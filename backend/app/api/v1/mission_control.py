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
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_analytics_repository import CloudAnalyticsRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.temporal_fusion_repository import TemporalFusionRepository

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
    from app.repositories.reconstruction_repository import ReconstructionRepository
    from app.repositories.temporal_fusion_repository import TemporalFusionRepository
    from app.repositories.confidence_repository import ConfidenceRepository
    from app.repositories.reliability_repository import ReliabilityRepository
    from app.repositories.confidence_heatmap_repository import ConfidenceHeatmapRepository
    from app.repositories.confidence_analytics_repository import ConfidenceAnalyticsRepository
    
    # Repositories
    dataset_repository = DatasetRepository(db)
    metadata_repository = DatasetMetadataRepository(db)
    geospatial_repository = GeospatialRepository(db)
    location_repository = LocationRepository(db)
    context_repository = GeospatialContextProfileRepository(db)
    temporal_context_repository = TemporalContextRepository(db)
    cloud_detection_repository = CloudDetectionRepository(db)
    cloud_classification_repository = CloudClassificationRepository(db)
    cloud_shadow_repository = CloudShadowRepository(db)
    cloud_segmentation_repository = CloudSegmentationRepository(db)
    cloud_analytics_repository = CloudAnalyticsRepository(db)
    reconstruction_repository = ReconstructionRepository(db)
    temporal_fusion_repository = TemporalFusionRepository(db)
    confidence_repository = ConfidenceRepository(db)
    reliability_repository = ReliabilityRepository(db)
    heatmap_repository = ConfidenceHeatmapRepository(db)
    analytics_repository = ConfidenceAnalyticsRepository(db)

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
        cloud_detection_repository=cloud_detection_repository,
        cloud_classification_repository=cloud_classification_repository,
        cloud_shadow_repository=cloud_shadow_repository,
        cloud_segmentation_repository=cloud_segmentation_repository,
        cloud_analytics_repository=cloud_analytics_repository,
        reconstruction_repository=reconstruction_repository,
        temporal_fusion_repository=temporal_fusion_repository,
        confidence_repository=confidence_repository,
        reliability_repository=reliability_repository,
        heatmap_repository=heatmap_repository,
        analytics_repository=analytics_repository
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
