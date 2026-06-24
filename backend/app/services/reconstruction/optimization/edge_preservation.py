import cv2
import numpy as np
from typing import List

def guided_filter(I: np.ndarray, p: np.ndarray, r: int, eps: float) -> np.ndarray:
    """
    Fast O(1) time Guided Filter implementation using box filters.
    
    Args:
        I: Guidance image (single channel, float32).
        p: Input filtering image (single channel, float32).
        r: Local box window radius.
        eps: Regularization parameter.
    """
    # Size of the box filter window is (2*r + 1, 2*r + 1)
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

def preserve_edges(
    bands: List[np.ndarray],
    mask: np.ndarray,
    radius: int = 4,
    eps: float = 0.01
) -> List[np.ndarray]:
    """
    Applies Guided Filtering on each band specifically within the reconstruction mask.
    This preserves linear features (roads, boundaries) while smoothing out processing artifacts.
    
    Args:
        bands: List of 2D numpy arrays representing bands.
        mask: Reconstruction mask (2D array).
        radius: Window radius parameter.
        eps: Regularization parameter.
    """
    out_bands = []
    mask_idx = (mask > 0)
    
    for band in bands:
        orig_dtype = band.dtype
        # Handle empty/constant bands
        b_min = float(band.min())
        b_max = float(band.max())
        if b_max > b_min:
            norm_band = (band.astype(np.float32) - b_min) / (b_max - b_min)
        else:
            norm_band = np.zeros_like(band, dtype=np.float32)
            
        # Filter using self-guidance for optimal structural alignment
        filtered = guided_filter(norm_band, norm_band, r=radius, eps=eps)
        
        # Scale back to original range
        restored = filtered * (b_max - b_min) + b_min
        restored = np.clip(restored, b_min, b_max).astype(orig_dtype)
        
        # Selectively apply to mask area to prevent blurring original pixels
        out_band = band.copy()
        out_band[mask_idx] = restored[mask_idx]
        out_bands.append(out_band)
        
    return out_bands
