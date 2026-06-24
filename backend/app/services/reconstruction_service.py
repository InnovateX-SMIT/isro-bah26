import json
import os
from typing import Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.geospatial_context_profile_repository import GeospatialContextProfileRepository
from app.repositories.temporal_context_repository import TemporalContextRepository
from app.repositories.cloud_analytics_repository import CloudAnalyticsRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.temporal_fusion_repository import TemporalFusionRepository

from app.schemas.reconstruction import ReconstructionResponse, ReconstructionRunResponse, ReconstructionSummaryResponse

class ReconstructionService:
    """
    Service layer coordinating the Reconstruction Framework Foundation:
    1. Validating Analysis Session, Dataset, Temporal Context, and Cloud Intelligence prerequisites.
    2. Tracking reconstruction run lifecycle (PENDING -> RUNNING -> COMPLETED or FAILED).
    3. Bundling inputs into a structured Reconstruction Package.
    4. Executing V1 reconstruction engine using inpainting and temporal guidance.
    """
    def __init__(
        self,
        db: Session,
        reconstruction_repo: ReconstructionRepository,
        session_repo: AnalysisSessionRepository,
        dataset_repo: DatasetRepository,
        metadata_repo: DatasetMetadataRepository,
        geospatial_repo: GeospatialRepository,
        geospatial_profile_repo: GeospatialContextProfileRepository,
        temporal_context_repo: TemporalContextRepository,
        cloud_analytics_repo: CloudAnalyticsRepository,
        cloud_detection_repo: CloudDetectionRepository,
        cloud_classification_repo: CloudClassificationRepository,
        cloud_shadow_repo: CloudShadowRepository,
        cloud_segmentation_repo: CloudSegmentationRepository,
        temporal_fusion_repo: TemporalFusionRepository
    ):
        self.db = db
        self.reconstruction_repo = reconstruction_repo
        self.session_repo = session_repo
        self.dataset_repo = dataset_repo
        self.metadata_repo = metadata_repo
        self.geospatial_repo = geospatial_repo
        self.geospatial_profile_repo = geospatial_profile_repo
        self.temporal_context_repo = temporal_context_repo
        self.cloud_analytics_repo = cloud_analytics_repo
        self.cloud_detection_repo = cloud_detection_repo
        self.cloud_classification_repo = cloud_classification_repo
        self.cloud_shadow_repo = cloud_shadow_repo
        self.cloud_segmentation_repo = cloud_segmentation_repo
        self.temporal_fusion_repo = temporal_fusion_repo

    def get_latest_run(self, session_id: str) -> ReconstructionRunResponse:
        """
        Retrieves the latest reconstruction run record for a session.
        """
        # Validate session first
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )

        run = self.reconstruction_repo.get_latest_by_session(session_id)
        if not run:
            raise HTTPException(
                status_code=404,
                detail=f"No reconstruction run found for session {session_id}."
            )
        return ReconstructionRunResponse.model_validate(run)

    def get_run_summary(self, session_id: str) -> ReconstructionSummaryResponse:
        """
        Retrieves the summary for the latest reconstruction run in the session.
        """
        # Validate session first
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )

        run = self.reconstruction_repo.get_latest_by_session(session_id)
        if not run:
            raise HTTPException(
                status_code=404,
                detail=f"No reconstruction run found for session {session_id}."
            )
        return ReconstructionSummaryResponse(
            session_id=run.session_id,
            reconstruction_status=run.reconstruction_status,
            summary=run.summary
        )

    def run_reconstruction_pipeline(
        self,
        session_id: str,
        strategy: str = "DEFAULT"
    ) -> ReconstructionResponse:
        """
        Executes the reconstruction orchestrator:
        1. Validate Session.
        2. Validate Dataset.
        3. Validate Temporal Context.
        4. Validate Cloud Intelligence.
        5. Initialize run record in status RUNNING.
        6. Build structured reconstruction package from all layers.
        7. Generate explainability summary.
        8. Complete run in status COMPLETED.
        """
        # Step 1: Validate Session
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )

        # Step 2: Validate Dataset
        datasets = self.dataset_repo.list_session_datasets(session_id)
        if not datasets:
            raise HTTPException(
                status_code=404,
                detail=f"No datasets registered under session {session_id}."
            )
        # Select target dataset (we follow the platform standard of taking the active/latest registered dataset)
        dataset = datasets[0]
        dataset_id = dataset.dataset_id

        # Step 3: Validate Temporal Context
        temporal_context = self.temporal_context_repo.get_by_dataset(dataset_id)
        if not temporal_context:
            raise HTTPException(
                status_code=400,
                detail=f"Temporal context not found for dataset {dataset_id}. Run temporal context generation first."
            )

        # Step 4: Validate Cloud Intelligence
        cloud_analytics = self.cloud_analytics_repo.get_by_dataset(dataset_id)
        if not cloud_analytics or cloud_analytics.analytics_status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Completed cloud analytics not found for dataset {dataset_id}. Run cloud analytics first."
            )
        if not cloud_analytics.reconstruction_readiness:
            raise HTTPException(
                status_code=400,
                detail=f"Cloud analytics indicates dataset {dataset_id} is not ready for reconstruction."
            )

        # Step 5: Create Reconstruction Run in RUNNING status
        run = self.reconstruction_repo.create(
            session_id=session_id,
            dataset_id=dataset_id,
            reconstruction_status="RUNNING",
            reconstruction_strategy=strategy
        )

        try:
            # Step 6: Build Reconstruction Package
            # A. Fetch details
            metadata = self.metadata_repo.get_by_dataset(dataset_id)
            geo_context = self.geospatial_repo.get_by_dataset(dataset_id)
            geo_profile = self.geospatial_profile_repo.get_by_dataset(dataset_id)

            # B. Format sub-profiles
            metadata_profile = {
                "coordinate_system": metadata.coordinate_system if metadata else None,
                "projection_name": metadata.projection_name if metadata else None,
                "epsg_code": metadata.epsg_code if metadata else None,
                "utm_zone": metadata.utm_zone if metadata else None,
                "raster_width": metadata.raster_width if metadata else None,
                "raster_height": metadata.raster_height if metadata else None,
                "band_count": metadata.band_count if metadata else None,
                "acquisition_date": metadata.acquisition_date if metadata else None,
            }

            geospatial_profile = {
                "center_lat": geo_context.center_lat if geo_context else None,
                "center_lon": geo_context.center_lon if geo_context else None,
                "min_lat": geo_context.min_lat if geo_context else None,
                "min_lon": geo_context.min_lon if geo_context else None,
                "max_lat": geo_context.max_lat if geo_context else None,
                "max_lon": geo_context.max_lon if geo_context else None,
                "terrain_type": geo_profile.terrain_type if geo_profile else None,
                "environment_type": geo_profile.environment_type if geo_profile else None,
            }

            temporal_metadata = {}
            if temporal_context.metadata_json:
                try:
                    temporal_metadata = json.loads(temporal_context.metadata_json)
                except Exception:
                    pass

            temporal_profile = {
                "provider_count": temporal_context.provider_count,
                "reference_count": temporal_context.reference_count,
                "average_cloud_cover": temporal_context.average_cloud_cover,
                "average_temporal_distance": temporal_context.average_temporal_distance,
                "average_spatial_overlap": temporal_context.average_spatial_overlap,
                "summary": temporal_context.summary,
                "metadata": temporal_metadata
            }

            cloud_intelligence_profile = {
                "total_cloud_coverage_percent": cloud_analytics.total_cloud_coverage_percent,
                "total_shadow_coverage_percent": cloud_analytics.total_shadow_coverage_percent,
                "reconstruction_target_percent": cloud_analytics.reconstruction_target_percent,
                "scene_cloud_complexity_score": cloud_analytics.scene_cloud_complexity_score,
                "scene_reconstruction_difficulty": cloud_analytics.scene_reconstruction_difficulty,
                "cloud_burden_index": cloud_analytics.cloud_burden_index,
                "reconstruction_readiness": cloud_analytics.reconstruction_readiness,
            }

            package = {
                "metadata_profile": metadata_profile,
                "geospatial_profile": geospatial_profile,
                "temporal_profile": temporal_profile,
                "cloud_intelligence_profile": cloud_intelligence_profile,
                "reconstruction_strategy": strategy
            }

            # Resolve paths relative to workspace root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
            dataset_path = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))
            
            mask_rel_path = f"datasets/cloud_segmentations/{dataset_id}/reconstruction_mask.tif"
            mask_path = os.path.abspath(os.path.join(workspace_root, mask_rel_path))
            
            output_rel_dir = f"datasets/reconstructions/{dataset_id}"
            output_dir = os.path.abspath(os.path.join(workspace_root, output_rel_dir))

            # Query Temporal Fusion parameters
            # If TemporalFusionRun exists, extract parameters, else fall back to temporal context values
            temporal_relevance = 85.0
            provider_name = "GoogleEarthEngine"
            
            try:
                fusion_run = self.temporal_fusion_repo.get_latest_by_session(session_id)
                if fusion_run and fusion_run.fusion_status == "COMPLETED":
                    provider_name = "GoogleEarthEngine"  # primary provider
                    # calculate simulated relevance score
                    temporal_relevance = max(10.0, min(100.0, 100.0 - temporal_context.average_cloud_cover - (temporal_context.average_temporal_distance * 0.1)))
            except Exception:
                pass

            # Execute Reconstruction Engine V1
            from app.services.reconstruction.reconstruction_engine import execute_reconstruction
            result = execute_reconstruction(
                dataset_path=dataset_path,
                mask_path=mask_path,
                output_dir=output_dir,
                strategy=strategy,
                temporal_relevance=temporal_relevance,
                provider_name=provider_name
            )

            # Write reconstruction_metadata.json on disk
            meta_json_path = os.path.join(output_dir, "reconstruction_metadata.json")
            from datetime import datetime
            meta_payload = {
                "generation_timestamp": datetime.utcnow().isoformat() + "Z",
                "reconstruction_method": result["method_used"],
                "source_dataset": dataset_id,
                "temporal_guidance_used": {
                    "strategy": result["strategy"],
                    "relevance": result["temporal_relevance"],
                    "provider": result["provider_name"]
                }
            }
            with open(meta_json_path, "w") as f:
                json.dump(meta_payload, f, indent=4)

            summary = (
                f"Reconstruction run completed successfully using {result['method_used']}. "
                f"Generated reconstructed image raster and visual previews in {result['execution_time_ms']} ms."
            )

            # Update Reconstruction Run in Database
            run = self.reconstruction_repo.update_status(
                run_id=run.id,
                status="COMPLETED",
                summary=summary,
                output_image_path=f"{output_rel_dir}/reconstructed_image.tif",
                preview_image_path=f"{output_rel_dir}/reconstruction_preview.png",
                reconstruction_method=result["method_used"],
                execution_time_ms=result["execution_time_ms"]
            )

            return ReconstructionResponse(
                run=ReconstructionRunResponse.model_validate(run),
                package=package
            )

        except Exception as e:
            # Update to FAILED status
            self.reconstruction_repo.update_status(
                run_id=run.id,
                status="FAILED",
                summary=f"Reconstruction execution failed: {str(e)}"
            )
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Reconstruction pipeline encountered a critical error: {str(e)}"
            )

    def delete_reconstruction_runs(self, session_id: str) -> bool:
        """
        Deletes all reconstruction runs associated with the session.
        """
        # Validate session first
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )
        return self.reconstruction_repo.delete(session_id)

    def get_preview_image_path(self, session_id: str) -> str:
        """
        Resolves the absolute file path of the generated preview PNG for a completed reconstruction.
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )
        
        run = self.reconstruction_repo.get_latest_by_session(session_id)
        if not run or run.reconstruction_status != "COMPLETED":
            raise HTTPException(
                status_code=404,
                detail=f"Completed reconstruction run not found for session {session_id}."
            )

        if not run.preview_image_path:
             raise HTTPException(
                status_code=404,
                detail="Reconstruction preview image path is not registered."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        abs_path = os.path.abspath(os.path.join(workspace_root, run.preview_image_path))

        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=404,
                detail="Physical reconstruction preview file not found on disk."
            )
        return abs_path

    def run_reconstruction_optimization(self, session_id: str) -> Dict[str, Any]:
        """
        Executes the reconstruction optimization workflow (Phase 7D):
        1. Fetch the latest completed reconstruction run.
        2. Set optimization status to RUNNING.
        3. Invoke the reconstruction optimizer to post-process.
        4. Record optimized paths, timestamp, and method to the database.
        5. Return database record and report.
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )

        run = self.reconstruction_repo.get_latest_by_session(session_id)
        if not run or run.reconstruction_status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail=f"No completed reconstruction run found for session {session_id}. Run reconstruction first."
            )

        self.reconstruction_repo.update_optimization(
            run_id=run.id,
            optimization_status="RUNNING"
        )

        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

            dataset = self.dataset_repo.get_dataset(run.dataset_id)
            dataset_path = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))
            
            mask_rel_path = f"datasets/cloud_segmentations/{run.dataset_id}/reconstruction_mask.tif"
            mask_path = os.path.abspath(os.path.join(workspace_root, mask_rel_path))
            
            rec_image_path = os.path.abspath(os.path.join(workspace_root, run.output_image_path))
            output_rel_dir = f"datasets/reconstructions/{run.dataset_id}"
            output_dir = os.path.abspath(os.path.join(workspace_root, output_rel_dir))

            from app.services.reconstruction.optimization.reconstruction_optimizer import optimize_reconstruction_pipeline
            result = optimize_reconstruction_pipeline(
                reconstructed_image_path=rec_image_path,
                mask_path=mask_path,
                dataset_path=dataset_path,
                output_dir=output_dir
            )

            from datetime import datetime
            opt_method = "+".join(result["report"]["optimization_methods"])
            
            updated_run = self.reconstruction_repo.update_optimization(
                run_id=run.id,
                optimization_status="COMPLETED",
                optimization_timestamp=datetime.utcnow(),
                optimization_method=opt_method,
                optimized_output_path=f"{output_rel_dir}/optimized_reconstruction.tif",
                optimized_preview_path=f"{output_rel_dir}/optimized_preview.png"
            )

            return {
                "run": updated_run,
                "report": result["report"]
            }

        except Exception as e:
            self.reconstruction_repo.update_optimization(
                run_id=run.id,
                optimization_status="FAILED"
            )
            raise HTTPException(
                status_code=500,
                detail=f"Reconstruction optimization failed: {str(e)}"
            )

    def get_optimized_preview_image_path(self, session_id: str) -> str:
        """
        Resolves the absolute file path of the optimized preview PNG.
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )
        
        run = self.reconstruction_repo.get_latest_by_session(session_id)
        if not run or run.optimization_status != "COMPLETED":
            raise HTTPException(
                status_code=404,
                detail=f"Completed optimized reconstruction run not found for session {session_id}."
            )

        if not run.optimized_preview_path:
             raise HTTPException(
                status_code=404,
                detail="Optimized preview image path is not registered."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        abs_path = os.path.abspath(os.path.join(workspace_root, run.optimized_preview_path))

        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=404,
                detail="Physical optimized preview file not found on disk."
            )
        return abs_path
