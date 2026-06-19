from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class MetadataStatus(str, Enum):
    """
    Workflow extraction state.
    """
    PENDING = "PENDING"
    EXTRACTING = "EXTRACTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class DatasetMetadataBase(BaseModel):
    dataset_id: str = Field(..., description="Unique UUID reference of the target dataset")

class DatasetMetadataCreate(DatasetMetadataBase):
    """
    Schema used to instantiate metadata records in PENDING status.
    """
    pass

class DatasetMetadataUpdate(BaseModel):
    """
    Schema used when updating extracted metadata records.
    """
    coordinate_system: str | None = None
    projection_name: str | None = None
    epsg_code: int | None = None
    utm_zone: int | None = None
    origin_x: float | None = None
    origin_y: float | None = None
    pixel_size_x: float | None = None
    pixel_size_y: float | None = None
    raster_width: int | None = None
    raster_height: int | None = None
    band_count: int | None = None
    acquisition_date: str | None = None
    metadata_status: MetadataStatus

class DatasetMetadataResponse(DatasetMetadataBase):
    metadata_id: str = Field(..., description="Unique UUID for this metadata profile")
    coordinate_system: str | None = Field(None, description="Name of CRS")
    projection_name: str | None = Field(None, description="Name of Map Projection")
    epsg_code: int | None = Field(None, description="EPSG Code")
    utm_zone: int | None = Field(None, description="UTM Zone Number")
    origin_x: float | None = Field(None, description="Top-left origin X")
    origin_y: float | None = Field(None, description="Top-left origin Y")
    pixel_size_x: float | None = Field(None, description="Pixel resolution X")
    pixel_size_y: float | None = Field(None, description="Pixel resolution Y")
    raster_width: int | None = Field(None, description="Width of raster in pixels")
    raster_height: int | None = Field(None, description="Height of raster in scans")
    band_count: int | None = Field(None, description="Total bands detected")
    acquisition_date: str | None = Field(None, description="Acquisition date (e.g. 12-AUG-2025)")
    metadata_status: MetadataStatus = Field(..., description="Workflow status")
    created_at: datetime = Field(..., description="Creation date")
    updated_at: datetime = Field(..., description="Update date")

    model_config = ConfigDict(from_attributes=True)
