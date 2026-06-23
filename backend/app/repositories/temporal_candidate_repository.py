import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.temporal_candidate import TemporalCandidate

class TemporalCandidateRepository:
    """
    Repository layer handling low-level database operations for TemporalCandidate records.
    """

    def __init__(self, db: Session):
        self.db = db

    def bulk_create(self, discovery_id: str, candidates_data: List[Dict[str, Any]]) -> List[TemporalCandidate]:
        """
        Creates and persists multiple candidate observations linked to a discovery.
        """
        db_candidates = []
        for c in candidates_data:
            metadata_str = json.dumps(c.get("metadata", {}))
            candidate = TemporalCandidate(
                discovery_id=discovery_id,
                candidate_id=c["candidate_id"],
                provider_name=c["provider_name"],
                acquisition_date=c["acquisition_date"],
                cloud_cover=c["cloud_cover"],
                spatial_overlap=c["spatial_overlap"],
                preview_url=c.get("preview_url"),
                metadata_json=metadata_str
            )
            self.db.add(candidate)
            db_candidates.append(candidate)
        
        self.db.commit()
        for db_c in db_candidates:
            self.db.refresh(db_c)
        return db_candidates

    def get_by_discovery(self, discovery_id: str) -> List[TemporalCandidate]:
        """
        Retrieves all candidate observations associated with a specific discovery run.
        """
        return self.db.query(TemporalCandidate).filter(
            TemporalCandidate.discovery_id == discovery_id
        ).order_by(TemporalCandidate.acquisition_date.asc()).all()

    def count(self, discovery_id: str) -> int:
        """
        Returns the number of candidates associated with a discovery run.
        """
        return self.db.query(TemporalCandidate).filter(
            TemporalCandidate.discovery_id == discovery_id
        ).count()
