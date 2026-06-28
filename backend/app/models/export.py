import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Export(Base):
    """
    SQLAlchemy Model representing a Raster Export record.
    Tracks export configuration, status, output file paths, and metadata.
    """
    __tablename__ = "exports"

    export_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the export record (UUIDv4 string)"
    )
    session_id = Column(
        String,
        ForeignKey("analysis_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Analysis Session ID"
    )
    layer = Column(
        String,
        nullable=False,
        doc="The specific raster layer exported (e.g., reconstruction, optimized_reconstruction, cloud_mask, confidence_map)"
    )
    format = Column(
        String,
        nullable=False,
        doc="The output format requested (e.g., GeoTIFF, PNG, JPG)"
    )
    status = Column(
        String,
        nullable=False,
        default="PENDING",
        doc="Lifecycle status: PENDING, PROCESSING, COMPLETED, FAILED"
    )
    file_path = Column(
        String,
        nullable=True,
        doc="Path relative to workspace root of the generated export file"
    )
    file_size_bytes = Column(
        Integer,
        nullable=True,
        doc="Size of the exported file in bytes"
    )
    error_message = Column(
        Text,
        nullable=True,
        doc="Error message detailing compilation failure if status is FAILED"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when export run was created"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last status modification"
    )

    # Relationship to parent AnalysisSession
    session = relationship("AnalysisSession", back_populates="exports")
