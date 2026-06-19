from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.services.dataset_service import DatasetService
from app.services.demo_dataset_service import DemoDatasetService
from app.schemas.dataset import DatasetResponse, DatasetCreate

router = APIRouter()

def get_dataset_service(db: Session = Depends(get_db)) -> DatasetService:
    """
    Dependency provider instantiating the DatasetService with correct repositories.
    """
    repository = DatasetRepository(db)
    session_repository = AnalysisSessionRepository(db)
    return DatasetService(repository, session_repository)

@router.get(
    "/demo",
    status_code=status.HTTP_200_OK,
    summary="List Demo Datasets",
    description="Scans the datasets/demo directory and returns all available demo folders."
)
def list_demo_datasets():
    return DemoDatasetService.discover_demo_datasets()

@router.post(
    "/register",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Dataset",
    description=(
        "Registers a dataset and maps it to a valid Analysis Session. "
        "Verifies that the target path exists on disk, the session is valid, "
        "and that the dataset is not a duplicate in that session."
    )
)
def register_dataset(
    payload: DatasetCreate,
    service: DatasetService = Depends(get_dataset_service)
):
    return service.register_dataset(
        analysis_session_id=payload.analysis_session_id,
        dataset_name=payload.dataset_name,
        dataset_path=payload.dataset_path,
        dataset_type=payload.dataset_type
    )

@router.get(
    "",
    response_model=list[DatasetResponse],
    status_code=status.HTTP_200_OK,
    summary="List Registered Datasets",
    description="Retrieves a list of all registered dataset profiles across all sessions."
)
def list_datasets(service: DatasetService = Depends(get_dataset_service)):
    return service.list_datasets()

@router.get(
    "/{dataset_id}",
    response_model=DatasetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Dataset Registration",
    description="Retrieves a registered dataset profile by its unique ID."
)
def get_dataset(
    dataset_id: str,
    service: DatasetService = Depends(get_dataset_service)
):
    return service.get_dataset(dataset_id)

@router.get(
    "/session/{session_id}",
    response_model=list[DatasetResponse],
    status_code=status.HTTP_200_OK,
    summary="List Session Datasets",
    description="Retrieves all registered datasets mapped to a specific Analysis Session."
)
def list_session_datasets(
    session_id: str,
    service: DatasetService = Depends(get_dataset_service)
):
    return service.list_session_datasets(session_id)

@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Dataset Registration",
    description="Purges a dataset registration row. Never alters local disk directories."
)
def delete_dataset(
    dataset_id: str,
    service: DatasetService = Depends(get_dataset_service)
):
    service.delete_dataset(dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
