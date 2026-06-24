from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
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

from app.services.reconstruction_service import ReconstructionService
from app.schemas.reconstruction import (
    ReconstructionResponse,
    ReconstructionRunResponse,
    ReconstructionSummaryResponse,
    ReconstructionRunRequest
)

router = APIRouter()

def get_reconstruction_service(db: Session = Depends(get_db)) -> ReconstructionService:
    """
    Dependency provider instantiating ReconstructionService with all required repositories.
    """
    return ReconstructionService(
        db=db,
        reconstruction_repo=ReconstructionRepository(db),
        session_repo=AnalysisSessionRepository(db),
        dataset_repo=DatasetRepository(db),
        metadata_repo=DatasetMetadataRepository(db),
        geospatial_repo=GeospatialRepository(db),
        geospatial_profile_repo=GeospatialContextProfileRepository(db),
        temporal_context_repo=TemporalContextRepository(db),
        cloud_analytics_repo=CloudAnalyticsRepository(db),
        cloud_detection_repo=CloudDetectionRepository(db),
        cloud_classification_repo=CloudClassificationRepository(db),
        cloud_shadow_repo=CloudShadowRepository(db),
        cloud_segmentation_repo=CloudSegmentationRepository(db)
    )

@router.post(
    "/run/{session_id}",
    response_model=ReconstructionResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Reconstruction Pipeline Foundation",
    description="Validates all geospatial/temporal/cloud prerequisites and builds a reconstruction package."
)
def run_reconstruction(
    session_id: str,
    payload: Optional[ReconstructionRunRequest] = None,
    service: ReconstructionService = Depends(get_reconstruction_service)
):
    strategy = payload.strategy if payload else "DEFAULT"
    return service.run_reconstruction_pipeline(session_id=session_id, strategy=strategy)

@router.get(
    "/{session_id}",
    response_model=ReconstructionRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Reconstruction Run Status",
    description="Retrieves the latest reconstruction run status record for the session."
)
def get_reconstruction(
    session_id: str,
    service: ReconstructionService = Depends(get_reconstruction_service)
):
    return service.get_latest_run(session_id)

@router.get(
    "/{session_id}/summary",
    response_model=ReconstructionSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Reconstruction Run Summary",
    description="Retrieves the explainability summary of the latest reconstruction run."
)
def get_reconstruction_summary(
    session_id: str,
    service: ReconstructionService = Depends(get_reconstruction_service)
):
    return service.get_run_summary(session_id)

@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Reconstruction Runs",
    description="Deletes all reconstruction runs associated with the given session ID."
)
def delete_reconstruction(
    session_id: str,
    service: ReconstructionService = Depends(get_reconstruction_service)
):
    service.delete_reconstruction_runs(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
