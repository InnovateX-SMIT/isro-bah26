from typing import Optional
from sqlalchemy.orm import Session
from app.models.reliability_score import ReliabilityScore

class ReliabilityRepository:
    """
    Repository class handling low-level database operations for Reliability Scores.
    Contains no FastAPI logic, validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_by_confidence_estimation(self, confidence_estimation_id: str) -> Optional[ReliabilityScore]:
        """
        Retrieves reliability score by parent confidence estimation ID.
        Part of lazy-generate-then-cache pattern.
        """
        return (
            self.db.query(ReliabilityScore)
            .filter(ReliabilityScore.confidence_estimation_id == confidence_estimation_id)
            .first()
        )

    def get_by_dataset(self, dataset_id: str) -> Optional[ReliabilityScore]:
        """
        Retrieves the latest reliability score record for a dataset.
        """
        return (
            self.db.query(ReliabilityScore)
            .filter(ReliabilityScore.dataset_id == dataset_id)
            .order_by(ReliabilityScore.created_at.desc())
            .first()
        )

    def create(
        self,
        confidence_estimation_id: str,
        dataset_id: str,
        scoring_basis: str = "Initializing reliability scoring...",
        status: str = "pending"
    ) -> ReliabilityScore:
        """
        Creates and persists a new ReliabilityScore record.
        """
        record = ReliabilityScore(
            confidence_estimation_id=confidence_estimation_id,
            dataset_id=dataset_id,
            reliability_status=status,
            scoring_basis=scoring_basis
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def update_status(
        self,
        reliability_id: str,
        status: str,
        dataset_reliability_score: Optional[float] = None,
        dataset_reliability_tier: Optional[str] = None,
        region_reliability_json: Optional[str] = None,
        reconstruction_reliability_score: Optional[float] = None,
        scoring_basis: Optional[str] = None
    ) -> Optional[ReliabilityScore]:
        """
        Updates fields on a reliability scoring record.
        """
        record = self.db.query(ReliabilityScore).filter(ReliabilityScore.reliability_id == reliability_id).first()
        if record:
            record.reliability_status = status
            if dataset_reliability_score is not None:
                record.dataset_reliability_score = dataset_reliability_score
            if dataset_reliability_tier is not None:
                record.dataset_reliability_tier = dataset_reliability_tier
            if region_reliability_json is not None:
                record.region_reliability_json = region_reliability_json
            if reconstruction_reliability_score is not None:
                record.reconstruction_reliability_score = reconstruction_reliability_score
            if scoring_basis is not None:
                record.scoring_basis = scoring_basis
            self.db.commit()
            self.db.refresh(record)
        return record

    def delete_by_confidence_estimation(self, confidence_estimation_id: str) -> bool:
        """
        Deletes all reliability scores associated with the parent confidence estimation.
        """
        records = self.db.query(ReliabilityScore).filter(ReliabilityScore.confidence_estimation_id == confidence_estimation_id).all()
        if records:
            for record in records:
                self.db.delete(record)
            self.db.commit()
            return True
        return False
