import os
import json
import time
from typing import Dict, Any, List

def map_score_to_grade(score: float) -> str:
    """Helper mapping numeric score to letter grade."""
    if score >= 95.0: return "A+"
    elif score >= 90.0: return "A"
    elif score >= 80.0: return "B"
    elif score >= 70.0: return "C"
    elif score >= 60.0: return "D"
    else: return "F"

def generate_and_save_reports(
    output_dir: str,
    dataset_id: str,
    metrics: Dict[str, float],
    dataset_info: Dict[str, Any],
    cloud_info: Dict[str, Any],
    temporal_info: Dict[str, Any],
    reconstruction_info: Dict[str, Any],
    optimization_info: Dict[str, Any],
    reconstruction_analytics: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Creates and saves the 4 required JSON artifacts under datasets/reconstruction_evaluations/{dataset_id}/.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp_utc = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Resolve Strengths, Weaknesses, and Recommendations dynamically
    strengths = []
    weaknesses = []
    recommendations = []
    
    if metrics["spatial_consistency_score"] >= 80.0:
        strengths.append("Exceptional seam correction and boundary transition smoothing (spatial boundary refined > 80%).")
    else:
        weaknesses.append("Moderate border seam discontinuity detected. Boundary feathering transition can be improved.")
        recommendations.append("Increase boundary blending kernel size to smooth out local border gradients.")
        
    if metrics["temporal_agreement_score"] >= 80.0:
        strengths.append("High correlation with multi-temporal edge-preserving GEE historical reference stacks.")
    else:
        weaknesses.append("Lower agreement with historical references, possibly due to seasonal variations or high cloud density.")
        recommendations.append("Source additional historical stacks with narrower acquisition windows (<15 days offset).")
        
    if metrics["structural_preservation_score"] >= 85.0:
        strengths.append("Excellent preservation of linear edge structures (roads, fields, rivers) via Guided Filtering.")
    else:
        weaknesses.append("Reconstructed regions show slight blurring of high-frequency structures.")
        recommendations.append("Reduce the Guided Filter regularizer epsilon to enforce sharper edge preservation.")
        
    if metrics["artifact_score"] >= 80.0:
        strengths.append("Texture matching matches surrounding clean backgrounds closely with no noise artifacts.")
    else:
        weaknesses.append("Minor blurring or texture mismatch detected inside the reconstructed region.")
        
    if not strengths:
        strengths.append("Baseline classical computer vision recovery completes successfully.")
        
    overall_score = metrics["overall_score"]
    if overall_score >= 90.0:
        assessment = "EXCELLENT"
    elif overall_score >= 80.0:
        assessment = "GOOD"
    elif overall_score >= 70.0:
        assessment = "FAIR"
    else:
        assessment = "POOR"
        
    summary_text = (
        f"Reconstruction evaluation complete for dataset {dataset_id}. "
        f"Achieved an overall quality score of {overall_score}/100 ({assessment} assessment). "
        f"Completeness is at {metrics['completeness_score']}% with a temporal consistency score of {metrics['temporal_agreement_score']}% "
        f"and edge preservation score of {metrics['structural_preservation_score']}%."
    )
    
    # 1. evaluation_report.json (Comprehensive Machine-Readable Report)
    report_data = {
        "dataset_information": dataset_info,
        "cloud_information": cloud_info,
        "temporal_information": temporal_info,
        "reconstruction_information": reconstruction_info,
        "optimization_information": optimization_info,
        "reconstruction_analytics": reconstruction_analytics or {},
        "evaluation_metrics": metrics,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "overall_assessment": assessment,
        "timestamp_utc": timestamp_utc
    }
    with open(os.path.join(output_dir, "evaluation_report.json"), "w") as f:
        json.dump(report_data, f, indent=4)
        
    # 2. evaluation_summary.json (Brief Briefing Summary)
    summary_data = {
        "dataset_id": dataset_id,
        "overall_score": overall_score,
        "summary_text": summary_text,
        "timestamp_utc": timestamp_utc
    }
    with open(os.path.join(output_dir, "evaluation_summary.json"), "w") as f:
        json.dump(summary_data, f, indent=4)
        
    # 3. quality_metrics.json (Flat Metric Dictionary)
    metrics_data = {
        "reconstruction_coverage": metrics["reconstruction_coverage"],
        "completeness_score": metrics["completeness_score"],
        "boundary_quality_score": metrics["boundary_quality_score"],
        "spatial_consistency_score": metrics["spatial_consistency_score"],
        "temporal_agreement_score": metrics["temporal_agreement_score"],
        "structural_preservation_score": metrics["structural_preservation_score"],
        "artifact_score": metrics["artifact_score"],
        "overall_score": overall_score,
        "psnr": metrics.get("psnr", 0.0),
        "ssim": metrics.get("ssim", 0.0),
        "mae": metrics.get("mae", 0.0),
        "rmse": metrics.get("rmse", 0.0),
        "sam_degrees": metrics.get("sam_degrees", 0.0)
    }
    with open(os.path.join(output_dir, "quality_metrics.json"), "w") as f:
        json.dump(metrics_data, f, indent=4)
        
    # 4. reconstruction_scorecard.json (Standard Letter Grades for Hackathon demo)
    scorecard_data = {
        "dataset_id": dataset_id,
        "timestamp_utc": timestamp_utc,
        "grades": {
            "Coverage": map_score_to_grade(metrics["reconstruction_coverage"]),
            "Completeness": map_score_to_grade(metrics["completeness_score"]),
            "Spatial Consistency": map_score_to_grade(metrics["spatial_consistency_score"]),
            "Boundary Quality": map_score_to_grade(metrics["boundary_quality_score"]),
            "Temporal Agreement": map_score_to_grade(metrics["temporal_agreement_score"]),
            "Structural Edge Preservation": map_score_to_grade(metrics["structural_preservation_score"]),
            "Artifact Level (Cleanliness)": map_score_to_grade(metrics["artifact_score"])
        },
        "overall_grade": map_score_to_grade(overall_score)
    }
    with open(os.path.join(output_dir, "reconstruction_scorecard.json"), "w") as f:
        json.dump(scorecard_data, f, indent=4)
        
    return {
        "report": report_data,
        "summary": summary_data,
        "metrics": metrics_data,
        "scorecard": scorecard_data
    }
