from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class ReconstructionRunResponse(BaseModel):
    """
    Response schema returning the details of a reconstruction run database record.
    """
    id: str = Field(..., description="Unique UUID for this reconstruction run")
    session_id: str = Field(..., description="Reference to parent Analysis Session")
    dataset_id: str = Field(..., description="Reference to parent Dataset")
    reconstruction_status: str = Field(..., description="Lifecycle status: PENDING, RUNNING, COMPLETED, FAILED")
    reconstruction_strategy: Optional[str] = Field(None, description="The chosen reconstruction strategy")
    summary: Optional[str] = Field(None, description="Explainable reconstruction summary")
    output_image_path: Optional[str] = Field(None, description="Path relative to workspace root of generated image GeoTIFF")
    preview_image_path: Optional[str] = Field(None, description="Path relative to workspace root of generated preview PNG")
    reconstruction_method: Optional[str] = Field(None, description="Reconstruction method/algorithm used")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")
    created_at: datetime = Field(..., description="Timestamp when run was initialized")
    updated_at: datetime = Field(..., description="Timestamp of last update")

    model_config = ConfigDict(from_attributes=True)

class ReconstructionStatusResponse(BaseModel):
    """
    Response schema returning just the status and metadata for status endpoints.
    """
    session_id: str = Field(..., description="Reference to Analysis Session")
    reconstruction_status: str = Field(..., description="Lifecycle status: PENDING, RUNNING, COMPLETED, FAILED")
    updated_at: datetime = Field(..., description="Timestamp of last status update")

    model_config = ConfigDict(from_attributes=True)

class ReconstructionSummaryResponse(BaseModel):
    """
    Response schema returning the session reconstruction status and explainable summary.
    """
    session_id: str = Field(..., description="Reference to Analysis Session")
    reconstruction_status: str = Field(..., description="Lifecycle status: PENDING, RUNNING, COMPLETED, FAILED")
    summary: Optional[str] = Field(None, description="Explainable reconstruction summary")

    model_config = ConfigDict(from_attributes=True)

class ReconstructionResponse(BaseModel):
    """
    Comprehensive response returned when running the reconstruction framework.
    Includes the database run details and the compiled multi-layer package.
    """
    run: ReconstructionRunResponse = Field(..., description="Reconstruction run details")
    package: Dict[str, Any] = Field(..., description="The structured reconstruction package metadata profile")

    model_config = ConfigDict(from_attributes=True)

class ReconstructionRunRequest(BaseModel):
    """
    Request payload to trigger/run reconstruction pipeline.
    """
    strategy: str = Field("DEFAULT", description="Reconstruction strategy option (e.g. DEFAULT)")
