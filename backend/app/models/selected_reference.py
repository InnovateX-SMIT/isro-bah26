import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class SelectedReference(Base):
    """
    SQLAlchemy Model representing a single selected candidate historical scene,
    including rank position, ranking score, and natural language selection explanation.
    """
    __tablename__ = "selected_references"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the selection record (UUIDv4 string)"
    )
    reference_stack_id = Column(
        String,
        ForeignKey("temporal_reference_stacks.id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent TemporalReferenceStack ID"
    )
    candidate_id = Column(
        String,
        ForeignKey("temporal_candidates.id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the underlying TemporalCandidate ID"
    )
    rank_position = Column(
        Integer,
        nullable=False,
        doc="Position in the selection ranking (1-indexed, e.g. 1 represents top choice)"
    )
    ranking_score = Column(
        Float,
        nullable=False,
        doc="Final composite ranking score (0.0 to 100.0)"
    )
    selection_reason = Column(
        Text,
        nullable=False,
        doc="Human-explainable reason stating why this candidate was selected"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when the selection record was created"
    )

    # Relationships
    reference_stack = relationship("TemporalReferenceStack", back_populates="selected_references")
    candidate = relationship("TemporalCandidate")
