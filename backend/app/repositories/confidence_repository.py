from typing import Optional
from sqlalchemy.orm import Session
from app.models.confidence_estimation import ConfidenceEstimation

class ConfidenceRepository:
    """
    Repository class handling low-level database operations for Confidence Estimations.
    Contains no FastAPI logic, validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, confidence_id: str) -> Optional[ConfidenceEstimation]:
        """
        Retrieves confidence estimation by confidence ID (primary key).
        """
        return (
            self.db.query(ConfidenceEstimation)
            .filter(ConfidenceEstimation.confidence_id == confidence_id)
            .first()
        )

    def get_by_reconstruction_run(self, run_id: str) -> Optional[ConfidenceEstimation]:
        """
        Retrieves confidence estimation by reconstruction run ID.
        Part of lazy-generate-then-cache pattern.
        """
        return (
            self.db.query(ConfidenceEstimation)
            .filter(ConfidenceEstimation.reconstruction_run_id == run_id)
            .first()
        )

    def get_by_dataset(self, dataset_id: str) -> Optional[ConfidenceEstimation]:
        """
        Retrieves confidence estimation by dataset ID.
        """
        return (
            self.db.query(ConfidenceEstimation)
            .filter(ConfidenceEstimation.dataset_id == dataset_id)
            .order_by(ConfidenceEstimation.created_at.desc())
            .first()
        )

    def create(
        self,
        reconstruction_run_id: str,
        dataset_id: str,
        inference_basis: str = "Initializing confidence estimation",
        status: str = "pending"
    ) -> ConfidenceEstimation:
        """
        Creates and persists a new ConfidenceEstimation record.
        """
        record = ConfidenceEstimation(
            reconstruction_run_id=reconstruction_run_id,
            dataset_id=dataset_id,
            confidence_status=status,
            inference_basis=inference_basis
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def update_status(
        self,
        confidence_id: str,
        status: str,
        mean_confidence_score: Optional[float] = None,
        low_confidence_area_percent: Optional[float] = None,
        confidence_map_path: Optional[str] = None,
        confidence_preview_path: Optional[str] = None,
        inference_basis: Optional[str] = None
    ) -> Optional[ConfidenceEstimation]:
        """
        Updates the status, scores, paths and basis details of a confidence estimation.
        """
        record = self.db.query(ConfidenceEstimation).filter(ConfidenceEstimation.confidence_id == confidence_id).first()
        if record:
            record.confidence_status = status
            if mean_confidence_score is not None:
                record.mean_confidence_score = mean_confidence_score
            if low_confidence_area_percent is not None:
                record.low_confidence_area_percent = low_confidence_area_percent
            if confidence_map_path is not None:
                record.confidence_map_path = confidence_map_path
            if confidence_preview_path is not None:
                record.confidence_preview_path = confidence_preview_path
            if inference_basis is not None:
                record.inference_basis = inference_basis
            self.db.commit()
            self.db.refresh(record)
        return record

    def delete_by_reconstruction_run(self, run_id: str) -> bool:
        """
        Deletes all confidence estimations associated with the reconstruction run.
        """
        records = self.db.query(ConfidenceEstimation).filter(ConfidenceEstimation.reconstruction_run_id == run_id).all()
        if records:
            for record in records:
                self.db.delete(record)
            self.db.commit()
            return True
        return False
