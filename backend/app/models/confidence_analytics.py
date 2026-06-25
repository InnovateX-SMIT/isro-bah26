import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ConfidenceAnalytics(Base):
    """
    SQLAlchemy Model representing the confidence aggregated analytics reports,
    summaries, and scorecards for reconstructed datasets.
    """
    __tablename__ = "confidence_analytics"

    analytics_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this confidence analytics record (UUIDv4 string)"
    )
    confidence_heatmap_id = Column(
        String,
        ForeignKey("confidence_heatmaps.heatmap_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent ConfidenceHeatmap ID"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Dataset ID"
    )
    analytics_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="Lifecycle state of analytics reporting: pending, completed, failed"
    )
    confidence_report_path = Column(
        String,
        nullable=True,
        doc="Path to confidence_report.json containing the comprehensive nested report"
    )
    confidence_summary_path = Column(
        String,
        nullable=True,
        doc="Path to confidence_summary.json containing the condensed human-readable summary"
    )
    reliability_scorecard_path = Column(
        String,
        nullable=True,
        doc="Path to reliability_scorecard.json containing the flat numeric scorecard"
    )
    headline_summary = Column(
        Text,
        nullable=True,
        doc="One or two sentence plain-English high-level summary of the reliability findings"
    )
    report_basis = Column(
        Text,
        nullable=False,
        doc="Mandatory detail explaining the data sources and evaluation stack used"
    )
    analytics_method = Column(
        String,
        nullable=False,
        default="confidence_reliability_aggregation_v1",
        doc="Name of the analytical aggregation method used"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when this analytics record was created"
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
    confidence_heatmap = relationship("ConfidenceHeatmap")
