from fastapi import APIRouter, Depends, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.services.cloud_segmentation_service import CloudSegmentationService
from app.schemas.cloud_segmentation import CloudSegmentationResponse

router = APIRouter()

def get_cloud_segmentation_service(db: Session = Depends(get_db)) -> CloudSegmentationService:
    """
    Dependency provider instantiating CloudSegmentationService.
    """
    repository = CloudSegmentationRepository(db)
    shadow_repository = CloudShadowRepository(db)
    classification_repository = CloudClassificationRepository(db)
    detection_repository = CloudDetectionRepository(db)
    return CloudSegmentationService(repository, shadow_repository, classification_repository, detection_repository)

@router.post(
    "/run/{dataset_id}",
    response_model=CloudSegmentationResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Cloud Segmentation",
    description="Consolidates cloud components, shadow projections, fills holes and filters noise into a single reconstruction-ready product."
)
def run_cloud_segmentation(
    dataset_id: str,
    service: CloudSegmentationService = Depends(get_cloud_segmentation_service)
):
    return service.run_cloud_segmentation(dataset_id)

@router.get(
    "/{dataset_id}",
    response_model=CloudSegmentationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Segmentation Record",
    description="Retrieves the cloud segmentation metadata profile for the target registered dataset."
)
def get_cloud_segmentation(
    dataset_id: str,
    service: CloudSegmentationService = Depends(get_cloud_segmentation_service)
):
    return service.get_cloud_segmentation(dataset_id)

@router.get(
    "/{dataset_id}/preview",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Segmentation Preview Image",
    description="Streams the generated color-coded segmentation preview PNG from disk."
)
def get_segmentation_preview(
    dataset_id: str,
    service: CloudSegmentationService = Depends(get_cloud_segmentation_service)
):
    path = service.get_preview_image_path(dataset_id)
    return FileResponse(path, media_type="image/png")

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Cloud Segmentation Assets",
    description="Deletes cloud segmentation record and clears generated outputs from disk."
)
def delete_cloud_segmentation(
    dataset_id: str,
    service: CloudSegmentationService = Depends(get_cloud_segmentation_service)
):
    service.delete_segmentation_assets(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
