import cv2
import numpy as np
from typing import List

def ensure_spectral_consistency(
    reconstructed_bands: List[np.ndarray],
    original_bands: List[np.ndarray],
    mask: np.ndarray
) -> List[np.ndarray]:
    """
    Aligns the spectral, contrast, and brightness profile of the reconstructed region
    with the local unclouded surrounding neighborhood using Local Retinex Ratio propagation.
    
    Args:
        reconstructed_bands: Bands output by boundary refinement & edge preservation (list of 2D arrays).
        original_bands: Original resampled bands (list of 2D arrays).
        mask: Reconstruction mask (2D array).
    """
    out_bands = []
    mask_idx = (mask > 0)
    
    total_masked = np.sum(mask_idx)
    if total_masked == 0:
        return [b.copy() for b in reconstructed_bands]
        
    binary_mask = (mask > 0).astype(np.uint8) * 255
    
    # Generate feathering alpha map for transition blending
    alpha = cv2.GaussianBlur(binary_mask.astype(np.float32), (15, 15), sigmaX=0)
    alpha = np.clip(alpha, 0.0, 1.0)
        
    for i in range(len(reconstructed_bands)):
        rec_band = reconstructed_bands[i]
        orig_band = original_bands[i]
        
        rec_band_float = rec_band.astype(np.float32)
        orig_band_float = orig_band.astype(np.float32)
        
        # 1. Compute pixel-wise local ratio
        # Avoid zero division and limit ratio between [0.2, 5.0] to prevent hot/cold spots
        clipped_ratio = np.clip(orig_band_float / np.maximum(rec_band_float, 1.0), 0.2, 5.0)
        
        # 2. Setup initial ratio map. Inside mask, it is unknown (we will inpaint it).
        # Outside mask, we keep the ratio where original band has valid telemetry
        valid_ratio_mask = (mask == 0) & (orig_band > 0)
        ratio_map = np.ones_like(rec_band_float)
        ratio_map[valid_ratio_mask] = clipped_ratio[valid_ratio_mask]
        
        # 3. Propagate boundary ratio values into the reconstructed region via fast marching inpainting
        # Map [0.2, 5.0] to [0, 255] for uint8 OpenCV inpainting
        ratio_min, ratio_max = 0.2, 5.0
        ratio_u8 = (((ratio_map - ratio_min) / (ratio_max - ratio_min)) * 255.0).astype(np.uint8)
        
        inpainted_u8 = cv2.inpaint(ratio_u8, binary_mask, inpaintRadius=20, flags=cv2.INPAINT_TELEA)
        inpainted_ratio = (inpainted_u8.astype(np.float32) / 255.0) * (ratio_max - ratio_min) + ratio_min
        
        # 4. Apply correction inside the mask
        adjusted_band = rec_band_float * inpainted_ratio
        
        # Clip to physical band boundaries to avoid invalid overflow/underflow
        b_min = float(orig_band.min())
        b_max = float(orig_band.max())
        adjusted_band = np.clip(adjusted_band, b_min, b_max)
        
        # 5. Blend smoothly at the boundary using the alpha map
        blended = rec_band_float * (1.0 - alpha) + adjusted_band * alpha
        out_bands.append(blended.astype(rec_band.dtype))
            
    return out_bands
