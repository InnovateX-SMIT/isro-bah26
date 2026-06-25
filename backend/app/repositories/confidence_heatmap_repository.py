from typing import Optional
from sqlalchemy.orm import Session
from app.models.confidence_heatmap import ConfidenceHeatmap

class ConfidenceHeatmapRepository:
    """
    Repository class handling low-level database operations for Confidence Heatmaps.
    Contains no FastAPI logic, validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_by_reliability_score(self, reliability_score_id: str) -> Optional[ConfidenceHeatmap]:
        """
        Retrieves confidence heatmap by parent reliability score ID.
        Part of lazy-generate-then-cache pattern.
        """
        return (
            self.db.query(ConfidenceHeatmap)
            .filter(ConfidenceHeatmap.reliability_score_id == reliability_score_id)
            .first()
        )

    def get_by_id(self, heatmap_id: str) -> Optional[ConfidenceHeatmap]:
        """
        Retrieves confidence heatmap by primary key heatmap_id.
        """
        return (
            self.db.query(ConfidenceHeatmap)
            .filter(ConfidenceHeatmap.heatmap_id == heatmap_id)
            .first()
        )

    def create(
        self,
        reliability_score_id: str,
        dataset_id: str,
        basis: str = "Initializing confidence heatmap visualization...",
        status: str = "pending"
    ) -> ConfidenceHeatmap:
        """
        Creates and persists a new ConfidenceHeatmap record.
        """
        record = ConfidenceHeatmap(
            reliability_score_id=reliability_score_id,
            dataset_id=dataset_id,
            heatmap_status=status,
            basis=basis
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def update_status(
        self,
        heatmap_id: str,
        status: str,
        confidence_overlay_path: Optional[str] = None,
        reliability_map_path: Optional[str] = None,
        legend_json: Optional[str] = None,
        basis: Optional[str] = None
    ) -> Optional[ConfidenceHeatmap]:
        """
        Updates fields on a confidence heatmap record.
        """
        record = self.db.query(ConfidenceHeatmap).filter(ConfidenceHeatmap.heatmap_id == heatmap_id).first()
        if record:
            record.heatmap_status = status
            if confidence_overlay_path is not None:
                record.confidence_overlay_path = confidence_overlay_path
            if reliability_map_path is not None:
                record.reliability_map_path = reliability_map_path
            if legend_json is not None:
                record.legend_json = legend_json
            if basis is not None:
                record.basis = basis
            self.db.commit()
            self.db.refresh(record)
        return record

    def delete_by_reliability_score(self, reliability_score_id: str) -> bool:
        """
        Deletes all confidence heatmaps associated with the parent reliability score.
        """
        records = self.db.query(ConfidenceHeatmap).filter(ConfidenceHeatmap.reliability_score_id == reliability_score_id).all()
        if records:
            for record in records:
                self.db.delete(record)
            self.db.commit()
            return True
        return False
