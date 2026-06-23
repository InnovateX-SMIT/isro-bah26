from typing import Optional
from sqlalchemy.orm import Session
from app.models.temporal_reference_stack import TemporalReferenceStack

class TemporalReferenceStackRepository:
    """
    Repository layer handling low-level database operations for TemporalReferenceStack records.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        session_id: str,
        dataset_id: str,
        discovery_id: str,
        selected_count: int,
        selection_strategy: str = "weighted_composite"
    ) -> TemporalReferenceStack:
        """
        Creates and persists a new TemporalReferenceStack run metadata record.
        """
        stack = TemporalReferenceStack(
            session_id=session_id,
            dataset_id=dataset_id,
            discovery_id=discovery_id,
            selected_count=selected_count,
            selection_strategy=selection_strategy
        )
        self.db.add(stack)
        self.db.commit()
        self.db.refresh(stack)
        return stack

    def get_by_id(self, stack_id: str) -> Optional[TemporalReferenceStack]:
        """
        Retrieves a single TemporalReferenceStack by its unique ID.
        """
        return self.db.query(TemporalReferenceStack).filter(
            TemporalReferenceStack.id == stack_id
        ).first()

    def get_latest_by_session(self, session_id: str) -> Optional[TemporalReferenceStack]:
        """
        Retrieves the latest generated reference stack for the given session ID.
        """
        return self.db.query(TemporalReferenceStack).filter(
            TemporalReferenceStack.session_id == session_id
        ).order_by(TemporalReferenceStack.created_at.desc()).first()
