from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.selected_reference import SelectedReference

class SelectedReferenceRepository:
    """
    Repository layer handling low-level database operations for SelectedReference records.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        reference_stack_id: str,
        candidate_id: str,
        rank_position: int,
        ranking_score: float,
        selection_reason: str
    ) -> SelectedReference:
        """
        Creates and persists a single SelectedReference record.
        """
        ref = SelectedReference(
            reference_stack_id=reference_stack_id,
            candidate_id=candidate_id,
            rank_position=rank_position,
            ranking_score=ranking_score,
            selection_reason=selection_reason
        )
        self.db.add(ref)
        self.db.commit()
        self.db.refresh(ref)
        return ref

    def bulk_create(
        self,
        reference_stack_id: str,
        selected_references_data: List[Dict[str, Any]]
    ) -> List[SelectedReference]:
        """
        Bulk inserts multiple selected reference observations.
        """
        db_references = []
        for r in selected_references_data:
            ref = SelectedReference(
                reference_stack_id=reference_stack_id,
                candidate_id=r["candidate_id"],
                rank_position=r["rank_position"],
                ranking_score=r["ranking_score"],
                selection_reason=r["selection_reason"]
            )
            self.db.add(ref)
            db_references.append(ref)
        
        self.db.commit()
        for db_ref in db_references:
            self.db.refresh(db_ref)
        return db_references

    def get_by_stack(self, stack_id: str) -> List[SelectedReference]:
        """
        Retrieves all selected references linked to a stack, ordered by rank position ASC.
        """
        return self.db.query(SelectedReference).filter(
            SelectedReference.reference_stack_id == stack_id
        ).order_by(SelectedReference.rank_position.asc()).all()
