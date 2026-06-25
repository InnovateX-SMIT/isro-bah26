import json
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator

class ConfidenceHeatmapResponse(BaseModel):
    """
    Response schema returning the details of a confidence heatmap database record.
    Exposes legend JSON string as a structured dictionary.
    """
    heatmap_id: str = Field(..., description="Unique UUID for this confidence heatmap record")
    reliability_score_id: str = Field(..., description="Reference to parent Reliability Score ID")
    dataset_id: str = Field(..., description="Reference to parent Dataset ID")
    heatmap_status: str = Field(..., description="Lifecycle status: pending, completed, failed")
    confidence_overlay_path: Optional[str] = Field(None, description="Path to confidence_overlay.png on disk")
    reliability_map_path: Optional[str] = Field(None, description="Path to reliability_map.png on disk")
    legend: Optional[Dict[str, Any]] = Field(None, description="Structured visual color-to-meaning mapping details")
    basis: str = Field(..., description="Explainability detail for blend ratios and color mappings")
    heatmap_method: str = Field(..., description="Visualization mapping method/algorithm version name used")
    created_at: datetime = Field(..., description="Timestamp when heatmap record was created")
    updated_at: datetime = Field(..., description="Timestamp of last update")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def parse_legend_json(cls, value: Any) -> Any:
        """
        Parses legend_json from SQLite string format to a dictionary.
        """
        if isinstance(value, dict):
            if "legend_json" in value and isinstance(value["legend_json"], str):
                try:
                    value["legend"] = json.loads(value["legend_json"])
                except Exception:
                    value["legend"] = {}
        else:
            try:
                if hasattr(value, "legend_json") and value.legend_json:
                    setattr(value, "legend", json.loads(value.legend_json))
                else:
                    setattr(value, "legend", {})
            except Exception:
                pass
        return value
