import os
import shutil
import json
import numpy as np
import cv2
import rasterio
from PIL import Image
from skimage.measure import label, regionprops
from fastapi import HTTPException

from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.schemas.cloud_classification import CloudClassificationResponse, CloudClassificationStatus

class CloudClassificationService:
    """
    Service layer responsible for classifying connected cloud regions into Thick, Thin, Cirrus,
    and Uncertain classes based on probability stats and shape compactness.
    """
    
    # Percentiles for dynamic threshold calibration (exposed for visibility and tuning)
    PCT_THICK_MEAN = 70
    PCT_THICK_STD = 75
    PCT_THICK_AREA = 40
    PCT_CIRRUS_COMPACTNESS = 70
    PCT_THIN_MEAN_MAX = 90
    PCT_THIN_STD = 85

    # Fallback default constants when region count is too low to compute percentiles reliably
    FALLBACK_THICK_MEAN = 0.65
    FALLBACK_THICK_STD = 0.18
    FALLBACK_THICK_AREA = 50
    FALLBACK_CIRRUS_COMPACTNESS = 30.0
    FALLBACK_THIN_MEAN_MAX = 0.90
    FALLBACK_THIN_STD = 0.25

    # Absolute bounds for thin and cirrus clouds
    THETA_CIRRUS_MEAN_MAX = 0.60
    THETA_THIN_MEAN_MIN = 0.35


    # Integer codes for georeferenced raster outputs
    CODE_BACKGROUND = 0
    CODE_THICK = 1
    CODE_THIN = 2
    CODE_CIRRUS = 3
    CODE_UNCERTAIN = 4

    # Color codes for visualization PNG
    COLOR_MAP = {
        CODE_BACKGROUND: [0, 0, 0],          # Black background
        CODE_THICK: [239, 68, 68],           # Red
        CODE_THIN: [249, 115, 22],           # Orange
        CODE_CIRRUS: [59, 130, 246],         # Blue
        CODE_UNCERTAIN: [156, 163, 175]      # Gray
    }

    def __init__(
        self,
        repository: CloudClassificationRepository,
        detection_repository: CloudDetectionRepository
    ):
        self.repository = repository
        self.detection_repository = detection_repository

    def get_cloud_classification(self, dataset_id: str) -> CloudClassificationResponse:
        """
        Retrieves the cloud classification record for a dataset.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud classification record found for dataset {dataset_id}."
            )
        return CloudClassificationResponse.model_validate(record)

    def run_cloud_classification(self, dataset_id: str) -> CloudClassificationResponse:
        """
        Runs the cloud region classification pipeline:
        1. Checks cache for completed classification.
        2. Validates that a completed CloudDetection record exists.
        3. Loads probability_map.tif.
        4. Re-derives connected component regions.
        5. Computes features (mean, std, area, compactness) per region.
        6. Runs rule-based heuristics to classify each region.
        7. Saves georeferenced classification raster and colored PNG preview.
        8. Persists stats and region detail JSON list to database.
        """
        # 1. Cache hit check
        existing = self.repository.get_by_dataset(dataset_id)
        if existing and existing.classification_status == CloudClassificationStatus.COMPLETED.value:
            return CloudClassificationResponse.model_validate(existing)

        # 2. Guard: Verify completed detection exists
        detection = self.detection_repository.get_by_dataset(dataset_id)
        if not detection or detection.detection_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Run cloud detection before classification. Completed cloud detection record not found."
            )

        # Resolve paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        prob_map_abs_path = os.path.abspath(os.path.join(workspace_root, detection.probability_map_path))

        if not os.path.exists(prob_map_abs_path):
            raise HTTPException(
                status_code=404,
                detail=f"Input probability map file not found on disk: {detection.probability_map_path}"
            )

        # Initialize/fetch record in PENDING
        record = existing
        if not record:
            record = self.repository.create_classification(
                dataset_id=dataset_id,
                cloud_detection_id=detection.detection_id,
                status=CloudClassificationStatus.PENDING.value
            )
        else:
            self.repository.update_classification(record.classification_id, {
                "classification_status": CloudClassificationStatus.PENDING.value
            })

        # Transition status to processing (or inline update)
        try:
            # 3. Load probability map via rasterio
            with rasterio.open(prob_map_abs_path) as src:
                prob_map = src.read(1)
                profile = src.profile.copy()
                transform = src.transform

            # 4. Extract connected regions
            binary_mask = (prob_map > 0.5).astype(np.uint8)
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            cleaned_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
            cleaned_mask = cv2.morphologyEx(cleaned_mask, cv2.MORPH_CLOSE, kernel)

            labeled_mask, num_features = label(cleaned_mask, return_num=True)
            regions = regionprops(labeled_mask)
            valid_regions = [r for r in regions if r.area >= 16]

            # 5. Extract features from each valid region
            region_features = []
            all_mean_probs = []
            all_std_probs = []
            all_compactnesses = []
            all_areas = []

            for r in valid_regions:
                region_mask = (labeled_mask == r.label)
                region_probs = prob_map[region_mask]

                mean_prob = float(np.mean(region_probs))
                std_prob = float(np.std(region_probs))
                area_px = int(r.area)
                perimeter = float(r.perimeter)
                compactness = (perimeter ** 2) / area_px if area_px > 0 else 0.0

                all_mean_probs.append(mean_prob)
                all_std_probs.append(std_prob)
                all_compactnesses.append(compactness)
                all_areas.append(area_px)

                region_features.append((r, mean_prob, std_prob, area_px, compactness, region_mask))

            # Compute dynamic thresholds using percentiles
            if len(all_mean_probs) >= 4:
                thick_mean_threshold = float(np.percentile(all_mean_probs, self.PCT_THICK_MEAN))
                thick_std_threshold = max(0.15, float(np.percentile(all_std_probs, self.PCT_THICK_STD)))
                thick_area_threshold = max(50, int(np.percentile(all_areas, self.PCT_THICK_AREA)))

                cirrus_compactness_threshold = max(20.0, float(np.percentile(all_compactnesses, self.PCT_CIRRUS_COMPACTNESS)))
                thin_mean_max = max(0.85, float(np.percentile(all_mean_probs, self.PCT_THIN_MEAN_MAX)))
                thin_std_threshold = max(0.20, float(np.percentile(all_std_probs, self.PCT_THIN_STD)))
            else:
                thick_mean_threshold = self.FALLBACK_THICK_MEAN
                thick_std_threshold = self.FALLBACK_THICK_STD
                thick_area_threshold = self.FALLBACK_THICK_AREA

                cirrus_compactness_threshold = self.FALLBACK_CIRRUS_COMPACTNESS
                thin_mean_max = self.FALLBACK_THIN_MEAN_MAX
                thin_std_threshold = self.FALLBACK_THIN_STD

            # Print or log calculated thresholds for debugging/explainability
            print(f"DEBUG: Calibrated Cloud Classification Thresholds for dataset {dataset_id}:")
            print(f" - Thick Mean: {thick_mean_threshold:.4f}, Thick Std: {thick_std_threshold:.4f}, Thick Area: {thick_area_threshold}")
            print(f" - Cirrus Compactness: {cirrus_compactness_threshold:.4f}")
            print(f" - Thin Mean Max: {thin_mean_max:.4f}, Thin Std: {thin_std_threshold:.4f}")

            # 6. Classify regions
            region_details = []
            thick_count = 0
            thin_count = 0
            cirrus_count = 0
            uncertain_count = 0

            thick_area = 0
            thin_area = 0
            cirrus_area = 0
            uncertain_area = 0

            class_raster = np.zeros_like(labeled_mask, dtype=np.uint8)

            for r, mean_prob, std_prob, area_px, compactness, region_mask in region_features:
                # Apply calibrated rules
                if mean_prob >= thick_mean_threshold and std_prob <= thick_std_threshold and area_px >= thick_area_threshold:
                    cls_label = "Thick Cloud"
                    code = self.CODE_THICK
                    thick_count += 1
                    thick_area += area_px
                elif mean_prob <= self.THETA_CIRRUS_MEAN_MAX and compactness >= cirrus_compactness_threshold:
                    cls_label = "Cirrus Cloud"
                    code = self.CODE_CIRRUS
                    cirrus_count += 1
                    cirrus_area += area_px
                elif self.THETA_THIN_MEAN_MIN <= mean_prob <= thin_mean_max and std_prob <= thin_std_threshold:
                    cls_label = "Thin Cloud"
                    code = self.CODE_THIN
                    thin_count += 1
                    thin_area += area_px
                else:
                    cls_label = "Uncertain Region"
                    code = self.CODE_UNCERTAIN
                    uncertain_count += 1
                    uncertain_area += area_px

                # Paint labeled pixels in output raster
                class_raster[region_mask] = code

                region_details.append({
                    "class": cls_label,
                    "mean_probability": mean_prob,
                    "area_px": area_px,
                    "compactness": compactness
                })


            # Calculate area percentages
            total_cloud_area = thick_area + thin_area + cirrus_area + uncertain_area
            if total_cloud_area > 0:
                thick_area_percent = (thick_area / total_cloud_area) * 100.0
                thin_area_percent = (thin_area / total_cloud_area) * 100.0
                cirrus_area_percent = (cirrus_area / total_cloud_area) * 100.0
                uncertain_area_percent = (uncertain_area / total_cloud_area) * 100.0
            else:
                thick_area_percent = 0.0
                thin_area_percent = 0.0
                cirrus_area_percent = 0.0
                uncertain_area_percent = 0.0

            # 7. Write outputs to disk
            out_dir = os.path.join(workspace_root, "datasets", "cloud_classifications", dataset_id)
            os.makedirs(out_dir, exist_ok=True)

            tif_rel_path = f"datasets/cloud_classifications/{dataset_id}/classification_map.tif"
            png_rel_path = f"datasets/cloud_classifications/{dataset_id}/classification_preview.png"

            tif_abs_path = os.path.join(workspace_root, tif_rel_path)
            png_abs_path = os.path.join(workspace_root, png_rel_path)

            # Update profile for integer classification raster
            profile.update(
                dtype=rasterio.uint8,
                count=1,
                compress='lzw'
            )
            with rasterio.open(tif_abs_path, "w", **profile) as dst:
                dst.write(class_raster, 1)

            # Build color visualization image
            height, width = class_raster.shape
            rgb_image = np.zeros((height, width, 3), dtype=np.uint8)
            for code, color in self.COLOR_MAP.items():
                rgb_image[class_raster == code] = color

            png_img = Image.fromarray(rgb_image)
            png_img.save(png_abs_path, "PNG")

            # 8. Persist summary stats and region JSON details
            update_data = {
                "classification_status": CloudClassificationStatus.COMPLETED.value,
                "thick_cloud_region_count": thick_count,
                "thin_cloud_region_count": thin_count,
                "cirrus_cloud_region_count": cirrus_count,
                "uncertain_region_count": uncertain_count,
                "thick_cloud_area_percent": thick_area_percent,
                "thin_cloud_area_percent": thin_area_percent,
                "cirrus_cloud_area_percent": cirrus_area_percent,
                "uncertain_area_percent": uncertain_area_percent,
                "classification_map_path": tif_rel_path,
                "classification_preview_path": png_rel_path,
                "region_details_json": json.dumps(region_details),
                "classification_method": "probability_texture_compactness_rules_v1"
            }

            db_record = self.repository.update_classification(record.classification_id, update_data)
            return CloudClassificationResponse.model_validate(db_record)

        except Exception as err:
            self.repository.update_classification(record.classification_id, {
                "classification_status": CloudClassificationStatus.FAILED.value
            })
            raise HTTPException(
                status_code=500,
                detail=f"Cloud classification pipeline crashed: {err}"
            )

    def get_preview_image_path(self, dataset_id: str) -> str:
        """
        Resolves the absolute path of the generated preview PNG visualization on disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record or record.classification_status != CloudClassificationStatus.COMPLETED.value:
            raise HTTPException(
                status_code=404,
                detail=f"Completed classification assets not found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        abs_path = os.path.abspath(os.path.join(workspace_root, record.classification_preview_path))

        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=404,
                detail="Physical classification preview file not found on disk."
            )
        return abs_path

    def delete_classification_assets(self, dataset_id: str) -> bool:
        """
        Deletes database record and clears generated classification files from disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud classification record found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        class_dir = os.path.join(workspace_root, "datasets", "cloud_classifications", dataset_id)

        if os.path.exists(class_dir):
            try:
                shutil.rmtree(class_dir)
            except Exception as err:
                print(f"Warning: Could not remove cloud classification files at {class_dir}: {err}")

        return self.repository.delete_classification(dataset_id)
