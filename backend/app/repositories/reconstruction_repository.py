from typing import Optional
from sqlalchemy.orm import Session
from app.models.reconstruction_run import ReconstructionRun

class ReconstructionRepository:
    """
    Repository class handling low-level database operations for Reconstruction Runs.
    Contains no FastAPI logic, validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, run_id: str) -> Optional[ReconstructionRun]:
        """
        Retrieves a single ReconstructionRun by its ID.
        """
        return self.db.query(ReconstructionRun).filter(ReconstructionRun.id == run_id).first()

    def create(
        self,
        session_id: str,
        dataset_id: str,
        reconstruction_status: str = "PENDING",
        reconstruction_strategy: Optional[str] = None
    ) -> ReconstructionRun:
        """
        Creates and persists a new ReconstructionRun.
        """
        run = ReconstructionRun(
            session_id=session_id,
            dataset_id=dataset_id,
            reconstruction_status=reconstruction_status,
            reconstruction_strategy=reconstruction_strategy
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def get_latest_by_session(self, session_id: str) -> Optional[ReconstructionRun]:
        """
        Retrieves the latest reconstruction run associated with the given session ID.
        """
        return (
            self.db.query(ReconstructionRun)
            .filter(ReconstructionRun.session_id == session_id)
            .order_by(ReconstructionRun.created_at.desc())
            .first()
        )

    def get_by_dataset(self, dataset_id: str) -> Optional[ReconstructionRun]:
        """
        Retrieves the latest reconstruction run associated with the given dataset ID.
        """
        return (
            self.db.query(ReconstructionRun)
            .filter(ReconstructionRun.dataset_id == dataset_id)
            .order_by(ReconstructionRun.created_at.desc())
            .first()
        )

    def update_status(
        self,
        run_id: str,
        status: str,
        summary: Optional[str] = None
    ) -> Optional[ReconstructionRun]:
        """
        Updates the status and optional summary of a reconstruction run.
        """
        run = self.get_by_id(run_id)
        if run:
            run.reconstruction_status = status
            if summary is not None:
                run.summary = summary
            self.db.commit()
            self.db.refresh(run)
        return run

    def delete(self, session_id: str) -> bool:
        """
        Deletes all reconstruction runs associated with the session.
        Returns True if records were found and deleted, False otherwise.
        """
        runs = self.db.query(ReconstructionRun).filter(ReconstructionRun.session_id == session_id).all()
        if runs:
            for run in runs:
                self.db.delete(run)
            self.db.commit()
            return True
        return False
