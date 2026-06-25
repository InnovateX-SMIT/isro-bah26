import json
import numpy as np
from typing import Dict, Any, List

def map_score_to_grade(score: float) -> str:
    """Helper mapping numeric score to letter grade."""
    if score >= 95.0: return "A+"
    elif score >= 90.0: return "A"
    elif score >= 80.0: return "B"
    elif score >= 70.0: return "C"
    elif score >= 60.0: return "D"
    else: return "F"

def generate_headline_summary(reliability_tier: str, dataset_reliability_score: float, region_tier_counts: Dict[str, int]) -> str:
    """
    Generates a deterministic plain-English headline summary sentence.
    No LLM calls. Vectorized/tally counts computed before calling this.
    """
    total_regions = sum(region_tier_counts.values())
    low_or_very_low = region_tier_counts.get("Low", 0) + region_tier_counts.get("Very Low", 0)
    
    if total_regions == 0:
        return (
            f"Dataset shows {reliability_tier} overall reliability (score {dataset_reliability_score:.1f}/100) "
            f"with no cloud regions detected."
        )
    elif total_regions == 1:
        # Retrieve the single tier
        single_tier = "Very Low"
        for t, count in region_tier_counts.items():
            if count == 1:
                single_tier = t
                break
        return (
            f"Dataset shows {reliability_tier} overall reliability (score {dataset_reliability_score:.1f}/100) "
            f"with the single detected cloud region falling into the {single_tier} confidence tier."
        )
    else:
        return (
            f"Dataset shows {reliability_tier} overall reliability (score {dataset_reliability_score:.1f}/100) "
            f"with {low_or_very_low} of {total_regions} cloud regions falling into the Low or Very Low confidence tier."
        )

def build_full_report(
    confidence_data: Dict[str, Any],
    reliability_data: Dict[str, Any],
    heatmap_data: Dict[str, Any],
    timestamp_utc: str
) -> Dict[str, Any]:
    """
    Creates the comprehensive machine-readable report containing all details under distinct sections.
    """
    return {
        "report_metadata": {
            "timestamp_utc": timestamp_utc,
            "report_version": "1.0.0"
        },
        "confidence": {
            "confidence_id": confidence_data.get("confidence_id"),
            "mean_confidence_score": confidence_data.get("mean_confidence_score"),
            "low_confidence_area_percent": confidence_data.get("low_confidence_area_percent"),
            "confidence_status": confidence_data.get("confidence_status"),
            "inference_basis": confidence_data.get("inference_basis"),
            "confidence_map_path": confidence_data.get("confidence_map_path"),
            "confidence_preview_path": confidence_data.get("confidence_preview_path"),
            "created_at": str(confidence_data.get("created_at"))
        },
        "reliability": {
            "reliability_id": reliability_data.get("reliability_id"),
            "dataset_reliability_score": reliability_data.get("dataset_reliability_score"),
            "dataset_reliability_tier": reliability_data.get("dataset_reliability_tier"),
            "region_reliability": reliability_data.get("region_reliability"),
            "reconstruction_reliability_score": reliability_data.get("reconstruction_reliability_score"),
            "scoring_basis": reliability_data.get("scoring_basis"),
            "scoring_method": reliability_data.get("scoring_method"),
            "created_at": str(reliability_data.get("created_at"))
        },
        "heatmap": {
            "heatmap_id": heatmap_data.get("heatmap_id"),
            "heatmap_status": heatmap_data.get("heatmap_status"),
            "confidence_overlay_path": heatmap_data.get("confidence_overlay_path"),
            "reliability_map_path": heatmap_data.get("reliability_map_path"),
            "legend": heatmap_data.get("legend"),
            "basis": heatmap_data.get("basis"),
            "heatmap_method": heatmap_data.get("heatmap_method"),
            "created_at": str(heatmap_data.get("created_at"))
        }
    }

def build_summary(full_report: Dict[str, Any], headline_summary: str) -> Dict[str, Any]:
    """
    Creates a condensed summary report.
    """
    reliability = full_report["reliability"]
    confidence = full_report["confidence"]
    
    # Calculate counts using a single vectorized approach or fast aggregation
    region_list = reliability.get("region_reliability") or []
    total_regions = len(region_list)
    
    tier_counts = {"High": 0, "Moderate": 0, "Low": 0, "Very Low": 0}
    if total_regions > 0:
        tiers = [r.get("reliability_tier") for r in region_list if r.get("reliability_tier")]
        # Fast numpy aggregation
        unique, counts = np.unique(tiers, return_counts=True)
        for u, c in zip(unique, counts):
            if u in tier_counts:
                tier_counts[u] = int(c)

    return {
        "dataset_id": full_report["confidence"].get("confidence_id"), # Or generic dataset ref
        "dataset_reliability_score": reliability.get("dataset_reliability_score"),
        "dataset_reliability_tier": reliability.get("dataset_reliability_tier"),
        "mean_confidence_score": confidence.get("mean_confidence_score"),
        "low_confidence_area_percent": confidence.get("low_confidence_area_percent"),
        "total_cloud_regions": total_regions,
        "region_tier_counts": tier_counts,
        "headline_summary": headline_summary,
        "timestamp_utc": full_report["report_metadata"]["timestamp_utc"]
    }

def build_scorecard(full_report: Dict[str, Any]) -> Dict[str, Any]:
    """
    Creates a flat scorecard dict mapping numeric scores and letter grades.
    """
    reliability = full_report["reliability"]
    confidence = full_report["confidence"]
    
    mean_conf = confidence.get("mean_confidence_score") or 0.0
    low_conf_area = confidence.get("low_confidence_area_percent") or 0.0
    ds_reliability = reliability.get("dataset_reliability_score") or 0.0
    recon_reliability = reliability.get("reconstruction_reliability_score") or 0.0

    return {
        "scores": {
            "mean_confidence_score": mean_conf,
            "low_confidence_area_percent": low_conf_area,
            "dataset_reliability_score": ds_reliability,
            "reconstruction_reliability_score": recon_reliability
        },
        "grades": {
            "Mean Confidence": map_score_to_grade(mean_conf),
            "Dataset Reliability": map_score_to_grade(ds_reliability),
            "Reconstruction Reliability": map_score_to_grade(recon_reliability)
        },
        "overall_grade": map_score_to_grade(ds_reliability),
        "timestamp_utc": full_report["report_metadata"]["timestamp_utc"]
    }
