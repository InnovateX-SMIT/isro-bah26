from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.workflow import WorkflowResponse
from app.services.workflow_service import WorkflowService

router = APIRouter(
    tags=["Workflow Monitoring"]
)

@router.get("/{session_id}", response_model=WorkflowResponse)
def get_workflow_profile(session_id: str, db: Session = Depends(get_db)):
    """
    Consolidated endpoint to fetch live pipeline status, timelines, logs, and stage properties for an active session.
    """
    service = WorkflowService(db)
    return service.get_session_workflow(session_id)
