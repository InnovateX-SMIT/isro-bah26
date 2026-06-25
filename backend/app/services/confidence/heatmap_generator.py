import numpy as np
import cv2
import rasterio
from typing import List, Dict, Any, Tuple
from skimage.measure import label

def build_rgb_composite(band2_path: str, band3_path: str, band4_path: str, target_height: int, target_width: int) -> np.ndarray:
    """
    Builds an RGB composite from BAND2, BAND3, and BAND4 rasters, resampled to the target size.
    Consistent with the normalization approach in dataset_preview_service.py.
    """
    channels = []
    for bp in (band2_path, band3_path, band4_path):
        with rasterio.open(bp) as src:
            band_data = src.read(
                1,
                out_shape=(target_height, target_width),
                resampling=rasterio.enums.Resampling.bilinear
            )
            channels.append(band_data)
            
    def normalize_band(band):
        b_min = float(band.min())
        b_max = float(band.max())
        if b_max > b_min:
            return ((band - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
        return np.zeros_like(band, dtype=np.uint8)

    r_norm = normalize_band(channels[0])
    g_norm = normalize_band(channels[1])
    b_norm = normalize_band(channels[2])
    
    return np.stack([r_norm, g_norm, b_norm], axis=-1)

def get_red_yellow_green_lut() -> np.ndarray:
    """
    Generates a BGR custom Red-Yellow-Green lookup table (LUT) for cv2.applyColorMap.
    Red: (0, 0, 255), Yellow: (0, 255, 255), Green: (0, 255, 0).
    """
    lut = np.zeros((256, 1, 3), dtype=np.uint8)
    for i in range(256):
        if i < 128:
            lut[i, 0, 0] = 0
            lut[i, 0, 1] = int(2 * i)
            lut[i, 0, 2] = 255
        else:
            lut[i, 0, 0] = 0
            lut[i, 0, 1] = 255
            lut[i, 0, 2] = int(255 - 2 * (i - 128))
    return lut

def overlay_confidence(
    rgb_composite: np.ndarray,
    confidence_map_array: np.ndarray,
    reconstruction_mask: np.ndarray,
    alpha: float = 0.4
) -> np.ndarray:
    """
    Alpha-blends the colorized confidence map onto the RGB composite inside the reconstructed regions.
    """
    map_u8 = (confidence_map_array * 2.55).astype(np.uint8)
    lut = get_red_yellow_green_lut()
    color_mapped_bgr = cv2.applyColorMap(map_u8, lut)
    color_mapped_rgb = cv2.cvtColor(color_mapped_bgr, cv2.COLOR_BGR2RGB)
    
    blended = cv2.addWeighted(rgb_composite, 1.0 - alpha, color_mapped_rgb, alpha, 0)
    
    output = rgb_composite.copy()
    mask_indices = reconstruction_mask > 0
    output[mask_indices] = blended[mask_indices]
    return output

def build_reliability_map(
    rgb_composite: np.ndarray,
    labeled_region_array: np.ndarray,
    region_reliability_json: List[Dict[str, Any]],
    alpha: float = 0.4
) -> np.ndarray:
    """
    Builds the reliability map by tinting cloud regions with their Phase 8B tier color.
    Uses a highly optimized vectorized NumPy LUT mapping.
    """
    max_id = int(np.max(labeled_region_array)) if labeled_region_array.size > 0 else 0
    
    # Create LUT: shape (max_id + 1, 3), default to background [0, 0, 0]
    tier_color_lut = np.zeros((max_id + 1, 3), dtype=np.uint8)
    
    # Map tier names to RGB colors
    tier_colors = {
        "High": [0, 255, 0],
        "Moderate": [255, 255, 0],
        "Low": [255, 165, 0],
        "Very Low": [255, 0, 0]
    }
    
    # Populate the LUT based on the region_reliability_json details
    for reg in region_reliability_json:
        region_id = reg["region_id"]
        tier = reg.get("reliability_tier", "Very Low")
        color = tier_colors.get(tier, [255, 0, 0])
        if region_id <= max_id:
            tier_color_lut[region_id] = color
            
    # Apply the LUT in one vectorized indexing operation
    tint_map = tier_color_lut[labeled_region_array]
    
    # Blend the tinted regions onto the RGB composite
    blended = cv2.addWeighted(rgb_composite, 1.0 - alpha, tint_map, alpha, 0)
    
    # Only replace pixels that belong to actual cloud regions (labeled_mask > 0)
    output = rgb_composite.copy()
    mask_indices = labeled_region_array > 0
    output[mask_indices] = blended[mask_indices]
    
    return output

def build_legend() -> Dict[str, Any]:
    """
    Returns the legend color scheme metadata for the frontend.
    """
    return {
        "confidence_heatmap": {
            "description": "Alpha-blended raw confidence scoring gradient from Red (lowest) to Green (highest)",
            "gradient": {
                "0": "Red (RGB: 255, 0, 0)",
                "50": "Yellow (RGB: 255, 255, 0)",
                "100": "Green (RGB: 0, 255, 0)"
            }
        },
        "reliability_map": {
            "description": "Discrete cloud regions color-coded by their aggregated reliability tier",
            "tiers": {
                "High": {
                    "color_rgb": [0, 255, 0],
                    "meaning": "Highly reliable reconstruction (Score >= 75)"
                },
                "Moderate": {
                    "color_rgb": [255, 255, 0],
                    "meaning": "Moderately reliable reconstruction (Score 50-74)"
                },
                "Low": {
                    "color_rgb": [255, 165, 0],
                    "meaning": "Low reliability reconstruction (Score 25-49)"
                },
                "Very Low": {
                    "color_rgb": [255, 0, 0],
                    "meaning": "Unreliable reconstruction (Score < 25)"
                }
            }
        }
    }
