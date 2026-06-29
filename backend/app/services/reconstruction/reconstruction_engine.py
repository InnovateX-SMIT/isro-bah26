import os
import time
import logging
import cv2
import numpy as np
import rasterio
import concurrent.futures
from typing import Dict, Any, List, Optional

from app.services.reconstruction.temporal_guidance import get_temporal_guidance, blend_temporal_guidance
from app.services.reconstruction.reconstruction_preview import generate_reconstruction_preview
from app.services.reconstruction.model import get_reconstruction_model

logger = logging.getLogger("reconstruction_engine")

def load_and_resample_band(bp: str, target_height: int, target_width: int) -> np.ndarray:
    """Loads a single band TIFF and resamples it in a thread-safe manner."""
    with rasterio.open(bp) as src_band:
        return src_band.read(
            1,
            out_shape=(target_height, target_width),
            resampling=rasterio.enums.Resampling.bilinear
        )

def execute_reconstruction(
    dataset_path: str,
    mask_path: str,
    output_dir: str,
    strategy: str = "DEFAULT",
    temporal_relevance: float = 85.0,
    provider_name: str = "GoogleEarthEngine",
    historical_reference_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the improved reconstruction engine pipeline (Phase 12E):
    1. Loads LISS-IV bands B2, B3, B4 in parallel using a ThreadPoolExecutor.
    2. Loads the binary reconstruction mask.
    3. Normalizes bands and sets up inputs.
    4. Dynamically compiles/exports the spatial-temporal fusion U-Net model (ONNX/TorchScript).
    5. Performs overlapping tile-based reconstruction (tile_size=512, padding=32) for memory efficiency.
    6. Seamlessly blends temporal guidance for classical fallback tiles.
    7. Restores original radiometry, writes georeferenced output GeoTIFF, and creates preview PNG.
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

    # 3. Load bands in parallel resampled to match mask shape
    logger.info("Starting parallel band loading and resampling.")
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(load_and_resample_band, bp, mask_height, mask_width)
            for bp in (band2_path, band3_path, band4_path)
        ]
        bands = [f.result() for f in futures]

    # Load and resample historical reference bands if provided
    historical_bands_uint8 = None
    if historical_reference_path:
        if os.path.exists(historical_reference_path):
            try:
                with rasterio.open(historical_reference_path) as src_hist:
                    hist_count = src_hist.count
                    if hist_count != 3:
                        logger.warning(f"Historical reference band count differs from 3 (found {hist_count}).")
                    
                    hist_bands = []
                    for b_idx in range(1, hist_count + 1):
                        band_data = src_hist.read(
                            b_idx,
                            out_shape=(mask_height, mask_width),
                            resampling=rasterio.enums.Resampling.bilinear
                        )
                        hist_bands.append(band_data)
                    
                    loaded_bands_u8 = []
                    for b in hist_bands:
                        b_min = float(b.min())
                        b_max = float(b.max())
                        if b_max > b_min:
                            b_u8 = ((b - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
                        else:
                            b_u8 = np.zeros_like(b, dtype=np.uint8)
                        loaded_bands_u8.append(b_u8)
                    
                    if len(loaded_bands_u8) >= 3:
                        historical_bands_uint8 = loaded_bands_u8[:3]
                    elif len(loaded_bands_u8) == 1:
                        historical_bands_uint8 = [loaded_bands_u8[0]] * 3
                    elif len(loaded_bands_u8) == 2:
                        historical_bands_uint8 = [loaded_bands_u8[0], loaded_bands_u8[1], loaded_bands_u8[1]]
                    else:
                        logger.warning("Historical reference has 0 bands.")
            except Exception as e:
                logger.warning(f"Could not load/resample historical reference file {historical_reference_path}: {e}")
        else:
            logger.warning(f"Historical reference file does not exist on disk: {historical_reference_path}")

    # 4. Normalize bands to uint8 range for OpenCV and [0, 1] for U-Net
    orig_mins = []
    orig_maxs = []
    bands_uint8 = []
    bands_normalized = []
    for b in bands:
        b_min = float(b.min())
        b_max = float(b.max())
        orig_mins.append(b_min)
        orig_maxs.append(b_max)
        
        # [0, 255] uint8 normalization
        if b_max > b_min:
            b_u8 = ((b - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
            b_norm = (b.astype(np.float32) - b_min) / (b_max - b_min)
        else:
            b_u8 = np.zeros_like(b, dtype=np.uint8)
            b_norm = np.zeros_like(b, dtype=np.float32)
        bands_uint8.append(b_u8)
        bands_normalized.append(b_norm)

    # Create binary inpainting mask (OpenCV expects 8-bit single channel, 255 for pixels to fill)
    inpaint_mask = (mask_data > 0).astype(np.uint8) * 255

    # Retrieve Temporal Guidance
    guidance_bands_uint8 = get_temporal_guidance(
        bands_uint8,
        inpaint_mask,
        temporal_relevance,
        historical_bands_uint8=historical_bands_uint8
    )
    
    guidance_bands_normalized = []
    for i in range(3):
        g_min = float(guidance_bands_uint8[i].min())
        g_max = float(guidance_bands_uint8[i].max())
        if g_max > g_min:
            g_norm = (guidance_bands_uint8[i].astype(np.float32) - g_min) / (g_max - g_min)
        else:
            g_norm = np.zeros_like(guidance_bands_uint8[i], dtype=np.float32)
        guidance_bands_normalized.append(g_norm)

    # 5. Load or Compile U-Net Reconstruction Model
    model_type = None
    model = None
    if strategy and strategy.upper() not in ("TELEA", "NS"):
        model_type, model = get_reconstruction_model(output_dir, bands_normalized, mask_data, guidance_bands_normalized)
    
    method_name = "cv2.INPAINT_TELEA"
    inpaint_flags = cv2.INPAINT_TELEA
    if strategy and "NS" in strategy.upper():
        inpaint_flags = cv2.INPAINT_NS
        method_name = "cv2.INPAINT_NS"

    if model:
        method_name = f"U-Net Autoencoder ({model_type})"

    # 6. Execute overlapping tile-based reconstruction
    tile_size = 512
    padding = 32
    H, W = mask_height, mask_width
    
    # Analytics tracking
    inference_time_ms = 0
    total_tiles = 0
    cloudy_tiles = 0
    clean_tiles = 0
    
    # Accumulators for OLA tile blending
    accumulators = [np.zeros((H + 2 * padding, W + 2 * padding), dtype=np.float32) for _ in range(3)]
    weight_accumulator = np.zeros((H + 2 * padding, W + 2 * padding), dtype=np.float32)
    
    # Pad images to handle boundary tiles seamlessly
    padded_bands_u8 = [np.pad(b, padding, mode='reflect') for b in bands_uint8]
    padded_mask = np.pad(inpaint_mask, padding, mode='constant', constant_values=0)
    
    if model:
        padded_bands_norm = [np.pad(b, padding, mode='reflect') for b in bands_normalized]
        padded_guidance_norm = [np.pad(g, padding, mode='reflect') for g in guidance_bands_normalized]
    
    logger.info(f"Starting OLA tile-based reconstruction with tile size {tile_size} and padding {padding}.")
    
    for y in range(0, H, tile_size):
        for x in range(0, W, tile_size):
            total_tiles += 1
            y_start_pad = y
            y_end_pad = min(y + tile_size + 2 * padding, H + 2 * padding)
            x_start_pad = x
            x_end_pad = min(x + tile_size + 2 * padding, W + 2 * padding)
            
            tile_mask = padded_mask[y_start_pad:y_end_pad, x_start_pad:x_end_pad]
            tile_h = y_end_pad - y_start_pad
            tile_w = x_end_pad - x_start_pad
            
            tile_reconstructed_u8 = []
            
            # Skip computation entirely if tile has no clouds
            if not np.any(tile_mask > 0):
                clean_tiles += 1
                tile_reconstructed_u8 = [
                    padded_bands_u8[i][y_start_pad:y_end_pad, x_start_pad:x_end_pad]
                    for i in range(3)
                ]
            else:
                cloudy_tiles += 1
                t0 = time.perf_counter()
                if model:
                    try:
                        # Form 7-channel input for model: masked bands (3) + mask (1) + temporal guidance (3)
                        tile_bands_norm = []
                        for i in range(3):
                            t_b = padded_bands_norm[i][y_start_pad:y_end_pad, x_start_pad:x_end_pad].copy()
                            t_b[tile_mask > 0] = 0.0
                            tile_bands_norm.append(t_b)
                            
                        tile_guidance_norm = [
                            padded_guidance_norm[i][y_start_pad:y_end_pad, x_start_pad:x_end_pad]
                            for i in range(3)
                        ]
                        
                        t_mask_float = (tile_mask > 0).astype(np.float32)[np.newaxis, ...]
                        input_p = np.concatenate([
                            np.stack(tile_bands_norm, axis=0),
                            t_mask_float,
                            np.stack(tile_guidance_norm, axis=0)
                        ], axis=0)
                        input_tensor = input_p[np.newaxis, ...] # Add batch dimension [1, 7, H, W]
                        
                        if model_type == "ONNX":
                            outputs = model.run(None, {'input': input_tensor.astype(np.float32)})
                            out_patch = outputs[0][0]
                        else:
                            import torch
                            with torch.no_grad():
                                t_in = torch.from_numpy(input_tensor).float()
                                t_out = model(t_in)
                                out_patch = t_out.squeeze(0).cpu().numpy()
                                
                        for i in range(3):
                            p_u8 = (np.clip(out_patch[i], 0.0, 1.0) * 255.0).astype(np.uint8)
                            tile_reconstructed_u8.append(p_u8)
                    except Exception as e:
                        logger.error(f"Error during tile U-Net inference: {e}. Falling back to cv2.inpaint.")
                        tile_reconstructed_u8 = []
                        
                if not tile_reconstructed_u8:
                    # Fallback to classical inpainting on tile
                    for i in range(3):
                        t_b_u8 = padded_bands_u8[i][y_start_pad:y_end_pad, x_start_pad:x_end_pad].copy()
                        inp_tile = cv2.inpaint(t_b_u8, tile_mask, inpaintRadius=5, flags=inpaint_flags)
                        tile_reconstructed_u8.append(inp_tile)
                
                inference_time_ms += int((time.perf_counter() - t0) * 1000)
            
            # Construct overlapping linear blend weight map for this tile
            w_h = np.ones(tile_h, dtype=np.float32)
            w_w = np.ones(tile_w, dtype=np.float32)
            for i in range(padding):
                val = float(i) / padding
                if y_start_pad > 0:
                    w_h[i] = min(w_h[i], val)
                if y_end_pad < H + 2 * padding:
                    w_h[tile_h - 1 - i] = min(w_h[tile_h - 1 - i], val)
                if x_start_pad > 0:
                    w_w[i] = min(w_w[i], val)
                if x_end_pad < W + 2 * padding:
                    w_w[tile_w - 1 - i] = min(w_w[tile_w - 1 - i], val)
            
            W_tile = np.outer(w_h, w_w)
            
            # Accumulate tile results and weight map
            for i in range(3):
                accumulators[i][y_start_pad:y_end_pad, x_start_pad:x_end_pad] += tile_reconstructed_u8[i].astype(np.float32) * W_tile
            weight_accumulator[y_start_pad:y_end_pad, x_start_pad:x_end_pad] += W_tile

    # Normalize accumulator values and crop padding back to (H, W)
    reconstructed_bands_uint8 = []
    for i in range(3):
        recon_padded = accumulators[i] / np.maximum(weight_accumulator, 1e-5)
        recon_cropped = recon_padded[padding:padding+H, padding:padding+W]
        reconstructed_bands_uint8.append(np.clip(recon_cropped, 0.0, 255.0).astype(np.uint8))

    # 7. Blend Temporal Guidance (Only for fallback tiles, model already fused guidance)
    final_bands_uint8 = []
    for i in range(3):
        rec_b = reconstructed_bands_uint8[i]
        guidance = guidance_bands_uint8[i]
        if model is not None:
            # Model already has guidance fused natively
            final_bands_uint8.append(rec_b)
        else:
            blended = blend_temporal_guidance(rec_b, guidance, inpaint_mask, temporal_relevance)
            final_bands_uint8.append(blended)

    # 8. Convert back to original band ranges to preserve radiometry
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

    # 9. Write 3-band output raster preserving metadata
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

    # 10. Generate visual preview PNG
    output_png_path = generate_reconstruction_preview(final_bands_uint8, bands_uint8, output_dir)

    elapsed_time_ms = int((time.perf_counter() - start_time) * 1000)
    logger.info(f"Reconstruction completed using {method_name} in {elapsed_time_ms} ms.")

    # 11. Compile and write Reconstruction Technical Analytics
    try:
        import psutil
        process = psutil.Process(os.getpid())
        memory_usage_mb = float(process.memory_info().rss / (1024 * 1024))
    except Exception:
        # Fallback approximation based on float32 image sizes
        memory_usage_mb = float((H * W * 3 * 4) / (1024 * 1024))

    cloud_cov_pct = round(float(np.sum(inpaint_mask > 0) / inpaint_mask.size * 100.0), 2)
    analytics = {
        "cloud_coverage_percent": cloud_cov_pct,
        "reconstructed_area_percent": cloud_cov_pct,
        "processing_duration_ms": elapsed_time_ms,
        "inference_duration_ms": inference_time_ms,
        "memory_usage_mb": round(memory_usage_mb, 2),
        "tile_processing_statistics": {
            "total_tiles": total_tiles,
            "cloudy_tiles": cloudy_tiles,
            "clean_tiles": clean_tiles,
            "tile_size": tile_size,
            "padding": padding
        },
        "reconstruction_success": True
    }
    
    analytics_path = os.path.join(output_dir, "reconstruction_analytics.json")
    try:
        import json
        with open(analytics_path, "w") as f:
            json.dump(analytics, f, indent=4)
        logger.info(f"Saved reconstruction analytics to {analytics_path}")
    except Exception as e:
        logger.warning(f"Could not save reconstruction analytics: {e}")

    return {
        "output_tif_path": output_tif_path,
        "preview_png_path": output_png_path,
        "method_used": method_name,
        "execution_time_ms": elapsed_time_ms,
        "strategy": strategy,
        "temporal_relevance": temporal_relevance,
        "provider_name": provider_name,
        "historical_reference_path": historical_reference_path
    }

