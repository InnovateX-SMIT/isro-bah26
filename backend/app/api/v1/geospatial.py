from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.geospatial_service import GeospatialService
from app.schemas.geospatial_context import GeospatialContextResponse

router = APIRouter()

def get_geospatial_service(db: Session = Depends(get_db)) -> GeospatialService:
    """
    Dependency provider instantiating the GeospatialService with database contexts.
    """
    repository = GeospatialRepository(db)
    metadata_repository = DatasetMetadataRepository(db)
    dataset_repository = DatasetRepository(db)
    return GeospatialService(repository, metadata_repository, dataset_repository)

@router.get(
    "/{dataset_id}/context",
    response_model=GeospatialContextResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Dataset Geospatial Context",
    description=(
        "Retrieves or dynamically computes the geographic bounding box, center, "
        "and footprint coordinate parameters for map visualization."
    )
)
def get_geospatial_context(
    dataset_id: str,
    service: GeospatialService = Depends(get_geospatial_service)
):
    return service.get_or_calculate_context(dataset_id)
