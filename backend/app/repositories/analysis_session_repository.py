from sqlalchemy.orm import Session
from app.models.session import AnalysisSession

class AnalysisSessionRepository:
    """
    Repository class handling low-level database operations for Analysis Sessions.
    Contains no FastAPI logic, validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def create(self, status: str = "created") -> AnalysisSession:
        """
        Creates a new AnalysisSession and persists it in the database.
        """
        session = AnalysisSession(status=status)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_by_id(self, session_id: str) -> AnalysisSession | None:
        """
        Retrieves a single AnalysisSession by its ID. Returns None if not found.
        """
        return self.db.query(AnalysisSession).filter(AnalysisSession.session_id == session_id).first()

    def list_all(self) -> list[AnalysisSession]:
        """
        Retrieves all AnalysisSessions ordered by created_at DESC (newest first).
        """
        return self.db.query(AnalysisSession).order_by(AnalysisSession.created_at.desc()).all()

    def update_status(self, session_id: str, status: str) -> AnalysisSession | None:
        """
        Updates the status of an existing session. Returns the updated session object or None.
        """
        session = self.get_by_id(session_id)
        if session:
            session.status = status
            self.db.commit()
            self.db.refresh(session)
        return session

    def delete(self, session_id: str) -> bool:
        """
        Deletes a session from the database. Returns True if deleted, False if not found.
        """
        session = self.get_by_id(session_id)
        if session:
            self.db.delete(session)
            self.db.commit()
            return True
        return False
