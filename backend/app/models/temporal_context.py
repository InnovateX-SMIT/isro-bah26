import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class TemporalContext(Base):
    """
    SQLAlchemy Model representing the finalized reconstruction-ready Temporal Context Package.
    Consolidates historical reference selection stats, summaries, and provider metrics.
    """
    __tablename__ = "temporal_contexts"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the temporal context record (UUIDv4 string)"
    )
    session_id = Column(
        String,
        ForeignKey("analysis_sessions.session_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Reference to the parent Analysis Session ID"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Reference to the parent Dataset ID"
    )
    reference_stack_id = Column(
        String,
        ForeignKey("temporal_reference_stacks.id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the underlying reference stack selection ID"
    )
    provider_count = Column(
        Integer,
        nullable=False,
        doc="Count of unique satellite/imagery providers represented in this context"
    )
    reference_count = Column(
        Integer,
        nullable=False,
        doc="Total number of selected references in this context"
    )
    average_cloud_cover = Column(
        Float,
        nullable=False,
        doc="Mean cloud cover percentage across all selected references"
    )
    average_temporal_distance = Column(
        Float,
        nullable=False,
        doc="Mean temporal distance in days across all selected references"
    )
    average_spatial_overlap = Column(
        Float,
        nullable=False,
        doc="Mean spatial footprint overlap percentage across all selected references"
    )
    summary = Column(
        Text,
        nullable=False,
        doc="Human-readable operational summary explaining what was discovered and why it matters"
    )
    metadata_json = Column(
        Text,
        nullable=False,
        doc="Raw JSON serialization of fully calculated statistics (provider, cloud, temporal, spatial, metrics)"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when this temporal context package was generated"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last update"
    )

    # Relationships
    reference_stack = relationship("TemporalReferenceStack")
