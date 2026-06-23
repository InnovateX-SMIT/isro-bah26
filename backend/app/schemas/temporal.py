from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class TemporalReferenceCandidate(BaseModel):
    """
    Schema representing a historical reference imagery candidate returned by a provider.
    """
    candidate_id: str = Field(..., description="Unique ID of the reference candidate")
    provider_name: str = Field(..., description="Name of the provider supplying this candidate")
    acquisition_date: str = Field(..., description="Acquisition date in YYYY-MM-DD format")
    cloud_cover: float = Field(..., description="Cloud cover percentage (0.0 to 100.0)")
    spatial_overlap: float = Field(..., description="Spatial overlap percentage with target scene (0.0 to 100.0)")
    preview_url: Optional[str] = Field(None, description="URL to preview thumbnail or preview composition")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional provider-specific metadata fields")

class ProviderInfoResponse(BaseModel):
    """
    Response schema detailing general metadata/information about a provider.
    """
    name: str = Field(..., description="Unique name identifier of the provider")
    is_primary: bool = Field(..., description="True if this is the primary historical provider")
    description: str = Field(..., description="Brief description of the provider integration")

class ProviderHealthStatus(BaseModel):
    """
    Individual health status check result for a provider.
    """
    name: str = Field(..., description="Unique name identifier of the provider")
    healthy: bool = Field(..., description="Health/online status of the provider integration")
    details: Optional[Dict[str, Any]] = Field(None, description="Detailed diagnostic or error state info if any")

class SystemHealthResponse(BaseModel):
    """
    Aggregated health report across all registered temporal providers.
    """
    status: str = Field(..., description="Overall status ('healthy' if all providers are healthy, otherwise 'unhealthy')")
    providers: List[ProviderHealthStatus] = Field(..., description="Detailed status breakdown per provider")
