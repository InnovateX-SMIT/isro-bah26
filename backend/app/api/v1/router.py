from fastapi import APIRouter
from app.api.v1.analysis import router as analysis_router
from app.api.v1.datasets import router as datasets_router
from app.api.v1.dataset_inspection import router as dataset_inspection_router
from app.api.v1.dataset_metadata import router as dataset_metadata_router
from app.api.v1.dataset_preview import router as dataset_preview_router

api_router = APIRouter()

@api_router.get("/status", tags=["System Status"])
def get_v1_status():
    """
    Diagnostic status information for API version 1.
    """
    return {
        "version": "1.0.0",
        "service": "AI-Powered Geospatial Reconstruction Platform API",
        "status": "ready"
    }

api_router.include_router(analysis_router, prefix="/analysis", tags=["Analysis Sessions"])
api_router.include_router(datasets_router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(dataset_inspection_router, prefix="/dataset-inspection", tags=["Dataset Inspection"])
api_router.include_router(dataset_metadata_router, prefix="/dataset-metadata", tags=["Dataset Metadata"])
api_router.include_router(dataset_preview_router, prefix="/dataset-preview", tags=["Dataset Preview"])



