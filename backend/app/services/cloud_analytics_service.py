import os
import shutil
import json
from datetime import datetime
from fastapi import HTTPException

from app.repositories.cloud_analytics_repository import CloudAnalyticsRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.schemas.cloud_analytics import CloudAnalyticsResponse, CloudAnalyticsStatus

class CloudAnalyticsService:
    """
    Service layer responsible for compiling, scoring, and exporting consolidated
    cloud/shadow analytics profiles and operational mission recommendations.
    """
    def __init__(
        self,
        repository: CloudAnalyticsRepository,
        segmentation_repository: CloudSegmentationRepository,
        shadow_repository: CloudShadowRepository,
        classification_repository: CloudClassificationRepository,
        detection_repository: CloudDetectionRepository
    ):
        self.repository = repository
        self.segmentation_repository = segmentation_repository
        self.shadow_repository = shadow_repository
        self.classification_repository = classification_repository
        self.detection_repository = detection_repository

    def get_cloud_analytics(self, dataset_id: str) -> CloudAnalyticsResponse:
        """
        Retrieves the cloud analytics record for a dataset.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud analytics record found for dataset {dataset_id}."
            )
        return CloudAnalyticsResponse.model_validate(record)

    def run_cloud_analytics(self, dataset_id: str) -> CloudAnalyticsResponse:
        """
        Runs the cloud analytics compilation and scoring pipeline:
        1. Checks cache for completed analytics.
        2. Guard clauses: verifies 6A, 6B, 6C, and 6D are completed.
        3. Extracts and aggregates data from the DB records of previous phases.
        4. Calculates analytics parameters:
           - Scene Complexity Score (0-100)
           - Reconstruction Difficulty (LOW, MEDIUM, HIGH, EXTREME)
           - Cloud Intelligence Score (0-100)
           - Cloud Burden Index (0-100) and Burden Level (Minimal, Light, Moderate, Severe, Critical)
           - Operational and Mission Recommendations
        5. Writes output JSON files:
           - datasets/cloud_analytics/{dataset_id}/analytics_summary.json
           - datasets/cloud_analytics/{dataset_id}/mission_recommendations.json
           - datasets/cloud_analytics/{dataset_id}/analytics_report.json
        6. Persists data and marks record as completed and reconstruction_ready=True.
        """
        # 1. Cache hit check
        existing = self.repository.get_by_dataset(dataset_id)
        if existing and existing.analytics_status == CloudAnalyticsStatus.COMPLETED.value:
            return CloudAnalyticsResponse.model_validate(existing)

        # 2. Guard: Verify detection, classification, shadow, and segmentation are completed
        detection = self.detection_repository.get_by_dataset(dataset_id)
        classification = self.classification_repository.get_by_dataset(dataset_id)
        shadow = self.shadow_repository.get_by_dataset(dataset_id)
        segmentation = self.segmentation_repository.get_by_dataset(dataset_id)

        if not detection or detection.detection_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Completed cloud detection record not found. Run cloud detection first."
            )
        if not classification or classification.classification_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Completed cloud classification record not found. Run cloud classification first."
            )
        if not shadow or shadow.shadow_detection_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Completed cloud shadow record not found. Run cloud shadow detection first."
            )
        if not segmentation or segmentation.segmentation_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Completed cloud segmentation record not found. Run cloud segmentation first."
            )

        # Resolve paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

        # Initialize/fetch record in PENDING
        record = existing
        if not record:
            record = self.repository.create_analytics_record(
                dataset_id=dataset_id,
                cloud_segmentation_id=segmentation.segmentation_id,
                status=CloudAnalyticsStatus.PENDING.value
            )
        else:
            self.repository.update_analytics_record(record.analytics_id, {
                "analytics_status": CloudAnalyticsStatus.PENDING.value,
                "reconstruction_readiness": False
            })

        try:
            # 3. Extract metrics from database records
            total_cloud_coverage_percent = detection.cloud_coverage_percent
            total_shadow_coverage_percent = shadow.total_shadow_area_percent
            
            thick_cloud_percent = classification.thick_cloud_area_percent
            thin_cloud_percent = classification.thin_cloud_area_percent
            cirrus_cloud_percent = classification.cirrus_cloud_area_percent
            uncertain_cloud_percent = classification.uncertain_area_percent

            total_cloud_objects = segmentation.total_segmented_regions
            largest_cloud_object_pixels = segmentation.largest_region_pixels
            smallest_cloud_object_pixels = segmentation.smallest_region_pixels
            mean_cloud_object_pixels = segmentation.mean_region_pixels
            reconstruction_target_percent = segmentation.total_segmented_area_percent

            # Decode segmentation region details to evaluate priority counts
            region_details = []
            if segmentation.region_details_json:
                try:
                    region_details = json.loads(segmentation.region_details_json)
                except Exception:
                    region_details = []

            high_priority_objects = sum(1 for r in region_details if r.get("reconstruction_priority") == "HIGH")
            medium_priority_objects = sum(1 for r in region_details if r.get("reconstruction_priority") == "MEDIUM")
            low_priority_objects = sum(1 for r in region_details if r.get("reconstruction_priority") == "LOW")

            # 4. Analytics Calculations
            # 4a. Scene Cloud Complexity Score (0-100)
            obj_factor = min(35.0, total_cloud_objects * 0.5)
            cov_factor = min(35.0, total_cloud_coverage_percent * 0.5)
            sha_factor = min(15.0, total_shadow_coverage_percent * 2.0)
            prio_factor = 15.0 if high_priority_objects > 0 else 0.0
            scene_cloud_complexity_score = min(100.0, obj_factor + cov_factor + sha_factor + prio_factor)

            # 4b. Reconstruction Difficulty: LOW, MEDIUM, HIGH, EXTREME
            if reconstruction_target_percent > 50.0 or scene_cloud_complexity_score > 75.0:
                scene_reconstruction_difficulty = "EXTREME"
            elif reconstruction_target_percent > 25.0 or scene_cloud_complexity_score > 50.0:
                scene_reconstruction_difficulty = "HIGH"
            elif reconstruction_target_percent > 5.0 or scene_cloud_complexity_score > 25.0:
                scene_reconstruction_difficulty = "MEDIUM"
            else:
                scene_reconstruction_difficulty = "LOW"

            # 4c. Cloud Intelligence Score (0-100)
            intel_base = 80.0
            if shadow.solar_geometry_available:
                intel_base += 10.0
            if shadow.linked_shadow_region_count > 0 or total_shadow_coverage_percent == 0.0:
                intel_base += 10.0
            cloud_intelligence_score = min(100.0, intel_base)

            # 4d. Cloud Burden Index (0-100) & Burden Level
            cloud_burden_index = min(100.0, reconstruction_target_percent)
            if cloud_burden_index <= 20.0:
                burden_level = "Minimal"
            elif cloud_burden_index <= 40.0:
                burden_level = "Light"
            elif cloud_burden_index <= 60.0:
                burden_level = "Moderate"
            elif cloud_burden_index <= 80.0:
                burden_level = "Severe"
            else:
                burden_level = "Critical"

            # 4e. Operational and Mission Recommendations
            recommendations = []
            if cloud_burden_index <= 20.0:
                recommendations.append("Low cloud burden")
            elif cloud_burden_index <= 60.0:
                recommendations.append("Moderate reconstruction required")
            else:
                recommendations.append("High reconstruction required")

            if total_cloud_coverage_percent > 50.0:
                recommendations.append("Cloud-dominated scene")
            if total_shadow_coverage_percent > total_cloud_coverage_percent:
                recommendations.append("Shadow-dominated scene")
            if cirrus_cloud_percent > 50.0:
                recommendations.append("Cirrus-dominated scene")

            if largest_cloud_object_pixels > 50000:
                recommendations.append("Large contiguous cloud system")
            if total_cloud_objects > 100:
                recommendations.append("Highly fragmented cloud system")

            # 5. Compile outputs
            # Compile Summary Package
            summary_data = {
                "coverage_metrics": {
                    "cloud_coverage_percent": total_cloud_coverage_percent,
                    "shadow_coverage_percent": total_shadow_coverage_percent,
                    "reconstruction_target_percent": reconstruction_target_percent
                },
                "difficulty_metrics": {
                    "complexity_score": scene_cloud_complexity_score,
                    "reconstruction_difficulty": scene_reconstruction_difficulty,
                    "burden_index": cloud_burden_index,
                    "burden_level": burden_level,
                    "intelligence_score": cloud_intelligence_score
                },
                "priority_metrics": {
                    "high": high_priority_objects,
                    "medium": medium_priority_objects,
                    "low": low_priority_objects
                },
                "cloud_composition": {
                    "thick_percent": thick_cloud_percent,
                    "thin_percent": thin_cloud_percent,
                    "cirrus_percent": cirrus_cloud_percent,
                    "uncertain_percent": uncertain_cloud_percent
                },
                "shadow_composition": {
                    "total_shadow_objects": shadow.shadow_region_count,
                    "linked_shadow_objects": shadow.linked_shadow_region_count,
                    "unlinked_shadow_objects": shadow.unlinked_shadow_region_count,
                    "mean_shadow_to_cloud_ratio": shadow.mean_shadow_to_cloud_area_ratio
                },
                "recommendations": recommendations
            }

            # Write outputs to disk
            out_dir = os.path.join(workspace_root, "datasets", "cloud_analytics", dataset_id)
            os.makedirs(out_dir, exist_ok=True)

            summary_path = os.path.join(out_dir, "analytics_summary.json")
            recs_path = os.path.join(out_dir, "mission_recommendations.json")
            report_path = os.path.join(out_dir, "analytics_report.json")

            with open(summary_path, "w", encoding="utf-8") as f:
                json.dump(summary_data, f, indent=4)

            with open(recs_path, "w", encoding="utf-8") as f:
                json.dump({"recommendations": recommendations}, f, indent=4)

            # Combined Analytics Report (includes basic dataset metadata if available)
            report_data = {
                "dataset_id": dataset_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "summary": summary_data,
                "reconstruction_readiness": True
            }
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=4)

            # 6. Update database record
            update_data = {
                "analytics_status": CloudAnalyticsStatus.COMPLETED.value,
                "total_cloud_coverage_percent": total_cloud_coverage_percent,
                "total_shadow_coverage_percent": total_shadow_coverage_percent,
                "thick_cloud_percent": thick_cloud_percent,
                "thin_cloud_percent": thin_cloud_percent,
                "cirrus_cloud_percent": cirrus_cloud_percent,
                "uncertain_cloud_percent": uncertain_cloud_percent,
                "total_cloud_objects": total_cloud_objects,
                "high_priority_objects": high_priority_objects,
                "medium_priority_objects": medium_priority_objects,
                "low_priority_objects": low_priority_objects,
                "largest_cloud_object_pixels": largest_cloud_object_pixels,
                "smallest_cloud_object_pixels": smallest_cloud_object_pixels,
                "mean_cloud_object_pixels": mean_cloud_object_pixels,
                "reconstruction_target_percent": reconstruction_target_percent,
                "scene_cloud_complexity_score": scene_cloud_complexity_score,
                "scene_reconstruction_difficulty": scene_reconstruction_difficulty,
                "cloud_intelligence_score": cloud_intelligence_score,
                "cloud_burden_index": cloud_burden_index,
                "reconstruction_readiness": True,
                "analytics_summary_json": json.dumps(summary_data)
            }

            db_record = self.repository.update_analytics_record(record.analytics_id, update_data)
            return CloudAnalyticsResponse.model_validate(db_record)

        except Exception as err:
            self.repository.update_analytics_record(record.analytics_id, {
                "analytics_status": CloudAnalyticsStatus.FAILED.value
            })
            raise HTTPException(
                status_code=500,
                detail=f"Cloud analytics pipeline crashed: {err}"
            )

    def delete_analytics_assets(self, dataset_id: str) -> bool:
        """
        Deletes database record and clears generated analytics report files from disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud analytics record found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        analytics_dir = os.path.join(workspace_root, "datasets", "cloud_analytics", dataset_id)

        if os.path.exists(analytics_dir):
            try:
                shutil.rmtree(analytics_dir)
            except Exception as err:
                print(f"Warning: Could not remove cloud analytics files at {analytics_dir}: {err}")

        return self.repository.delete_analytics_record(dataset_id)
