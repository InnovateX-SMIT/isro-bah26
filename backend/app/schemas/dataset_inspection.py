from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class InspectionStatus(str, Enum):
    """
    State of the dataset inspection workflow.
    """
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class FileCategory(str, Enum):
    """
    Categorized file classifications.
    """
    TIF = "TIF"
    XML = "XML"
    TXT = "TXT"
    META = "META"
    JPG = "JPG"
    OTHER = "OTHER"

class DatasetFileBase(BaseModel):
    file_name: str = Field(..., description="Basename of the file (e.g. BAND2.tif)")
    file_extension: str = Field(..., description="Extension of the file (e.g. .tif)")
    relative_path: str = Field(..., description="Path relative to workspace root")
    file_size_bytes: int = Field(..., description="Size of the file in bytes")
    file_category: FileCategory = Field(..., description="File category class")

class DatasetFileResponse(DatasetFileBase):
    file_id: str = Field(..., description="Unique UUID for this file entry")
    inspection_id: str = Field(..., description="Unique UUID reference of the parent inspection")
    created_at: datetime = Field(..., description="Timestamp of discovery")

    model_config = ConfigDict(from_attributes=True)

class DatasetInspectionBase(BaseModel):
    dataset_id: str = Field(..., description="Unique UUID reference of the target dataset")

class DatasetInspectionCreate(DatasetInspectionBase):
    """
    Schema for creating a new inspection profile.
    """
    pass

class DatasetInspectionUpdate(BaseModel):
    """
    Schema for updating the metadata and file counts of an inspection.
    """
    inspection_status: InspectionStatus
    total_files: int
    total_tif_files: int
    total_xml_files: int
    total_txt_files: int
    total_meta_files: int
    total_jpg_files: int

class DatasetInspectionResponse(DatasetInspectionBase):
    inspection_id: str = Field(..., description="Unique UUID for the inspection profile")
    inspection_status: InspectionStatus = Field(..., description="Current state of the inspection")
    total_files: int = Field(..., description="Total count of files found")
    total_tif_files: int = Field(..., description="Total count of TIF files")
    total_xml_files: int = Field(..., description="Total count of XML files")
    total_txt_files: int = Field(..., description="Total count of TXT files")
    total_meta_files: int = Field(..., description="Total count of META files")
    total_jpg_files: int = Field(..., description="Total count of JPG files")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")

    model_config = ConfigDict(from_attributes=True)
