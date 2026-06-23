from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class SessionStatus(str, Enum):
    """
    Supported states for an Analysis Session lifecycle.
    """
    CREATED = "created"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    TEMPORAL_CONTEXT_RETRIEVED = "TEMPORAL_CONTEXT_RETRIEVED"
    REFERENCE_SELECTION_COMPLETE = "REFERENCE_SELECTION_COMPLETE"
    TEMPORAL_CONTEXT_GENERATED = "TEMPORAL_CONTEXT_GENERATED"




class SessionBase(BaseModel):
    status: SessionStatus = Field(
        default=SessionStatus.CREATED,
        description="The current operational status of the session"
    )

class SessionCreate(BaseModel):
    """
    Request schema for creating a new session. No parameters are required
    as the server generates the UUID and initializes status to 'created'.
    """
    pass

class SessionUpdate(BaseModel):
    """
    Request schema for updating session state.
    """
    status: SessionStatus = Field(
        ...,
        description="The target status of the session to transition to"
    )

class SessionInDBBase(SessionBase):
    session_id: str = Field(..., description="Unique UUID identification for the session")
    created_at: datetime = Field(..., description="Timestamp of when the session was created")
    updated_at: datetime = Field(..., description="Timestamp of the last session update")

    model_config = ConfigDict(from_attributes=True)

class SessionResponse(SessionInDBBase):
    """
    Public response schema for analysis sessions.
    """
    pass
