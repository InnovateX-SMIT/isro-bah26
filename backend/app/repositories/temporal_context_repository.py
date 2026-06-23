from typing import Optional
from sqlalchemy.orm import Session
from app.models.temporal_context import TemporalContext

class TemporalContextRepository:
    """
    Repository layer handling low-level database operations for TemporalContext records.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        session_id: str,
        dataset_id: str,
        reference_stack_id: str,
        provider_count: int,
        reference_count: int,
        average_cloud_cover: float,
        average_temporal_distance: float,
        average_spatial_overlap: float,
        summary: str,
        metadata_json: str
    ) -> TemporalContext:
        """
        Creates and persists a new TemporalContext record.
        """
        # Ensure only one context per session/dataset exists
        existing = self.get_by_session(session_id)
        if existing:
            self.db.delete(existing)
            self.db.commit()

        context = TemporalContext(
            session_id=session_id,
            dataset_id=dataset_id,
            reference_stack_id=reference_stack_id,
            provider_count=provider_count,
            reference_count=reference_count,
            average_cloud_cover=average_cloud_cover,
            average_temporal_distance=average_temporal_distance,
            average_spatial_overlap=average_spatial_overlap,
            summary=summary,
            metadata_json=metadata_json
        )
        self.db.add(context)
        self.db.commit()
        self.db.refresh(context)
        return context

    def update(
        self,
        context_id: str,
        update_fields: dict
    ) -> Optional[TemporalContext]:
        """
        Updates fields of a temporal context record.
        """
        context = self.get_by_id(context_id)
        if context:
            for key, val in update_fields.items():
                if hasattr(context, key):
                    setattr(context, key, val)
            self.db.commit()
            self.db.refresh(context)
        return context

    def get_by_session(self, session_id: str) -> Optional[TemporalContext]:
        """
        Retrieves the temporal context record associated with the given session ID.
        """
        return self.db.query(TemporalContext).filter(
            TemporalContext.session_id == session_id
        ).first()

    def get_latest(self, session_id: str) -> Optional[TemporalContext]:
        """
        Alias/helper to fetch latest context (since session is 1:1, get_by_session is equivalent).
        """
        return self.get_by_session(session_id)

    def get_by_id(self, context_id: str) -> Optional[TemporalContext]:
        """
        Retrieves a temporal context record by its ID.
        """
        return self.db.query(TemporalContext).filter(
            TemporalContext.id == context_id
        ).first()

    def get_by_dataset(self, dataset_id: str) -> Optional[TemporalContext]:
        """
        Retrieves the temporal context record associated with the given dataset ID.
        """
        return self.db.query(TemporalContext).filter(
            TemporalContext.dataset_id == dataset_id
        ).first()
