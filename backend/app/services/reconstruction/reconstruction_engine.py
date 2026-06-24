import os
import time
import cv2
import numpy as np
import rasterio
from typing import Dict, Any
from app.services.reconstruction.temporal_guidance import get_temporal_guidance, blend_temporal_guidance
from app.services.reconstruction.reconstruction_preview import generate_reconstruction_preview

def execute_reconstruction(
    dataset_path: str,
    mask_path: str,
    output_dir: str,
    strategy: str = "DEFAULT",
    temporal_relevance: float = 85.0,
    provider_name: str = "GoogleEarthEngine"
) -> Dict[str, Any]:
    """
    Executes the reconstruction engine pipeline:
    1. Loads the source LISS-IV band TIFFs (B2, B3, B4).
    2. Loads the binary reconstruction mask.
    3. Resamples band TIFFs to match mask shape.
    4. Computes the inpainted bands using cv2.inpaint (TELEA or NS).
    5. Retrieves and blends temporal guidance to improve spectral consistency.
    6. Writes a 3-band georeferenced GeoTIFF (reconstructed_image.tif) preserving CRS/transform.
    7. Generates visual preview PNG.
    """
    start_time = time.perf_counter()
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Discover band files
    band2_path = None
    band3_path = None
    band4_path = None
    for root, _, files in os.walk(dataset_path):
        for file in files:
            file_lower = file.lower()
            full_path = os.path.join(root, file)
            if file_lower == "band2.tif":
                band2_path = full_path
            elif file_lower == "band3.tif":
                band3_path = full_path
            elif file_lower == "band4.tif":
                band4_path = full_path

    if not (band2_path and band3_path and band4_path):
        raise ValueError("Missing band files BAND2.tif, BAND3.tif, BAND4.tif in dataset path.")

    # 2. Read mask and profile
    with rasterio.open(mask_path) as src_mask:
        mask_data = src_mask.read(1)
        mask_profile = src_mask.profile.copy()
        mask_width = src_mask.width
        mask_height = src_mask.height

    # 3. Load bands resampled to match mask shape
    bands = []
    for bp in (band2_path, band3_path, band4_path):
        with rasterio.open(bp) as src_band:
            band_data = src_band.read(
                1,
                out_shape=(mask_height, mask_width),
                resampling=rasterio.enums.Resampling.bilinear
            )
            bands.append(band_data)

    # 4. Normalize bands to uint8 range for OpenCV inpainting
    orig_mins = []
    orig_maxs = []
    bands_uint8 = []
    for b in bands:
        b_min = float(b.min())
        b_max = float(b.max())
        orig_mins.append(b_min)
        orig_maxs.append(b_max)
        if b_max > b_min:
            b_u8 = ((b - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
        else:
            b_u8 = np.zeros_like(b, dtype=np.uint8)
        bands_uint8.append(b_u8)

    # Create binary inpainting mask (OpenCV expects 8-bit single channel, 255 for pixels to fill)
    inpaint_mask = (mask_data > 0).astype(np.uint8) * 255

    # 5. Execute inpainting flags based on strategy
    inpaint_flags = cv2.INPAINT_TELEA
    method_name = "cv2.INPAINT_TELEA"
    if strategy and "NS" in strategy.upper():
        inpaint_flags = cv2.INPAINT_NS
        method_name = "cv2.INPAINT_NS"

    inpainted_bands_uint8 = []
    for b_u8 in bands_uint8:
        inpainted = cv2.inpaint(b_u8, inpaint_mask, inpaintRadius=5, flags=inpaint_flags)
        inpainted_bands_uint8.append(inpainted)

    # 6. Retrieve and Blend Temporal Guidance
    guidance_bands = get_temporal_guidance(bands_uint8, inpaint_mask, temporal_relevance)
    
    final_bands_uint8 = []
    for i in range(3):
        inpainted = inpainted_bands_uint8[i]
        guidance = guidance_bands[i]
        blended = blend_temporal_guidance(inpainted, guidance, inpaint_mask, temporal_relevance)
        final_bands_uint8.append(blended)

    # 7. Convert back to original band ranges to preserve radiometry
    final_bands_restored = []
    for i in range(3):
        b_u8 = final_bands_uint8[i]
        b_min = orig_mins[i]
        b_max = orig_maxs[i]
        if b_max > b_min:
            restored = (b_u8.astype(np.float32) / 255.0 * (b_max - b_min) + b_min)
            final_bands_restored.append(restored.astype(bands[i].dtype))
        else:
            final_bands_restored.append(bands[i])

    # 8. Write 3-band output raster preserving metadata
    output_tif_path = os.path.join(output_dir, "reconstructed_image.tif")
    out_profile = mask_profile.copy()
    out_profile.update(
        dtype=bands[0].dtype,
        count=3,
        compress='lzw'
    )

    with rasterio.open(output_tif_path, "w", **out_profile) as dst:
        for i in range(3):
            dst.write(final_bands_restored[i], i + 1)

    # 9. Generate visual preview PNG
    output_png_path = generate_reconstruction_preview(final_bands_uint8, output_dir)

    elapsed_time_ms = int((time.perf_counter() - start_time) * 1000)

    return {
        "output_tif_path": output_tif_path,
        "preview_png_path": output_png_path,
        "method_used": method_name,
        "execution_time_ms": elapsed_time_ms,
        "strategy": strategy,
        "temporal_relevance": temporal_relevance,
        "provider_name": provider_name
    }
