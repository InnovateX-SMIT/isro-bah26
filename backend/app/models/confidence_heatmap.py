import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ConfidenceHeatmap(Base):
    """
    SQLAlchemy Model representing the confidence visualization overlays
    and reliability maps for reconstructed datasets.
    """
    __tablename__ = "confidence_heatmaps"

    heatmap_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this confidence heatmap record (UUIDv4 string)"
    )
    reliability_score_id = Column(
        String,
        ForeignKey("reliability_scores.reliability_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent ReliabilityScore ID"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Dataset ID"
    )
    heatmap_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="Lifecycle state of heatmap generation: pending, completed, failed"
    )
    confidence_overlay_path = Column(
        String,
        nullable=True,
        doc="Path to confidence_overlay.png showing color-coded confidence alpha-blended over RGB composite"
    )
    reliability_map_path = Column(
        String,
        nullable=True,
        doc="Path to reliability_map.png showing cloud regions tinted by their reliability tier color over RGB composite"
    )
    legend_json = Column(
        Text,
        nullable=True,
        doc="JSON serialized mapping describing visual meanings of colors in both visual products"
    )
    basis = Column(
        Text,
        nullable=False,
        doc="Mandatory detail explaining visual blend ratios, normalization thresholds, and color mappings"
    )
    heatmap_method = Column(
        String,
        nullable=False,
        default="alpha_blend_rgb_composite_v1",
        doc="Name of the visualization mapping method used"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when this heatmap record was created"
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
    reliability_score = relationship("ReliabilityScore")
