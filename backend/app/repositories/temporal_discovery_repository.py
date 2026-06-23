from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.temporal_discovery import TemporalDiscovery

class TemporalDiscoveryRepository:
    """
    Repository layer handling low-level database operations for TemporalDiscovery records.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        session_id: str,
        dataset_id: str,
        provider_used: str,
        search_window_start: str,
        search_window_end: str,
        status: str = "PENDING"
    ) -> TemporalDiscovery:
        """
        Creates and persists a new TemporalDiscovery record.
        """
        discovery = TemporalDiscovery(
            session_id=session_id,
            dataset_id=dataset_id,
            provider_used=provider_used,
            search_window_start=search_window_start,
            search_window_end=search_window_end,
            status=status
        )
        self.db.add(discovery)
        self.db.commit()
        self.db.refresh(discovery)
        return discovery

    def get_by_session(self, session_id: str) -> List[TemporalDiscovery]:
        """
        Retrieves all discovery runs associated with a specific session ID, ordered newest first.
        """
        return self.db.query(TemporalDiscovery).filter(
            TemporalDiscovery.session_id == session_id
        ).order_by(TemporalDiscovery.created_at.desc()).all()

    def update_status(self, discovery_id: str, status: str, candidate_count: Optional[int] = None) -> Optional[TemporalDiscovery]:
        """
        Updates the workflow status and optionally the count of discovered candidates.
        """
        discovery = self.db.query(TemporalDiscovery).filter(TemporalDiscovery.id == discovery_id).first()
        if discovery:
            discovery.status = status
            if candidate_count is not None:
                discovery.candidate_count = candidate_count
            self.db.commit()
            self.db.refresh(discovery)
        return discovery

    def get_latest(self, session_id: str) -> Optional[TemporalDiscovery]:
        """
        Retrieves the single latest discovery run for the given session.
        """
        return self.db.query(TemporalDiscovery).filter(
            TemporalDiscovery.session_id == session_id
        ).order_by(TemporalDiscovery.created_at.desc()).first()
