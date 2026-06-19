from fastapi import APIRouter, Depends, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.dataset_preview_repository import DatasetPreviewRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.dataset_preview_service import DatasetPreviewService
from app.schemas.dataset_preview import PreviewResponse

router = APIRouter()

def get_preview_service(db: Session = Depends(get_db)) -> DatasetPreviewService:
    """
    Dependency provider instantiating the DatasetPreviewService with database context.
    """
    repository = DatasetPreviewRepository(db)
    dataset_repository = DatasetRepository(db)
    return DatasetPreviewService(repository, dataset_repository)

@router.post(
    "/run/{dataset_id}",
    response_model=PreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Dataset Preview",
    description="Loads band rasters, normalizes pixel values, writes preview and thumbnail PNGs, and saves details."
)
def generate_preview(
    dataset_id: str,
    service: DatasetPreviewService = Depends(get_preview_service)
):
    return service.generate_preview(dataset_id)

@router.get(
    "/{dataset_id}",
    response_model=PreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Dataset Preview Record",
    description="Retrieves the generated preview record information for the target registered dataset."
)
def get_preview(
    dataset_id: str,
    service: DatasetPreviewService = Depends(get_preview_service)
):
    return service.get_preview(dataset_id)

@router.get(
    "/{dataset_id}/image",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Preview Image File",
    description="Streams the generated preview.png file from disk."
)
def get_preview_image(
    dataset_id: str,
    service: DatasetPreviewService = Depends(get_preview_service)
):
    path = service.get_image_path(dataset_id, is_thumbnail=False)
    return FileResponse(path, media_type="image/png")

@router.get(
    "/{dataset_id}/thumbnail",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Preview Thumbnail File",
    description="Streams the generated thumbnail.png file from disk."
)
def get_preview_thumbnail(
    dataset_id: str,
    service: DatasetPreviewService = Depends(get_preview_service)
):
    path = service.get_image_path(dataset_id, is_thumbnail=True)
    return FileResponse(path, media_type="image/png")

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Dataset Preview Assets",
    description="Deletes the database preview record and generated PNG folders on disk."
)
def delete_preview(
    dataset_id: str,
    service: DatasetPreviewService = Depends(get_preview_service)
):
    service.delete_preview(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
