from typing import List, Optional
from pydantic import BaseModel, Field

class PackageRequest(BaseModel):
    """
    Request payload to trigger compiling and exporting a consolidated analysis package.
    """
    session_id: str = Field(..., description="Reference to parent Analysis Session ID")
    format: Optional[str] = Field("ZIP", description="Archive file format requested (e.g., ZIP)")

class PackageResponse(BaseModel):
    """
    Response schema returning package generation telemetry.
    """
    package_id: str = Field(..., description="Unique UUID for this package generation run")
    session_id: str = Field(..., description="Reference to parent Analysis Session ID")
    status: str = Field(..., description="Lifecycle status: PENDING, PROCESSING, COMPLETED, FAILED")
    format: str = Field(..., description="The archive format requested")
    file_path: Optional[str] = Field(None, description="Path relative to workspace root of the generated ZIP file")
    file_size_bytes: Optional[int] = Field(None, description="Size of the compiled package file in bytes")
    progress: int = Field(0, description="Processing compilation progress percentage (0 to 100)")
    message: str = Field("", description="Operator log / status details")
    error_message: Optional[str] = Field(None, description="Details explaining package compilation failure")
    created_at: str = Field(..., description="Timestamp when package run was created")
    updated_at: str = Field(..., description="Timestamp of last status modification")
    included_assets: List[str] = Field(default_factory=list, description="List of outputs gathered in the package")

class PackageValidationResponse(BaseModel):
    """
    Pre-compilation check response listing available and unavailable assets.
    """
    valid: bool = Field(..., description="True if minimum geospatial criteria is met to compile a package")
    message: str = Field(..., description="Status summary of validation checks")
    available_assets: List[str] = Field(default_factory=list, description="Subsystems and files ready for package inclusion")
    missing_assets: List[str] = Field(default_factory=list, description="Subsystems or files that are missing/unprocessed")
