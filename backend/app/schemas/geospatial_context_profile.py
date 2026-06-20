from pydantic import BaseModel, Field

class GeospatialContextProfileResponse(BaseModel):
    """
    Response schema returning the full Geospatial Context Profile of a dataset.
    Matches Phase 3C specifications exactly.
    """
    dataset_id: str = Field(..., description="Unique referencing dataset UUID")
    terrain_type: str = Field(..., description="Inferred terrain/geomorphic type")
    environment_type: str = Field(..., description="Inferred environment type")
    dominant_landscape: str = Field(..., description="Inferred dominant landscape features")
    hydrology_context: str = Field(..., description="Inferred hydrology context description")
    agricultural_context: str = Field(..., description="Inferred agricultural intensity level")
    urbanization_context: str = Field(..., description="Inferred urbanization intensity level")
    regional_characteristics: list[str] = Field(..., description="List of regional/geographic characteristics")
    inference_basis: str = Field(..., description="Explicit description of how this profile was inferred (Explainability flag)")
    context_summary: str = Field(..., description="Dynamically generated textual summary with explanation caveat")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "dataset_id": "8a589fa0-d8dd-4224-9102-704746ae1c47",
                "terrain_type": "Alluvial Plain",
                "environment_type": "Agricultural Landscape",
                "dominant_landscape": "Cultivated Agricultural Fields",
                "hydrology_context": "River-influenced plain with drainage networks",
                "agricultural_context": "High agricultural activity with extensive irrigation",
                "urbanization_context": "Low to Moderate",
                "regional_characteristics": [
                    "Seasonal vegetation cycles",
                    "Irrigation canal presence",
                    "High agricultural utilization",
                    "Flat topography with minor slope variations"
                ],
                "inference_basis": "rule-based regional heuristic",
                "context_summary": "This dataset covers a predominantly agricultural alluvial plain within the Indo-Gangetic region characterized by extensive cultivation, irrigation networks, and relatively low terrain variation. This characterization is derived from regional classification data and should be treated as contextual guidance rather than verified ground survey data."
            }
        }
