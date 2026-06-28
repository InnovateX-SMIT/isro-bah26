import os
from fastapi import APIRouter, Depends, status, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.services.reports.report_service import ReportService
from app.services.package_service import PackageService
from app.schemas.package import (
    PackageRequest,
    PackageResponse,
    PackageValidationResponse
)

router = APIRouter()

def get_report_service(db: Session = Depends(get_db)) -> ReportService:
    """
    Dependency provider instantiating ReportService.
    """
    return ReportService(
        db=db,
        session_repo=AnalysisSessionRepository(db),
        dataset_repo=DatasetRepository(db),
        metadata_repo=DatasetMetadataRepository(db),
        reconstruction_repo=ReconstructionRepository(db)
    )

def get_package_service(
    db: Session = Depends(get_db),
    report_service: ReportService = Depends(get_report_service)
) -> PackageService:
    """
    Dependency provider instantiating PackageService.
    """
    return PackageService(
        db=db,
        session_repo=AnalysisSessionRepository(db),
        dataset_repo=DatasetRepository(db),
        metadata_repo=DatasetMetadataRepository(db),
        reconstruction_repo=ReconstructionRepository(db),
        report_service=report_service
    )

@router.post(
    "/request",
    response_model=PackageResponse,
    status_code=status.HTTP_200_OK,
    summary="Request Consolidated Package Generation",
    description="Initiates background compilation of all ready session outputs (rasters, previews, metadata JSONs, and PDF reports) into a structured ZIP package."
)
def request_package(
    payload: PackageRequest,
    background_tasks: BackgroundTasks,
    service: PackageService = Depends(get_package_service)
):
    return service.trigger_package_generation(
        session_id=payload.session_id,
        background_tasks=background_tasks
    )

@router.post(
    "/validate",
    response_model=PackageValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Session Telemetry for Packaging",
    description="Analyzes the database session records to determine which layers and PDF reports are ready to bundle, and verifies minimum criteria."
)
def validate_package(
    payload: PackageRequest,
    service: PackageService = Depends(get_package_service)
):
    return service.validate_package_request(session_id=payload.session_id)

@router.get(
    "/status/{session_id}",
    response_model=PackageResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Package Generation Status",
    description="Queries the compiler cache status of a submitted session package compilation."
)
def get_package_status(
    session_id: str,
    service: PackageService = Depends(get_package_service)
):
    return service.get_package_status(session_id=session_id)

@router.get(
    "/download/{session_id}",
    summary="Download Generated Analysis Package ZIP",
    description="Downloads the completed consolidated analysis ZIP package containing structured scientific outputs."
)
def download_package(
    session_id: str,
    service: PackageService = Depends(get_package_service)
):
    file_path = service.get_package_file_path(session_id=session_id)
    filename = f"Analysis_Package_{session_id[:8]}.zip"
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/zip"
    )
