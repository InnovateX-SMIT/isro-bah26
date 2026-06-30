from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.upload_service import UploadService
from app.schemas.dataset import DatasetResponse, UploadValidationResponse, UploadFinalizePayload

router = APIRouter()

@router.post(
    "/upload",
    response_model=UploadValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and Validate LISS-IV Dataset",
    description=(
        "Uploads a ZIP archive containing a LISS-IV dataset. "
        "Performs safety validation (preventing ZIP Slip), verifies bands, "
        "extracts the files, and attempts metadata recovery. Returns a list of "
        "missing fields if required parameters cannot be automatically extracted."
    )
)
def upload_dataset(
    file: UploadFile = File(..., description="ZIP archive with LISS-IV dataset"),
    analysis_session_id: str = Form(..., description="Parent Analysis Session UUID"),
    dataset_name: str = Form("", description="Optional name override for the dataset"),
    db: Session = Depends(get_db)
):
    upload_service = UploadService(db)
    return upload_service.handle_upload(
        file=file,
        analysis_session_id=analysis_session_id,
        dataset_name=dataset_name
    )

@router.post(
    "/upload/finalize",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Finalize LISS-IV Dataset Upload with user metadata",
    description="Validates and registers a temporarily extracted ZIP dataset using user-provided metadata."
)
def finalize_upload_dataset(
    payload: UploadFinalizePayload,
    db: Session = Depends(get_db)
):
    upload_service = UploadService(db)
    return upload_service.finalize_upload(
        temp_session_id=payload.temp_session_id,
        analysis_session_id=payload.analysis_session_id,
        dataset_name=payload.dataset_name,
        metadata=payload.metadata.model_dump()
    )
