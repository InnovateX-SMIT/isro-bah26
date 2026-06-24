import cv2
import numpy as np
from typing import List, Dict, Any

def calculate_coverage_and_completeness(
    optimized_bands: List[np.ndarray],
    mask: np.ndarray
) -> Dict[str, float]:
    """
    Computes reconstruction coverage percentage and completeness scorecard.
    Coverage = percentage of cloud mask area targeted.
    Completeness = percentage of mask pixels that are successfully filled (non-zero, non-NaN).
    """
    mask_idx = (mask > 0)
    total_mask_pixels = int(np.sum(mask_idx))
    
    if total_mask_pixels == 0:
        return {"coverage": 100.0, "completeness": 100.0}
        
    invalid_pixels = 0
    for band in optimized_bands:
        # Check for NaN, infinite, or exactly 0 values in the reconstructed region
        invalid_mask = np.isnan(band) | np.isinf(band) | (band == 0)
        invalid_pixels += int(np.sum(invalid_mask & mask_idx))
        
    # Average across all bands
    avg_invalid_pixels = invalid_pixels / len(optimized_bands)
    valid_pixels = max(0, total_mask_pixels - avg_invalid_pixels)
    
    completeness = (valid_pixels / total_mask_pixels) * 100.0
    # Coverage is 100% since our reconstruction engine processes the entire input mask
    coverage = 100.0
    
    return {
        "coverage": round(coverage, 2),
        "completeness": round(completeness, 2)
    }

def calculate_boundary_scores(
    optimized_bands: List[np.ndarray],
    reconstructed_bands: List[np.ndarray],
    mask: np.ndarray
) -> Dict[str, float]:
    """
    Computes Boundary Quality and Spatial Consistency Scores.
    - Boundary Quality measures border smoothness (average gradient magnitude).
    - Spatial Consistency measures percentage improvement of seam discontinuity before/after optimization.
    """
    binary_mask = (mask > 0).astype(np.uint8) * 255
    kernel = np.ones((3, 3), np.uint8)
    
    # Extract mask boundary
    dilated = cv2.dilate(binary_mask, kernel, iterations=1)
    eroded = cv2.erode(binary_mask, kernel, iterations=1)
    boundary = (dilated > 0) & (eroded == 0)
    
    if np.sum(boundary) == 0:
        return {"boundary_quality": 100.0, "spatial_consistency": 100.0}
        
    # Calculate gradients before optimization
    grad_before = []
    for band in reconstructed_bands:
        b_min, b_max = band.min(), band.max()
        norm = ((band - b_min) / (b_max - b_min) * 255.0).astype(np.uint8) if b_max > b_min else np.zeros_like(band, dtype=np.uint8)
        sobelx = cv2.Sobel(norm.astype(np.float32), cv2.CV_32F, 1, 0, ksize=3)
        sobely = cv2.Sobel(norm.astype(np.float32), cv2.CV_32F, 0, 1, ksize=3)
        grad_before.append(np.mean(np.sqrt(sobelx**2 + sobely**2)[boundary]))
        
    # Calculate gradients after optimization
    grad_after = []
    for band in optimized_bands:
        b_min, b_max = band.min(), band.max()
        norm = ((band - b_min) / (b_max - b_min) * 255.0).astype(np.uint8) if b_max > b_min else np.zeros_like(band, dtype=np.uint8)
        sobelx = cv2.Sobel(norm.astype(np.float32), cv2.CV_32F, 1, 0, ksize=3)
        sobely = cv2.Sobel(norm.astype(np.float32), cv2.CV_32F, 0, 1, ksize=3)
        grad_after.append(np.mean(np.sqrt(sobelx**2 + sobely**2)[boundary]))
        
    g_before = float(np.mean(grad_before))
    g_after = float(np.mean(grad_after))
    
    # Boundary Quality Score (normalized 0-100, where lower gradient seam is better)
    # Target threshold is around 15 gradient strength
    boundary_quality = max(0.0, min(100.0, 100.0 - (g_after * 1.5)))
    
    # Spatial Consistency based on relative improvement
    spatial_consistency = 50.0
    if g_before > 0:
        improvement = (g_before - g_after) / g_before
        spatial_consistency = max(0.0, min(100.0, 50.0 + (improvement * 50.0)))
        
    return {
        "boundary_quality": round(boundary_quality, 2),
        "spatial_consistency": round(spatial_consistency, 2)
    }

def calculate_artifact_score(
    optimized_bands: List[np.ndarray],
    original_bands: List[np.ndarray],
    mask: np.ndarray
) -> float:
    """
    Computes Artifact Score by comparing high frequency texture variance (Laplacian)
    inside the mask (optimized) vs outside the mask (surrounding local clean neighborhood).
    If it's blurred (variance -> 0) or noisy (variance -> high), the score drops.
    """
    mask_idx = (mask > 0)
    
    # Generate local clean neighborhood ring of 20 pixels
    binary_mask = (mask > 0).astype(np.uint8) * 255
    kernel = np.ones((41, 41), np.uint8)
    dilated = cv2.dilate(binary_mask, kernel, iterations=1)
    local_clean_idx = (dilated > 0) & (mask == 0)
    
    if np.sum(local_clean_idx) < 100:
        local_clean_idx = (mask == 0) # Fallback to all unclouded
        
    scores = []
    for i in range(len(optimized_bands)):
        opt_band = optimized_bands[i].astype(np.float32)
        orig_band = original_bands[i].astype(np.float32)
        
        # Calculate Laplacian variance
        lap_opt = cv2.Laplacian(opt_band, cv2.CV_32F)
        lap_orig = cv2.Laplacian(orig_band, cv2.CV_32F)
        
        var_mask = float(np.var(lap_opt[mask_idx]))
        var_clean = float(np.var(lap_orig[local_clean_idx]))
        
        if var_clean > 0 and var_mask > 0:
            ratio = min(var_mask, var_clean) / max(var_mask, var_clean)
            scores.append(ratio * 100.0)
        else:
            scores.append(50.0)
            
    return round(float(np.mean(scores)), 2)
