from fastapi import APIRouter, Depends, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.cloud_shadow_service import CloudShadowService
from app.schemas.cloud_shadow import CloudShadowResponse

router = APIRouter()

def get_cloud_shadow_service(db: Session = Depends(get_db)) -> CloudShadowService:
    """
    Dependency provider instantiating CloudShadowService.
    """
    repository = CloudShadowRepository(db)
    classification_repository = CloudClassificationRepository(db)
    dataset_repository = DatasetRepository(db)
    return CloudShadowService(repository, classification_repository, dataset_repository)

@router.post(
    "/run/{dataset_id}",
    response_model=CloudShadowResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Cloud Shadow Detection",
    description="Detects cloud shadows using solar geometry ray projection and applies NDVI/NDWI false-positive suppression."
)
def run_cloud_shadow(
    dataset_id: str,
    service: CloudShadowService = Depends(get_cloud_shadow_service)
):
    return service.run_cloud_shadow(dataset_id)

@router.get(
    "/{dataset_id}",
    response_model=CloudShadowResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Shadow Record",
    description="Retrieves the cloud shadow detection metadata profile for the target registered dataset."
)
def get_cloud_shadow(
    dataset_id: str,
    service: CloudShadowService = Depends(get_cloud_shadow_service)
):
    return service.get_cloud_shadow(dataset_id)

@router.get(
    "/{dataset_id}/preview",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Shadow Preview Image",
    description="Streams the generated purple shadow preview PNG from disk."
)
def get_shadow_preview(
    dataset_id: str,
    service: CloudShadowService = Depends(get_cloud_shadow_service)
):
    path = service.get_preview_image_path(dataset_id)
    return FileResponse(path, media_type="image/png")

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Cloud Shadow Assets",
    description="Deletes cloud shadow record and clears generated outputs from disk."
)
def delete_cloud_shadow(
    dataset_id: str,
    service: CloudShadowService = Depends(get_cloud_shadow_service)
):
    service.delete_shadow_assets(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
