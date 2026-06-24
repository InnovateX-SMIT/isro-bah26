import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CloudClassification(Base):
    """
    SQLAlchemy Model representing the cloud type classification profile for a registered dataset.
    Links one-to-one with a Dataset and lineage-wise with its CloudDetection.
    """
    __tablename__ = "cloud_classifications"

    classification_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this cloud classification profile (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    cloud_detection_id = Column(
        String,
        ForeignKey("cloud_detections.detection_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference back to the CloudDetection record used as input"
    )
    classification_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="State of cloud classification workflow: pending, completed, failed"
    )
    thick_cloud_region_count = Column(
        Integer,
        nullable=True,
        doc="Number of regions classified as Thick Cloud"
    )
    thin_cloud_region_count = Column(
        Integer,
        nullable=True,
        doc="Number of regions classified as Thin Cloud"
    )
    cirrus_cloud_region_count = Column(
        Integer,
        nullable=True,
        doc="Number of regions classified as Cirrus Cloud"
    )
    uncertain_region_count = Column(
        Integer,
        nullable=True,
        doc="Number of regions classified as Uncertain Region"
    )
    thick_cloud_area_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of total cloud area that is Thick Cloud"
    )
    thin_cloud_area_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of total cloud area that is Thin Cloud"
    )
    cirrus_cloud_area_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of total cloud area that is Cirrus Cloud"
    )
    uncertain_area_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of total cloud area that is Uncertain Region"
    )
    classification_map_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated georeferenced class raster TIFF"
    )
    classification_preview_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated color-coded classification preview PNG"
    )
    region_details_json = Column(
        Text,
        nullable=True,
        doc="JSON serialized list of per-region details (class, mean_probability, area_px, compactness)"
    )
    classification_method = Column(
        String,
        nullable=False,
        default="probability_texture_compactness_rules_v1",
        doc="Explainable classification logic used (e.g. probability_texture_compactness_rules_v1)"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when cloud classification was instantiated"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last status modification"
    )

    # Relationships
    dataset = relationship("Dataset")
    cloud_detection = relationship("CloudDetection", back_populates="cloud_classification")
    cloud_shadow = relationship("CloudShadow", back_populates="cloud_classification", uselist=False, cascade="all, delete-orphan")

