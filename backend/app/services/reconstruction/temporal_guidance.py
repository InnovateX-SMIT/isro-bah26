import numpy as np
import cv2
from typing import List, Optional

def get_temporal_guidance(
    bands_uint8: List[np.ndarray],
    inpaint_mask: np.ndarray,
    temporal_relevance: float,
    historical_bands_uint8: Optional[List[np.ndarray]] = None
) -> List[np.ndarray]:
    """
    Retrieves or simulates temporal guidance from target bands.
    Uses real historical pixel data when available.
    Only falls back to the bilateral-filter synthesis if historical_bands_uint8 is None.
    """
    if historical_bands_uint8 is not None:
        return historical_bands_uint8

    guidance_bands = []
    for b_u8 in bands_uint8:
        # Bilateral filter retains sharp edges but smooths textures to simulate historical/coarse references
        guided = cv2.bilateralFilter(b_u8, d=9, sigmaColor=75, sigmaSpace=75)
        
        # Brightness shift based on temporal distance / relevance
        brightness_shift = int((100.0 - temporal_relevance) * 0.1)
        if brightness_shift > 0:
            guided = cv2.add(guided, brightness_shift)
            
        guidance_bands.append(guided)
    return guidance_bands

def blend_temporal_guidance(
    inpainted: np.ndarray,
    guidance: np.ndarray,
    inpaint_mask: np.ndarray,
    temporal_relevance: float
) -> np.ndarray:
    """
    Blends the inpainting result with the temporal guidance inside the mask.
    Weighting is proportional to the temporal relevance score:
    - High relevance (e.g. 95) -> 35% guidance, 65% inpainting
    - Low relevance (e.g. 50) -> 10% guidance, 90% inpainting
    Never directly replaces pixels to ensure seamless spatial blending.
    """
    if temporal_relevance <= 0.0:
        return inpainted.copy()
        
    # Map relevance (0-100) to alpha weight (0.05 to 0.40) for guidance influence
    guidance_weight = min(0.40, max(0.05, (temporal_relevance / 100.0) * 0.40))
    inpaint_weight = 1.0 - guidance_weight

    blended = inpainted.copy()
    
    # Apply blending only in the masked region
    mask_indices = (inpaint_mask > 0)
    if np.any(mask_indices):
        blended_pixels = (
            inpaint_weight * inpainted[mask_indices].astype(np.float32) +
            guidance_weight * guidance[mask_indices].astype(np.float32)
        )
        blended[mask_indices] = np.clip(blended_pixels, 0, 255).astype(np.uint8)
        
    return blended
