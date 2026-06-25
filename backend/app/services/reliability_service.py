import os
import json
import rasterio
from typing import Optional, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.reliability_repository import ReliabilityRepository
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository

from app.services.reliability.reliability_scorer import (
    assign_tier,
    score_per_region,
    score_dataset,
    score_reconstruction
)

class ReliabilityService:
    """
    Service layer coordinating Reliability Scoring calculations, caching,
    and DB persistence.
    """
    def __init__(
        self,
        db: Session,
        reliability_repo: ReliabilityRepository,
        confidence_repo: ConfidenceRepository,
        cloud_segmentation_repo: CloudSegmentationRepository
    ):
        self.db = db
        self.reliability_repo = reliability_repo
        self.confidence_repo = confidence_repo
        self.cloud_segmentation_repo = cloud_segmentation_repo

    def get_reliability(self, confidence_estimation_id: str) -> Optional[Any]:
        """
        Retrieves the reliability score record for a given Confidence Estimation ID.
        """
        record = self.reliability_repo.get_by_confidence_estimation(confidence_estimation_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Reliability scoring record not found for confidence estimation {confidence_estimation_id}."
            )
        return record

    def run_reliability_scoring(self, confidence_estimation_id: str) -> Optional[Any]:
        """
        Runs the multi-granular reliability scoring pipeline:
        1. Cache check via lazy-generate-then-cache.
        2. Validates completed parent ConfidenceEstimation.
        3. Pulls prerequisite cloud segmentation mask and region details.
        4. Loads confidence_map.tif per-pixel values.
        5. Computes region-level, dataset-level, and reconstruction-level scores and tiers.
        6. Persists details to database.
        """
        # Step 1: Cache check
        existing = self.reliability_repo.get_by_confidence_estimation(confidence_estimation_id)
        if existing and existing.reliability_status == "completed":
            return existing

        # Step 2: Validate parent confidence estimation
        conf_est = self.confidence_repo.get_by_id(confidence_estimation_id)
        
        if not conf_est:
            raise HTTPException(
                status_code=404,
                detail=f"Confidence estimation {confidence_estimation_id} not found."
            )
        if conf_est.confidence_status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Parent ConfidenceEstimation status is '{conf_est.confidence_status}'. It must be 'completed'."
            )

        # Resolve workspace root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

        # Step 3: Load Cloud Segmentation region details and mask
        seg_rec = self.cloud_segmentation_repo.get_by_dataset(conf_est.dataset_id)
        if not seg_rec or not seg_rec.reconstruction_mask_path:
            raise HTTPException(
                status_code=400,
                detail=f"Reconstruction mask not found for dataset {conf_est.dataset_id}. Run segmentation first."
            )

        # Initialize/fetch record in database
        record = existing
        if not record:
            record = self.reliability_repo.create(
                confidence_estimation_id=confidence_estimation_id,
                dataset_id=conf_est.dataset_id,
                scoring_basis="Initializing reliability scoring engine...",
                status="pending"
            )
        else:
            self.reliability_repo.update_status(record.reliability_id, status="pending")

        try:
            # Parse region details
            if not seg_rec.region_details_json:
                raise ValueError("Cloud segmentations region details JSON is missing or empty.")
            
            try:
                region_details = json.loads(seg_rec.region_details_json)
            except Exception as parse_err:
                raise ValueError(f"Unparsable region details JSON: {parse_err}")

            if not isinstance(region_details, list) or len(region_details) == 0:
                raise ValueError("No cloud regions found in the segmentation record.")

            # Load confidence map raster
            conf_map_abs = os.path.abspath(os.path.join(workspace_root, conf_est.confidence_map_path))
            if not os.path.exists(conf_map_abs):
                raise FileNotFoundError(f"Physical confidence map TIFF not found on disk: {conf_est.confidence_map_path}")
            
            with rasterio.open(conf_map_abs) as src:
                confidence_map = src.read(1)

            # Load reconstruction mask raster
            mask_abs = os.path.abspath(os.path.join(workspace_root, seg_rec.reconstruction_mask_path))
            if not os.path.exists(mask_abs):
                raise FileNotFoundError(f"Physical reconstruction mask TIFF not found on disk: {seg_rec.reconstruction_mask_path}")
            
            with rasterio.open(mask_abs) as src:
                reconstruction_mask = src.read(1)

            # Load Phase 7E Overall Score
            eval_metrics_path = os.path.join(workspace_root, f"datasets/reconstruction_evaluations/{conf_est.dataset_id}/quality_metrics.json")
            overall_score = None
            if os.path.exists(eval_metrics_path):
                try:
                    with open(eval_metrics_path, "r") as f:
                        eval_data = json.load(f)
                        overall_score = float(eval_data.get("overall_score", 100.0))
                except Exception:
                    pass

            # Step 4: Run scoring computations
            region_reliabilities = score_per_region(confidence_map, reconstruction_mask, region_details)
            dataset_score, dataset_basis = score_dataset(confidence_map, conf_est.mean_confidence_score, region_reliabilities)
            dataset_tier = assign_tier(dataset_score)
            recon_score, recon_basis = score_reconstruction(dataset_score, overall_score)

            # Combine explainability logs
            basis_parts = [
                "Reliability Scoring Basis:",
                f"- Tier Banding Definition: High (>=75), Moderate (50-74), Low (25-49), Very Low (<25).",
                f"- {dataset_basis}",
                f"- {recon_basis}"
            ]
            scoring_basis = "\n".join(basis_parts)

            # Step 5: Save database record
            updated_record = self.reliability_repo.update_status(
                reliability_id=record.reliability_id,
                status="completed",
                dataset_reliability_score=dataset_score,
                dataset_reliability_tier=dataset_tier,
                region_reliability_json=json.dumps(region_reliabilities),
                reconstruction_reliability_score=recon_score,
                scoring_basis=scoring_basis
            )
            return updated_record

        except Exception as e:
            self.reliability_repo.update_status(
                reliability_id=record.reliability_id,
                status="failed",
                scoring_basis=f"Reliability scoring execution failed: {str(e)}"
            )
            # Make sure we propagate HTTP errors correctly
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Reliability scoring failed: {str(e)}"
            )

    def delete_reliability_score(self, confidence_estimation_id: str) -> bool:
        """
        Deletes the reliability scoring record.
        """
        # Ensure confidence record exists
        conf_est = self.confidence_repo.get_by_reconstruction_run(confidence_estimation_id)
        # Note: if it is passed as confidence_estimation_id directly we look up by id
        if not conf_est:
            # Try directly query
            conf_est = self.confidence_repo.get_by_id(confidence_estimation_id)
            
        if not conf_est:
            raise HTTPException(
                status_code=404,
                detail=f"Confidence estimation {confidence_estimation_id} not found."
            )
        return self.reliability_repo.delete_by_confidence_estimation(conf_est.confidence_id)
