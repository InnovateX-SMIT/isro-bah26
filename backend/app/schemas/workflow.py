from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class WorkflowStageDetail(BaseModel):
    """
    Pydantic schema detailing status, timing, metadata inputs, and output paths of a workflow stage.
    """
    name: str = Field(..., description="Stage name (e.g. Cloud Intelligence)")
    status: str = Field(..., description="Execution status: pending, waiting, running, completed, failed, blocked")
    updated_at: str = Field(..., description="Timestamp of the last execution state transition")
    duration_ms: float = Field(0.0, description="Processing duration of the stage in milliseconds")
    error_summary: Optional[str] = Field(None, description="Detailed traceback or validation error snippet if failed")
    blocked_by: Optional[str] = Field(None, description="Name of the upstream stage that blocked this stage")
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Metadata inputs required by the stage")
    outputs: Dict[str, Any] = Field(default_factory=dict, description="Data parameters or preview outputs produced")
    related_apis: List[str] = Field(default_factory=list, description="Target platform endpoints triggered by the stage")
    dependencies: List[str] = Field(default_factory=list, description="Upstream stages that must be completed first")

class WorkflowTimelineItem(BaseModel):
    """
    Timeline record showing chronological events generated during session processing.
    """
    stage_name: str = Field(..., description="Name of the generating stage")
    event: str = Field(..., description="Details of the operational event (e.g. Started, Completed)")
    timestamp: str = Field(..., description="ISO 8601 formatting timestamp of occurrence")
    duration_ms: Optional[float] = Field(None, description="Action duration in milliseconds")

class WorkflowRunRequest(BaseModel):
    """
    Request parameters for triggering an end-to-end orchestrated workflow run.
    """
    dataset_name: str = Field(..., description="Target dataset name to register or run")
    dataset_path: str = Field(..., description="Directory path of target LISS-IV dataset folder")
    dataset_type: str = Field("DEMO", description="DEMO or CUSTOM")
    temporal_window_days: int = Field(30, description="Temporal window size in days for reference selection")
    num_references: int = Field(3, description="Number of temporal references to select")
    reconstruction_strategy: str = Field("TELEA", description="Inpainting strategy name, e.g. TELEA, NS")

class WorkflowLogEntry(BaseModel):
    """
    Log record formatting a terminal console output line.
    """
    timestamp: str = Field(..., description="ISO 8601 log timestamp")
    stage: str = Field(..., description="Name of the triggering stage")
    event: str = Field(..., description="Verbose event details text")
    status: str = Field(..., description="Status tag associated with the entry")
    severity: str = Field(..., description="Log classification: INFO, WARNING, ERROR")

class WorkflowResponse(BaseModel):
    """
    Response schema returning the consolidated live workflow profile of a session.
    """
    session_id: str = Field(..., description="UUID of the parent Analysis Session")
    current_stage: str = Field(..., description="Name of the currently running or last completed stage")
    overall_progress: float = Field(0.0, description="Dynamic percentage progress based on completed stages")
    total_processing_time_ms: float = Field(0.0, description="Cumulative execution time of completed stages in ms")
    session_health: str = Field(..., description="Aggregated status: HEALTHY, WARNING, DEGRADED, ERROR")
    stages: List[WorkflowStageDetail] = Field(default_factory=list, description="Workflow pipeline stages status list")
    timeline: List[WorkflowTimelineItem] = Field(default_factory=list, description="Historical execution event sequence")
    logs: List[WorkflowLogEntry] = Field(default_factory=list, description="Consolidated terminal console logs list")

class ValidationComponentResponse(BaseModel):
    """
    Validation response detailing status, message and properties of a specific workflow component.
    """
    valid: bool = Field(..., description="Whether this workflow group is valid/healthy")
    message: str = Field(..., description="Explanation or summary message")
    details: Dict[str, Any] = Field(default_factory=dict, description="Detailed validation key-value properties")

class WorkflowValidationResponse(BaseModel):
    """
    Overall validation response for the end-to-end analysis session workflow.
    """
    session_id: str = Field(..., description="UUID of the parent Analysis Session")
    overall_valid: bool = Field(..., description="True if all workflow groups are valid")
    upload: ValidationComponentResponse = Field(..., description="Upload workflow validation results")
    metadata: ValidationComponentResponse = Field(..., description="Metadata workflow validation results")
    temporal: ValidationComponentResponse = Field(..., description="Temporal workflow validation results")
    reconstruction: ValidationComponentResponse = Field(..., description="Reconstruction workflow validation results")
    export: ValidationComponentResponse = Field(..., description="Export workflow validation results")
