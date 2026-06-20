import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class GeospatialContext(Base):
    """
    SQLAlchemy Model representing the geospatial intelligence context of a registered dataset.
    Links one-to-one with a Dataset.
    """
    __tablename__ = "geospatial_contexts"

    context_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this geospatial context record (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    center_lat = Column(Float, nullable=False, doc="Geographic center latitude in WGS84")
    center_lon = Column(Float, nullable=False, doc="Geographic center longitude in WGS84")
    min_lat = Column(Float, nullable=False, doc="Minimum latitude of bounding box in WGS84")
    min_lon = Column(Float, nullable=False, doc="Minimum longitude of bounding box in WGS84")
    max_lat = Column(Float, nullable=False, doc="Maximum latitude of bounding box in WGS84")
    max_lon = Column(Float, nullable=False, doc="Maximum longitude of bounding box in WGS84")
    epsg = Column(Integer, nullable=True, doc="EPSG code of dataset projection")
    crs = Column(String, nullable=True, doc="Coordinate Reference System name")
    projection = Column(String, nullable=True, doc="Map projection name")
    generated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp when this geospatial context was generated"
    )

    # Relationships
    dataset = relationship("Dataset", back_populates="geospatial_context")
