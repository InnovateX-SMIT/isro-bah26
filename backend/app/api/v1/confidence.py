from fastapi import APIRouter, Depends, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.selected_reference_repository import SelectedReferenceRepository

from app.services.confidence_service import ConfidenceService
from app.schemas.confidence_estimation import ConfidenceEstimationResponse

router = APIRouter()

def get_confidence_service(db: Session = Depends(get_db)) -> ConfidenceService:
    """
    Dependency provider instantiating ConfidenceService.
    """
    confidence_repo = ConfidenceRepository(db)
    reconstruction_repo = ReconstructionRepository(db)
    cloud_segmentation_repo = CloudSegmentationRepository(db)
    cloud_classification_repo = CloudClassificationRepository(db)
    reference_stack_repo = TemporalReferenceStackRepository(db)
    selected_reference_repo = SelectedReferenceRepository(db)
    
    return ConfidenceService(
        db=db,
        confidence_repo=confidence_repo,
        reconstruction_repo=reconstruction_repo,
        cloud_segmentation_repo=cloud_segmentation_repo,
        cloud_classification_repo=cloud_classification_repo,
        reference_stack_repo=reference_stack_repo,
        selected_reference_repo=selected_reference_repo
    )

@router.post(
    "/run/{reconstruction_run_id}",
    response_model=ConfidenceEstimationResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Confidence Estimation",
    description="Runs the confidence estimation engine dynamically based on reconstruction outputs, cloud masks, temporal references, and overall scores."
)
def run_confidence_estimation(
    reconstruction_run_id: str,
    service: ConfidenceService = Depends(get_confidence_service)
):
    return service.run_confidence_estimation(reconstruction_run_id)

@router.get(
    "/{reconstruction_run_id}",
    response_model=ConfidenceEstimationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Confidence Estimation Record",
    description="Retrieves the confidence estimation profile for a target reconstruction run."
)
def get_confidence_estimation(
    reconstruction_run_id: str,
    service: ConfidenceService = Depends(get_confidence_service)
):
    return service.get_confidence(reconstruction_run_id)

@router.get(
    "/{reconstruction_run_id}/image",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Confidence Preview Image",
    description="Streams the generated color-coded confidence preview PNG from disk."
)
def get_confidence_preview(
    reconstruction_run_id: str,
    service: ConfidenceService = Depends(get_confidence_service)
):
    path = service.get_preview_image_path(reconstruction_run_id)
    return FileResponse(path, media_type="image/png")

@router.delete(
    "/{reconstruction_run_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Confidence Estimation Assets",
    description="Deletes confidence estimation record and clears generated outputs from database."
)
def delete_confidence_estimation(
    reconstruction_run_id: str,
    service: ConfidenceService = Depends(get_confidence_service)
):
    service.delete_confidence_estimation(reconstruction_run_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
