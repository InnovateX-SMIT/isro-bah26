from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.services.analysis_session_service import AnalysisSessionService
from app.schemas.session import SessionResponse, SessionUpdate

router = APIRouter()

def get_session_service(db: Session = Depends(get_db)) -> AnalysisSessionService:
    """
    Dependency injection provider returning an instance of AnalysisSessionService.
    """
    repository = AnalysisSessionRepository(db)
    return AnalysisSessionService(repository)

@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Analysis Session",
    description="Initializes a new isolated analysis and reconstruction session with status 'created'."
)
def create_session(service: AnalysisSessionService = Depends(get_session_service)):
    return service.create_analysis_session()

@router.get(
    "",
    response_model=list[SessionResponse],
    status_code=status.HTTP_200_OK,
    summary="List Analysis Sessions",
    description="Retrieves a list of all analysis sessions in the platform, ordered newest first (created_at DESC)."
)
def list_sessions(service: AnalysisSessionService = Depends(get_session_service)):
    return service.list_analysis_sessions()

@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve Session",
    description="Retrieves the detailed record of an analysis session by its unique ID. Returns 404 if not found."
)
def get_session(session_id: str, service: AnalysisSessionService = Depends(get_session_service)):
    return service.get_analysis_session(session_id)

@router.patch(
    "/{session_id}",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Status",
    description=(
        "Updates the status of an analysis session. Enforces strict state machine rules: "
        "created -> active, active -> completed, and active -> failed. "
        "Returns 404 if not found, and 409 if the transition is invalid."
    )
)
def update_status(
    session_id: str,
    payload: SessionUpdate,
    service: AnalysisSessionService = Depends(get_session_service)
):
    return service.update_analysis_status(session_id, payload.status)

@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Session",
    description=(
        "Deletes an analysis session by ID. Active sessions cannot be deleted. "
        "Returns 204 No Content on success, 404 if not found, and 409 if deletion is disallowed."
    )
)
def delete_session(session_id: str, service: AnalysisSessionService = Depends(get_session_service)):
    service.delete_analysis_session(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
