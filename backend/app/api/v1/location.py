from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.location_repository import LocationRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.services.location_service import LocationService
from app.services.geospatial_service import GeospatialService
from app.schemas.location_context import LocationContextResponse

router = APIRouter()

def get_location_service(db: Session = Depends(get_db)) -> LocationService:
    """
    Dependency provider instantiating the LocationService with database context.
    """
    repository = LocationRepository(db)
    geospatial_repository = GeospatialRepository(db)
    dataset_repository = DatasetRepository(db)
    metadata_repository = DatasetMetadataRepository(db)
    geospatial_service = GeospatialService(geospatial_repository, metadata_repository, dataset_repository)
    return LocationService(repository, geospatial_repository, dataset_repository, geospatial_service)

@router.get(
    "/{dataset_id}/context",
    response_model=LocationContextResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Dataset Location Context Summary",
    description=(
        "Retrieves the Location Intelligence profile, reverse geocoding "
        "coordinates, and deriving geographic and administrative zone features."
    )
)
def get_location_context(
    dataset_id: str,
    service: LocationService = Depends(get_location_service)
):
    return service.get_or_create_location_context(dataset_id)
