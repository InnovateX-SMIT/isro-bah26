import cv2
import numpy as np
from typing import List

def ensure_spectral_consistency(
    reconstructed_bands: List[np.ndarray],
    original_bands: List[np.ndarray],
    mask: np.ndarray
) -> List[np.ndarray]:
    """
    Aligns the mean and standard deviation of the reconstructed region
    with the local unclouded surrounding neighborhood.
    Uses boundary feathering to prevent seam discontinuities.
    
    Args:
        reconstructed_bands: Bands output by boundary refinement & edge preservation (list of 2D arrays).
        original_bands: Original resampled bands (list of 2D arrays).
        mask: Reconstruction mask (2D array).
    """
    out_bands = []
    mask_idx = (mask > 0)
    valid_idx = (mask == 0)
    
    total_masked = np.sum(mask_idx)
    if total_masked == 0:
        return [b.copy() for b in reconstructed_bands]
        
    # Generate local neighborhood mask (dilation of 20 pixels around mask)
    binary_mask = (mask > 0).astype(np.uint8) * 255
    dilation_kernel = np.ones((41, 41), np.uint8)
    dilated = cv2.dilate(binary_mask, dilation_kernel, iterations=1)
    local_idx = (dilated > 0) & (mask == 0)
    
    # Generate feathering alpha map for transition blending
    alpha = cv2.GaussianBlur(binary_mask.astype(np.float32), (15, 15), sigmaX=0)
    alpha = np.clip(alpha, 0.0, 1.0)
        
    for i in range(len(reconstructed_bands)):
        rec_band = reconstructed_bands[i]
        orig_band = original_bands[i]
        
        rec_pixels = rec_band[mask_idx].astype(np.float32)
        
        # Get pixels in the local neighborhood excluding nodata 0
        band_local_idx = local_idx & (orig_band > 0)
        local_pixels = orig_band[band_local_idx].astype(np.float32)
        
        # Fallback to global valid pixels if local neighborhood is too small
        if len(local_pixels) < 100:
            band_valid_idx = valid_idx & (orig_band > 0)
            local_pixels = orig_band[band_valid_idx].astype(np.float32)
            
        # If still too few background pixels, skip alignment
        if len(local_pixels) < 100:
            out_bands.append(rec_band.copy())
            continue
            
        # Calculate target statistics from clean local background
        mu_valid = float(np.mean(local_pixels))
        std_valid = float(np.std(local_pixels))
        
        # Calculate current statistics from reconstructed area
        mu_rec = float(np.mean(rec_pixels))
        std_rec = float(np.std(rec_pixels))
        
        if std_rec > 1e-5:
            # Shift and scale pixels of the entire band
            band_float = rec_band.astype(np.float32)
            adjusted_band = (band_float - mu_rec) / std_rec * std_valid + mu_valid
            
            # Clip to physical band boundaries to avoid invalid overflow/underflow
            b_min = float(orig_band.min())
            b_max = float(orig_band.max())
            adjusted_band = np.clip(adjusted_band, b_min, b_max)
            
            # Blend smoothly at the boundary using the alpha map
            blended = band_float * (1.0 - alpha) + adjusted_band * alpha
            out_bands.append(blended.astype(rec_band.dtype))
        else:
            out_bands.append(rec_band.copy())
            
    return out_bands
