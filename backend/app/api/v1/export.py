import os
from fastapi import APIRouter, Depends, status, Response, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.export_repository import ExportRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.export_service import ExportService
from app.schemas.export import (
    ExportRequest,
    ExportResponse,
    ExportValidationRequest,
    ExportValidationResponse
)

router = APIRouter()

def get_export_service(db: Session = Depends(get_db)) -> ExportService:
    """
    Dependency provider instantiating ExportService with repositories.
    """
    return ExportService(
        db=db,
        export_repo=ExportRepository(db),
        session_repo=AnalysisSessionRepository(db),
        dataset_repo=DatasetRepository(db)
    )

@router.post(
    "/request",
    response_model=ExportResponse,
    status_code=status.HTTP_200_OK,
    summary="Request Raster Export Generation",
    description="Initiates compilation and conversion of geospatial raster output layers to GeoTIFF, PNG, or JPG."
)
def request_export(
    payload: ExportRequest,
    service: ExportService = Depends(get_export_service)
):
    return service.trigger_export(
        session_id=payload.session_id,
        layer=payload.layer,
        format=payload.format
    )

@router.post(
    "/validate",
    response_model=ExportValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Layer Availability for Export",
    description="Checks if the requested layer has been fully generated and is physically available on disk."
)
def validate_export(
    payload: ExportValidationRequest,
    service: ExportService = Depends(get_export_service)
):
    return service.validate_export_request(
        session_id=payload.session_id,
        layer=payload.layer,
        format=payload.format
    )

@router.get(
    "/status/{export_id}",
    response_model=ExportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Export Request Status",
    description="Retrieves the metadata status record of a submitted raster export request."
)
def get_export_status(
    export_id: str,
    db: Session = Depends(get_db)
):
    repo = ExportRepository(db)
    export_run = repo.get_by_id(export_id)
    if not export_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Export request ID {export_id} not found."
        )
    return ExportResponse.model_validate(export_run)

@router.get(
    "/download/{export_id}",
    summary="Download Generated Export File",
    description="Downloads the compiled and format-converted raster product."
)
def download_export(
    export_id: str,
    service: ExportService = Depends(get_export_service)
):
    file_path = service.get_export_file_path(export_id)
    filename = os.path.basename(file_path)
    
    # Resolve mime type for standard browser responses
    media_type = "application/octet-stream"
    if filename.lower().endswith(".png"):
        media_type = "image/png"
    elif filename.lower().endswith((".jpg", ".jpeg")):
        media_type = "image/jpeg"
    elif filename.lower().endswith(".tif"):
        media_type = "image/tiff"
        
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type
    )
