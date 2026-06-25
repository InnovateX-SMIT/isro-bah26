from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.reliability_repository import ReliabilityRepository
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.services.reliability_service import ReliabilityService
from app.schemas.reliability_score import ReliabilityScoreResponse

router = APIRouter()

def get_reliability_service(db: Session = Depends(get_db)) -> ReliabilityService:
    """
    Dependency provider instantiating ReliabilityService.
    """
    reliability_repo = ReliabilityRepository(db)
    confidence_repo = ConfidenceRepository(db)
    cloud_segmentation_repo = CloudSegmentationRepository(db)
    
    return ReliabilityService(
        db=db,
        reliability_repo=reliability_repo,
        confidence_repo=confidence_repo,
        cloud_segmentation_repo=cloud_segmentation_repo
    )

@router.post(
    "/run/{confidence_estimation_id}",
    response_model=ReliabilityScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Reliability Scoring",
    description="Computes region-level, dataset-level, and reconstruction-level reliability scores and tiers based on confidence rasters and segmented regions."
)
def run_reliability_scoring(
    confidence_estimation_id: str,
    service: ReliabilityService = Depends(get_reliability_service)
):
    return service.run_reliability_scoring(confidence_estimation_id)

@router.get(
    "/{confidence_estimation_id}",
    response_model=ReliabilityScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Reliability Scores",
    description="Retrieves the multi-granular reliability scores and tiers for a target confidence estimation."
)
def get_reliability_score(
    confidence_estimation_id: str,
    service: ReliabilityService = Depends(get_reliability_service)
):
    return service.get_reliability(confidence_estimation_id)

@router.delete(
    "/{confidence_estimation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Reliability Scores",
    description="Deletes the reliability scoring record associated with a parent confidence estimation."
)
def delete_reliability_score(
    confidence_estimation_id: str,
    service: ReliabilityService = Depends(get_reliability_service)
):
    service.delete_reliability_score(confidence_estimation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
