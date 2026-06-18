from fastapi import APIRouter

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
