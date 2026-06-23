import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.temporal_reference import SelectedReferenceResponse

class ProviderStatisticsResponse(BaseModel):
    """
    Response schema returning aggregate statistics about satellite data providers represented in a stack.
    """
    providers_represented: List[str] = Field(..., description="Unique provider names represented in the selections")
    provider_counts: Dict[str, int] = Field(..., description="Count of selected references mapped by provider")

class CloudStatisticsResponse(BaseModel):
    """
    Response schema returning aggregate cloud cover percentages.
    """
    average: float = Field(..., description="Average cloud cover percentage across reference stack")
    min: float = Field(..., description="Minimum cloud cover percentage observed")
    max: float = Field(..., description="Maximum cloud cover percentage observed")

class TemporalStatisticsResponse(BaseModel):
    """
    Response schema returning aggregate temporal distances.
    """
    average: float = Field(..., description="Average temporal distance in days from target acquisition date")
    min: float = Field(..., description="Minimum temporal distance in days (closest reference date)")
    max: float = Field(..., description="Maximum temporal distance in days (furthest reference date)")

class SpatialStatisticsResponse(BaseModel):
    """
    Response schema returning aggregate spatial footprint overlap percentages.
    """
    average: float = Field(..., description="Average footprint spatial overlap percentage")
    min: float = Field(..., description="Minimum footprint overlap percentage observed")
    max: float = Field(..., description="Maximum footprint overlap percentage observed")

class TemporalContextResponse(BaseModel):
    """
    Response schema mapping the persisted TemporalContext database entity.
    """
    id: str
    session_id: str
    dataset_id: str
    reference_stack_id: str
    provider_count: int
    reference_count: int
    average_cloud_cover: float
    average_temporal_distance: float
    average_spatial_overlap: float
    summary: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def parse_metadata_json(cls, data: Any) -> Any:
        """
        Validator parsing raw metadata_json string column from SQLite into standard metadata dictionary.
        """
        if hasattr(data, 'metadata_json') and isinstance(data.metadata_json, str):
            try:
                data_dict = {}
                for key in ["id", "session_id", "dataset_id", "reference_stack_id", "provider_count", "reference_count", "average_cloud_cover", "average_temporal_distance", "average_spatial_overlap", "summary", "created_at", "updated_at"]:
                    data_dict[key] = getattr(data, key)
                data_dict["metadata"] = json.loads(data.metadata_json)
                return data_dict
            except Exception:
                pass
        elif isinstance(data, dict) and "metadata_json" in data:
            try:
                if "metadata" not in data or not data["metadata"]:
                    data["metadata"] = json.loads(data["metadata_json"])
            except Exception:
                pass
        return data

class TemporalContextPackageResponse(BaseModel):
    """
    Official Temporal Layer output package compiling references, statistics, and human briefing summaries.
    """
    selected_references: List[SelectedReferenceResponse] = Field(..., description="Ordered list of selected reference details")
    provider_summary: ProviderStatisticsResponse = Field(..., description="Unique providers represented and reference allocations")
    cloud_statistics: CloudStatisticsResponse = Field(..., description="Aggregated cloud cover analytics")
    temporal_statistics: TemporalStatisticsResponse = Field(..., description="Aggregated temporal distance analytics")
    spatial_statistics: SpatialStatisticsResponse = Field(..., description="Aggregated spatial footprint overlap analytics")
    reference_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context metadata")
    context_summary: str = Field(..., description="Human-readable operational briefing summary")
