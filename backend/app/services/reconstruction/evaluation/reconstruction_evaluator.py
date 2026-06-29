import os
import time
import rasterio
import cv2
import numpy as np
from typing import Dict, Any, List

from app.services.reconstruction.evaluation.quality_metrics import (
    calculate_coverage_and_completeness,
    calculate_boundary_scores,
    calculate_artifact_score
)
from app.services.reconstruction.evaluation.temporal_consistency import calculate_temporal_consistency
from app.services.reconstruction.evaluation.structural_analysis import calculate_structural_preservation
from app.services.reconstruction.evaluation.evaluation_report import generate_and_save_reports

def execute_evaluation(
    optimized_image_path: str,
    reconstructed_image_path: str,
    mask_path: str,
    dataset_path: str,
    output_dir: str,
    dataset_id: str,
    temporal_relevance: float = 85.0,
    metadata_profile: Dict[str, Any] = None,
    geospatial_profile: Dict[str, Any] = None,
    temporal_profile: Dict[str, Any] = None,
    cloud_profile: Dict[str, Any] = None,
    reconstruction_run_strategy: str = "DEFAULT",
    optimization_method: str = "DEFAULT"
) -> Dict[str, Any]:
    """
    Executes the quantitative evaluation of the reconstructed and optimized GeoTIFF files:
    1. Reads mask, baseline reconstructed TIFF, optimized reconstruction TIFF, and original dataset bands.
    2. Invokes sub-calculators for Coverage, Completeness, Spatial Continuity, Edges, and Artifact levels.
    3. Aggregates a normalized overall score [0, 100].
    4. Saves evaluation report, scorecard, summary, and quality metrics as JSON artifacts.
    """
    # 1. Load mask
    with rasterio.open(mask_path) as src_mask:
        mask_data = src_mask.read(1)
        mask_height, mask_width = src_mask.height, src_mask.width
        
    # 2. Load reconstructed TIFF bands
    reconstructed_bands = []
    with rasterio.open(reconstructed_image_path) as src_rec:
        for i in range(1, src_rec.count + 1):
            reconstructed_bands.append(src_rec.read(i))
            
    # 3. Load optimized TIFF bands
    optimized_bands = []
    with rasterio.open(optimized_image_path) as src_opt:
        for i in range(1, src_opt.count + 1):
            optimized_bands.append(src_opt.read(i))
            
    # 4. Discover original dataset bands
    band2_path, band3_path, band4_path = None, None, None
    for root, _, files in os.walk(dataset_path):
        for file in files:
            file_lower = file.lower()
            full_path = os.path.join(root, file)
            if file_lower == "band2.tif":
                band2_path = full_path
            elif file_lower == "band3.tif":
                band3_path = full_path
            elif file_lower == "band4.tif":
                band4_path = full_path
                
    if not (band2_path and band3_path and band4_path):
        raise ValueError("Missing original band files BAND2.tif, BAND3.tif, BAND4.tif in dataset path.")
        
    # Load resampled original bands for reference
    original_bands = []
    for bp in (band2_path, band3_path, band4_path):
        with rasterio.open(bp) as src_band:
            band_data = src_band.read(
                1,
                out_shape=(mask_height, mask_width),
                resampling=rasterio.enums.Resampling.bilinear
            )
            original_bands.append(band_data)
            
    # --- Execute Evaluation Pipeline ---
    
    # 1. Coverage & Completeness
    cov_comp = calculate_coverage_and_completeness(optimized_bands, mask_data)
    
    # 2. Boundary Scores (Quality & Spatial Consistency)
    boundary_scores = calculate_boundary_scores(optimized_bands, reconstructed_bands, mask_data)
    
    # 3. Temporal Consistency
    temporal_score = calculate_temporal_consistency(
        optimized_bands=optimized_bands,
        original_bands=original_bands,
        mask=mask_data,
        temporal_relevance=temporal_relevance
    )
    
    # 4. Structural Preservation (Edge Alignment)
    structural_score = calculate_structural_preservation(
        optimized_bands=optimized_bands,
        original_bands=original_bands,
        mask=mask_data
    )
    
    # 5. Artifact Score (Laplacian variance texture similarity)
    artifact_score = calculate_artifact_score(
        optimized_bands=optimized_bands,
        original_bands=original_bands,
        mask=mask_data
    )
    
    # 6. Scientific Quality Metrics (MAE, RMSE, PSNR, SSIM, SAM)
    from app.services.reconstruction.temporal_guidance import get_temporal_guidance
    
    # Normalize original bands to uint8 to match reference format
    bands_uint8 = []
    orig_mins = []
    orig_maxs = []
    for b in original_bands:
        b_min = float(b.min())
        b_max = float(b.max())
        orig_mins.append(b_min)
        orig_maxs.append(b_max)
        if b_max > b_min:
            b_u8 = ((b - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
        else:
            b_u8 = np.zeros_like(b, dtype=np.uint8)
        bands_uint8.append(b_u8)
        
    inpaint_mask = (mask_data > 0).astype(np.uint8) * 255
    guidance_bands = get_temporal_guidance(bands_uint8, inpaint_mask, temporal_relevance)
    
    mask_idx = (mask_data > 0)
    total_reconstructed = np.sum(mask_idx)
    
    maes = []
    rmses = []
    psnrs = []
    ssims = []
    
    # Local SSIM helper
    def local_ssim(img1, img2):
        img1 = img1.astype(np.float32)
        img2 = img2.astype(np.float32)
        C1 = (0.01 * 255.0) ** 2
        C2 = (0.03 * 255.0) ** 2
        
        mu1 = cv2.GaussianBlur(img1, (11, 11), 1.5)
        mu2 = cv2.GaussianBlur(img2, (11, 11), 1.5)
        
        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2
        
        sigma1_sq = cv2.GaussianBlur(img1 * img1, (11, 11), 1.5) - mu1_sq
        sigma2_sq = cv2.GaussianBlur(img2 * img2, (11, 11), 1.5) - mu2_sq
        sigma12 = cv2.GaussianBlur(img1 * img2, (11, 11), 1.5) - mu1_mu2
        
        ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / \
                   ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))
        return ssim_map

    opt_stacked_list = []
    guide_stacked_list = []

    for i in range(len(optimized_bands)):
        b_min = orig_mins[i]
        b_max = orig_maxs[i]
        
        # Scale optimized band to uint8 matching range
        if b_max > b_min:
            opt_u8 = (((optimized_bands[i].astype(np.float32) - b_min) / (b_max - b_min)) * 255.0).clip(0, 255).astype(np.uint8)
        else:
            opt_u8 = np.zeros_like(optimized_bands[i], dtype=np.uint8)
            
        opt_pixels = opt_u8[mask_idx].astype(np.float32)
        guide_pixels = guidance_bands[i][mask_idx].astype(np.float32)
        
        opt_stacked_list.append(opt_pixels)
        guide_stacked_list.append(guide_pixels)
        
        # MAE
        mae_val = np.mean(np.abs(opt_pixels - guide_pixels)) if total_reconstructed > 0 else 0.0
        maes.append(mae_val)
        
        # RMSE
        rmse_val = np.sqrt(np.mean((opt_pixels - guide_pixels) ** 2)) if total_reconstructed > 0 else 0.0
        rmses.append(rmse_val)
        
        # PSNR
        mse = np.mean((opt_pixels - guide_pixels) ** 2) if total_reconstructed > 0 else 0.0
        if mse < 1e-5:
            psnr_val = 100.0
        else:
            psnr_val = 20.0 * np.log10(255.0 / np.sqrt(mse))
        psnrs.append(psnr_val)
        
        # SSIM
        ssim_map = local_ssim(opt_u8, guidance_bands[i])
        ssim_val = np.mean(ssim_map[mask_idx]) if total_reconstructed > 0 else 1.0
        ssims.append(ssim_val)
        
    mae = round(float(np.mean(maes)), 2)
    rmse = round(float(np.mean(rmses)), 2)
    psnr = round(float(np.mean(psnrs)), 2)
    ssim = round(float(np.mean(ssims)), 4)
    
    # SAM (Spectral Angle Mapper) in Degrees
    if total_reconstructed > 0:
        opt_stacked = np.stack(opt_stacked_list, axis=1) # (N, 3)
        guide_stacked = np.stack(guide_stacked_list, axis=1) # (N, 3)
        dot_product = np.sum(opt_stacked * guide_stacked, axis=1)
        norm_opt = np.linalg.norm(opt_stacked, axis=1)
        norm_guide = np.linalg.norm(guide_stacked, axis=1)
        cos_theta = dot_product / np.maximum(norm_opt * norm_guide, 1e-5)
        cos_theta = np.clip(cos_theta, -1.0, 1.0)
        sam_radians = np.arccos(cos_theta)
        sam = round(float(np.mean(sam_radians) * 180.0 / np.pi), 2)
    else:
        sam = 0.0

    # Calculate Overall Score (weighted average of individual aspects)
    overall_score = (
        cov_comp["completeness"] * 0.05 +
        boundary_scores["spatial_consistency"] * 0.20 +
        boundary_scores["boundary_quality"] * 0.15 +
        temporal_score * 0.25 +
        structural_score * 0.20 +
        artifact_score * 0.15
    )
    overall_score = round(max(0.0, min(100.0, overall_score)), 2)
    
    metrics = {
        "reconstruction_coverage": cov_comp["coverage"],
        "completeness_score": cov_comp["completeness"],
        "boundary_quality_score": boundary_scores["boundary_quality"],
        "spatial_consistency_score": boundary_scores["spatial_consistency"],
        "temporal_agreement_score": temporal_score,
        "structural_preservation_score": structural_score,
        "artifact_score": artifact_score,
        "overall_score": overall_score,
        "psnr": psnr,
        "ssim": ssim,
        "mae": mae,
        "rmse": rmse,
        "sam_degrees": sam
    }
    
    # Build report sections
    dataset_info = metadata_profile or {"info": "Not available"}
    if geospatial_profile:
        dataset_info.update(geospatial_profile)
        
    cloud_info = cloud_profile or {"cloud_status": "Not available"}
    temporal_info = temporal_profile or {"temporal_status": "Not available"}
    reconstruction_info = {
        "strategy": reconstruction_run_strategy,
        "input_reconstructed_raster": reconstructed_image_path,
        "input_mask_raster": mask_path
    }
    optimization_info = {
        "optimization_method": optimization_method,
        "input_optimized_raster": optimized_image_path
    }
    
    # Load technical analytics from the reconstruction run folder
    workspace_root = os.path.abspath(os.path.join(output_dir, "..", "..", ".."))
    analytics_path = os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}/reconstruction_analytics.json")
    reconstruction_analytics = {}
    if os.path.exists(analytics_path):
        try:
            import json
            with open(analytics_path, "r") as f:
                reconstruction_analytics = json.load(f)
        except Exception:
            pass

    # Write JSON files to output directory
    reports = generate_and_save_reports(
        output_dir=output_dir,
        dataset_id=dataset_id,
        metrics=metrics,
        dataset_info=dataset_info,
        cloud_info=cloud_info,
        temporal_info=temporal_info,
        reconstruction_info=reconstruction_info,
        optimization_info=optimization_info,
        reconstruction_analytics=reconstruction_analytics
    )
    
    return reports
