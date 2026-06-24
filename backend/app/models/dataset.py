import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Dataset(Base):
    """
    SQLAlchemy Model representing a registered dataset in the platform.
    Every dataset belongs to exactly one Analysis Session.
    """
    __tablename__ = "datasets"

    dataset_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the dataset (UUIDv4 string)"
    )
    analysis_session_id = Column(
        String,
        ForeignKey("analysis_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Analysis Session ID"
    )
    dataset_name = Column(
        String,
        nullable=False,
        doc="Discovered name of the dataset (e.g. LISS-IV scene identifier)"
    )
    dataset_path = Column(
        String,
        nullable=False,
        doc="Physical folder path relative to workspace or absolute on local disk"
    )
    dataset_type = Column(
        String,
        nullable=False,
        default="DEMO",
        doc="Origin type: DEMO or CUSTOM"
    )
    dataset_status = Column(
        String,
        nullable=False,
        default="REGISTERED",
        doc="Lifecycle status: REGISTERED, INSPECTING, VALIDATED, READY, FAILED"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when the dataset was registered"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last dataset state change"
    )

    # Relationship back to AnalysisSession
    session = relationship("AnalysisSession", back_populates="datasets")

    # Relationship to DatasetInspection (one-to-one)
    inspection = relationship("DatasetInspection", back_populates="dataset", uselist=False, cascade="all, delete-orphan")

    # Relationship to DatasetMetadata (one-to-one)
    dataset_metadata = relationship("DatasetMetadata", back_populates="dataset", uselist=False, cascade="all, delete-orphan")

    # Relationship to DatasetPreview (one-to-one)
    preview = relationship("DatasetPreview", back_populates="dataset", uselist=False, cascade="all, delete-orphan")

    # Relationship to GeospatialContext (one-to-one)
    geospatial_context = relationship("GeospatialContext", back_populates="dataset", uselist=False, cascade="all, delete-orphan")

    # Relationship to LocationContext (one-to-one)
    location_context = relationship("LocationContext", back_populates="dataset", uselist=False, cascade="all, delete-orphan")

    # Relationship to GeospatialContextProfile (one-to-one)
    geospatial_context_profile = relationship("GeospatialContextProfile", back_populates="dataset", uselist=False, cascade="all, delete-orphan")

    # Relationship to CloudDetection (one-to-one)
    cloud_detection = relationship("CloudDetection", back_populates="dataset", uselist=False, cascade="all, delete-orphan")


