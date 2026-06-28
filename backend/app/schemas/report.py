from typing import List, Optional
from pydantic import BaseModel, Field

class ReportRequest(BaseModel):
    """
    Request payload to trigger compiling and rendering a session report.
    """
    session_id: str = Field(..., description="Reference to parent Analysis Session ID")
    report_type: str = Field(..., description="The type of report: analysis, metadata, reconstruction, confidence")

class ReportResponse(BaseModel):
    """
    Metadata returned after compiling a report.
    """
    session_id: str = Field(..., description="Reference to parent Analysis Session ID")
    report_type: str = Field(..., description="The type of report compiled")
    status: str = Field(..., description="Compilation status: COMPLETED, FAILED")
    file_path: Optional[str] = Field(None, description="Path relative to workspace root of the generated PDF report")
    file_size_bytes: Optional[int] = Field(None, description="Size of the report file in bytes")
    created_at: str = Field(..., description="ISO timestamp of report compilation")
    error_message: Optional[str] = Field(None, description="Error details if status is FAILED")

class ReportValidationRequest(BaseModel):
    """
    Request payload to validate layer readiness for report generation.
    """
    session_id: str = Field(..., description="Reference to parent Analysis Session ID")
    report_type: str = Field(..., description="The type of report to validate")

class ReportValidationResponse(BaseModel):
    """
    Prerequisite checks response detailing ready segments.
    """
    valid: bool = Field(..., description="True if minimum prerequisites are met to compile the report")
    message: str = Field(..., description="Status summary of checks")
    sections: List[str] = Field(default_factory=list, description="List of report sections that are ready to compile")
