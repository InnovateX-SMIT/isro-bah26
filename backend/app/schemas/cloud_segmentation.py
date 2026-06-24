from datetime import datetime
from enum import Enum
from typing import List, Dict, Any
import json
from pydantic import BaseModel, ConfigDict, Field, model_validator

class CloudSegmentationStatus(str, Enum):
    """
    Workflow state for cloud segmentation processing.
    """
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class CloudSegmentationBase(BaseModel):
    dataset_id: str = Field(..., description="Unique UUID reference of the target dataset")
    cloud_shadow_id: str = Field(..., description="Unique UUID reference of the input cloud shadow record")

class CloudSegmentationCreate(CloudSegmentationBase):
    """
    Schema for initializing a PENDING cloud segmentation record.
    """
    pass

class CloudSegmentationUpdate(BaseModel):
    """
    Schema for updating generated cloud segmentation fields.
    """
    segmentation_status: CloudSegmentationStatus
    total_segmented_regions: int | None = None
    total_cloud_pixels: int | None = None
    total_shadow_pixels: int | None = None
    largest_region_pixels: int | None = None
    smallest_region_pixels: int | None = None
    mean_region_pixels: float | None = None
    total_segmented_area_percent: float | None = None
    reconstruction_ready: bool | None = None
    segmentation_mask_path: str | None = None
    reconstruction_mask_path: str | None = None
    segmentation_preview_path: str | None = None
    region_details_json: str | None = None

class CloudSegmentationResponse(CloudSegmentationBase):
    segmentation_id: str = Field(..., description="Unique UUID for this cloud segmentation profile")
    segmentation_status: CloudSegmentationStatus = Field(..., description="Processing workflow status")
    total_segmented_regions: int | None = Field(None, description="Number of connected segmented regions detected")
    total_cloud_pixels: int | None = Field(None, description="Total number of pixels classified as cloud")
    total_shadow_pixels: int | None = Field(None, description="Total number of pixels classified as shadow")
    largest_region_pixels: int | None = Field(None, description="Size in pixels of the largest segmented region")
    smallest_region_pixels: int | None = Field(None, description="Size in pixels of the smallest segmented region")
    mean_region_pixels: float | None = Field(None, description="Average size in pixels of segmented regions")
    total_segmented_area_percent: float | None = Field(None, description="Percentage of the total image area classified as cloud or shadow")
    reconstruction_ready: bool = Field(..., description="Indicates if the masks are fully processed and ready for ingestion")
    segmentation_mask_path: str | None = Field(None, description="Path to georeferenced multi-class segmentation TIFF mask")
    reconstruction_mask_path: str | None = Field(None, description="Path to georeferenced binary reconstruction TIFF mask")
    segmentation_preview_path: str | None = Field(None, description="Path to colored segmentation preview PNG")
    region_details: List[Dict[str, Any]] = Field(default_factory=list, description="List of per-region details (id, area_px, bounding_box, centroid, priority, etc.)")
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
                "segmentation_id", "dataset_id", "cloud_shadow_id", "segmentation_status",
                "total_segmented_regions", "total_cloud_pixels", "total_shadow_pixels",
                "largest_region_pixels", "smallest_region_pixels", "mean_region_pixels",
                "total_segmented_area_percent", "reconstruction_ready",
                "segmentation_mask_path", "reconstruction_mask_path", "segmentation_preview_path",
                "created_at", "updated_at"
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
