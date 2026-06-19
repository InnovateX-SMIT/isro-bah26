from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.dataset_metadata_service import DatasetMetadataService
from app.schemas.dataset_metadata import DatasetMetadataResponse

router = APIRouter()

def get_metadata_service(db: Session = Depends(get_db)) -> DatasetMetadataService:
    """
    Dependency provider instantiating the DatasetMetadataService with database context.
    """
    repository = DatasetMetadataRepository(db)
    dataset_repository = DatasetRepository(db)
    return DatasetMetadataService(repository, dataset_repository)

@router.post(
    "/run/{dataset_id}",
    response_model=DatasetMetadataResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Metadata Extraction",
    description=(
        "Recursively scans dataset files, parses text metadata profiles, "
        "and queries GeoTIFF tags using rasterio to compile metadata intelligence."
    )
)
def run_extraction(
    dataset_id: str,
    service: DatasetMetadataService = Depends(get_metadata_service)
):
    return service.run_extraction(dataset_id)

@router.get(
    "/{dataset_id}",
    response_model=DatasetMetadataResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Dataset Metadata Summary",
    description="Retrieves the extracted metadata intelligence summary for the target dataset."
)
def get_metadata(
    dataset_id: str,
    service: DatasetMetadataService = Depends(get_metadata_service)
):
    return service.get_metadata(dataset_id)

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Dataset Metadata",
    description="Deletes the dataset metadata intelligence summary database record."
)
def delete_metadata(
    dataset_id: str,
    service: DatasetMetadataService = Depends(get_metadata_service)
):
    service.delete_metadata(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
