import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class DatasetPreview(Base):
    """
    SQLAlchemy Model representing the generated preview and thumbnail asset details for a registered dataset.
    Links one-to-one with a Dataset.
    """
    __tablename__ = "dataset_previews"

    preview_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this preview profile (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the scanned Dataset ID"
    )
    preview_status = Column(
        String,
        nullable=False,
        default="PENDING",
        doc="State of preview generation workflow: PENDING, GENERATING, COMPLETED, FAILED"
    )
    preview_image_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated preview image"
    )
    thumbnail_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated quick navigation thumbnail"
    )
    preview_width = Column(
        Integer,
        nullable=True,
        doc="Width in pixels of generated preview image"
    )
    preview_height = Column(
        Integer,
        nullable=True,
        doc="Height in pixels of generated preview image"
    )
    band_count = Column(
        Integer,
        nullable=True,
        doc="Number of bands read from raw files and mapped to channels"
    )
    generation_time_ms = Column(
        Integer,
        nullable=True,
        doc="Time in milliseconds taken to perform decimation and image write"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when preview profile was instantiated"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last status modification"
    )

    # Relationships
    dataset = relationship("Dataset", back_populates="preview")
