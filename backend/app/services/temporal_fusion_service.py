import json
from typing import Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.temporal_fusion_repository import TemporalFusionRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.temporal_context_repository import TemporalContextRepository
from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.selected_reference_repository import SelectedReferenceRepository
from app.repositories.temporal_candidate_repository import TemporalCandidateRepository
from app.repositories.cloud_analytics_repository import CloudAnalyticsRepository
from app.repositories.reconstruction_repository import ReconstructionRepository

from app.schemas.temporal_fusion import TemporalFusionResponse, TemporalFusionRunResponse, TemporalFusionSummaryResponse

class TemporalFusionService:
    """
    Service layer coordinating the Temporal Fusion Engine:
    1. Validates Session, Dataset, Reconstruction Run, Temporal Context, Reference Stack, and Cloud Analytics inputs.
    2. Instantiates temporal fusion run in RUNNING state.
    3. Aggregates data from preceding layers into a unified guidance package.
    4. Automatically generates dynamic explainability summaries.
    5. Completes the run in COMPLETED status (marking FAILED on errors).
    """
    def __init__(
        self,
        db: Session,
        temporal_fusion_repo: TemporalFusionRepository,
        session_repo: AnalysisSessionRepository,
        dataset_repo: DatasetRepository,
        metadata_repo: DatasetMetadataRepository,
        geospatial_repo: GeospatialRepository,
        temporal_context_repo: TemporalContextRepository,
        reference_stack_repo: TemporalReferenceStackRepository,
        selected_reference_repo: SelectedReferenceRepository,
        candidate_repo: TemporalCandidateRepository,
        cloud_analytics_repo: CloudAnalyticsRepository,
        reconstruction_repo: ReconstructionRepository
    ):
        self.db = db
        self.temporal_fusion_repo = temporal_fusion_repo
        self.session_repo = session_repo
        self.dataset_repo = dataset_repo
        self.metadata_repo = metadata_repo
        self.geospatial_repo = geospatial_repo
        self.temporal_context_repo = temporal_context_repo
        self.reference_stack_repo = reference_stack_repo
        self.selected_reference_repo = selected_reference_repo
        self.candidate_repo = candidate_repo
        self.cloud_analytics_repo = cloud_analytics_repo
        self.reconstruction_repo = reconstruction_repo

    def get_latest_run(self, session_id: str) -> TemporalFusionRunResponse:
        """
        Retrieves the latest temporal fusion run record for a session.
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )

        run = self.temporal_fusion_repo.get_latest_by_session(session_id)
        if not run:
            raise HTTPException(
                status_code=404,
                detail=f"No temporal fusion run found for session {session_id}."
            )
        return TemporalFusionRunResponse.model_validate(run)

    def get_run_summary(self, session_id: str) -> TemporalFusionSummaryResponse:
        """
        Retrieves the summary for the latest temporal fusion run in the session.
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )

        run = self.temporal_fusion_repo.get_latest_by_session(session_id)
        if not run:
            raise HTTPException(
                status_code=404,
                detail=f"No temporal fusion run found for session {session_id}."
            )
        return TemporalFusionSummaryResponse(
            session_id=run.session_id,
            fusion_status=run.fusion_status,
            guidance_summary=run.guidance_summary
        )

    def run_temporal_fusion(
        self,
        session_id: str,
        strategy: str = "DEFAULT"
    ) -> TemporalFusionResponse:
        """
        Executes the temporal fusion orchestrator pipeline.
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
        dataset = datasets[0]
        dataset_id = dataset.dataset_id

        # Step 3: Validate Reconstruction Framework
        reconstruction_run = self.reconstruction_repo.get_latest_by_session(session_id)
        if not reconstruction_run or reconstruction_run.reconstruction_status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail=f"Completed reconstruction framework run not found. Run reconstruction framework first."
            )

        # Step 4: Validate Temporal Context
        temporal_context = self.temporal_context_repo.get_by_dataset(dataset_id)
        if not temporal_context:
            raise HTTPException(
                status_code=400,
                detail=f"Temporal context not found for dataset {dataset_id}. Run temporal context generation first."
            )

        # Step 5: Validate Reference Stack
        ref_stack = self.reference_stack_repo.get_latest_by_session(session_id)
        if not ref_stack or ref_stack.selected_count == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No selected reference stack found for session {session_id}."
            )
        references = self.selected_reference_repo.get_by_stack(ref_stack.id)
        if not references:
            raise HTTPException(
                status_code=400,
                detail=f"Selected references details not found for stack {ref_stack.id}."
            )

        # Step 6: Validate Cloud Intelligence
        cloud_analytics = self.cloud_analytics_repo.get_by_dataset(dataset_id)
        if not cloud_analytics or cloud_analytics.analytics_status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Completed cloud analytics not found for dataset {dataset_id}. Run cloud analytics first."
            )

        # Step 7: Create Temporal Fusion Run in RUNNING status
        run = self.temporal_fusion_repo.create(
            session_id=session_id,
            dataset_id=dataset_id,
            reconstruction_run_id=reconstruction_run.id,
            reference_count=len(references),
            fusion_status="RUNNING",
            fusion_strategy=strategy
        )

        try:
            # Step 8: Generate Fusion Intelligence Package
            metadata = self.metadata_repo.get_by_dataset(dataset_id)

            # Build temporal distribution list
            temporal_distribution = []
            for ref in references:
                cand = ref.candidate
                if cand:
                    days_offset = None
                    if metadata and metadata.acquisition_date and cand.acquisition_date:
                        try:
                            from app.services.temporal.historical_discovery_service import parse_acquisition_date
                            d_target = parse_acquisition_date(metadata.acquisition_date)
                            d_cand = parse_acquisition_date(cand.acquisition_date)
                            days_offset = abs((d_cand - d_target).days)
                        except Exception:
                            pass
                    temporal_distribution.append({
                        "reference_id": cand.candidate_id,
                        "acquisition_date": cand.acquisition_date,
                        "days_offset": days_offset or ref.rank_position * 30 # fallback approximation
                    })

            # Retrieve spatial overlap details if available in context metadata_json
            spatial_overlap_summary = {
                "average": temporal_context.average_spatial_overlap,
                "min": temporal_context.average_spatial_overlap,
                "max": temporal_context.average_spatial_overlap
            }
            if temporal_context.metadata_json:
                try:
                    tc_meta = json.loads(temporal_context.metadata_json)
                    if "spatial_statistics" in tc_meta:
                        spatial_overlap_summary = tc_meta["spatial_statistics"]
                except Exception:
                    pass

            # Count providers represented
            providers = [ref.candidate.provider_name for ref in references if ref.candidate]
            provider_counts = {}
            for p in providers:
                provider_counts[p] = provider_counts.get(p, 0) + 1

            # Prepare reconstruction guidance mapping
            reconstruction_guidance = {
                "primary_provider_distribution": provider_counts or {"GoogleEarthEngine": len(references)},
                "strategy": strategy,
                "recommended_reference_stack_id": ref_stack.id,
                "reconstruction_target_percent": cloud_analytics.reconstruction_target_percent,
                "difficulty": cloud_analytics.scene_reconstruction_difficulty,
                "reconstruction_run_id": reconstruction_run.id
            }

            # Relevance rating metric (100 minus average cloud cover and temporal offset weight)
            temporal_relevance = max(10.0, min(100.0, 100.0 - temporal_context.average_cloud_cover - (temporal_context.average_temporal_distance * 0.1)))

            package = {
                "temporal_reference_count": len(references),
                "temporal_distribution": temporal_distribution,
                "average_cloud_cover": temporal_context.average_cloud_cover,
                "temporal_relevance": round(temporal_relevance, 2),
                "spatial_overlap_summary": spatial_overlap_summary,
                "reconstruction_guidance": reconstruction_guidance
            }

            # Step 9: Generate Guidance Summary
            guidance_summary = (
                f"Temporal fusion package generated successfully using {len(references)} selected references. "
                f"Fusion intelligence prepared for future reconstruction model execution."
            )

            # Step 10: Complete Run
            run = self.temporal_fusion_repo.update_status(
                run_id=run.id,
                status="COMPLETED",
                guidance_summary=guidance_summary
            )

            return TemporalFusionResponse(
                run=TemporalFusionRunResponse.model_validate(run),
                package=package
            )

        except Exception as e:
            self.temporal_fusion_repo.update_status(
                run_id=run.id,
                status="FAILED",
                guidance_summary=f"Temporal fusion pipeline failed: {str(e)}"
            )
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Temporal fusion pipeline encountered a critical error: {str(e)}"
            )

    def delete_temporal_fusion_runs(self, session_id: str) -> bool:
        """
        Deletes all temporal fusion runs associated with the session.
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )
        return self.temporal_fusion_repo.delete(session_id)
