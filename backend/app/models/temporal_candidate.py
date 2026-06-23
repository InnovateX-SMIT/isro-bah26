import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class TemporalCandidate(Base):
    """
    SQLAlchemy Model representing a single historical imagery candidate discovered by a provider.
    """
    __tablename__ = "temporal_candidates"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the persisted candidate (UUIDv4 string)"
    )
    discovery_id = Column(
        String,
        ForeignKey("temporal_discoveries.id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent TemporalDiscovery ID"
    )
    candidate_id = Column(
        String,
        nullable=False,
        doc="Provider-specific unique identifier for the candidate scene"
    )
    provider_name = Column(
        String,
        nullable=False,
        doc="Name of the provider supplying this candidate"
    )
    acquisition_date = Column(
        String,
        nullable=False,
        doc="Acquisition date in YYYY-MM-DD format"
    )
    cloud_cover = Column(
        Float,
        nullable=False,
        doc="Cloud cover percentage (0.0 to 100.0)"
    )
    spatial_overlap = Column(
        Float,
        nullable=False,
        doc="Spatial overlap percentage with the target scene (0.0 to 100.0)"
    )
    preview_url = Column(
        String,
        nullable=True,
        doc="Optional URL to a preview thumbnail/image"
    )
    metadata_json = Column(
        Text,
        nullable=False,
        doc="Raw JSON serialization of provider-specific candidate metadata"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when this candidate record was created"
    )

    # Relationship back to TemporalDiscovery
    discovery = relationship("TemporalDiscovery", back_populates="candidates")
