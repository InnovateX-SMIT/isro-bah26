import os
import numpy as np
from PIL import Image
from typing import List

def generate_reconstruction_preview(
    final_bands_uint8: List[np.ndarray],
    output_dir: str
) -> str:
    """
    Generates a 3-channel visual composite preview PNG (reconstruction_preview.png)
    using the final uint8 reconstructed bands.
    Maps Band 3 (Red) to R, Band 2 (Green) to G, and Band 2 to B for natural look.
    """
    # LISS-IV band mappings: Band 2 (Green), Band 3 (Red), Band 4 (NIR)
    # Natural Visual RGB mapping: R=Band 3 (Red), G=Band 2 (Green), B=Band 2 (Green)
    r = final_bands_uint8[1] # Band 3
    g = final_bands_uint8[0] # Band 2
    b = final_bands_uint8[0] # Reuse Green for Blue
    
    rgb_stack = np.stack([r, g, b], axis=-1)
    
    output_png_path = os.path.join(output_dir, "reconstruction_preview.png")
    img = Image.fromarray(rgb_stack)
    img.save(output_png_path, "PNG")
    
    return output_png_path
