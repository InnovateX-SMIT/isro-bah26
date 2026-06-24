import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ReconstructionRun(Base):
    """
    SQLAlchemy Model representing a Reconstruction Run.
    Tracks lifecycle, status, strategy, and generated summaries.
    """
    __tablename__ = "reconstruction_runs"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the reconstruction run (UUIDv4 string)"
    )
    session_id = Column(
        String,
        ForeignKey("analysis_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Analysis Session ID"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Dataset ID"
    )
    reconstruction_status = Column(
        String,
        nullable=False,
        default="PENDING",
        doc="Lifecycle status: PENDING, RUNNING, COMPLETED, FAILED"
    )
    reconstruction_strategy = Column(
        String,
        nullable=True,
        doc="Strategy used for the reconstruction run"
    )
    summary = Column(
        Text,
        nullable=True,
        doc="Explainability summary of the reconstruction run"
    )
    output_image_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated reconstructed image GeoTIFF"
    )
    preview_image_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of generated reconstruction preview PNG"
    )
    reconstruction_method = Column(
        String,
        nullable=True,
        doc="Reconstruction algorithm method used (e.g. cv2.INPAINT_TELEA)"
    )
    execution_time_ms = Column(
        Integer,
        nullable=True,
        doc="Execution time of the reconstruction pipeline run in milliseconds"
    )
    optimization_status = Column(
        String,
        nullable=True,
        doc="Optimization lifecycle status: PENDING, RUNNING, COMPLETED, FAILED"
    )
    optimization_timestamp = Column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when optimization was completed"
    )
    optimization_method = Column(
        String,
        nullable=True,
        doc="Optimization method algorithm used"
    )
    optimized_output_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of optimized reconstructed image GeoTIFF"
    )
    optimized_preview_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of optimized preview PNG"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when run was created"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last update"
    )

    # Relationships
    session = relationship("AnalysisSession", back_populates="reconstruction_runs")
    dataset = relationship("Dataset", back_populates="reconstruction_runs")
    temporal_fusion_runs = relationship("TemporalFusionRun", back_populates="reconstruction_run", cascade="all, delete-orphan")
