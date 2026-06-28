import os
from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.services.reports.report_service import ReportService
from app.schemas.report import (
    ReportRequest,
    ReportResponse,
    ReportValidationRequest,
    ReportValidationResponse
)

router = APIRouter()

def get_report_service(db: Session = Depends(get_db)) -> ReportService:
    """
    Dependency provider instantiating ReportService with repositories.
    """
    return ReportService(
        db=db,
        session_repo=AnalysisSessionRepository(db),
        dataset_repo=DatasetRepository(db),
        metadata_repo=DatasetMetadataRepository(db),
        reconstruction_repo=ReconstructionRepository(db)
    )

@router.post(
    "/request",
    response_model=ReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Request Telemetry Report Generation",
    description="Initiates on-the-fly compilation of scientific reports (analysis, metadata, reconstruction, or confidence)."
)
def request_report(
    payload: ReportRequest,
    service: ReportService = Depends(get_report_service)
):
    return service.compile_report(
        session_id=payload.session_id,
        report_type=payload.report_type
    )

@router.post(
    "/validate",
    response_model=ReportValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Session Telemetry for Report",
    description="Validates if minimum geospatial reconstruction metrics are populated to compile the requested report."
)
def validate_report(
    payload: ReportValidationRequest,
    service: ReportService = Depends(get_report_service)
):
    return service.validate_report_request(
        session_id=payload.session_id,
        report_type=payload.report_type
    )

@router.get(
    "/download/{session_id}/{report_type}",
    summary="Download Compiled PDF Report",
    description="Serves the compiled scientific analysis PDF report as a downloadable attachment."
)
def download_report(
    session_id: str,
    report_type: str,
    service: ReportService = Depends(get_report_service)
):
    file_path = service.get_report_file_path(session_id, report_type)
    filename = os.path.basename(file_path)
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf"
    )
