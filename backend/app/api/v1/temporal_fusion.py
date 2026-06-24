from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
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

from app.services.temporal_fusion_service import TemporalFusionService
from app.schemas.temporal_fusion import (
    TemporalFusionResponse,
    TemporalFusionRunResponse,
    TemporalFusionSummaryResponse,
    TemporalFusionRunRequest
)

router = APIRouter()

def get_temporal_fusion_service(db: Session = Depends(get_db)) -> TemporalFusionService:
    """
    Dependency provider instantiating TemporalFusionService with all required repositories.
    """
    return TemporalFusionService(
        db=db,
        temporal_fusion_repo=TemporalFusionRepository(db),
        session_repo=AnalysisSessionRepository(db),
        dataset_repo=DatasetRepository(db),
        metadata_repo=DatasetMetadataRepository(db),
        geospatial_repo=GeospatialRepository(db),
        temporal_context_repo=TemporalContextRepository(db),
        reference_stack_repo=TemporalReferenceStackRepository(db),
        selected_reference_repo=SelectedReferenceRepository(db),
        candidate_repo=TemporalCandidateRepository(db),
        cloud_analytics_repo=CloudAnalyticsRepository(db),
        reconstruction_repo=ReconstructionRepository(db)
    )

@router.post(
    "/run/{session_id}",
    response_model=TemporalFusionResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Temporal Fusion Engine",
    description="Validates all prerequisite runs and generates a compiled temporal fusion guidance package."
)
def run_temporal_fusion(
    session_id: str,
    payload: Optional[TemporalFusionRunRequest] = None,
    service: TemporalFusionService = Depends(get_temporal_fusion_service)
):
    strategy = payload.strategy if payload else "DEFAULT"
    return service.run_temporal_fusion(session_id=session_id, strategy=strategy)

@router.get(
    "/{session_id}",
    response_model=TemporalFusionRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Temporal Fusion Run Status",
    description="Retrieves the latest temporal fusion run status record for the session."
)
def get_temporal_fusion(
    session_id: str,
    service: TemporalFusionService = Depends(get_temporal_fusion_service)
):
    return service.get_latest_run(session_id)

@router.get(
    "/{session_id}/summary",
    response_model=TemporalFusionSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Temporal Fusion Run Summary",
    description="Retrieves the guidance summary of the latest temporal fusion run."
)
def get_temporal_fusion_summary(
    session_id: str,
    service: TemporalFusionService = Depends(get_temporal_fusion_service)
):
    return service.get_run_summary(session_id)

@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Temporal Fusion Runs",
    description="Deletes all temporal fusion runs associated with the given session ID."
)
def delete_temporal_fusion(
    session_id: str,
    service: TemporalFusionService = Depends(get_temporal_fusion_service)
):
    service.delete_temporal_fusion_runs(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
