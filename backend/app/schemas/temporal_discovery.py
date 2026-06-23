import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

class TemporalDiscoveryRequest(BaseModel):
    """
    Request payload to trigger a historical satellite imagery discovery run.
    """
    provider_name: Optional[str] = Field(None, description="Optional provider name override (default uses primary)")
    temporal_window_days: int = Field(30, description="Temporal search window size in days (e.g. 30, 90, 180)")

class TemporalCandidateResponse(BaseModel):
    """
    Response schema representing a single discovered historical imagery candidate.
    """
    id: str
    discovery_id: str
    candidate_id: str
    provider_name: str
    acquisition_date: str
    cloud_cover: float
    spatial_overlap: float
    preview_url: Optional[str]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def parse_metadata_json(cls, data: Any) -> Any:
        """
        Parses raw database string 'metadata_json' into the Pydantic 'metadata' dictionary.
        """
        if hasattr(data, 'metadata_json') and isinstance(data.metadata_json, str):
            try:
                # Extract all attributes into a dictionary
                data_dict = {}
                for key in ["id", "discovery_id", "candidate_id", "provider_name", "acquisition_date", "cloud_cover", "spatial_overlap", "preview_url", "created_at"]:
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

class TemporalDiscoveryResponse(BaseModel):
    """
    Response schema representing metadata about a discovery execution run.
    """
    id: str
    session_id: str
    dataset_id: str
    provider_used: str
    search_window_start: str
    search_window_end: str
    candidate_count: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TemporalCandidateListResponse(BaseModel):
    """
    Comprehensive response including discovery metadata and all associated candidates.
    """
    discovery: TemporalDiscoveryResponse
    candidate_count: int
    candidates: List[TemporalCandidateResponse]
