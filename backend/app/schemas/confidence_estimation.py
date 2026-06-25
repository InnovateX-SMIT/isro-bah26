from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ConfidenceEstimationResponse(BaseModel):
    """
    Response schema returning the details of a confidence estimation database record.
    """
    confidence_id: str = Field(..., description="Unique UUID for this confidence estimation run")
    reconstruction_run_id: str = Field(..., description="Reference to parent Reconstruction Run")
    dataset_id: str = Field(..., description="Reference to parent Dataset")
    confidence_status: str = Field(..., description="Lifecycle status: pending, completed, failed")
    mean_confidence_score: Optional[float] = Field(None, description="Mean confidence score [0.0 to 100.0]")
    low_confidence_area_percent: Optional[float] = Field(None, description="Percentage of low confidence pixels (< 50.0) in mask")
    confidence_map_path: Optional[str] = Field(None, description="Path relative to workspace root of generated GeoTIFF")
    confidence_preview_path: Optional[str] = Field(None, description="Path relative to workspace root of preview PNG")
    inference_basis: str = Field(..., description="Explainability detail for the scoring signals used")
    confidence_method: str = Field(..., description="Method/algorithm version name used")
    created_at: datetime = Field(..., description="Timestamp when confidence run was created")
    updated_at: datetime = Field(..., description="Timestamp of last update")

    model_config = ConfigDict(from_attributes=True)
