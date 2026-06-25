from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ConfidenceAnalyticsResponse(BaseModel):
    """
    Response schema returning the details of a confidence analytics database record.
    """
    analytics_id: str = Field(..., description="Unique UUID for this confidence analytics record")
    confidence_heatmap_id: str = Field(..., description="Reference to parent Confidence Heatmap ID")
    dataset_id: str = Field(..., description="Reference to parent Dataset ID")
    analytics_status: str = Field(..., description="Lifecycle status: pending, completed, failed")
    confidence_report_path: Optional[str] = Field(None, description="Path to confidence_report.json on disk")
    confidence_summary_path: Optional[str] = Field(None, description="Path to confidence_summary.json on disk")
    reliability_scorecard_path: Optional[str] = Field(None, description="Path to reliability_scorecard.json on disk")
    headline_summary: Optional[str] = Field(None, description="High-level plain-English summary text")
    report_basis: str = Field(..., description="Explainability detail about evaluation inputs and sources")
    analytics_method: str = Field(..., description="Analytics method/algorithm version name used")
    created_at: datetime = Field(..., description="Timestamp when analytics record was created")
    updated_at: datetime = Field(..., description="Timestamp of last update")

    model_config = ConfigDict(from_attributes=True)
