import os
import time
import rasterio
import numpy as np
from typing import Dict, Any, List

from app.services.reconstruction.evaluation.quality_metrics import (
    calculate_coverage_and_completeness,
    calculate_boundary_scores,
    calculate_artifact_score
)
from app.services.reconstruction.evaluation.temporal_consistency import calculate_temporal_consistency
from app.services.reconstruction.evaluation.structural_analysis import calculate_structural_preservation
from app.services.reconstruction.evaluation.evaluation_report import generate_and_save_reports

def execute_evaluation(
    optimized_image_path: str,
    reconstructed_image_path: str,
    mask_path: str,
    dataset_path: str,
    output_dir: str,
    dataset_id: str,
    temporal_relevance: float = 85.0,
    metadata_profile: Dict[str, Any] = None,
    geospatial_profile: Dict[str, Any] = None,
    temporal_profile: Dict[str, Any] = None,
    cloud_profile: Dict[str, Any] = None,
    reconstruction_run_strategy: str = "DEFAULT",
    optimization_method: str = "DEFAULT"
) -> Dict[str, Any]:
    """
    Executes the quantitative evaluation of the reconstructed and optimized GeoTIFF files:
    1. Reads mask, baseline reconstructed TIFF, optimized reconstruction TIFF, and original dataset bands.
    2. Invokes sub-calculators for Coverage, Completeness, Spatial Continuity, Edges, and Artifact levels.
    3. Aggregates a normalized overall score [0, 100].
    4. Saves evaluation report, scorecard, summary, and quality metrics as JSON artifacts.
    """
    # 1. Load mask
    with rasterio.open(mask_path) as src_mask:
        mask_data = src_mask.read(1)
        mask_height, mask_width = src_mask.height, src_mask.width
        
    # 2. Load reconstructed TIFF bands
    reconstructed_bands = []
    with rasterio.open(reconstructed_image_path) as src_rec:
        for i in range(1, src_rec.count + 1):
            reconstructed_bands.append(src_rec.read(i))
            
    # 3. Load optimized TIFF bands
    optimized_bands = []
    with rasterio.open(optimized_image_path) as src_opt:
        for i in range(1, src_opt.count + 1):
            optimized_bands.append(src_opt.read(i))
            
    # 4. Discover original dataset bands
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
        
    # Load resampled original bands for reference
    original_bands = []
    for bp in (band2_path, band3_path, band4_path):
        with rasterio.open(bp) as src_band:
            band_data = src_band.read(
                1,
                out_shape=(mask_height, mask_width),
                resampling=rasterio.enums.Resampling.bilinear
            )
            original_bands.append(band_data)
            
    # --- Execute Evaluation Pipeline ---
    
    # 1. Coverage & Completeness
    cov_comp = calculate_coverage_and_completeness(optimized_bands, mask_data)
    
    # 2. Boundary Scores (Quality & Spatial Consistency)
    boundary_scores = calculate_boundary_scores(optimized_bands, reconstructed_bands, mask_data)
    
    # 3. Temporal Consistency
    temporal_score = calculate_temporal_consistency(
        optimized_bands=optimized_bands,
        original_bands=original_bands,
        mask=mask_data,
        temporal_relevance=temporal_relevance
    )
    
    # 4. Structural Preservation (Edge Alignment)
    structural_score = calculate_structural_preservation(
        optimized_bands=optimized_bands,
        original_bands=original_bands,
        mask=mask_data
    )
    
    # 5. Artifact Score (Laplacian variance texture similarity)
    artifact_score = calculate_artifact_score(
        optimized_bands=optimized_bands,
        original_bands=original_bands,
        mask=mask_data
    )
    
    # Calculate Overall Score (weighted average of individual aspects)
    overall_score = (
        cov_comp["completeness"] * 0.05 +
        boundary_scores["spatial_consistency"] * 0.20 +
        boundary_scores["boundary_quality"] * 0.15 +
        temporal_score * 0.25 +
        structural_score * 0.20 +
        artifact_score * 0.15
    )
    overall_score = round(max(0.0, min(100.0, overall_score)), 2)
    
    metrics = {
        "reconstruction_coverage": cov_comp["coverage"],
        "completeness_score": cov_comp["completeness"],
        "boundary_quality_score": boundary_scores["boundary_quality"],
        "spatial_consistency_score": boundary_scores["spatial_consistency"],
        "temporal_agreement_score": temporal_score,
        "structural_preservation_score": structural_score,
        "artifact_score": artifact_score,
        "overall_score": overall_score
    }
    
    # Build report sections
    dataset_info = metadata_profile or {"info": "Not available"}
    if geospatial_profile:
        dataset_info.update(geospatial_profile)
        
    cloud_info = cloud_profile or {"cloud_status": "Not available"}
    temporal_info = temporal_profile or {"temporal_status": "Not available"}
    reconstruction_info = {
        "strategy": reconstruction_run_strategy,
        "input_reconstructed_raster": reconstructed_image_path,
        "input_mask_raster": mask_path
    }
    optimization_info = {
        "optimization_method": optimization_method,
        "input_optimized_raster": optimized_image_path
    }
    
    # Write JSON files to output directory
    reports = generate_and_save_reports(
        output_dir=output_dir,
        dataset_id=dataset_id,
        metrics=metrics,
        dataset_info=dataset_info,
        cloud_info=cloud_info,
        temporal_info=temporal_info,
        reconstruction_info=reconstruction_info,
        optimization_info=optimization_info
    )
    
    return reports
