import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class DatasetFile(Base):
    """
    SQLAlchemy Model representing an individual file inventoried during a dataset scan.
    Categorized by extension: TIF, XML, TXT, META, JPG, or OTHER.
    """
    __tablename__ = "dataset_files"

    file_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the file entry (UUIDv4 string)"
    )
    inspection_id = Column(
        String,
        ForeignKey("dataset_inspections.inspection_id", ondelete="CASCADE"),
        nullable=False,
        doc="Reference to the parent Dataset Inspection ID"
    )
    file_name = Column(
        String,
        nullable=False,
        doc="Basename of the file (e.g. BAND2.tif)"
    )
    file_extension = Column(
        String,
        nullable=False,
        doc="Lowercase extension of the file (e.g. .tif)"
    )
    relative_path = Column(
        String,
        nullable=False,
        doc="Workspace path of the file (e.g. datasets/demo/scene1/BAND2.tif)"
    )
    file_size_bytes = Column(
        Integer,
        nullable=False,
        doc="Size of the file in bytes"
    )
    file_category = Column(
        String,
        nullable=False,
        doc="File class category: TIF, XML, TXT, META, JPG, or OTHER"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp of file discovery recording"
    )

    # Relationship back to DatasetInspection
    inspection = relationship("DatasetInspection", back_populates="files")
