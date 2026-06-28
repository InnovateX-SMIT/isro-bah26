from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ExportRequest(BaseModel):
    """
    Request payload to trigger compiling and exporting a raster layer.
    """
    session_id: str = Field(..., description="Reference to parent Analysis Session ID")
    layer: str = Field(..., description="The specific raster layer to export (e.g. reconstruction, optimized_reconstruction, cloud_mask, confidence_map)")
    format: str = Field(..., description="The output format requested: GeoTIFF, PNG, or JPG")

class ExportResponse(BaseModel):
    """
    Response details of an export run record.
    """
    export_id: str = Field(..., description="Unique UUID for this export record")
    session_id: str = Field(..., description="Reference to parent Analysis Session ID")
    layer: str = Field(..., description="The specific raster layer exported")
    format: str = Field(..., description="The output format requested")
    status: str = Field(..., description="Lifecycle status: PENDING, PROCESSING, COMPLETED, FAILED")
    file_path: Optional[str] = Field(None, description="Path relative to workspace root of the generated export file")
    file_size_bytes: Optional[int] = Field(None, description="Size of the exported file in bytes")
    error_message: Optional[str] = Field(None, description="Error message if the export failed")
    created_at: datetime = Field(..., description="Timestamp when export run was created")
    updated_at: datetime = Field(..., description="Timestamp of last status modification")

    model_config = ConfigDict(from_attributes=True)

class ExportValidationRequest(BaseModel):
    """
    Request payload to validate if a raster layer is generated and ready for export.
    """
    session_id: str = Field(..., description="Reference to parent Analysis Session ID")
    layer: str = Field(..., description="The specific raster layer to validate")
    format: str = Field(..., description="The output format requested (GeoTIFF, PNG, JPG)")

class ExportValidationResponse(BaseModel):
    """
    Response payload detailing if the requested layer is ready for export.
    """
    valid: bool = Field(..., description="True if the layer is generated and format is supported")
    message: str = Field(..., description="Details explaining validation check results")
