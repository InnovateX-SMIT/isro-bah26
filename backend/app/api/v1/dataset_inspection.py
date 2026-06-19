from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.dataset_inspection_repository import DatasetInspectionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.dataset_inspection_service import DatasetInspectionService
from app.schemas.dataset_inspection import DatasetInspectionResponse, DatasetFileResponse

router = APIRouter()

def get_inspection_service(db: Session = Depends(get_db)) -> DatasetInspectionService:
    """
    Dependency provider instantiating the DatasetInspectionService with database context.
    """
    repository = DatasetInspectionRepository(db)
    dataset_repository = DatasetRepository(db)
    return DatasetInspectionService(repository, dataset_repository)

@router.post(
    "/run/{dataset_id}",
    response_model=DatasetInspectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Dataset Inspection",
    description=(
        "Recursively scans the local filesystem path registered to the dataset. "
        "Registers every discovered file and updates category counts. "
        "Allows re-running and overwriting past scans."
    )
)
def run_inspection(
    dataset_id: str,
    service: DatasetInspectionService = Depends(get_inspection_service)
):
    return service.run_inspection(dataset_id)

@router.get(
    "/{dataset_id}",
    response_model=DatasetInspectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Dataset Inspection Summary",
    description="Retrieves the inspection counts summary for the target registered dataset."
)
def get_inspection(
    dataset_id: str,
    service: DatasetInspectionService = Depends(get_inspection_service)
):
    return service.get_inspection(dataset_id)

@router.get(
    "/{dataset_id}/files",
    response_model=list[DatasetFileResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Discovered Dataset Files",
    description="Retrieves the full list of file assets discovered inside the dataset directory."
)
def list_discovered_files(
    dataset_id: str,
    service: DatasetInspectionService = Depends(get_inspection_service)
):
    return service.list_files(dataset_id)

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Dataset Inspection",
    description=(
        "Deletes the dataset inspection summary and cascading catalog database files rows. "
        "Never alters physical files on disk."
    )
)
def delete_inspection(
    dataset_id: str,
    service: DatasetInspectionService = Depends(get_inspection_service)
):
    service.delete_inspection(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
