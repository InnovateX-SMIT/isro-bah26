from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.geospatial_context_profile_repository import GeospatialContextProfileRepository
from app.repositories.temporal_context_repository import TemporalContextRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository

from app.services.dataset_metadata_service import DatasetMetadataService
from app.services.geospatial_service import GeospatialService
from app.services.location_service import LocationService
from app.services.geospatial_context_service import GeospatialContextService
from app.services.mission_control_service import MissionControlService
from app.schemas.mission_control import MissionControlResponse

router = APIRouter()

def get_mission_control_service(db: Session = Depends(get_db)) -> MissionControlService:
    """
    Dependency provider instantiating the MissionControlService with all underlying
    intelligence services and repositories.
    """
    # Repositories
    dataset_repository = DatasetRepository(db)
    metadata_repository = DatasetMetadataRepository(db)
    geospatial_repository = GeospatialRepository(db)
    location_repository = LocationRepository(db)
    context_repository = GeospatialContextProfileRepository(db)
    temporal_context_repository = TemporalContextRepository(db)
    cloud_detection_repository = CloudDetectionRepository(db)

    # Services
    metadata_service = DatasetMetadataService(metadata_repository, dataset_repository)
    geospatial_service = GeospatialService(geospatial_repository, metadata_repository, dataset_repository)
    location_service = LocationService(location_repository, geospatial_repository, dataset_repository, geospatial_service)
    context_service = GeospatialContextService(context_repository, location_repository, dataset_repository, location_service)

    return MissionControlService(
        dataset_repository=dataset_repository,
        metadata_service=metadata_service,
        geospatial_service=geospatial_service,
        location_service=location_service,
        geospatial_context_service=context_service,
        temporal_context_repository=temporal_context_repository,
        cloud_detection_repository=cloud_detection_repository
    )

@router.get(
    "/{dataset_id}",
    response_model=MissionControlResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Consolidated Dataset Mission Control Profile",
    description=(
        "Retrieves a single unified operational briefing of a registered dataset. "
        "Aggregates metadata, geospatial limits, location boundaries, and geomorphic context, "
        "dynamically indicating readiness status per intelligence layer."
    )
)
def get_mission_control_profile(
    dataset_id: str,
    service: MissionControlService = Depends(get_mission_control_service)
):
    return service.get_mission_control_profile(dataset_id)
