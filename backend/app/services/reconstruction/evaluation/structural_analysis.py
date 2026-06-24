import cv2
import numpy as np
from typing import List

def calculate_structural_preservation(
    optimized_bands: List[np.ndarray],
    original_bands: List[np.ndarray],
    mask: np.ndarray
) -> float:
    """
    Computes Structural Preservation Score (0-100) by comparing the edge alignment
    (Sobel gradient magnitudes) inside the reconstructed region of the optimized bands
    versus the original bands resampled structure.
    
    Args:
        optimized_bands: List of optimized bands (numpy 2D arrays).
        original_bands: List of original bands (numpy 2D arrays).
        mask: Reconstruction mask (2D array).
    """
    mask_idx = (mask > 0)
    if np.sum(mask_idx) == 0:
        return 100.0
        
    scores = []
    for i in range(len(optimized_bands)):
        opt = optimized_bands[i].astype(np.float32)
        orig = original_bands[i].astype(np.float32)
        
        # Calculate Sobel edge gradient maps
        opt_sobelx = cv2.Sobel(opt, cv2.CV_32F, 1, 0, ksize=3)
        opt_sobely = cv2.Sobel(opt, cv2.CV_32F, 0, 1, ksize=3)
        opt_edges = np.sqrt(opt_sobelx**2 + opt_sobely**2)
        
        orig_sobelx = cv2.Sobel(orig, cv2.CV_32F, 1, 0, ksize=3)
        orig_sobely = cv2.Sobel(orig, cv2.CV_32F, 0, 1, ksize=3)
        orig_edges = np.sqrt(orig_sobelx**2 + orig_sobely**2)
        
        opt_pixels = opt_edges[mask_idx]
        orig_pixels = orig_edges[mask_idx]
        
        std_opt = np.std(opt_pixels)
        std_orig = np.std(orig_pixels)
        
        if std_opt > 1e-4 and std_orig > 1e-4:
            corr = np.corrcoef(opt_pixels, orig_pixels)[0, 1]
            if np.isnan(corr):
                score = 50.0
            else:
                # Correlation [-1, 1] mapped to [0, 100]
                score = (corr + 1.0) / 2.0 * 100.0
            scores.append(score)
        else:
            scores.append(100.0 if np.allclose(opt_pixels, orig_pixels) else 50.0)
            
    return round(float(np.mean(scores)), 2)
