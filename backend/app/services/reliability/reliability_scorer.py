import numpy as np
from skimage.measure import label
from typing import List, Dict, Any, Tuple

def assign_tier(score: float) -> str:
    """
    Shared helper for tier banding (High, Moderate, Low, Very Low).
    Single source of truth for all reliability tiers.
    """
    if score >= 75.0:
        return "High"
    elif score >= 50.0:
        return "Moderate"
    elif score >= 25.0:
        return "Low"
    else:
        return "Very Low"

def score_per_region(
    confidence_map: np.ndarray,
    reconstruction_mask: np.ndarray,
    region_details: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Calculates the mean confidence score and tier for each reconstructed cloud region.
    Uses skimage.measure.label on the reconstruction mask to identify pixels for each region ID.
    Optimized to group pixels in a single pass to handle thousands of regions in milliseconds.
    """
    # Run connected component labeling on the reconstruction mask
    labeled_mask = label(reconstruction_mask)
    
    # Fast grouping using numpy flat-indexing and sorting
    means = {}
    mask_indices = np.flatnonzero(labeled_mask)
    if len(mask_indices) > 0:
        labels = labeled_mask.flat[mask_indices]
        confidences = confidence_map.flat[mask_indices]
        
        sort_idx = np.argsort(labels)
        sorted_labels = labels[sort_idx]
        sorted_confidences = confidences[sort_idx]
        
        change_idx = np.flatnonzero(sorted_labels[1:] != sorted_labels[:-1]) + 1
        split_idx = np.concatenate(([0], change_idx, [len(sorted_labels)]))
        unique_labels = sorted_labels[split_idx[:-1]]
        
        for i in range(len(split_idx) - 1):
            start = split_idx[i]
            end = split_idx[i+1]
            lbl = int(unique_labels[i])
            means[lbl] = float(np.mean(sorted_confidences[start:end]))
            
    region_reliabilities = []
    for region in region_details:
        region_id = region["region_id"]
        area_px = region.get("pixel_count", region.get("area_px", 0))
        
        if region_id in means:
            mean_conf = means[region_id]
        else:
            # Fallback to bounding box slice if labeling ID is missing
            bbox = region.get("bounding_box")
            if bbox and len(bbox) == 4:
                min_y, min_x, max_y, max_x = bbox
                box_slice = confidence_map[min_y:max_y, min_x:max_x]
                # Filter out clean background pixels (which are 100.0)
                mask_slice = reconstruction_mask[min_y:max_y, min_x:max_x]
                rec_slice_pixels = box_slice[mask_slice == 1]
                if len(rec_slice_pixels) > 0:
                    mean_conf = float(np.mean(rec_slice_pixels))
                else:
                    mean_conf = float(np.mean(box_slice))
            else:
                mean_conf = 0.0

        mean_conf = round(mean_conf, 2)
        tier = assign_tier(mean_conf)
        
        region_reliabilities.append({
            "region_id": region_id,
            "mean_confidence": mean_conf,
            "reliability_tier": tier,
            "area_px": area_px
        })
        
    return region_reliabilities

def score_dataset(
    confidence_map: np.ndarray,
    mean_confidence_score: float,
    region_reliabilities: List[Dict[str, Any]]
) -> Tuple[float, str]:
    """
    Calculates the dataset reliability score by blending the global mean confidence score
    with a localized variance penalty to represent regional inconsistency.
    """
    if not region_reliabilities:
        return mean_confidence_score, "Dataset reliability equals global mean confidence (no regions found)."

    # Extract regional mean confidence values
    region_scores = [r["mean_confidence"] for r in region_reliabilities]
    
    if len(region_scores) > 1:
        # Penalize variance across regions (localized inconsistency)
        std_dev = float(np.std(region_scores))
        # Penalty scales with standard deviation: 0.5 * std_dev, capped at max 15.0 points
        penalty = min(15.0, std_dev * 0.5)
        dataset_score = max(0.0, min(100.0, mean_confidence_score - penalty))
        basis = (
            f"Dataset Reliability Score: {dataset_score:.2f}. Calculated as global mean confidence ({mean_confidence_score:.2f}) "
            f"minus a localized variance penalty ({penalty:.2f}) derived from the standard deviation ({std_dev:.2f}) of regional confidence scores."
        )
    else:
        dataset_score = mean_confidence_score
        basis = f"Dataset Reliability Score: {dataset_score:.2f}. Equals global mean confidence since there is only 1 region."
        
    return round(dataset_score, 2), basis

def score_reconstruction(
    dataset_score: float,
    phase7e_overall_score: float
) -> Tuple[float, str]:
    """
    Blends dataset reliability and reconstruction process metrics.
    Conceptual distinction:
      - Dataset reliability reflects final output data usability (i.e. spatial/spectral fidelity).
      - Reconstruction reliability combines this with reconstruction process quality (scorecard metrics).
    Formula: 60% Dataset score + 40% Phase 7E overall scorecard quality score.
    """
    if phase7e_overall_score is None:
        # Default weight to 100% dataset score if 7E is missing
        return dataset_score, "Reconstruction Reliability: 100% weighted on dataset score (Phase 7E overall score missing)."
        
    recon_score = 0.6 * dataset_score + 0.4 * phase7e_overall_score
    recon_score = max(0.0, min(100.0, recon_score))
    
    basis = (
        f"Reconstruction Reliability Score: {recon_score:.2f}. Conceptually distinct from dataset reliability: "
        f"blends spatial/spectral output data usability (60% weight, score {dataset_score:.2f}) with reconstruction process optimization quality "
        f"from Phase 7E scorecard metrics (40% weight, score {phase7e_overall_score:.2f})."
    )
    return round(recon_score, 2), basis
