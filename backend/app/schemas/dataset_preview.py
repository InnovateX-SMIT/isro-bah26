from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class PreviewStatus(str, Enum):
    """
    Workflow state for dataset preview generation.
    """
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class DatasetPreviewBase(BaseModel):
    dataset_id: str = Field(..., description="Unique UUID reference of the target dataset")

class PreviewCreate(DatasetPreviewBase):
    """
    Schema for initializing a PENDING preview record.
    """
    pass

class PreviewUpdate(BaseModel):
    """
    Schema for updating generated preview fields.
    """
    preview_status: PreviewStatus
    preview_image_path: str | None = None
    thumbnail_path: str | None = None
    preview_width: int | None = None
    preview_height: int | None = None
    band_count: int | None = None
    generation_time_ms: int | None = None

class PreviewResponse(DatasetPreviewBase):
    preview_id: str = Field(..., description="Unique UUID for this preview profile")
    preview_status: PreviewStatus = Field(..., description="Generation progress status")
    preview_image_path: str | None = Field(None, description="Path relative to workspace root of preview PNG")
    thumbnail_path: str | None = Field(None, description="Path relative to workspace root of thumbnail PNG")
    preview_width: int | None = Field(None, description="Generated image width")
    preview_height: int | None = Field(None, description="Generated image height")
    band_count: int | None = Field(None, description="Count of bands stacked in visualization")
    generation_time_ms: int | None = Field(None, description="Process execution time in ms")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")

    model_config = ConfigDict(from_attributes=True)

class PreviewSummary(BaseModel):
    preview_id: str
    dataset_id: str
    preview_status: PreviewStatus
    preview_width: int | None = None
    preview_height: int | None = None
    band_count: int | None = None
    generation_time_ms: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
