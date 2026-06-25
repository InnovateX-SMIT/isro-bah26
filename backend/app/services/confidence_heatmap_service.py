import os
import json
import numpy as np
import cv2
import rasterio
from skimage.measure import label
from typing import Optional, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.confidence_heatmap_repository import ConfidenceHeatmapRepository
from app.repositories.reliability_repository import ReliabilityRepository
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.dataset_repository import DatasetRepository
from app.models.reliability_score import ReliabilityScore

from app.services.confidence.heatmap_generator import (
    build_rgb_composite,
    overlay_confidence,
    build_reliability_map,
    build_legend
)

class ConfidenceHeatmapService:
    """
    Service layer coordinating Confidence Heatmap visualization generation, caching,
    and DB persistence.
    """
    def __init__(
        self,
        db: Session,
        heatmap_repo: ConfidenceHeatmapRepository,
        reliability_repo: ReliabilityRepository,
        confidence_repo: ConfidenceRepository,
        cloud_segmentation_repo: CloudSegmentationRepository,
        dataset_repo: DatasetRepository
    ):
        self.db = db
        self.heatmap_repo = heatmap_repo
        self.reliability_repo = reliability_repo
        self.confidence_repo = confidence_repo
        self.cloud_segmentation_repo = cloud_segmentation_repo
        self.dataset_repo = dataset_repo

    def get_heatmap(self, reliability_score_id: str) -> Optional[Any]:
        """
        Retrieves the confidence heatmap record for a given Reliability Score ID.
        """
        record = self.heatmap_repo.get_by_reliability_score(reliability_score_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Confidence heatmap record not found for reliability score {reliability_score_id}."
            )
        return record

    def run_heatmap_generation(self, reliability_score_id: str) -> Optional[Any]:
        """
        Runs the visual heatmap generation pipeline:
        1. Cache check via lazy-generate-then-cache.
        2. Validates completed parent ReliabilityScore.
        3. Loads confidence map, reconstruction mask, and original bands (BAND2, 3, 4).
        4. Invokes visual generator functions to build overlay and reliability map.
        5. Writes visual outputs (PNG format) to datasets directory.
        6. Persists details to database.
        """
        # Step 1: Cache check
        existing = self.heatmap_repo.get_by_reliability_score(reliability_score_id)
        if existing and existing.heatmap_status == "completed":
            return existing

        # Step 2: Validate parent reliability score record
        rel_score = self.db.query(ReliabilityScore).filter(
            ReliabilityScore.reliability_id == reliability_score_id
        ).first()

        if not rel_score:
            raise HTTPException(
                status_code=404,
                detail=f"Reliability score {reliability_score_id} not found."
            )
        if rel_score.reliability_status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Parent ReliabilityScore status is '{rel_score.reliability_status}'. It must be 'completed'."
            )

        # Retrieve confidence estimation details
        conf_est = self.confidence_repo.get_by_id(rel_score.confidence_estimation_id)
        if not conf_est or conf_est.confidence_status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Parent ConfidenceEstimation is missing or not completed."
            )

        # Resolve workspace root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

        # Step 3: Discover original dataset bands
        dataset = self.dataset_repo.get_dataset(rel_score.dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset {rel_score.dataset_id} not found."
            )

        dataset_path_abs = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))
        band2_path, band3_path, band4_path = None, None, None
        for root, _, files in os.walk(dataset_path_abs):
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
            raise HTTPException(
                status_code=400,
                detail=f"Missing original band files BAND2.tif, BAND3.tif, or BAND4.tif in dataset path {dataset.dataset_path}."
            )

        # Initialize/fetch record in database
        record = existing
        if not record:
            record = self.heatmap_repo.create(
                reliability_score_id=reliability_score_id,
                dataset_id=rel_score.dataset_id,
                basis="Initializing confidence heatmap engine...",
                status="pending"
            )
        else:
            self.heatmap_repo.update_status(record.heatmap_id, "pending", basis="Re-initializing generation...")

        try:
            # Load confidence map raster
            conf_map_abs = os.path.abspath(os.path.join(workspace_root, conf_est.confidence_map_path))
            if not os.path.exists(conf_map_abs):
                raise FileNotFoundError(f"Physical confidence map TIFF not found: {conf_est.confidence_map_path}")
            
            with rasterio.open(conf_map_abs) as src:
                confidence_map = src.read(1)
                height, width = src.height, src.width

            # Load Cloud Segmentation region details and mask
            seg_rec = self.cloud_segmentation_repo.get_by_dataset(rel_score.dataset_id)
            if not seg_rec or not seg_rec.reconstruction_mask_path:
                raise ValueError("Reconstruction mask path is missing in segmentation record.")
            
            mask_abs = os.path.abspath(os.path.join(workspace_root, seg_rec.reconstruction_mask_path))
            with rasterio.open(mask_abs) as src:
                reconstruction_mask = src.read(1)

            # Connected component labeling from reconstruction mask
            labeled_region_array = label(reconstruction_mask)

            # Load region reliability JSON from Phase 8B
            region_reliability = json.loads(rel_score.region_reliability_json)

            # Step 4: Run computations
            rgb_composite = build_rgb_composite(band2_path, band3_path, band4_path, height, width)
            conf_overlay = overlay_confidence(rgb_composite, confidence_map, reconstruction_mask, alpha=0.4)
            rel_map = build_reliability_map(rgb_composite, labeled_region_array, region_reliability, alpha=0.4)
            legend = build_legend()

            # Output paths
            output_dir_rel = f"datasets/confidence_heatmaps/{rel_score.dataset_id}"
            output_dir_abs = os.path.abspath(os.path.join(workspace_root, output_dir_rel))
            os.makedirs(output_dir_abs, exist_ok=True)

            overlay_path_rel = f"{output_dir_rel}/confidence_overlay.png"
            rel_map_path_rel = f"{output_dir_rel}/reliability_map.png"

            overlay_path_abs = os.path.join(output_dir_abs, "confidence_overlay.png")
            rel_map_path_abs = os.path.join(output_dir_abs, "reliability_map.png")

            # Save PNG images
            cv2.imwrite(overlay_path_abs, cv2.cvtColor(conf_overlay, cv2.COLOR_RGB2BGR))
            cv2.imwrite(rel_map_path_abs, cv2.cvtColor(rel_map, cv2.COLOR_RGB2BGR))

            # Blend basis details
            basis_str = (
                f"Confidence overlay generated via 60% RGB composite and 40% custom Red-Yellow-Green confidence gradient. "
                f"Reliability map generated using a 60% RGB composite and 40% region-level reliability tier color tinting: "
                f"High=Green, Moderate=Yellow, Low=Orange, Very Low=Red."
            )

            # Step 5: Save database record
            updated_record = self.heatmap_repo.update_status(
                heatmap_id=record.heatmap_id,
                status="completed",
                confidence_overlay_path=overlay_path_rel,
                reliability_map_path=rel_map_path_rel,
                legend_json=json.dumps(legend),
                basis=basis_str
            )
            return updated_record

        except Exception as e:
            self.heatmap_repo.update_status(
                heatmap_id=record.heatmap_id,
                status="failed",
                basis=f"Heatmap visualization generation failed: {str(e)}"
            )
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Heatmap visualization generation failed: {str(e)}"
            )

    def delete_heatmap(self, reliability_score_id: str) -> bool:
        """
        Deletes the confidence heatmap record.
        """
        heatmap = self.heatmap_repo.get_by_reliability_score(reliability_score_id)
        if not heatmap:
            raise HTTPException(
                status_code=404,
                detail=f"Confidence heatmap record not found for reliability score {reliability_score_id}."
            )
        return self.heatmap_repo.delete_by_reliability_score(reliability_score_id)
