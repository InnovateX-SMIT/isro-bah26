from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class TemporalFusionRunResponse(BaseModel):
    """
    Response schema returning the details of a temporal fusion run database record.
    """
    id: str = Field(..., description="Unique UUID for this temporal fusion run")
    session_id: str = Field(..., description="Reference to parent Analysis Session")
    dataset_id: str = Field(..., description="Reference to parent Dataset")
    reconstruction_run_id: str = Field(..., description="Reference to parent Reconstruction Run")
    fusion_status: str = Field(..., description="Lifecycle status: PENDING, RUNNING, COMPLETED, FAILED")
    reference_count: int = Field(..., description="Count of temporal reference images fused")
    fusion_strategy: Optional[str] = Field(None, description="The chosen temporal fusion strategy")
    guidance_summary: Optional[str] = Field(None, description="Summary of generated reconstruction guidance")
    created_at: datetime = Field(..., description="Timestamp when run was initialized")
    updated_at: datetime = Field(..., description="Timestamp of last update")

    model_config = ConfigDict(from_attributes=True)

class TemporalFusionStatusResponse(BaseModel):
    """
    Response schema returning just the status and metadata for status endpoints.
    """
    session_id: str = Field(..., description="Reference to Analysis Session")
    fusion_status: str = Field(..., description="Lifecycle status: PENDING, RUNNING, COMPLETED, FAILED")
    updated_at: datetime = Field(..., description="Timestamp of last status update")

    model_config = ConfigDict(from_attributes=True)

class TemporalFusionSummaryResponse(BaseModel):
    """
    Response schema returning the session fusion status and guidance summary.
    """
    session_id: str = Field(..., description="Reference to Analysis Session")
    fusion_status: str = Field(..., description="Lifecycle status: PENDING, RUNNING, COMPLETED, FAILED")
    guidance_summary: Optional[str] = Field(None, description="Summary of generated reconstruction guidance")

    model_config = ConfigDict(from_attributes=True)

class TemporalFusionResponse(BaseModel):
    """
    Comprehensive response returned when running the temporal fusion pipeline.
    Includes the database run details and the compiled fusion intelligence package.
    """
    run: TemporalFusionRunResponse = Field(..., description="Temporal fusion run details")
    package: Dict[str, Any] = Field(..., description="The structured temporal fusion intelligence package")

    model_config = ConfigDict(from_attributes=True)

class TemporalFusionRunRequest(BaseModel):
    """
    Request payload to trigger/run temporal fusion pipeline.
    """
    strategy: str = Field("DEFAULT", description="Temporal fusion strategy option (e.g. DEFAULT)")
