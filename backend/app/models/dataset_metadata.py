import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class DatasetMetadata(Base):
    """
    SQLAlchemy Model representing the extracted metadata/intelligence of a registered dataset.
    Links one-to-one with a Dataset.
    """
    __tablename__ = "dataset_metadata"

    metadata_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this metadata record (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    coordinate_system = Column(
        String,
        nullable=True,
        doc="Name of the Coordinate Reference System (e.g. WGS 84)"
    )
    projection_name = Column(
        String,
        nullable=True,
        doc="Name of the map projection (e.g. UTM)"
    )
    epsg_code = Column(
        Integer,
        nullable=True,
        doc="EPSG code for the projection system"
    )
    utm_zone = Column(
        Integer,
        nullable=True,
        doc="UTM zone number if applicable (e.g. 43)"
    )
    origin_x = Column(
        Float,
        nullable=True,
        doc="X coordinate of raster top-left origin"
    )
    origin_y = Column(
        Float,
        nullable=True,
        doc="Y coordinate of raster top-left origin"
    )
    pixel_size_x = Column(
        Float,
        nullable=True,
        doc="Resolution / spatial resolution in X direction"
    )
    pixel_size_y = Column(
        Float,
        nullable=True,
        doc="Resolution / spatial resolution in Y direction"
    )
    raster_width = Column(
        Integer,
        nullable=True,
        doc="Width of the raster in pixels"
    )
    raster_height = Column(
        Integer,
        nullable=True,
        doc="Height of the raster in scan lines"
    )
    band_count = Column(
        Integer,
        nullable=True,
        doc="Number of spectral bands detected"
    )
    acquisition_date = Column(
        String,
        nullable=True,
        doc="Acquisition timestamp or date string of pass (e.g. 12-AUG-2025)"
    )
    metadata_status = Column(
        String,
        nullable=False,
        default="PENDING",
        doc="Status of extraction workflow: PENDING, EXTRACTING, COMPLETED, FAILED"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when this metadata record was created"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last modifications"
    )

    # Relationships
    dataset = relationship("Dataset", back_populates="dataset_metadata")
