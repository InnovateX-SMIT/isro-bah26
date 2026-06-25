import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ConfidenceEstimation(Base):
    """
    SQLAlchemy Model representing the confidence estimation profile for a reconstructed dataset.
    Links one-to-one with a ReconstructionRun and many-to-one with a Dataset.
    """
    __tablename__ = "confidence_estimations"

    confidence_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this confidence estimation profile (UUIDv4 string)"
    )
    reconstruction_run_id = Column(
        String,
        ForeignKey("reconstruction_runs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent ReconstructionRun ID"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Dataset ID"
    )
    confidence_status = Column(
        String,
        nullable=False,
        default="pending",
        doc="State of confidence estimation workflow: pending, completed, failed"
    )
    mean_confidence_score = Column(
        Float,
        nullable=True,
        doc="Mean confidence score [0.0 to 100.0] inside the reconstructed mask"
    )
    low_confidence_area_percent = Column(
        Float,
        nullable=True,
        doc="Percentage of reconstructed pixels falling below a low-confidence threshold (< 50.0)"
    )
    confidence_map_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated single-band GeoTIFF confidence map"
    )
    confidence_preview_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of color-coded confidence preview PNG"
    )
    inference_basis = Column(
        Text,
        nullable=False,
        doc="Mandatory explainability detail describing contribution weights of the four signals"
    )
    confidence_method = Column(
        String,
        nullable=False,
        default="classification_distance_temporal_agreement_v1",
        doc="Name of the confidence estimation algorithm/method used"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when confidence estimation record was created"
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
    reconstruction_run = relationship("ReconstructionRun")
