from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.temporal_discovery import TemporalCandidateResponse

class ReferenceSelectionRequest(BaseModel):
    """
    Request payload to trigger ranking and reference selection.
    """
    num_references: int = Field(5, description="Number of top reference candidates to select (default is 5)")
    weights: Optional[Dict[str, float]] = Field(
        None,
        description="Optional weights mapping (keys: cloud_cover, temporal_distance, spatial_overlap, data_quality) summing to 1.0"
    )

class SelectedReferenceResponse(BaseModel):
    """
    Response schema representing a chosen candidate reference within a stack.
    """
    id: str
    reference_stack_id: str
    candidate_id: str
    rank_position: int
    ranking_score: float
    selection_reason: str
    candidate: Optional[TemporalCandidateResponse] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReferenceStackResponse(BaseModel):
    """
    Response schema representing a finalized reference stack containing selected observations.
    """
    id: str
    session_id: str
    dataset_id: str
    discovery_id: str
    selected_count: int
    selection_strategy: str
    selected_references: List[SelectedReferenceResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
