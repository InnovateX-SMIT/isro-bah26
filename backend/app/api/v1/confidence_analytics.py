import os
from fastapi import APIRouter, Depends, status, Response, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.confidence_analytics_repository import ConfidenceAnalyticsRepository
from app.repositories.confidence_heatmap_repository import ConfidenceHeatmapRepository
from app.repositories.reliability_repository import ReliabilityRepository
from app.repositories.confidence_repository import ConfidenceRepository

from app.services.confidence_analytics_service import ConfidenceAnalyticsService
from app.schemas.confidence_analytics import ConfidenceAnalyticsResponse

router = APIRouter()

def get_analytics_service(db: Session = Depends(get_db)) -> ConfidenceAnalyticsService:
    """
    Dependency provider instantiating ConfidenceAnalyticsService.
    """
    analytics_repo = ConfidenceAnalyticsRepository(db)
    heatmap_repo = ConfidenceHeatmapRepository(db)
    reliability_repo = ReliabilityRepository(db)
    confidence_repo = ConfidenceRepository(db)
    
    return ConfidenceAnalyticsService(
        db=db,
        analytics_repo=analytics_repo,
        heatmap_repo=heatmap_repo,
        reliability_repo=reliability_repo,
        confidence_repo=confidence_repo
    )

@router.post(
    "/run/{confidence_heatmap_id}",
    response_model=ConfidenceAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Confidence Analytics Report Generation",
    description="Runs the analytics reporting engine dynamically based on the parent visual heatmaps and parsed metrics."
)
def run_analytics(
    confidence_heatmap_id: str,
    service: ConfidenceAnalyticsService = Depends(get_analytics_service)
):
    return service.run_analytics(confidence_heatmap_id)

@router.get(
    "/{confidence_heatmap_id}",
    response_model=ConfidenceAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Confidence Analytics Record",
    description="Retrieves the analytics report metadata for a target confidence heatmap ID."
)
def get_analytics(
    confidence_heatmap_id: str,
    service: ConfidenceAnalyticsService = Depends(get_analytics_service)
):
    return service.get_analytics(confidence_heatmap_id)

@router.get(
    "/{confidence_heatmap_id}/report",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Confidence Full JSON Report File",
    description="Streams the generated comprehensive JSON report file from disk."
)
def get_confidence_report_file(
    confidence_heatmap_id: str,
    service: ConfidenceAnalyticsService = Depends(get_analytics_service)
):
    analytics = service.get_analytics(confidence_heatmap_id)
    if not analytics or not analytics.confidence_report_path:
        raise HTTPException(status_code=404, detail="Confidence full report not found or not yet generated.")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
    path = os.path.abspath(os.path.join(workspace_root, analytics.confidence_report_path))
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Confidence full report file does not exist on disk: {analytics.confidence_report_path}")
    return FileResponse(path, media_type="application/json")

@router.delete(
    "/{confidence_heatmap_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Confidence Analytics Assets",
    description="Deletes analytics record and clears report files from database."
)
def delete_analytics(
    confidence_heatmap_id: str,
    service: ConfidenceAnalyticsService = Depends(get_analytics_service)
):
    service.delete_analytics(confidence_heatmap_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
