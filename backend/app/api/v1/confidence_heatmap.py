import os
from fastapi import APIRouter, Depends, status, Response, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.confidence_heatmap_repository import ConfidenceHeatmapRepository
from app.repositories.reliability_repository import ReliabilityRepository
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.dataset_repository import DatasetRepository

from app.services.confidence_heatmap_service import ConfidenceHeatmapService
from app.schemas.confidence_heatmap import ConfidenceHeatmapResponse

router = APIRouter()

def get_heatmap_service(db: Session = Depends(get_db)) -> ConfidenceHeatmapService:
    """
    Dependency provider instantiating ConfidenceHeatmapService.
    """
    heatmap_repo = ConfidenceHeatmapRepository(db)
    reliability_repo = ReliabilityRepository(db)
    confidence_repo = ConfidenceRepository(db)
    cloud_segmentation_repo = CloudSegmentationRepository(db)
    dataset_repo = DatasetRepository(db)
    
    return ConfidenceHeatmapService(
        db=db,
        heatmap_repo=heatmap_repo,
        reliability_repo=reliability_repo,
        confidence_repo=confidence_repo,
        cloud_segmentation_repo=cloud_segmentation_repo,
        dataset_repo=dataset_repo
    )

@router.post(
    "/run/{reliability_score_id}",
    response_model=ConfidenceHeatmapResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Confidence Heatmap Generation",
    description="Runs the visualization engine dynamically based on the parent reliability scores and original image bands."
)
def run_heatmap_generation(
    reliability_score_id: str,
    service: ConfidenceHeatmapService = Depends(get_heatmap_service)
):
    return service.run_heatmap_generation(reliability_score_id)

@router.get(
    "/{reliability_score_id}",
    response_model=ConfidenceHeatmapResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Confidence Heatmap Record",
    description="Retrieves the visual heatmap metadata for a target reliability score ID."
)
def get_heatmap(
    reliability_score_id: str,
    service: ConfidenceHeatmapService = Depends(get_heatmap_service)
):
    return service.get_heatmap(reliability_score_id)

@router.get(
    "/{reliability_score_id}/overlay",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Confidence Overlay Image",
    description="Streams the generated color-coded confidence overlay PNG from disk."
)
def get_confidence_overlay(
    reliability_score_id: str,
    service: ConfidenceHeatmapService = Depends(get_heatmap_service)
):
    heatmap = service.get_heatmap(reliability_score_id)
    if not heatmap or not heatmap.confidence_overlay_path:
        raise HTTPException(status_code=404, detail="Confidence overlay image not found or not yet generated.")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
    path = os.path.abspath(os.path.join(workspace_root, heatmap.confidence_overlay_path))
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Confidence overlay image file does not exist on disk: {heatmap.confidence_overlay_path}")
    return FileResponse(path, media_type="image/png")

@router.get(
    "/{reliability_score_id}/reliability-map",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Region Reliability Map Image",
    description="Streams the generated region-level tier colored reliability map PNG from disk."
)
def get_reliability_map(
    reliability_score_id: str,
    service: ConfidenceHeatmapService = Depends(get_heatmap_service)
):
    heatmap = service.get_heatmap(reliability_score_id)
    if not heatmap or not heatmap.reliability_map_path:
        raise HTTPException(status_code=404, detail="Reliability map image not found or not yet generated.")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
    path = os.path.abspath(os.path.join(workspace_root, heatmap.reliability_map_path))
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Reliability map image file does not exist on disk: {heatmap.reliability_map_path}")
    return FileResponse(path, media_type="image/png")

@router.delete(
    "/{reliability_score_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Confidence Heatmap Assets",
    description="Deletes heatmap record and clears visual outputs from database."
)
def delete_heatmap(
    reliability_score_id: str,
    service: ConfidenceHeatmapService = Depends(get_heatmap_service)
):
    service.delete_heatmap(reliability_score_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
