from fastapi import APIRouter
from app.api.v1.analysis import router as analysis_router
from app.api.v1.datasets import router as datasets_router
from app.api.v1.dataset_inspection import router as dataset_inspection_router
from app.api.v1.dataset_metadata import router as dataset_metadata_router
from app.api.v1.dataset_preview import router as dataset_preview_router
from app.api.v1.geospatial import router as geospatial_router
from app.api.v1.location import router as location_router
from app.api.v1.geospatial_context import router as geospatial_context_router
from app.api.v1.mission_control import router as mission_control_router
from app.api.v1.temporal import router as temporal_router
from app.api.v1.temporal_discovery import router as temporal_discovery_router
from app.api.v1.temporal_reference import router as temporal_reference_router
from app.api.v1.temporal_context import router as temporal_context_router
from app.api.v1.cloud_detection import router as cloud_detection_router
from app.api.v1.cloud_classification import router as cloud_classification_router
from app.api.v1.cloud_shadow import router as cloud_shadow_router
from app.api.v1.cloud_segmentation import router as cloud_segmentation_router
from app.api.v1.cloud_analytics import router as cloud_analytics_router
from app.api.v1.reconstruction import router as reconstruction_router
from app.api.v1.temporal_fusion import router as temporal_fusion_router
from app.api.v1.confidence import router as confidence_router
from app.api.v1.reliability import router as reliability_router

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
api_router.include_router(geospatial_router, prefix="/geospatial", tags=["Geospatial Context"])
api_router.include_router(location_router, prefix="/location", tags=["Location Intelligence"])
api_router.include_router(geospatial_context_router, prefix="/geospatial-context", tags=["Geospatial Context Intelligence"])
api_router.include_router(mission_control_router, prefix="/mission-control", tags=["Geospatial Mission Control"])
api_router.include_router(temporal_router, prefix="/temporal", tags=["Temporal Provider Engine"])
api_router.include_router(temporal_discovery_router, prefix="/temporal", tags=["Temporal Discovery Engine"])
api_router.include_router(temporal_reference_router, prefix="/temporal", tags=["Temporal Reference Selection Engine"])
api_router.include_router(temporal_context_router, prefix="/temporal", tags=["Temporal Context Generation Engine"])
api_router.include_router(cloud_detection_router, prefix="/cloud-detection", tags=["Cloud Detection Engine"])
api_router.include_router(cloud_classification_router, prefix="/cloud-classification", tags=["Cloud Classification Engine"])
api_router.include_router(cloud_shadow_router, prefix="/cloud-shadow", tags=["Cloud Shadow Detection Engine"])
api_router.include_router(cloud_segmentation_router, prefix="/cloud-segmentation", tags=["Cloud Segmentation Engine"])
api_router.include_router(cloud_analytics_router, prefix="/cloud-analytics", tags=["Cloud Analytics Engine"])
api_router.include_router(reconstruction_router, prefix="/reconstruction", tags=["Reconstruction Framework"])
api_router.include_router(temporal_fusion_router, prefix="/temporal-fusion", tags=["Temporal Fusion Engine"])
api_router.include_router(confidence_router, prefix="/confidence", tags=["Confidence Intelligence Engine"])
api_router.include_router(reliability_router, prefix="/reliability", tags=["Reliability Scoring Engine"])
