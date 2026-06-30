from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class DatasetType(str, Enum):
    """
    Origin type of the dataset.
    """
    DEMO = "DEMO"
    CUSTOM = "CUSTOM"

class DatasetStatus(str, Enum):
    """
    Lifecycle status of the dataset.
    """
    REGISTERED = "REGISTERED"
    INSPECTING = "INSPECTING"
    VALIDATED = "VALIDATED"
    READY = "READY"
    FAILED = "FAILED"

class DatasetBase(BaseModel):
    dataset_name: str = Field(..., description="Name or identifier of the dataset (e.g. folder name)")
    dataset_path: str = Field(..., description="Folder path on disk (relative or absolute)")
    dataset_type: DatasetType = Field(default=DatasetType.DEMO, description="Type classification: DEMO or CUSTOM")

class DatasetCreate(DatasetBase):
    analysis_session_id: str = Field(..., description="UUID of the parent Analysis Session")

class DatasetUpdate(BaseModel):
    dataset_status: DatasetStatus = Field(..., description="Target lifecycle state to transition to")

class DatasetResponse(DatasetBase):
    dataset_id: str = Field(..., description="Unique UUID identification for the dataset record")
    analysis_session_id: str = Field(..., description="UUID of the parent Analysis Session")
    dataset_status: DatasetStatus = Field(..., description="Current status of the dataset registration")
    created_at: datetime = Field(..., description="Timestamp of registration creation")
    updated_at: datetime = Field(..., description="Timestamp of the last status update")

    model_config = ConfigDict(from_attributes=True)

class DatasetListResponse(BaseModel):
    """
    Envelope response containing a list of registered datasets.
    """
    datasets: list[DatasetResponse]

class UploadStatus(str, Enum):
    SUCCESS = "SUCCESS"
    METADATA_REQUIRED = "METADATA_REQUIRED"

class RecoveredMetadata(BaseModel):
    acquisition_date: str | None = None
    crs: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    sensor: str | None = None
    satellite: str | None = None

class UploadValidationResponse(BaseModel):
    status: UploadStatus
    temp_session_id: str | None = None
    recovered_metadata: RecoveredMetadata | None = None
    missing_fields: list[str] | None = None
    dataset: DatasetResponse | None = None

class UploadFinalizePayload(BaseModel):
    temp_session_id: str
    analysis_session_id: str
    dataset_name: str
    metadata: RecoveredMetadata
