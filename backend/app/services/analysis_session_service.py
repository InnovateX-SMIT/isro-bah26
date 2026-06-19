from fastapi import HTTPException
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.schemas.session import SessionResponse, SessionStatus

class AnalysisSessionService:
    """
    Service class handling high-level business logic, validation, and transition logic.
    Enforces lifecycle rules for Analysis Sessions.
    """
    def __init__(self, repository: AnalysisSessionRepository):
        self.repository = repository

    def create_analysis_session(self) -> SessionResponse:
        """
        Creates a new session and returns the Pydantic schema response.
        """
        session = self.repository.create()
        return SessionResponse.model_validate(session)

    def get_analysis_session(self, session_id: str) -> SessionResponse:
        """
        Retrieves a session. Raises 404 if not found.
        """
        session = self.repository.get_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        return SessionResponse.model_validate(session)

    def list_analysis_sessions(self) -> list[SessionResponse]:
        """
        Lists all sessions (newest first).
        """
        sessions = self.repository.list_all()
        return [SessionResponse.model_validate(s) for s in sessions]

    def update_analysis_status(self, session_id: str, status: SessionStatus) -> SessionResponse:
        """
        Validates transitions and updates status.
        Allowed Transitions:
        - created -> active
        - active -> completed
        - active -> failed
        Raises 404 if not found, 409 if transition is invalid.
        """
        session = self.repository.get_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        current_status = session.status
        target_status = status

        # Enforce transitions
        is_valid = False
        if current_status == SessionStatus.CREATED and target_status == SessionStatus.ACTIVE:
            is_valid = True
        elif current_status == SessionStatus.ACTIVE and target_status in (SessionStatus.COMPLETED, SessionStatus.FAILED):
            is_valid = True

        if not is_valid:
            raise HTTPException(
                status_code=409,
                detail=f"Invalid lifecycle transition from '{current_status}' to '{target_status}'"
            )

        updated = self.repository.update_status(session_id, target_status)
        return SessionResponse.model_validate(updated)

    def delete_analysis_session(self, session_id: str) -> bool:
        """
        Deletes a session. Active sessions cannot be deleted.
        Raises 404 if not found, 409 if active.
        """
        session = self.repository.get_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        if session.status == SessionStatus.ACTIVE:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete an active session"
            )

        return self.repository.delete(session_id)
