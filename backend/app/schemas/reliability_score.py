import json
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator

class RegionReliability(BaseModel):
    """
    Structured model returning reliability statistics per reconstructed region.
    """
    region_id: int = Field(..., description="Unique ID of the segmented region")
    mean_confidence: float = Field(..., description="Mean confidence score of pixels in this region")
    reliability_tier: str = Field(..., description="Reliability tier band (High, Moderate, Low, Very Low)")
    area_px: int = Field(..., description="Area of region in pixels")

class ReliabilityScoreResponse(BaseModel):
    """
    Response schema returning the details of a reliability score database record.
    Exposes region-level JSON as a structured list.
    """
    reliability_id: str = Field(..., description="Unique UUID for this reliability score record")
    confidence_estimation_id: str = Field(..., description="Reference to parent Confidence Estimation")
    dataset_id: str = Field(..., description="Reference to parent Dataset")
    reliability_status: str = Field(..., description="Lifecycle status: pending, completed, failed")
    dataset_reliability_score: Optional[float] = Field(None, description="Dataset reliability score [0.0 to 100.0]")
    dataset_reliability_tier: Optional[str] = Field(None, description="Dataset reliability tier (High, Moderate, Low, Very Low)")
    region_reliability: Optional[List[RegionReliability]] = Field(None, description="List of parsed region-level reliability statistics")
    reconstruction_reliability_score: Optional[float] = Field(None, description="Reconstruction process reliability score [0.0 to 100.0]")
    scoring_basis: str = Field(..., description="Explainability detail for the blend calculations and conceptual definitions")
    scoring_method: str = Field(..., description="Scoring method/algorithm version name used")
    created_at: datetime = Field(..., description="Timestamp when reliability record was created")
    updated_at: datetime = Field(..., description="Timestamp of last update")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def parse_region_json(cls, value: Any) -> Any:
        """
        Parses region_reliability_json from SQLite string format to a list of dicts.
        Uses setattr during ORM extraction to populate region_reliability dynamically.
        """
        if isinstance(value, dict):
            if "region_reliability_json" in value and isinstance(value["region_reliability_json"], str):
                try:
                    value["region_reliability"] = json.loads(value["region_reliability_json"])
                except Exception:
                    value["region_reliability"] = []
        else:
            try:
                if hasattr(value, "region_reliability_json") and value.region_reliability_json:
                    setattr(value, "region_reliability", json.loads(value.region_reliability_json))
                else:
                    setattr(value, "region_reliability", [])
            except Exception:
                pass
        return value
