from datetime import datetime
from enum import Enum
from typing import List, Dict, Any
import json
from pydantic import BaseModel, ConfigDict, Field, model_validator

class CloudAnalyticsStatus(str, Enum):
    """
    Workflow state for cloud analytics processing.
    """
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class CloudAnalyticsBase(BaseModel):
    dataset_id: str = Field(..., description="Unique UUID reference of the target dataset")
    cloud_segmentation_id: str = Field(..., description="Unique UUID reference of the input cloud segmentation record")

class CloudAnalyticsCreate(CloudAnalyticsBase):
    """
    Schema for initializing a PENDING cloud analytics record.
    """
    pass

class CloudAnalyticsUpdate(BaseModel):
    """
    Schema for updating generated cloud analytics fields.
    """
    analytics_status: CloudAnalyticsStatus
    total_cloud_coverage_percent: float | None = None
    total_shadow_coverage_percent: float | None = None
    thick_cloud_percent: float | None = None
    thin_cloud_percent: float | None = None
    cirrus_cloud_percent: float | None = None
    uncertain_cloud_percent: float | None = None
    total_cloud_objects: int | None = None
    high_priority_objects: int | None = None
    medium_priority_objects: int | None = None
    low_priority_objects: int | None = None
    largest_cloud_object_pixels: int | None = None
    smallest_cloud_object_pixels: int | None = None
    mean_cloud_object_pixels: float | None = None
    reconstruction_target_percent: float | None = None
    scene_cloud_complexity_score: float | None = None
    scene_reconstruction_difficulty: str | None = None
    cloud_intelligence_score: float | None = None
    cloud_burden_index: float | None = None
    reconstruction_readiness: bool | None = None
    analytics_summary_json: str | None = None

class CloudAnalyticsResponse(CloudAnalyticsBase):
    analytics_id: str = Field(..., description="Unique UUID for this cloud analytics profile")
    analytics_status: CloudAnalyticsStatus = Field(..., description="Processing workflow status")
    total_cloud_coverage_percent: float | None = Field(None, description="Percentage of the scene covered by clouds")
    total_shadow_coverage_percent: float | None = Field(None, description="Percentage of the scene covered by shadows")
    thick_cloud_percent: float | None = Field(None, description="Percentage of cloud cover that is Thick Cloud")
    thin_cloud_percent: float | None = Field(None, description="Percentage of cloud cover that is Thin Cloud")
    cirrus_cloud_percent: float | None = Field(None, description="Percentage of cloud cover that is Cirrus Cloud")
    uncertain_cloud_percent: float | None = Field(None, description="Percentage of cloud cover that is Uncertain Cloud")
    total_cloud_objects: int | None = Field(None, description="Total number of segmented cloud objects")
    high_priority_objects: int | None = Field(None, description="Number of objects flagged with HIGH priority")
    medium_priority_objects: int | None = Field(None, description="Number of objects flagged with MEDIUM priority")
    low_priority_objects: int | None = Field(None, description="Number of objects flagged with LOW priority")
    largest_cloud_object_pixels: int | None = Field(None, description="Size in pixels of the largest cloud object")
    smallest_cloud_object_pixels: int | None = Field(None, description="Size in pixels of the smallest cloud object")
    mean_cloud_object_pixels: float | None = Field(None, description="Average size in pixels of cloud objects")
    reconstruction_target_percent: float | None = Field(None, description="Percentage of the image requiring restoration")
    scene_cloud_complexity_score: float | None = Field(None, description="Synthesized scene cloud complexity score (0-100)")
    scene_reconstruction_difficulty: str | None = Field(None, description="Overall difficulty level: LOW, MEDIUM, HIGH, EXTREME")
    cloud_intelligence_score: float | None = Field(None, description="Confidence metric for cloud characterization")
    cloud_burden_index: float | None = Field(None, description="Operational burden of clouds on this scene (0-100)")
    reconstruction_readiness: bool = Field(..., description="Indicates if all preceding phases are complete")
    analytics_summary: Dict[str, Any] = Field(default_factory=dict, description="Consolidated analytics package summary report")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def parse_analytics_summary(cls, data: Any) -> Any:
        """
        Model validator that parses raw SQLite JSON text to Pydantic analytics_summary dict.
        """
        if not isinstance(data, dict):
            # SQLAlchemy Model instance
            data_dict = {}
            for col in [
                "analytics_id", "dataset_id", "cloud_segmentation_id", "analytics_status",
                "total_cloud_coverage_percent", "total_shadow_coverage_percent",
                "thick_cloud_percent", "thin_cloud_percent", "cirrus_cloud_percent", "uncertain_cloud_percent",
                "total_cloud_objects", "high_priority_objects", "medium_priority_objects", "low_priority_objects",
                "largest_cloud_object_pixels", "smallest_cloud_object_pixels", "mean_cloud_object_pixels",
                "reconstruction_target_percent", "scene_cloud_complexity_score", "scene_reconstruction_difficulty",
                "cloud_intelligence_score", "cloud_burden_index", "reconstruction_readiness",
                "created_at", "updated_at"
            ]:
                data_dict[col] = getattr(data, col, None)
            
            raw_json = getattr(data, "analytics_summary_json", None)
            if raw_json and isinstance(raw_json, str):
                try:
                    data_dict["analytics_summary"] = json.loads(raw_json)
                except Exception:
                    data_dict["analytics_summary"] = {}
            else:
                data_dict["analytics_summary"] = {}
            return data_dict
            
        elif isinstance(data, dict) and "analytics_summary_json" in data:
            if "analytics_summary" not in data or not data["analytics_summary"]:
                raw_json = data["analytics_summary_json"]
                if raw_json and isinstance(raw_json, str):
                    try:
                        data["analytics_summary"] = json.loads(raw_json)
                    except Exception:
                        data["analytics_summary"] = {}
                else:
                    data["analytics_summary"] = {}
        return data
