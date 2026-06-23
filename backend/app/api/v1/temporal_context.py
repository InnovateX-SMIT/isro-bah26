from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.services.temporal_service import TemporalService
from app.schemas.temporal_context import (
    TemporalContextPackageResponse,
    TemporalContextResponse
)

router = APIRouter()
temporal_service = TemporalService()

@router.post(
    "/context/{session_id}",
    response_model=TemporalContextPackageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Temporal Context Package",
    description="Analyzes the reference selection stack, computes temporal/cloud/spatial stats, generates a text summary, and persists context."
)
def generate_temporal_context(
    session_id: str,
    db: Session = Depends(get_db)
):
    return temporal_service.generate_temporal_context(session_id, db)

@router.get(
    "/context/{session_id}",
    response_model=TemporalContextResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Temporal Context Record",
    description="Retrieves the flat temporal context record for a session."
)
def get_temporal_context(
    session_id: str,
    db: Session = Depends(get_db)
):
    context = temporal_service.get_temporal_context(session_id, db)
    if not context:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=404,
            detail=f"Temporal context not found for session {session_id}."
        )
    return context

@router.get(
    "/context/{session_id}/summary",
    response_model=str,
    status_code=status.HTTP_200_OK,
    summary="Get Temporal Context Summary",
    description="Retrieves only the human-readable operational briefing summary."
)
def get_temporal_summary(
    session_id: str,
    db: Session = Depends(get_db)
):
    return temporal_service.get_temporal_summary(session_id, db)

@router.get(
    "/context/{session_id}/statistics",
    response_model=TemporalContextPackageResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Temporal Context Package",
    description="Retrieves the complete temporal context package including statistics and references list."
)
def get_temporal_context_package(
    session_id: str,
    db: Session = Depends(get_db)
):
    return temporal_service.get_temporal_context_package(session_id, db)
