import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
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
