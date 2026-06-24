import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CloudDetection(Base):
    """
    SQLAlchemy Model representing the cloud detection profile for a registered dataset.
    Links one-to-one with a Dataset.
    """
    __tablename__ = "cloud_detections"

    detection_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this cloud detection profile (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    detection_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="State of cloud detection workflow: pending, completed, failed"
    )
    cloud_coverage_percent = Column(
        Float,
        nullable=True,
        doc="Overall percentage of pixels classified as cloud candidates"
    )
    probability_map_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated probability map GeoTIFF"
    )
    mean_cloud_probability = Column(
        Float,
        nullable=True,
        doc="Average probability of cloud presence across the raster"
    )
    candidate_region_count = Column(
        Integer,
        nullable=True,
        doc="Count of distinct connected cloud regions discovered"
    )
    detection_method = Column(
        String,
        nullable=False,
        default="brightness_ndvi_threshold_v1",
        doc="Method logic used for detection (for explainability)"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when cloud detection profile was instantiated"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last status modification"
    )

    # Relationships
    dataset = relationship("Dataset", back_populates="cloud_detection")
    cloud_classification = relationship("CloudClassification", back_populates="cloud_detection", uselist=False, cascade="all, delete-orphan")

