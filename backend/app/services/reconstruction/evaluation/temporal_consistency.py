import cv2
import numpy as np
from typing import List
from app.services.reconstruction.temporal_guidance import get_temporal_guidance

def calculate_temporal_consistency(
    optimized_bands: List[np.ndarray],
    original_bands: List[np.ndarray],
    mask: np.ndarray,
    temporal_relevance: float
) -> float:
    """
    Computes the Temporal Agreement Score by calculating the Pearson correlation
    between the optimized bands and the edge-preserved historical temporal guidance
    inside the cloud mask.
    
    Args:
        optimized_bands: Optimized bands (list of 2D numpy arrays).
        original_bands: Original bands (list of 2D numpy arrays).
        mask: Reconstruction mask (2D array).
        temporal_relevance: Context relevance score (float).
    """
    mask_idx = (mask > 0)
    if np.sum(mask_idx) == 0:
        return 100.0

    # 1. Normalize original bands to uint8 to match temporal guidance format
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
        
    inpaint_mask = (mask > 0).astype(np.uint8) * 255
    
    # 2. Extract synthesized temporal guidance bands
    guidance_bands = get_temporal_guidance(bands_uint8, inpaint_mask, temporal_relevance)
    
    # 3. Calculate Pearson correlation inside the mask for each band
    correlations = []
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
        
        std_opt = np.std(opt_pixels)
        std_guide = np.std(guide_pixels)
        
        if std_opt > 1e-4 and std_guide > 1e-4:
            corr = np.corrcoef(opt_pixels, guide_pixels)[0, 1]
            if np.isnan(corr):
                score = 50.0
            else:
                # Map correlation from [-1, 1] to [0, 100]
                score = (corr + 1.0) / 2.0 * 100.0
            correlations.append(score)
        else:
            # Fallback if constant region
            correlations.append(100.0 if np.allclose(opt_pixels, guide_pixels) else 50.0)
            
    return round(float(np.mean(correlations)), 2)
