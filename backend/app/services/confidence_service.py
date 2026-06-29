import os
import json
import numpy as np
import rasterio
from typing import Optional, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.selected_reference_repository import SelectedReferenceRepository

from app.services.confidence.confidence_engine import (
    score_by_cloud_class,
    score_by_boundary_distance,
    score_by_temporal_agreement,
    score_global_modulation,
    combine_confidence,
    generate_confidence_outputs
)

class ConfidenceService:
    """
    Service layer coordinating Confidence Estimation execution, caching,
    prerequisite verification, and spatial product persistence.
    """
    def __init__(
        self,
        db: Session,
        confidence_repo: ConfidenceRepository,
        reconstruction_repo: ReconstructionRepository,
        cloud_segmentation_repo: CloudSegmentationRepository,
        cloud_classification_repo: CloudClassificationRepository,
        reference_stack_repo: TemporalReferenceStackRepository,
        selected_reference_repo: SelectedReferenceRepository
    ):
        self.db = db
        self.confidence_repo = confidence_repo
        self.reconstruction_repo = reconstruction_repo
        self.cloud_segmentation_repo = cloud_segmentation_repo
        self.cloud_classification_repo = cloud_classification_repo
        self.reference_stack_repo = reference_stack_repo
        self.selected_reference_repo = selected_reference_repo

    def get_confidence(self, run_id: str) -> Optional[Any]:
        """
        Retrieves the confidence estimation record for a given Reconstruction Run ID.
        """
        record = self.confidence_repo.get_by_reconstruction_run(run_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Confidence estimation not found for reconstruction run {run_id}."
            )
        return record

    def run_confidence_estimation(self, run_id: str) -> Optional[Any]:
        """
        Runs the confidence estimation engine workflow:
        1. Cache check via lazy-generate-then-cache.
        2. Validates completed Reconstruction Run.
        3. Pulls prerequisite cloud segmentation mask and classification details.
        4. Gathers temporal reference agreements and global metric scorecard.
        5. Computes confidence spatial array, saves TIF and PNG, and persists results.
        """
        # Step 1: Cache check
        existing = self.confidence_repo.get_by_reconstruction_run(run_id)
        if existing and existing.confidence_status == "completed":
            return existing

        # Step 2: Validate completed reconstruction run
        run = self.reconstruction_repo.get_by_id(run_id)
        if not run:
            raise HTTPException(
                status_code=404,
                detail=f"Reconstruction run {run_id} not found."
            )
        if run.reconstruction_status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail=f"Reconstruction run status is '{run.reconstruction_status}'. It must be COMPLETED."
            )

        # Resolve workspace root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

        # Step 3: Load Cloud Segmentation reconstruction mask
        seg_rec = self.cloud_segmentation_repo.get_by_dataset(run.dataset_id)
        if not seg_rec or not seg_rec.reconstruction_mask_path:
            raise HTTPException(
                status_code=400,
                detail=f"Reconstruction mask not found for dataset {run.dataset_id}. Run segmentation first."
            )
        
        mask_abs_path = os.path.abspath(os.path.join(workspace_root, seg_rec.reconstruction_mask_path))
        if not os.path.exists(mask_abs_path):
            raise HTTPException(
                status_code=404,
                detail=f"Physical reconstruction mask file not found on disk: {seg_rec.reconstruction_mask_path}"
            )

        # Initialize record in database
        record = existing
        if not record:
            record = self.confidence_repo.create(
                reconstruction_run_id=run_id,
                dataset_id=run.dataset_id,
                inference_basis="Initializing confidence scoring engine...",
                status="pending"
            )
        else:
            self.confidence_repo.update_status(record.confidence_id, status="pending")

        try:
            # Load mask data
            with rasterio.open(mask_abs_path) as src:
                mask = src.read(1)
                mask_shape = mask.shape

            # Fetch cloud classification
            class_rec = self.cloud_classification_repo.get_by_dataset(run.dataset_id)
            class_map_path = class_rec.classification_map_path if class_rec else ""

            # Fetch selected temporal references
            references = []
            ref_stack = self.reference_stack_repo.get_latest_by_session(run.session_id)
            if ref_stack:
                references = self.selected_reference_repo.get_by_stack(ref_stack.id)

            # Fetch global evaluation report score (overall_score)
            eval_metrics_path = os.path.join(workspace_root, f"datasets/reconstruction_evaluations/{run.dataset_id}/quality_metrics.json")
            overall_score = None
            if os.path.exists(eval_metrics_path):
                try:
                    with open(eval_metrics_path, "r") as f:
                        eval_data = json.load(f)
                        overall_score = float(eval_data.get("overall_score", 100.0))
                except Exception:
                    pass

            # Resolve absolute paths of temporal reference imagery files on disk
            ref_images = []
            for ref in references:
                cand = ref.candidate
                if not cand:
                    continue
                candidate_rel_path = f"datasets/temporal_references/{cand.candidate_id}.tif"
                candidate_abs_path = os.path.abspath(os.path.join(workspace_root, candidate_rel_path))
                if os.path.exists(candidate_abs_path):
                    ref_images.append(candidate_abs_path)

            # Resolve absolute path and load reconstructed band 2 (Green) for spatial-temporal structure guidance
            recon_band = np.zeros(mask_shape, dtype=np.float32)
            recon_abs_path = os.path.abspath(os.path.join(workspace_root, run.output_image_path))
            if os.path.exists(recon_abs_path):
                try:
                    with rasterio.open(recon_abs_path) as r_src:
                        recon_band = r_src.read(1).astype(np.float32)
                except Exception as e:
                    logger.warning(f"Could not load reconstructed image for confidence guidance: {e}")

            # Step 4: Run scoring signals
            class_score, basis_class = score_by_cloud_class(class_map_path, mask_shape, workspace_root)
            boundary_score = score_by_boundary_distance(mask)
            temporal_score, basis_temp = score_by_temporal_agreement(references, mask_shape, workspace_root)
            global_mod, basis_mod = score_global_modulation(overall_score)

            # Combine signals with advanced U-Net uncertainty and Guided Filter smoothing
            combined = combine_confidence(
                class_score=class_score,
                boundary_score=boundary_score,
                temporal_score=temporal_score,
                global_modulation=global_mod,
                recon_band=recon_band,
                ref_images=ref_images
            )

            # Scale to 0-100 and enforce 100.0 for clean background pixels
            confidence_map = np.full(mask_shape, 100.0, dtype=np.float32)
            reconstructed_mask = (mask == 1)
            confidence_map[reconstructed_mask] = combined[reconstructed_mask] * 100.0

            # Calculate stats on reconstructed region
            total_reconstructed = np.sum(reconstructed_mask)
            if total_reconstructed > 0:
                mean_confidence = float(np.mean(confidence_map[reconstructed_mask]))
                low_confidence_pixels = np.sum((confidence_map < 50.0) & reconstructed_mask)
                low_confidence_percent = float(low_confidence_pixels / total_reconstructed * 100.0)
            else:
                mean_confidence = 100.0
                low_confidence_percent = 0.0

            # Output paths
            tif_rel_path = f"datasets/confidence_estimations/{run.dataset_id}/confidence_map.tif"
            png_rel_path = f"datasets/confidence_estimations/{run.dataset_id}/confidence_preview.png"
            output_tif_path = os.path.abspath(os.path.join(workspace_root, tif_rel_path))
            output_png_path = os.path.abspath(os.path.join(workspace_root, png_rel_path))

            # Step 5: Save TIFF and PNG previews to disk
            generate_confidence_outputs(confidence_map, mask, mask_abs_path, output_tif_path, output_png_path)

            # Build inference basis explainability payload
            basis_parts = [
                "Confidence Estimation Engine Basis:",
                f"- {basis_class}",
                "- Boundary Proximity: Boundary Distance Transform applied (clipped at 30px max influence).",
                f"- {basis_temp}",
                f"- {basis_mod}",
                "- Reconstruction Uncertainty & Neighborhood Consistency calculated dynamically.",
                "- Spatial-Temporal Edge Continuity preservation applied.",
                "Weights: Cloud Class (20%), Boundary Distance (15%), Temporal Agreement (15%), Uncertainty (20%), Consistency (15%), Edge Continuity (15%). Guided Filter smoothed."
            ]
            inference_basis = "\n".join(basis_parts)

            # Persist completed state to database
            updated_record = self.confidence_repo.update_status(
                confidence_id=record.confidence_id,
                status="completed",
                mean_confidence_score=round(mean_confidence, 2),
                low_confidence_area_percent=round(low_confidence_percent, 2),
                confidence_map_path=tif_rel_path,
                confidence_preview_path=png_rel_path,
                inference_basis=inference_basis
            )
            return updated_record

        except Exception as e:
            self.confidence_repo.update_status(
                confidence_id=record.confidence_id,
                status="failed",
                inference_basis=f"Failed during engine execution: {str(e)}"
            )
            raise e

    def get_preview_image_path(self, run_id: str) -> str:
        """
        Resolves the absolute file path of the generated preview PNG.
        """
        record = self.get_confidence(run_id)
        if record.confidence_status != "completed" or not record.confidence_preview_path:
            raise HTTPException(
                status_code=404,
                detail="Completed confidence preview image path is not registered."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        abs_path = os.path.abspath(os.path.join(workspace_root, record.confidence_preview_path))

        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=404,
                detail="Physical confidence preview file not found on disk."
            )
        return abs_path

    def delete_confidence_estimation(self, run_id: str) -> bool:
        """
        Deletes the confidence estimation record.
        """
        # Ensure run exists
        run = self.reconstruction_repo.get_by_id(run_id)
        if not run:
            raise HTTPException(
                status_code=404,
                detail=f"Reconstruction run {run_id} not found."
            )
        return self.confidence_repo.delete_by_reconstruction_run(run_id)
