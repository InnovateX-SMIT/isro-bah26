from pydantic import BaseModel, Field
from datetime import datetime

class LocationContextResponse(BaseModel):
    """
    Response schema returning the full Location Intelligence Profile of a dataset.
    Matches Phase 3B specifications exactly.
    """
    dataset_id: str = Field(..., description="Unique referencing dataset UUID")
    country: str = Field(..., description="Resolved country name")
    state: str = Field(..., description="Resolved state or province name")
    district: str = Field(..., description="Resolved district or county name")
    administrative_region: str = Field(..., description="Classified administrative region of the target state")
    geographic_region: str = Field(..., description="Classified geographic/physiographic region")
    location_summary: str = Field(..., description="Generated textual location summary")

    class Config:
        from_attributes = True
