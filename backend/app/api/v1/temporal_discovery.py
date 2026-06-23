from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.temporal_service import TemporalService
from app.schemas.temporal_discovery import (
    TemporalDiscoveryRequest,
    TemporalDiscoveryResponse,
    TemporalCandidateListResponse
)

router = APIRouter()

def get_temporal_service() -> TemporalService:
    """
    Dependency provider instantiating the TemporalService.
    """
    return TemporalService()

@router.post(
    "/discover/{session_id}",
    response_model=TemporalCandidateListResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Historical Discovery",
    description="Triggers the Historical Discovery Engine to search for reference candidates matching the dataset footprint."
)
def run_discovery(
    session_id: str,
    payload: TemporalDiscoveryRequest,
    db: Session = Depends(get_db),
    service: TemporalService = Depends(get_temporal_service)
):
    return service.run_discovery(
        session_id=session_id,
        db=db,
        provider_name=payload.provider_name,
        temporal_window_days=payload.temporal_window_days
    )

@router.get(
    "/discover/{session_id}",
    response_model=TemporalDiscoveryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Latest Discovery Metadata",
    description="Retrieves metadata details of the latest discovery run executed for this session."
)
def get_latest_discovery(
    session_id: str,
    db: Session = Depends(get_db),
    service: TemporalService = Depends(get_temporal_service)
):
    return service.get_discovery(session_id=session_id, db=db)

@router.get(
    "/discover/{session_id}/candidates",
    response_model=TemporalCandidateListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Discovered Candidates",
    description="Retrieves the list of candidate observations matching the latest discovery run."
)
def get_discovered_candidates(
    session_id: str,
    db: Session = Depends(get_db),
    service: TemporalService = Depends(get_temporal_service)
):
    return service.get_candidates(session_id=session_id, db=db)
