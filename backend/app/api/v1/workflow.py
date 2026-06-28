from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.workflow import WorkflowResponse, WorkflowRunRequest
from app.services.workflow_service import WorkflowService
from app.services.workflow_orchestrator import WorkflowOrchestrator

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

@router.post("/run/{session_id}")
def run_orchestrated_workflow(
    session_id: str,
    payload: WorkflowRunRequest,
    db: Session = Depends(get_db)
):
    """
    Trigger the end-to-end orchestrated workflow for the given Analysis Session.
    """
    orchestrator = WorkflowOrchestrator(db)
    result = orchestrator.run_workflow(
        session_id=session_id,
        dataset_name=payload.dataset_name,
        dataset_path=payload.dataset_path,
        dataset_type=payload.dataset_type,
        temporal_window_days=payload.temporal_window_days,
        num_references=payload.num_references,
        reconstruction_strategy=payload.reconstruction_strategy
    )
    return result

