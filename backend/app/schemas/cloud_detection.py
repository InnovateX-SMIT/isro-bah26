from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class CloudDetectionStatus(str, Enum):
    """
    Workflow state for cloud detection processing.
    """
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class CloudDetectionBase(BaseModel):
    dataset_id: str = Field(..., description="Unique UUID reference of the target dataset")

class CloudDetectionCreate(CloudDetectionBase):
    """
    Schema for initializing a PENDING cloud detection record.
    """
    pass

class CloudDetectionUpdate(BaseModel):
    """
    Schema for updating generated cloud detection fields.
    """
    detection_status: CloudDetectionStatus
    cloud_coverage_percent: float | None = None
    probability_map_path: str | None = None
    mean_cloud_probability: float | None = None
    candidate_region_count: int | None = None
    detection_method: str | None = None

class CloudDetectionResponse(CloudDetectionBase):
    detection_id: str = Field(..., description="Unique UUID for this cloud detection profile")
    detection_status: CloudDetectionStatus = Field(..., description="Processing workflow status")
    cloud_coverage_percent: float | None = Field(None, description="Percentage of dataset covered by clouds")
    probability_map_path: str | None = Field(None, description="Path relative to workspace of probability map TIFF")
    mean_cloud_probability: float | None = Field(None, description="Mean cloud probability score across the raster")
    candidate_region_count: int | None = Field(None, description="Number of distinct cloud regions detected")
    detection_method: str = Field(..., description="Explainable description of detection method used")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)
