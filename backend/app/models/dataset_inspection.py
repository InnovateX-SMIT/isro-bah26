import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class DatasetInspection(Base):
    """
    SQLAlchemy Model representing the overall results of a filesystem dataset scan.
    Links one-to-one with a Dataset and one-to-many with its categorized DatasetFiles.
    """
    __tablename__ = "dataset_inspections"

    inspection_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for this inspection run (UUIDv4 string)"
    )
    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Unique reference to the scanned Dataset ID"
    )
    inspection_status = Column(
        String,
        nullable=False,
        default="PENDING",
        doc="State of the inspection workflow: PENDING, COMPLETED, FAILED"
    )
    total_files = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Sum of all files found within the dataset directory"
    )
    total_tif_files = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Count of raster .tif files found"
    )
    total_xml_files = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Count of .xml metadata/auxiliary files found"
    )
    total_txt_files = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Count of .txt report files found"
    )
    total_meta_files = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Count of .meta metadata files found"
    )
    total_jpg_files = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Count of .jpg/.jpeg preview files found"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp of scan initialization"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last status modification"
    )

    # Relationships
    dataset = relationship("Dataset", back_populates="inspection")
    files = relationship("DatasetFile", back_populates="inspection", cascade="all, delete-orphan")
