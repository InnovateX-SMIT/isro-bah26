from fastapi import APIRouter, Depends, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.services.cloud_classification_service import CloudClassificationService
from app.schemas.cloud_classification import CloudClassificationResponse

router = APIRouter()

def get_cloud_classification_service(db: Session = Depends(get_db)) -> CloudClassificationService:
    """
    Dependency provider instantiating CloudClassificationService.
    """
    repository = CloudClassificationRepository(db)
    detection_repository = CloudDetectionRepository(db)
    return CloudClassificationService(repository, detection_repository)

@router.post(
    "/run/{dataset_id}",
    response_model=CloudClassificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Cloud Classification",
    description="Extracts cloud components and classifies them into Thick, Thin, Cirrus, or Uncertain based on shape and probability statistics."
)
def run_cloud_classification(
    dataset_id: str,
    service: CloudClassificationService = Depends(get_cloud_classification_service)
):
    return service.run_cloud_classification(dataset_id)

@router.get(
    "/{dataset_id}",
    response_model=CloudClassificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Classification Record",
    description="Retrieves the cloud classification metadata profile for the target registered dataset."
)
def get_cloud_classification(
    dataset_id: str,
    service: CloudClassificationService = Depends(get_cloud_classification_service)
):
    return service.get_cloud_classification(dataset_id)

@router.get(
    "/{dataset_id}/preview",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Classification Preview Image",
    description="Streams the generated color-coded classification preview PNG from disk."
)
def get_classification_preview(
    dataset_id: str,
    service: CloudClassificationService = Depends(get_cloud_classification_service)
):
    path = service.get_preview_image_path(dataset_id)
    return FileResponse(path, media_type="image/png")

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Cloud Classification Assets",
    description="Deletes cloud classification record and clears generated outputs from disk."
)
def delete_cloud_classification(
    dataset_id: str,
    service: CloudClassificationService = Depends(get_cloud_classification_service)
):
    service.delete_classification_assets(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
