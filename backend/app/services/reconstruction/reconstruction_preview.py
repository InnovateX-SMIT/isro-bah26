import os
import numpy as np
from PIL import Image
from typing import List

def generate_reconstruction_preview(
    final_bands_uint8: List[np.ndarray],
    original_bands_uint8: List[np.ndarray],
    output_dir: str
) -> str:
    """
    Generates a 3-channel visual composite preview PNG (reconstruction_preview.png)
    using the final uint8 reconstructed bands.
    Also generates a thumbnail and a before vs after comparison image.
    Maps Band 3 (Red) to R, Band 2 (Green) to G, and Band 2 to B for natural look.
    """
    # LISS-IV band mappings: Band 2 (Green), Band 3 (Red), Band 4 (NIR)
    # Natural Visual RGB mapping: R=Band 3 (Red), G=Band 2 (Green), B=Band 2 (Green)
    r = final_bands_uint8[1] # Band 3
    g = final_bands_uint8[0] # Band 2
    b = final_bands_uint8[0] # Reuse Green for Blue
    
    rgb_stack = np.stack([r, g, b], axis=-1)
    
    # Save High-Quality Preview
    output_png_path = os.path.join(output_dir, "reconstruction_preview.png")
    img = Image.fromarray(rgb_stack)
    img.save(output_png_path, "PNG")
    
    # Save Thumbnail (preserving aspect ratio with max dimension 256)
    thumb_path = os.path.join(output_dir, "reconstruction_thumbnail.png")
    img.thumbnail((256, 256), Image.Resampling.LANCZOS)
    img.save(thumb_path, "PNG")
    
    # Save Side-by-Side Before vs After Comparison
    # "Before" uses original_bands_uint8 mapping
    r_orig = original_bands_uint8[1]
    g_orig = original_bands_uint8[0]
    b_orig = original_bands_uint8[0]
    rgb_orig = np.stack([r_orig, g_orig, b_orig], axis=-1)
    
    h, w, c = rgb_stack.shape
    # 5-pixel wide white separator line
    separator = np.zeros((h, 5, 3), dtype=np.uint8) + 255
    
    comparison_stack = np.concatenate([rgb_orig, separator, rgb_stack], axis=1)
    comparison_path = os.path.join(output_dir, "before_after_comparison.png")
    comp_img = Image.fromarray(comparison_stack)
    comp_img.save(comparison_path, "PNG")
    
    return output_png_path
