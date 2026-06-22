from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    """
    Geographic bounding box limits in WGS84 decimal degrees.
    """
    min_lat: float = Field(..., description="Minimum latitude of bounding box")
    min_lon: float = Field(..., description="Minimum longitude of bounding box")
    max_lat: float = Field(..., description="Maximum latitude of bounding box")
    max_lon: float = Field(..., description="Maximum longitude of bounding box")

class GeospatialProfile(BaseModel):
    """
    Geospatial Profile representing the geographic intelligence of a registered dataset.
    """
    dataset_id: str = Field(..., description="Unique dataset identification UUID")
    center_lat: float = Field(..., description="Geographic center latitude in WGS84")
    center_lon: float = Field(..., description="Geographic center longitude in WGS84")
    bbox: BoundingBox = Field(..., description="Calculated geographic bounds envelope")
    crs: str = Field(..., description="Coordinate Reference System name")
    projection: str = Field(..., description="Map projection model description")
    utm_zone: str | None = Field(None, description="UTM zone descriptor (e.g. '43N')")
    hemisphere: str | None = Field(None, description="Earth hemisphere context (e.g. 'Northern' or 'Southern')")
    spatial_reference: str | None = Field(None, description="Standardized spatial reference code (e.g. 'EPSG:32643')")
