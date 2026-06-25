import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ReliabilityScore(Base):
    """
    SQLAlchemy Model representing the multi-granular reliability scoring metrics
    for a reconstructed dataset, based on its confidence estimations.
    """
    __tablename__ = "reliability_scores"

    reliability_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this reliability score record (UUIDv4 string)"
    )
    confidence_estimation_id = Column(
        String,
        ForeignKey("confidence_estimations.confidence_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent ConfidenceEstimation ID"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Dataset ID"
    )
    reliability_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="Lifecycle state of reliability scoring: pending, completed, failed"
    )
    dataset_reliability_score = Column(
        Float,
        nullable=True,
        doc="Aggregated single score [0.0 to 100.0] summarizing dataset reconstruction reliability"
    )
    dataset_reliability_tier = Column(
        String,
        nullable=True,
        doc="Dataset reliability tier banding: High, Moderate, Low, or Very Low"
    )
    region_reliability_json = Column(
        Text,
        nullable=True,
        doc="JSON serialized list of per-region details including region_id, mean_confidence, reliability_tier, and area_px"
    )
    reconstruction_reliability_score = Column(
        Float,
        nullable=True,
        doc="Composite score [0.0 to 100.0] reflecting reconstruction process reliability (weighted with overall_score)"
    )
    scoring_basis = Column(
        Text,
        nullable=False,
        doc="Mandatory detail explaining the blend weights and conceptual differences in scoring"
    )
    scoring_method = Column(
        String,
        nullable=False,
        default="region_aggregation_tier_banding_v1",
        doc="Name of the reliability scoring method used"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when this reliability record was created"
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
    confidence_estimation = relationship("ConfidenceEstimation")
