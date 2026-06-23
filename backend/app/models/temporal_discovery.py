import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class TemporalDiscovery(Base):
    """
    SQLAlchemy Model representing a search session run by the Historical Discovery Engine.
    Tracks provider, search parameters, status, and links back to the session/dataset.
    """
    __tablename__ = "temporal_discoveries"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the temporal discovery session (UUIDv4 string)"
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
    provider_used = Column(
        String,
        nullable=False,
        doc="Name of the temporal imagery provider used for this search"
    )
    search_window_start = Column(
        String,
        nullable=False,
        doc="Start date of the temporal search window (YYYY-MM-DD)"
    )
    search_window_end = Column(
        String,
        nullable=False,
        doc="End date of the temporal search window (YYYY-MM-DD)"
    )
    candidate_count = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Number of historical candidate observations discovered"
    )
    status = Column(
        String,
        nullable=False,
        default="PENDING",
        doc="Workflow status: PENDING, COMPLETED, FAILED"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when this discovery run was initialized"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of the last update to this discovery record"
    )

    # Relationships
    candidates = relationship("TemporalCandidate", back_populates="discovery", cascade="all, delete-orphan")
