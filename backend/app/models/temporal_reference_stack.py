import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class TemporalReferenceStack(Base):
    """
    SQLAlchemy Model representing a finalized stack of selected historical reference scenes.
    """
    __tablename__ = "temporal_reference_stacks"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the reference stack run (UUIDv4 string)"
    )
    session_id = Column(
        String,
        ForeignKey("analysis_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Analysis Session ID"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Dataset ID"
    )
    discovery_id = Column(
        String,
        ForeignKey("temporal_discoveries.id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Discovery run ID"
    )
    selected_count = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Number of reference candidates selected in this stack"
    )
    selection_strategy = Column(
        String,
        nullable=False,
        default="weighted_composite",
        doc="Algorithm/Strategy identifier used to select candidates (e.g. weighted_composite)"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when the stack was created"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of the last status change or stack modification"
    )

    # Relationships
    selected_references = relationship("SelectedReference", back_populates="reference_stack", cascade="all, delete-orphan")
