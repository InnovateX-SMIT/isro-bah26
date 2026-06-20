import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class LocationContext(Base):
    """
    SQLAlchemy Model representing the resolved Location Intelligence of a registered dataset.
    Links one-to-one with a Dataset.
    """
    __tablename__ = "location_contexts"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this location context record (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    country = Column(
        String,
        nullable=False,
        doc="Resolved country name (e.g. India)"
    )
    state = Column(
        String,
        nullable=False,
        doc="Resolved state/province name (e.g. Uttar Pradesh)"
    )
    district = Column(
        String,
        nullable=False,
        doc="Resolved district/county name (e.g. Mathura)"
    )
    administrative_region = Column(
        String,
        nullable=False,
        doc="Administrative region classification (e.g. Northern India)"
    )
    geographic_region = Column(
        String,
        nullable=False,
        doc="Geographic / physiographic region (e.g. Indo-Gangetic Plain)"
    )
    location_summary = Column(
        String,
        nullable=False,
        doc="Dynamically constructed textual location summary"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp of context creation"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last modifications"
    )

    # Relationships
    dataset = relationship("Dataset", back_populates="location_context")
