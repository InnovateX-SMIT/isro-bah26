import os
import numpy as np
import cv2
import rasterio
from typing import List, Dict, Any, Tuple

def score_by_cloud_class(
    classification_map_path: str,
    mask_shape: Tuple[int, int],
    workspace_root: str
) -> Tuple[np.ndarray, str]:
    """
    Assigns a confidence base score [0.0, 1.0] to each pixel based on its original cloud class.
    Thick=0.3, Thin=0.55, Cirrus=0.65, Uncertain=0.4, Shadow=0.5, Background/Clean=1.0.
    """
    abs_path = os.path.abspath(os.path.join(workspace_root, classification_map_path)) if not os.path.isabs(classification_map_path) else classification_map_path

    basis_info = "Cloud Class Base Scores: Thick=0.3, Thin=0.55, Cirrus=0.65, Uncertain=0.4, Shadow=0.5."

    if not os.path.exists(abs_path):
        # Fallback to standard 0.4 score inside the mask if the classification raster is missing
        return np.full(mask_shape, 0.4, dtype=np.float32), basis_info + " (Degraded: Classification raster missing, defaulted to 0.4 inside mask)."

    try:
        with rasterio.open(abs_path) as src:
            class_map = src.read(
                1,
                out_shape=mask_shape,
                resampling=rasterio.enums.Resampling.nearest
            )
        
        # Map classes to float scores
        score_map = np.ones(mask_shape, dtype=np.float32)
        score_map[class_map == 1] = 0.3   # Thick
        score_map[class_map == 2] = 0.55  # Thin
        score_map[class_map == 3] = 0.65  # Cirrus
        score_map[class_map == 4] = 0.4   # Uncertain
        score_map[class_map == 5] = 0.5   # Shadow

        return score_map, basis_info
    except Exception as e:
        return np.full(mask_shape, 0.4, dtype=np.float32), basis_info + f" (Degraded: Error reading classification map: {e}, defaulted to 0.4)."

def score_by_boundary_distance(reconstruction_mask: np.ndarray) -> np.ndarray:
    """
    Computes a distance-from-edge confidence score [0.0, 1.0] using Distance Transform.
    Pixels closer to the clean boundary have higher confidence; clipped at max 30px distance.
    """
    # cv2.distanceTransform expects a binary mask (pixels of interest are 1, background is 0)
    # It calculates distance to the closest zero pixel.
    # Therefore, inside the reconstructed region (mask == 1), distance to boundaries increases as we go inward.
    # Let's ensure mask is cast to uint8.
    mask_u8 = reconstruction_mask.astype(np.uint8)
    
    # Check if there are any reconstructed pixels
    if np.sum(mask_u8) == 0:
        return np.ones(reconstruction_mask.shape, dtype=np.float32)

    dist = cv2.distanceTransform(mask_u8, cv2.DIST_L2, 5)
    
    # Clip at max 30px
    max_dist = 30.0
    clipped_dist = np.minimum(dist, max_dist)
    
    # Inside mask, distance 0 is boundary (score 1.0) and distance 30+ is deep center (score 0.0)
    boundary_score = 1.0 - (clipped_dist / max_dist)
    
    # Force clean background pixels to 1.0
    boundary_score[mask_u8 == 0] = 1.0
    
    return boundary_score

def score_by_temporal_agreement(
    selected_references: list,
    mask_shape: Tuple[int, int],
    workspace_root: str
) -> Tuple[np.ndarray, str]:
    """
    Estimates agreement between multiple historical references.
    If >= 2 references exist and their band files are present, computes pixel-wise std-dev.
    Otherwise, returns flat neutral 0.6 array and notes the degraded mode.
    """
    if len(selected_references) < 2:
        msg = f"Degraded mode: Insufficient historical references (found {len(selected_references)}, minimum 2 required)."
        return np.full(mask_shape, 0.6, dtype=np.float32), msg

    # Try to find and load reference files
    ref_images = []
    for ref in selected_references:
        cand = ref.candidate
        if not cand:
            continue
        # Check if there is a georeferenced raster file on disk for this candidate
        candidate_rel_path = f"datasets/temporal_references/{cand.candidate_id}.tif"
        candidate_abs_path = os.path.abspath(os.path.join(workspace_root, candidate_rel_path))
        if os.path.exists(candidate_abs_path):
            ref_images.append(candidate_abs_path)

    if len(ref_images) < 2:
        msg = "Degraded mode: Historical reference raster files are not available on local disk, defaulting to neutral 0.6 agreement."
        return np.full(mask_shape, 0.6, dtype=np.float32), msg

    # If we have physical files, read them and compute std-dev
    try:
        bands_data = []
        for path in ref_images:
            with rasterio.open(path) as src:
                data = src.read(1, out_shape=mask_shape, resampling=rasterio.enums.Resampling.bilinear)
                bands_data.append(data.astype(np.float32))
        
        stacked = np.stack(bands_data, axis=0) # shape (N, H, W)
        std_dev = np.std(stacked, axis=0) # shape (H, W)
        
        # High std_dev means low agreement. Scale std_dev to 0-1
        # E.g. at std_dev = 0, agreement is 1.0. At std_dev = 25, agreement approaches 0.36
        agreement_score = np.exp(-std_dev / 25.0)
        return agreement_score, "Temporal Agreement: Computed standard deviation across reference bands."
    except Exception as e:
        msg = f"Degraded mode: Error calculating std-dev agreement: {e}. Defaulting to 0.6."
        return np.full(mask_shape, 0.6, dtype=np.float32), msg

def score_global_modulation(overall_score: float) -> Tuple[float, str]:
    """
    Returns a global quality scalar in [0, 1] based on Phase 7E overall_score.
    """
    if overall_score is None:
        return 1.0, "Global Quality Modulation: 1.0 (Phase 7E scorecard score not available)"
    modulation = max(0.0, min(1.0, overall_score / 100.0))
    return modulation, f"Global Quality Modulation: {modulation:.2f} (from Phase 7E Overall Score of {overall_score})"

def guided_filter_local(I: np.ndarray, p: np.ndarray, r: int, eps: float) -> np.ndarray:
    """
    Local box-filter based Guided Filter helper for confidence maps.
    """
    win_size = (2 * r + 1, 2 * r + 1)
    mean_I = cv2.boxFilter(I, -1, win_size)
    mean_p = cv2.boxFilter(p, -1, win_size)
    mean_Ip = cv2.boxFilter(I * p, -1, win_size)
    cov_Ip = mean_Ip - mean_I * mean_p
    mean_II = cv2.boxFilter(I * I, -1, win_size)
    var_I = mean_II - mean_I * mean_I
    a = cov_Ip / (var_I + eps)
    b = mean_p - a * mean_I
    mean_a = cv2.boxFilter(a, -1, win_size)
    mean_b = cv2.boxFilter(b, -1, win_size)
    q = mean_a * I + mean_b
    return q

def combine_confidence(
    class_score: np.ndarray,
    boundary_score: np.ndarray,
    temporal_score: np.ndarray,
    global_modulation: float,
    weights: dict = None,
    recon_band: np.ndarray = None,
    ref_images: List[str] = None
) -> np.ndarray:
    """
    Combines the confidence signals into a final combined score in [0.0, 1.0].
    If recon_band is provided, computes advanced signals: Reconstruction Uncertainty,
    Neighborhood Consistency, and Edge Continuity, then applies a Guided Filter to smooth the result.
    """
    # 1. Setup weights for signals
    if weights is None:
        weights = {"class": 0.20, "boundary": 0.15, "temporal": 0.15, "uncertainty": 0.20, "consistency": 0.15, "edge": 0.15}
        
    w_class = weights.get("class", 0.20)
    w_bound = weights.get("boundary", 0.15)
    w_temp = weights.get("temporal", 0.15)
    w_unc = weights.get("uncertainty", 0.20)
    w_cons = weights.get("consistency", 0.15)
    w_edge = weights.get("edge", 0.15)
    
    # 2. Check if we can compute advanced signals
    has_advanced = (recon_band is not None and np.any(recon_band > 0))
    
    # Build temporal guidance composite if references exist
    guidance_band = None
    if has_advanced and ref_images and len(ref_images) >= 2:
        try:
            bands_data = []
            for path in ref_images:
                with rasterio.open(path) as src:
                    data = src.read(1, out_shape=recon_band.shape, resampling=rasterio.enums.Resampling.bilinear)
                    bands_data.append(data.astype(np.float32))
            if bands_data:
                guidance_band = np.mean(bands_data, axis=0)
        except Exception:
            pass
            
    # 3. Compute signals
    if has_advanced:
        recon_band_float = recon_band.astype(np.float32)
        
        # A. Reconstruction Uncertainty
        if guidance_band is not None:
            diff = np.abs(recon_band_float - guidance_band)
            uncertainty_score = np.exp(-diff / 30.0)
        else:
            # Spatial uncertainty: local variance of reconstruction
            local_mean = cv2.boxFilter(recon_band_float, -1, (9, 9))
            local_sq_mean = cv2.boxFilter(recon_band_float * recon_band_float, -1, (9, 9))
            local_std = np.sqrt(np.maximum(local_sq_mean - local_mean * local_mean, 0.0))
            uncertainty_score = np.exp(-local_std / 20.0)
            
        # B. Neighborhood Consistency
        if guidance_band is not None:
            recon_mean = cv2.boxFilter(recon_band_float, -1, (15, 15))
            guidance_mean = cv2.boxFilter(guidance_band, -1, (15, 15))
            consistency_score = np.exp(-np.abs(recon_mean - guidance_mean) / 15.0)
        else:
            local_mean = cv2.boxFilter(recon_band_float, -1, (31, 31))
            # Compare with global mean of non-zero pixels
            clean_mean = np.mean(recon_band_float[recon_band_float > 0]) if np.any(recon_band_float > 0) else 127.0
            consistency_score = np.exp(-np.abs(local_mean - clean_mean) / 40.0)
            
        # C. Edge Confidence
        sobel_x = cv2.Sobel(recon_band_float, cv2.CV_32F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(recon_band_float, cv2.CV_32F, 0, 1, ksize=3)
        grad_mag = np.sqrt(sobel_x**2 + sobel_y**2)
        if guidance_band is not None:
            g_sobel_x = cv2.Sobel(guidance_band, cv2.CV_32F, 1, 0, ksize=3)
            g_sobel_y = cv2.Sobel(guidance_band, cv2.CV_32F, 0, 1, ksize=3)
            g_grad_mag = np.sqrt(g_sobel_x**2 + g_sobel_y**2)
            edge_score = np.exp(-np.abs(grad_mag - g_grad_mag) / 15.0)
        else:
            edge_score = np.exp(-grad_mag / 30.0)
            
        # D. Combine signals
        sum_w = w_class + w_bound + w_temp + w_unc + w_cons + w_edge
        combined = (
            class_score * w_class +
            boundary_score * w_bound +
            temporal_score * w_temp +
            uncertainty_score * w_unc +
            consistency_score * w_cons +
            edge_score * w_edge
        )
        if sum_w > 0:
            combined = combined / sum_w
            
        # E. Edge-Preserving Heatmap Smoothing using Guided Filter guided by recon_band
        b_min, b_max = float(recon_band_float.min()), float(recon_band_float.max())
        if b_max > b_min:
            I = (recon_band_float - b_min) / (b_max - b_min)
        else:
            I = np.zeros_like(recon_band_float)
            
        smoothed_combined = guided_filter_local(I, combined, r=4, eps=0.005)
        combined = np.clip(smoothed_combined, 0.0, 1.0)
    else:
        # Fallback to standard combine
        sum_w = 0.35 + 0.25 + 0.25
        combined = (class_score * 0.35 + boundary_score * 0.25 + temporal_score * 0.25) / sum_w
        
    final_score = combined * global_modulation
    return final_score

def get_red_yellow_green_lut() -> np.ndarray:
    """
    Generates a BGR custom Red-Yellow-Green lookup table (LUT) for cv2.applyColorMap fallback.
    Red: (0, 0, 255), Yellow: (0, 255, 255), Green: (0, 255, 0).
    """
    lut = np.zeros((256, 1, 3), dtype=np.uint8)
    for i in range(256):
        if i < 128:
            # Red to Yellow
            lut[i, 0, 0] = 0
            lut[i, 0, 1] = int(2 * i)
            lut[i, 0, 2] = 255
        else:
            # Yellow to Green
            lut[i, 0, 0] = 0
            lut[i, 0, 1] = 255
            lut[i, 0, 2] = int(255 - 2 * (i - 128))
    return lut

def generate_confidence_outputs(
    confidence_map: np.ndarray,
    mask: np.ndarray,
    ref_mask_path: str,
    output_tif_path: str,
    output_png_path: str
) -> None:
    """
    Writes the confidence score map to a georeferenced GeoTIFF and color-coded PNG.
    """
    # 1. Save single-band GeoTIFF confidence map
    with rasterio.open(ref_mask_path) as src:
        profile = src.profile.copy()
        
    profile.update(
        dtype=rasterio.float32,
        count=1,
        nodata=None
    )
    
    os.makedirs(os.path.dirname(output_tif_path), exist_ok=True)
    with rasterio.open(output_tif_path, "w", **profile) as dst:
        dst.write(confidence_map.astype(np.float32), 1)

    # 2. Build color-coded preview PNG (Red -> Yellow -> Green)
    # Convert confidence map (0-100) to uint8 (0-255)
    map_u8 = (confidence_map * 2.55).astype(np.uint8)
    
    # Apply colormap
    if hasattr(cv2, "COLORMAP_RDYILGN"):
        color_mapped = cv2.applyColorMap(map_u8, cv2.COLORMAP_RDYILGN)
    else:
        lut = get_red_yellow_green_lut()
        color_mapped = cv2.applyColorMap(map_u8, lut)
        
    # Set background (clean pixels outside mask) to original BGR color or keep it.
    # To make it represent confidence, let's keep clean pixels green (confidence 100).
    # Write to PNG disk
    cv2.imwrite(output_png_path, color_mapped)
