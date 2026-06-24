import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CloudSegmentation(Base):
    """
    SQLAlchemy Model representing the cloud segmentation profile for a registered dataset.
    Links one-to-one with a Dataset and lineage-wise with its CloudShadow.
    """
    __tablename__ = "cloud_segmentations"

    segmentation_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this cloud segmentation profile (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    cloud_shadow_id = Column(
        String,
        ForeignKey("cloud_shadows.shadow_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference back to the CloudShadow record used as input"
    )
    segmentation_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="State of cloud segmentation workflow: pending, completed, failed"
    )
    total_segmented_regions = Column(
        Integer,
        nullable=True,
        doc="Number of connected segmented regions detected"
    )
    total_cloud_pixels = Column(
        Integer,
        nullable=True,
        doc="Total number of pixels classified as cloud (Thick, Thin, Cirrus, Uncertain)"
    )
    total_shadow_pixels = Column(
        Integer,
        nullable=True,
        doc="Total number of pixels classified as shadow"
    )
    largest_region_pixels = Column(
        Integer,
        nullable=True,
        doc="Size in pixels of the largest segmented region"
    )
    smallest_region_pixels = Column(
        Integer,
        nullable=True,
        doc="Size in pixels of the smallest segmented region"
    )
    mean_region_pixels = Column(
        Float,
        nullable=True,
        doc="Average size in pixels of segmented regions"
    )
    total_segmented_area_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the total image area classified as cloud or shadow"
    )
    reconstruction_ready = Column(
        Boolean,
        nullable=False,
        default=False,
        doc="Indicates if the segmentation and reconstruction masks are fully processed and ready for ingestion"
    )
    segmentation_mask_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated georeferenced multi-class segmentation raster TIFF"
    )
    reconstruction_mask_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated georeferenced binary reconstruction target TIFF"
    )
    segmentation_preview_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated color-coded segmentation preview PNG"
    )
    region_details_json = Column(
        Text,
        nullable=True,
        doc="JSON serialized list of segmented region objects (id, area_px, bounding_box, centroid, priority, etc.)"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when shadow segmentation profile was created"
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
    cloud_shadow = relationship("CloudShadow", back_populates="cloud_segmentation")
