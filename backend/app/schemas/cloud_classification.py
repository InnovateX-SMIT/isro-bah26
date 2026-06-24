from datetime import datetime
from enum import Enum
from typing import List, Dict, Any
import json
from pydantic import BaseModel, ConfigDict, Field, model_validator

class CloudClassificationStatus(str, Enum):
    """
    Workflow state for cloud classification processing.
    """
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class CloudClassificationBase(BaseModel):
    dataset_id: str = Field(..., description="Unique UUID reference of the target dataset")
    cloud_detection_id: str = Field(..., description="Unique UUID reference of the input cloud detection record")

class CloudClassificationCreate(CloudClassificationBase):
    """
    Schema for initializing a PENDING cloud classification record.
    """
    pass

class CloudClassificationUpdate(BaseModel):
    """
    Schema for updating generated cloud classification fields.
    """
    classification_status: CloudClassificationStatus
    thick_cloud_region_count: int | None = None
    thin_cloud_region_count: int | None = None
    cirrus_cloud_region_count: int | None = None
    uncertain_region_count: int | None = None
    thick_cloud_area_percent: float | None = None
    thin_cloud_area_percent: float | None = None
    cirrus_cloud_area_percent: float | None = None
    uncertain_area_percent: float | None = None
    classification_map_path: str | None = None
    classification_preview_path: str | None = None
    region_details_json: str | None = None
    classification_method: str | None = None

class CloudClassificationResponse(CloudClassificationBase):
    classification_id: str = Field(..., description="Unique UUID for this cloud classification profile")
    classification_status: CloudClassificationStatus = Field(..., description="Processing workflow status")
    thick_cloud_region_count: int | None = Field(None, description="Number of regions classified as Thick Cloud")
    thin_cloud_region_count: int | None = Field(None, description="Number of regions classified as Thin Cloud")
    cirrus_cloud_region_count: int | None = Field(None, description="Number of regions classified as Cirrus Cloud")
    uncertain_region_count: int | None = Field(None, description="Number of regions classified as Uncertain Region")
    thick_cloud_area_percent: float | None = Field(None, description="Percentage of total cloud area that is Thick Cloud")
    thin_cloud_area_percent: float | None = Field(None, description="Percentage of total cloud area that is Thin Cloud")
    cirrus_cloud_area_percent: float | None = Field(None, description="Percentage of total cloud area that is Cirrus Cloud")
    uncertain_area_percent: float | None = Field(None, description="Percentage of total cloud area that is Uncertain Region")
    classification_map_path: str | None = Field(None, description="Path to georeferenced classification TIFF map")
    classification_preview_path: str | None = Field(None, description="Path to colored preview PNG map")
    region_details: List[Dict[str, Any]] = Field(default_factory=list, description="List of per-region details (class, mean_probability, area_px, compactness)")
    classification_method: str = Field(..., description="Explainable description of classification logic used")
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
                "classification_id", "dataset_id", "cloud_detection_id", "classification_status",
                "thick_cloud_region_count", "thin_cloud_region_count", "cirrus_cloud_region_count", "uncertain_region_count",
                "thick_cloud_area_percent", "thin_cloud_area_percent", "cirrus_cloud_area_percent", "uncertain_area_percent",
                "classification_map_path", "classification_preview_path", "classification_method", "created_at", "updated_at"
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
