import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CloudShadow(Base):
    """
    SQLAlchemy Model representing the cloud shadow detection profile for a registered dataset.
    Links one-to-one with a Dataset and lineage-wise with its CloudClassification.
    """
    __tablename__ = "cloud_shadows"

    shadow_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this cloud shadow profile (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    cloud_classification_id = Column(
        String,
        ForeignKey("cloud_classifications.classification_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference back to the CloudClassification record used as input"
    )
    shadow_detection_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="State of shadow detection workflow: pending, completed, failed"
    )
    solar_geometry_available = Column(
        Boolean,
        nullable=False,
        default=True,
        doc="Indicates if solar azimuth/elevation was used (Path A) or if fallback spectral check was used (Path B)"
    )
    shadow_region_count = Column(
        Integer,
        nullable=True,
        doc="Number of connected shadow regions detected"
    )
    total_shadow_area_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the total image area classified as shadow"
    )
    linked_shadow_region_count = Column(
        Integer,
        nullable=True,
        doc="Number of shadow regions successfully linked to a casting cloud region"
    )
    unlinked_shadow_region_count = Column(
        Integer,
        nullable=True,
        doc="Number of shadow regions that could not be linked to any cloud region"
    )
    mean_shadow_to_cloud_area_ratio = Column(
        Float,
        nullable=True,
        doc="Average ratio of shadow area to its linked cloud area"
    )
    shadow_mask_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated georeferenced shadow raster TIFF"
    )
    shadow_preview_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated colored shadow preview PNG"
    )
    region_details_json = Column(
        Text,
        nullable=True,
        doc="JSON serialized list of shadow regions (id, area_px, linked_cloud_id, distance)"
    )
    detection_method = Column(
        String,
        nullable=False,
        default="solar_geometry_directional_v1",
        doc="Method used for shadow detection"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when shadow detection profile was created"
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
    cloud_classification = relationship("CloudClassification", back_populates="cloud_shadow")
    cloud_segmentation = relationship("CloudSegmentation", back_populates="cloud_shadow", uselist=False, cascade="all, delete-orphan")
