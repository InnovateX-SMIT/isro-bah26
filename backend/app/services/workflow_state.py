import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class StageState(BaseModel):
    """
    Pydantic schema detailing the runtime state of a specific stage in the orchestrated workflow.
    """
    name: str
    status: str = "pending"  # pending, waiting, running, completed, failed, blocked
    updated_at: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    duration_ms: float = 0.0
    error_summary: Optional[str] = None
    blocked_by: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)

class WorkflowRunState(BaseModel):
    """
    Pydantic schema representing the complete live workflow run state for an Analysis Session.
    """
    session_id: str
    status: str = "created"  # created, active, completed, failed
    current_stage: str = "Analysis Session"
    overall_progress: float = 0.0
    total_processing_time_ms: float = 0.0
    stages: List[StageState] = Field(default_factory=list)
    errors: Dict[str, str] = Field(default_factory=dict)
    logs: List[Dict[str, Any]] = Field(default_factory=list)
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
