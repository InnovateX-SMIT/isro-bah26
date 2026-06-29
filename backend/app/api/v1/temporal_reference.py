from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.temporal_candidate import TemporalCandidate
from app.services.temporal_service import TemporalService
from app.schemas.temporal_reference import (
    ReferenceSelectionRequest,
    ReferenceStackResponse,
    SelectedReferenceResponse
)

router = APIRouter()

def get_temporal_service() -> TemporalService:
    """
    Dependency provider instantiating the TemporalService.
    """
    return TemporalService()

@router.post(
    "/select/{session_id}",
    response_model=ReferenceStackResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Reference Selection",
    description="Evaluates all discovered candidates for this session, ranks them, selects the top N, and saves the stack."
)
def run_reference_selection(
    session_id: str,
    payload: ReferenceSelectionRequest,
    db: Session = Depends(get_db),
    service: TemporalService = Depends(get_temporal_service)
):
    return service.run_reference_selection(
        session_id=session_id,
        db=db,
        num_references=payload.num_references,
        custom_weights=payload.weights
    )

@router.get(
    "/references/{session_id}",
    response_model=ReferenceStackResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Latest Reference Stack",
    description="Retrieves the metadata and selected references of the latest reference stack generated for this session."
)
def get_reference_stack(
    session_id: str,
    db: Session = Depends(get_db),
    service: TemporalService = Depends(get_temporal_service)
):
    return service.get_reference_stack(session_id=session_id, db=db)

@router.get(
    "/references/{session_id}/selected",
    response_model=List[SelectedReferenceResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Selected References List",
    description="Retrieves the detailed list of selected reference candidates along with scores and explanations."
)
def get_selected_references(
    session_id: str,
    db: Session = Depends(get_db),
    service: TemporalService = Depends(get_temporal_service)
):
    return service.get_selected_references(session_id=session_id, db=db)

@router.get(
    "/references/{session_id}/candidate/{candidate_id}/preview",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Historical Reference Preview Image",
    description="Loads the downloaded historical reference GeoTIFF, generates a visual PNG preview, and streams it."
)
def get_historical_reference_preview(
    session_id: str,
    candidate_id: str,
    db: Session = Depends(get_db),
    service: TemporalService = Depends(get_temporal_service)
):
    candidate = db.query(TemporalCandidate).filter(
        (TemporalCandidate.id == candidate_id) | (TemporalCandidate.candidate_id == candidate_id)
    ).first()
    if not candidate:
        raise HTTPException(
            status_code=404,
            detail=f"Temporal candidate {candidate_id} not found."
        )
        
    try:
        preview_path = service.get_candidate_preview_path(candidate, db=db)
        return FileResponse(preview_path, media_type="image/png")
    except FileNotFoundError as fnfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical cloud-free image found: {fnfe}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical cloud-free image found: {e}"
        )
