from typing import Optional
from sqlalchemy.orm import Session
from app.models.confidence_analytics import ConfidenceAnalytics

class ConfidenceAnalyticsRepository:
    """
    Repository class handling low-level database operations for Confidence Analytics.
    Contains no FastAPI logic, validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_by_confidence_heatmap(self, confidence_heatmap_id: str) -> Optional[ConfidenceAnalytics]:
        """
        Retrieves confidence analytics by parent confidence heatmap ID.
        Part of lazy-generate-then-cache pattern.
        """
        return (
            self.db.query(ConfidenceAnalytics)
            .filter(ConfidenceAnalytics.confidence_heatmap_id == confidence_heatmap_id)
            .first()
        )

    def get_by_id(self, analytics_id: str) -> Optional[ConfidenceAnalytics]:
        """
        Retrieves confidence analytics by primary key analytics_id.
        """
        return (
            self.db.query(ConfidenceAnalytics)
            .filter(ConfidenceAnalytics.analytics_id == analytics_id)
            .first()
        )

    def create(
        self,
        confidence_heatmap_id: str,
        dataset_id: str,
        report_basis: str = "Initializing confidence analytics report...",
        status: str = "pending"
    ) -> ConfidenceAnalytics:
        """
        Creates and persists a new ConfidenceAnalytics record.
        """
        record = ConfidenceAnalytics(
            confidence_heatmap_id=confidence_heatmap_id,
            dataset_id=dataset_id,
            analytics_status=status,
            report_basis=report_basis
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def update_status(
        self,
        analytics_id: str,
        status: str,
        confidence_report_path: Optional[str] = None,
        confidence_summary_path: Optional[str] = None,
        reliability_scorecard_path: Optional[str] = None,
        headline_summary: Optional[str] = None,
        report_basis: Optional[str] = None
    ) -> Optional[ConfidenceAnalytics]:
        """
        Updates fields on a confidence analytics record.
        """
        record = self.db.query(ConfidenceAnalytics).filter(ConfidenceAnalytics.analytics_id == analytics_id).first()
        if record:
            record.analytics_status = status
            if confidence_report_path is not None:
                record.confidence_report_path = confidence_report_path
            if confidence_summary_path is not None:
                record.confidence_summary_path = confidence_summary_path
            if reliability_scorecard_path is not None:
                record.reliability_scorecard_path = reliability_scorecard_path
            if headline_summary is not None:
                record.headline_summary = headline_summary
            if report_basis is not None:
                record.report_basis = report_basis
            self.db.commit()
            self.db.refresh(record)
        return record

    def delete_by_confidence_heatmap(self, confidence_heatmap_id: str) -> bool:
        """
        Deletes all confidence analytics records associated with the parent confidence heatmap.
        """
        records = self.db.query(ConfidenceAnalytics).filter(ConfidenceAnalytics.confidence_heatmap_id == confidence_heatmap_id).all()
        if records:
            for record in records:
                self.db.delete(record)
            self.db.commit()
            return True
        return False
