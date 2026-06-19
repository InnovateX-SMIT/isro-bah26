from fastapi import APIRouter
from app.api.v1.analysis import router as analysis_router
from app.api.v1.datasets import router as datasets_router

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


