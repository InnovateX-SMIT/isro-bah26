from fastapi import APIRouter, Depends, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.cloud_detection_service import CloudDetectionService
from app.schemas.cloud_detection import CloudDetectionResponse

router = APIRouter()

def get_cloud_detection_service(db: Session = Depends(get_db)) -> CloudDetectionService:
    """
    Dependency provider instantiating CloudDetectionService with its repositories.
    """
    repository = CloudDetectionRepository(db)
    dataset_repository = DatasetRepository(db)
    return CloudDetectionService(repository, dataset_repository)

@router.post(
    "/run/{dataset_id}",
    response_model=CloudDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Cloud Detection",
    description="Identifies cloud candidate pixels using Brightness, NDVI, and whiteness thresholds, producing a probability map."
)
def run_cloud_detection(
    dataset_id: str,
    service: CloudDetectionService = Depends(get_cloud_detection_service)
):
    return service.run_cloud_detection(dataset_id)

@router.get(
    "/{dataset_id}",
    response_model=CloudDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Detection Record",
    description="Retrieves the cloud detection metadata profile for the target registered dataset."
)
def get_cloud_detection(
    dataset_id: str,
    service: CloudDetectionService = Depends(get_cloud_detection_service)
):
    return service.get_cloud_detection(dataset_id)

@router.get(
    "/{dataset_id}/probability-map",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cloud Probability Map",
    description="Streams the generated grayscale PNG probability map visualization from disk."
)
def get_probability_map(
    dataset_id: str,
    service: CloudDetectionService = Depends(get_cloud_detection_service)
):
    path = service.get_probability_map_path(dataset_id)
    return FileResponse(path, media_type="image/png")

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Cloud Detection Assets",
    description="Deletes database cloud detection record and clears file outputs from disk."
)
def delete_cloud_detection(
    dataset_id: str,
    service: CloudDetectionService = Depends(get_cloud_detection_service)
):
    service.delete_detection_assets(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
