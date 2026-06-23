from typing import List
from fastapi import APIRouter, Depends, status
from app.services.temporal_service import TemporalService
from app.schemas.temporal import ProviderInfoResponse, SystemHealthResponse

router = APIRouter()

def get_temporal_service() -> TemporalService:
    """
    Dependency provider instantiating the TemporalService.
    """
    return TemporalService()

@router.get(
    "/providers",
    response_model=List[ProviderInfoResponse],
    status_code=status.HTTP_200_OK,
    summary="List Registered Temporal Providers",
    description="Retrieves administrative profiles for all currently registered historical temporal providers."
)
def get_providers(
    service: TemporalService = Depends(get_temporal_service)
):
    return service.get_available_providers()

@router.get(
    "/providers/health",
    response_model=SystemHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Providers Health Status",
    description="Performs diagnostic queries to check live online/connectivity status of all providers."
)
def get_providers_health(
    service: TemporalService = Depends(get_temporal_service)
):
    return service.provider_health_status()
