import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CloudAnalytics(Base):
    """
    SQLAlchemy Model representing the consolidated cloud and shadow analytics report for a registered dataset.
    Links one-to-one with a Dataset and lineage-wise with its CloudSegmentation.
    """
    __tablename__ = "cloud_analytics"

    analytics_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this cloud analytics profile (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    cloud_segmentation_id = Column(
        String,
        ForeignKey("cloud_segmentations.segmentation_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference back to the CloudSegmentation record used as input"
    )
    analytics_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="State of analytics execution: pending, completed, failed"
    )
    total_cloud_coverage_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the scene covered by clouds"
    )
    total_shadow_coverage_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the scene covered by shadows"
    )
    thick_cloud_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the cloud cover that is Thick Cloud"
    )
    thin_cloud_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the cloud cover that is Thin Cloud"
    )
    cirrus_cloud_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the cloud cover that is Cirrus Cloud"
    )
    uncertain_cloud_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the cloud cover that is Uncertain Cloud"
    )
    total_cloud_objects = Column(
        Integer,
        nullable=True,
        doc="Total number of segmented cloud objects"
    )
    high_priority_objects = Column(
        Integer,
        nullable=True,
        doc="Number of objects flagged with HIGH reconstruction priority"
    )
    medium_priority_objects = Column(
        Integer,
        nullable=True,
        doc="Number of objects flagged with MEDIUM reconstruction priority"
    )
    low_priority_objects = Column(
        Integer,
        nullable=True,
        doc="Number of objects flagged with LOW reconstruction priority"
    )
    largest_cloud_object_pixels = Column(
        Integer,
        nullable=True,
        doc="Size in pixels of the largest cloud/reconstruction object"
    )
    smallest_cloud_object_pixels = Column(
        Integer,
        nullable=True,
        doc="Size in pixels of the smallest cloud/reconstruction object"
    )
    mean_cloud_object_pixels = Column(
        Float,
        nullable=True,
        doc="Average size in pixels of segmented reconstruction objects"
    )
    reconstruction_target_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of the image requiring generative reconstruction (Cloud + Shadow)"
    )
    scene_cloud_complexity_score = Column(
        Float,
        nullable=True,
        doc="Synthesized scene cloud complexity score (0-100)"
    )
    scene_reconstruction_difficulty = Column(
        String,
        nullable=True,
        doc="Overall reconstruction difficulty level: LOW, MEDIUM, HIGH, EXTREME"
    )
    cloud_intelligence_score = Column(
        Float,
        nullable=True,
        doc="Confidence and quality metric for cloud characterization (0-100)"
    )
    cloud_burden_index = Column(
        Float,
        nullable=True,
        doc="Overall operational burden of clouds on this scene (0-100)"
    )
    reconstruction_readiness = Column(
        Boolean,
        nullable=False,
        default=False,
        doc="Indicates if all preceding phases are complete and correct for Reconstruction input"
    )
    analytics_summary_json = Column(
        Text,
        nullable=True,
        doc="JSON serialized summary featuring coverage, priority distributions, and recommendations"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when analytics profile was instantiated"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last modifications"
    )

    # Relationships
    dataset = relationship("Dataset")
    cloud_segmentation = relationship("CloudSegmentation", back_populates="cloud_analytics")
