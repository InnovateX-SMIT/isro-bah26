from typing import Optional
from sqlalchemy.orm import Session
from app.models.temporal_fusion_run import TemporalFusionRun

class TemporalFusionRepository:
    """
    Repository class handling low-level database operations for Temporal Fusion Runs.
    Contains no FastAPI logic, validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, run_id: str) -> Optional[TemporalFusionRun]:
        """
        Retrieves a single TemporalFusionRun by its ID.
        """
        return self.db.query(TemporalFusionRun).filter(TemporalFusionRun.id == run_id).first()

    def create(
        self,
        session_id: str,
        dataset_id: str,
        reconstruction_run_id: str,
        reference_count: int = 0,
        fusion_status: str = "PENDING",
        fusion_strategy: Optional[str] = None
    ) -> TemporalFusionRun:
        """
        Creates and persists a new TemporalFusionRun.
        """
        run = TemporalFusionRun(
            session_id=session_id,
            dataset_id=dataset_id,
            reconstruction_run_id=reconstruction_run_id,
            reference_count=reference_count,
            fusion_status=fusion_status,
            fusion_strategy=fusion_strategy
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def get_latest_by_session(self, session_id: str) -> Optional[TemporalFusionRun]:
        """
        Retrieves the latest temporal fusion run associated with the given session ID.
        """
        return (
            self.db.query(TemporalFusionRun)
            .filter(TemporalFusionRun.session_id == session_id)
            .order_by(TemporalFusionRun.created_at.desc())
            .first()
        )

    def get_by_dataset(self, dataset_id: str) -> Optional[TemporalFusionRun]:
        """
        Retrieves the latest temporal fusion run associated with the given dataset ID.
        """
        return (
            self.db.query(TemporalFusionRun)
            .filter(TemporalFusionRun.dataset_id == dataset_id)
            .order_by(TemporalFusionRun.created_at.desc())
            .first()
        )

    def update_status(
        self,
        run_id: str,
        status: str,
        guidance_summary: Optional[str] = None
    ) -> Optional[TemporalFusionRun]:
        """
        Updates the status and optional guidance summary of a temporal fusion run.
        """
        run = self.get_by_id(run_id)
        if run:
            run.fusion_status = status
            if guidance_summary is not None:
                run.guidance_summary = guidance_summary
            self.db.commit()
            self.db.refresh(run)
        return run

    def delete(self, session_id: str) -> bool:
        """
        Deletes all temporal fusion runs associated with the session.
        Returns True if records were found and deleted, False otherwise.
        """
        runs = self.db.query(TemporalFusionRun).filter(TemporalFusionRun.session_id == session_id).all()
        if runs:
            for run in runs:
                self.db.delete(run)
            self.db.commit()
            return True
        return False
