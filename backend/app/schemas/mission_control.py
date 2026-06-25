from pydantic import BaseModel, ConfigDict, Field
from app.schemas.dataset import DatasetResponse
from app.schemas.dataset_metadata import DatasetMetadataResponse
from app.schemas.geospatial_context import GeospatialContextResponse
from app.schemas.location_context import LocationContextResponse
from app.schemas.geospatial_context_profile import GeospatialContextProfileResponse

class MissionControlStatus(BaseModel):
    """
    Response schema returning the readiness status of individual dataset intelligence layers.
    Each layer holds one of exactly three values: "available", "missing", or "error".
    """
    metadata: str = Field(..., description="Status of the Metadata layer: 'available', 'missing', or 'error'")
    geospatial: str = Field(..., description="Status of the Geospatial layer: 'available', 'missing', or 'error'")
    location: str = Field(..., description="Status of the Location layer: 'available', 'missing', or 'error'")
    context: str = Field(..., description="Status of the Geospatial Context layer: 'available', 'missing', or 'error'")

    # Future compatibility status hooks
    temporal: str = Field(default="missing", description="Status of the Temporal layer (future compatibility)")
    cloud: str = Field(default="missing", description="Status of the Cloud layer (future compatibility)")
    reconstruction: str = Field(default="missing", description="Status of the Reconstruction layer (future compatibility)")
    temporal_fusion: str = Field(default="missing", description="Status of the Temporal Fusion layer")
    confidence: str = Field(default="missing", description="Status of the Confidence layer (future compatibility)")
    reliability: str = Field(default="missing", description="Status of the Reliability layer")
    confidence_heatmap: str = Field(default="missing", description="Status of the Confidence Heatmap layer")
    confidence_analytics: str = Field(default="missing", description="Status of the Confidence Analytics layer")

    model_config = ConfigDict(from_attributes=True)

from app.schemas.temporal_context import TemporalContextResponse

class MissionControlResponse(BaseModel):
    """
    Response schema returning the consolidated Mission Control Profile of a dataset.
    """
    dataset: DatasetResponse = Field(..., description="Parent registered dataset metadata profile")
    metadata: DatasetMetadataResponse | None = Field(None, description="Metadata intelligence profile")
    geospatial: GeospatialContextResponse | None = Field(None, description="Geospatial bounding bounds and footprint")
    location: LocationContextResponse | None = Field(None, description="Location reverse geocoding intelligence profile")
    context: GeospatialContextProfileResponse | None = Field(None, description="Environmental and terrain context profile")
    status: MissionControlStatus = Field(..., description="Intelligence status indicators")
    summary: str | None = Field(None, description="Dynamically generated operational summary report")

    # Future compatibility data placeholders
    temporal: TemporalContextResponse | None = Field(default=None, description="Temporal Intelligence context details")
    cloud: dict | None = Field(default=None, description="Cloud Intelligence data placeholder")
    reconstruction: dict | None = Field(default=None, description="Reconstruction Intelligence data placeholder")
    temporal_fusion: dict | None = Field(default=None, description="Temporal Fusion Intelligence data placeholder")
    confidence: dict | None = Field(default=None, description="Confidence Intelligence data placeholder")
    reliability: dict | None = Field(default=None, description="Reliability Intelligence data placeholder")
    confidence_heatmap: dict | None = Field(default=None, description="Confidence Heatmap visual context")
    confidence_analytics: dict | None = Field(default=None, description="Confidence Analytics report context")

    model_config = ConfigDict(from_attributes=True)

