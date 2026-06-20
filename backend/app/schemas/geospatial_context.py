from pydantic import BaseModel, Field
from datetime import datetime

class CoordinateSchema(BaseModel):
    """
    Sub-schema representing a geographic coordinate.
    """
    lat: float = Field(..., description="Latitude coordinate in decimal degrees WGS84")
    lon: float = Field(..., description="Longitude coordinate in decimal degrees WGS84")

class BoundsSchema(BaseModel):
    """
    Sub-schema representing geographic bounding box extents.
    """
    north: float = Field(..., description="Maximum latitude (Northern extent)")
    south: float = Field(..., description="Minimum latitude (Southern extent)")
    east: float = Field(..., description="Maximum longitude (Eastern extent)")
    west: float = Field(..., description="Minimum longitude (Western extent)")

class GeospatialContextResponse(BaseModel):
    """
    Response schema returning the full Geospatial Intelligence Context of a dataset.
    Matches Phase 3A specifications exactly.
    """
    dataset_id: str = Field(..., description="Unique referencing dataset UUID")
    center: CoordinateSchema = Field(..., description="Calculated center coordinate")
    bounds: BoundsSchema = Field(..., description="Calculated bounds limits")
    crs: str | None = Field(None, description="Coordinate Reference System name")
    epsg: int | None = Field(None, description="EPSG integer identifier code")
    projection: str | None = Field(None, description="Name of map projection")
    footprint: list[list[float]] = Field(..., description="Ordered list of [longitude, latitude] coordinates representing footprint polygon boundary")

    class Config:
        from_attributes = True
