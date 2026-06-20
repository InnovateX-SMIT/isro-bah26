from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.geospatial_context_profile_repository import GeospatialContextProfileRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.geospatial_context_service import GeospatialContextService
from app.services.location_service import LocationService
from app.schemas.geospatial_context_profile import GeospatialContextProfileResponse

router = APIRouter()

def get_geospatial_context_service(db: Session = Depends(get_db)) -> GeospatialContextService:
    """
    Dependency provider instantiating the GeospatialContextService with database contexts.
    """
    repository = GeospatialContextProfileRepository(db)
    location_repository = LocationRepository(db)
    dataset_repository = DatasetRepository(db)
    
    # Instantiate geospatial components to satisfy location service cascade requirements
    from app.repositories.geospatial_repository import GeospatialRepository
    from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
    from app.services.geospatial_service import GeospatialService
    
    geospatial_repository = GeospatialRepository(db)
    metadata_repository = DatasetMetadataRepository(db)
    geospatial_service = GeospatialService(geospatial_repository, metadata_repository, dataset_repository)
    
    location_service = LocationService(
        location_repository, 
        geospatial_repository, 
        dataset_repository, 
        geospatial_service
    )
    
    return GeospatialContextService(repository, location_repository, dataset_repository, location_service)

@router.get(
    "/{dataset_id}/profile",
    response_model=GeospatialContextProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Dataset Geospatial Context Profile",
    description=(
        "Retrieves or dynamically deduces the terrain classification, hydrology metrics, "
        "dominant landscape traits, and inference summary for satellite images."
    )
)
def get_geospatial_context_profile(
    dataset_id: str,
    service: GeospatialContextService = Depends(get_geospatial_context_service)
):
    return service.get_or_create_context_profile(dataset_id)
