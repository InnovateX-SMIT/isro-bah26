import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class GeospatialContextProfile(Base):
    """
    SQLAlchemy Model representing the resolved environmental and geographic context of a registered dataset.
    Links one-to-one with a Dataset.
    """
    __tablename__ = "geospatial_context_profiles"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this geospatial context profile (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the parent Dataset ID"
    )
    terrain_type = Column(
        String,
        nullable=False,
        doc="Inferred terrain/geomorphic classification (e.g. Alluvial Plain)"
    )
    environment_type = Column(
        String,
        nullable=False,
        doc="Inferred environment type (e.g. Agricultural Landscape)"
    )
    dominant_landscape = Column(
        String,
        nullable=False,
        doc="Inferred dominant landscape features (e.g. Cultivated Fields)"
    )
    hydrology_context = Column(
        String,
        nullable=False,
        doc="Inferred surface water/drainage context"
    )
    agricultural_context = Column(
        String,
        nullable=False,
        doc="Inferred agricultural activity level"
    )
    urbanization_context = Column(
        String,
        nullable=False,
        doc="Inferred urbanization intensity level"
    )
    regional_characteristics = Column(
        String,
        nullable=False,
        doc="Semicolon-separated list of regional characteristics"
    )
    inference_basis = Column(
        String,
        nullable=False,
        default="rule-based regional heuristic",
        doc="Tracing flag describing how this profile was resolved"
    )
    context_summary = Column(
        String,
        nullable=False,
        doc="Dynamically constructed summary report of environmental context"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp of context creation"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last modifications"
    )

    # Relationships
    dataset = relationship("Dataset", back_populates="geospatial_context_profile")
