from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.cloud_analytics_repository import CloudAnalyticsRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.services.cloud_analytics_service import CloudAnalyticsService
from app.schemas.cloud_analytics import CloudAnalyticsResponse

router = APIRouter()

def get_cloud_analytics_service(db: Session = Depends(get_db)) -> CloudAnalyticsService:
    """
    Dependency provider instantiating CloudAnalyticsService.
    """
    repository = CloudAnalyticsRepository(db)
    segmentation_repository = CloudSegmentationRepository(db)
    shadow_repository = CloudShadowRepository(db)
    classification_repository = CloudClassificationRepository(db)
    detection_repository = CloudDetectionRepository(db)
    return CloudAnalyticsService(repository, segmentation_repository, shadow_repository, classification_repository, detection_repository)

@router.post(
    "/run/{dataset_id}",
    response_model=CloudAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Cloud Analytics",
    description="Compiles statistics, checks reconstruction readiness, grades difficulty, and creates recommendations package."
)
def run_cloud_analytics(
    dataset_id: str,
    service: CloudAnalyticsService = Depends(get_cloud_analytics_service)
):
    return service.run_cloud_analytics(dataset_id)

@router.get(
    "/{dataset_id}",
    response_model=CloudAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Analytics Record",
    description="Retrieves the cloud analytics metadata profile for the target registered dataset."
)
def get_cloud_analytics(
    dataset_id: str,
    service: CloudAnalyticsService = Depends(get_cloud_analytics_service)
):
    return service.get_cloud_analytics(dataset_id)

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Cloud Analytics Assets",
    description="Deletes cloud analytics record and clears generated outputs from disk."
)
def delete_cloud_analytics(
    dataset_id: str,
    service: CloudAnalyticsService = Depends(get_cloud_analytics_service)
):
    service.delete_analytics_assets(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
