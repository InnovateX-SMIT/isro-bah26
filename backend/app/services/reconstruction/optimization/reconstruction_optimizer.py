import os
import time
import json
import cv2
import numpy as np
import rasterio
from typing import Dict, Any, List
from PIL import Image

from app.services.reconstruction.optimization.boundary_refinement import refine_boundaries
from app.services.reconstruction.optimization.edge_preservation import preserve_edges
from app.services.reconstruction.optimization.spectral_consistency import ensure_spectral_consistency

def calculate_boundary_discontinuity(bands: List[np.ndarray], mask: np.ndarray) -> float:
    """
    Measures transition seam discontinuities along the mask boundary.
    Computes the mean Sobel gradient magnitude on boundary pixels.
    Lower values indicate smoother spatial transitions.
    """
    binary_mask = (mask > 0).astype(np.uint8) * 255
    kernel = np.ones((3, 3), np.uint8)
    
    # Boundary is defined as the border region of the binary mask
    dilated = cv2.dilate(binary_mask, kernel, iterations=1)
    eroded = cv2.erode(binary_mask, kernel, iterations=1)
    boundary = (dilated > 0) & (eroded == 0)
    
    if np.sum(boundary) == 0:
        return 0.0
        
    grad_magnitudes = []
    for band in bands:
        # Scale to uint8 for robust gradient calculation
        b_min, b_max = band.min(), band.max()
        if b_max > b_min:
            norm = ((band - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
        else:
            norm = np.zeros_like(band, dtype=np.uint8)
            
        sobelx = cv2.Sobel(norm.astype(np.float32), cv2.CV_32F, 1, 0, ksize=3)
        sobely = cv2.Sobel(norm.astype(np.float32), cv2.CV_32F, 0, 1, ksize=3)
        magnitude = np.sqrt(sobelx**2 + sobely**2)
        grad_magnitudes.append(float(np.mean(magnitude[boundary])))
        
    return float(np.mean(grad_magnitudes))

def optimize_reconstruction_pipeline(
    reconstructed_image_path: str,
    mask_path: str,
    dataset_path: str,
    output_dir: str
) -> Dict[str, Any]:
    """
    Executes Phase 7D Reconstruction Optimization:
    1. Load reconstruction mask & baseline reconstructed image.
    2. Discover and resample raw original bands for seam feathering reference.
    3. Apply Boundary Refinement (feathering).
    4. Apply Edge Preservation (guided filter).
    5. Apply Spectral Consistency (radiometric stats matching).
    6. Generate optimized GeoTIFF, visual PNG preview, and JSON report.
    """
    start_time = time.perf_counter()
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Read binary mask
    with rasterio.open(mask_path) as src_mask:
        mask_data = src_mask.read(1)
        mask_height, mask_width = src_mask.height, src_mask.width
        
    # 2. Read baseline reconstructed image bands
    reconstructed_bands = []
    with rasterio.open(reconstructed_image_path) as src_rec:
        rec_profile = src_rec.profile.copy()
        for i in range(1, src_rec.count + 1):
            reconstructed_bands.append(src_rec.read(i))
            
    # 3. Discover original band files
    band2_path, band3_path, band4_path = None, None, None
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
        raise ValueError("Missing original band files BAND2.tif, BAND3.tif, BAND4.tif in dataset path.")
        
    # 4. Load original bands resampled to mask shape
    original_bands = []
    for bp in (band2_path, band3_path, band4_path):
        with rasterio.open(bp) as src_band:
            band_data = src_band.read(
                1,
                out_shape=(mask_height, mask_width),
                resampling=rasterio.enums.Resampling.bilinear
            )
            original_bands.append(band_data)
            
    # Compute boundary discontinuity metric BEFORE optimization
    discontinuity_before = calculate_boundary_discontinuity(reconstructed_bands, mask_data)
    
    # --- PIPELINE STEP 1: Boundary Refinement (Feathering) ---
    refined_bands = refine_boundaries(
        reconstructed_bands=reconstructed_bands,
        mask=mask_data,
        kernel_size=15
    )
    
    # --- PIPELINE STEP 2: Edge Preservation (Guided Filter) ---
    edge_preserved_bands = preserve_edges(
        bands=refined_bands,
        mask=mask_data,
        radius=4,
        eps=0.01
    )
    
    # --- PIPELINE STEP 3: Spectral Consistency (Mean/Std Matching) ---
    spectrally_consistent_bands = ensure_spectral_consistency(
        reconstructed_bands=edge_preserved_bands,
        original_bands=original_bands,
        mask=mask_data
    )
    
    # --- PIPELINE STEP 4: Final Seam Blending ---
    optimized_bands = refine_boundaries(
        reconstructed_bands=spectrally_consistent_bands,
        mask=mask_data,
        kernel_size=15
    )
    
    # Compute boundary discontinuity metric AFTER optimization
    discontinuity_after = calculate_boundary_discontinuity(optimized_bands, mask_data)
    
    # Calculate improvement ratio
    improvement_percent = 0.0
    if discontinuity_before > 0:
        improvement_percent = max(0.0, ((discontinuity_before - discontinuity_after) / discontinuity_before) * 100.0)
        
    # 5. Save optimized georeferenced GeoTIFF
    optimized_tif_path = os.path.join(output_dir, "optimized_reconstruction.tif")
    out_profile = rec_profile.copy()
    out_profile.update(compress='lzw')
    with rasterio.open(optimized_tif_path, "w", **out_profile) as dst:
        for i in range(len(optimized_bands)):
            dst.write(optimized_bands[i], i + 1)
            
    # 6. Generate visual preview PNG (R=Band 3, G=Band 2, B=Band 2)
    # Convert optimized bands to uint8
    optimized_uint8 = []
    for b in optimized_bands:
        b_min, b_max = b.min(), b.max()
        if b_max > b_min:
            b_u8 = ((b - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
        else:
            b_u8 = np.zeros_like(b, dtype=np.uint8)
        optimized_uint8.append(b_u8)
        
    r_channel = optimized_uint8[1] # Band 3
    g_channel = optimized_uint8[0] # Band 2
    b_channel = optimized_uint8[0] # Reuse Band 2
    
    rgb_preview = np.stack([r_channel, g_channel, b_channel], axis=-1)
    optimized_png_path = os.path.join(output_dir, "optimized_preview.png")
    Image.fromarray(rgb_preview).save(optimized_png_path, "PNG")
    
    elapsed_time_ms = int((time.perf_counter() - start_time) * 1000)
    
    # 7. Write optimization report JSON
    report_data = {
        "optimization_methods": [
            "boundary_feathering_linear",
            "edge_preserving_guided_filter",
            "spectral_radiometric_statistics_matching"
        ],
        "execution_time_ms": elapsed_time_ms,
        "metrics": {
            "boundary_discontinuity_before": discontinuity_before,
            "boundary_discontinuity_after": discontinuity_after,
            "improvement_percent": improvement_percent
        },
        "metadata": {
            "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "guided_filter_radius": 4,
            "guided_filter_epsilon": 0.01,
            "boundary_kernel_size": 15
        }
    }
    
    report_json_path = os.path.join(output_dir, "optimization_report.json")
    with open(report_json_path, "w") as f:
        json.dump(report_data, f, indent=4)
        
    return {
        "optimized_tif_path": optimized_tif_path,
        "optimized_png_path": optimized_png_path,
        "report_json_path": report_json_path,
        "execution_time_ms": elapsed_time_ms,
        "metrics": report_data["metrics"],
        "report": report_data
    }
