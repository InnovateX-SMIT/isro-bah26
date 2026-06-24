from datetime import datetime
from enum import Enum
from typing import List, Dict, Any
import json
from pydantic import BaseModel, ConfigDict, Field, model_validator

class CloudShadowStatus(str, Enum):
    """
    Workflow state for cloud shadow detection processing.
    """
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class CloudShadowBase(BaseModel):
    dataset_id: str = Field(..., description="Unique UUID reference of the target dataset")
    cloud_classification_id: str = Field(..., description="Unique UUID reference of the input cloud classification record")

class CloudShadowCreate(CloudShadowBase):
    """
    Schema for initializing a PENDING cloud shadow record.
    """
    pass

class CloudShadowUpdate(BaseModel):
    """
    Schema for updating generated cloud shadow fields.
    """
    shadow_detection_status: CloudShadowStatus
    solar_geometry_available: bool | None = None
    shadow_region_count: int | None = None
    total_shadow_area_percent: float | None = None
    linked_shadow_region_count: int | None = None
    unlinked_shadow_region_count: int | None = None
    mean_shadow_to_cloud_area_ratio: float | None = None
    shadow_mask_path: str | None = None
    shadow_preview_path: str | None = None
    region_details_json: str | None = None
    detection_method: str | None = None

class CloudShadowResponse(CloudShadowBase):
    shadow_id: str = Field(..., description="Unique UUID for this cloud shadow profile")
    shadow_detection_status: CloudShadowStatus = Field(..., description="Processing workflow status")
    solar_geometry_available: bool = Field(..., description="Indicates if solar azimuth/elevation was used or fallback")
    shadow_region_count: int | None = Field(None, description="Number of connected shadow regions detected")
    total_shadow_area_percent: float | None = Field(None, description="Percentage of total area classified as shadow")
    linked_shadow_region_count: int | None = Field(None, description="Number of shadow regions successfully linked to a casting cloud")
    unlinked_shadow_region_count: int | None = Field(None, description="Number of shadow regions not linked to any cloud")
    mean_shadow_to_cloud_area_ratio: float | None = Field(None, description="Average ratio of shadow area to its linked cloud area")
    shadow_mask_path: str | None = Field(None, description="Path to georeferenced shadow TIFF mask")
    shadow_preview_path: str | None = Field(None, description="Path to colored shadow preview PNG")
    region_details: List[Dict[str, Any]] = Field(default_factory=list, description="List of per-region details (id, area_px, linked_cloud_id, distance)")
    detection_method: str = Field(..., description="Explainable description of shadow detection logic used")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def parse_region_details(cls, data: Any) -> Any:
        """
        Model validator that parses raw SQLite JSON text to Pydantic region_details list.
        """
        if not isinstance(data, dict):
            # SQLAlchemy Model instance
            data_dict = {}
            for col in [
                "shadow_id", "dataset_id", "cloud_classification_id", "shadow_detection_status",
                "solar_geometry_available", "shadow_region_count", "total_shadow_area_percent",
                "linked_shadow_region_count", "unlinked_shadow_region_count", "mean_shadow_to_cloud_area_ratio",
                "shadow_mask_path", "shadow_preview_path", "detection_method", "created_at", "updated_at"
            ]:
                data_dict[col] = getattr(data, col, None)
            
            raw_json = getattr(data, "region_details_json", None)
            if raw_json and isinstance(raw_json, str):
                try:
                    data_dict["region_details"] = json.loads(raw_json)
                except Exception:
                    data_dict["region_details"] = []
            else:
                data_dict["region_details"] = []
            return data_dict
            
        elif isinstance(data, dict) and "region_details_json" in data:
            if "region_details" not in data or not data["region_details"]:
                raw_json = data["region_details_json"]
                if raw_json and isinstance(raw_json, str):
                    try:
                        data["region_details"] = json.loads(raw_json)
                    except Exception:
                        data["region_details"] = []
                else:
                    data["region_details"] = []
        return data
