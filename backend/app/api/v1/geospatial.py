from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.geospatial_service import GeospatialService
from app.schemas.geospatial_context import GeospatialContextResponse

router = APIRouter()

def get_geospatial_service(db: Session = Depends(get_db)) -> GeospatialService:
    """
    Dependency provider instantiating the GeospatialService with database contexts.
    """
    repository = GeospatialRepository(db)
    metadata_repository = DatasetMetadataRepository(db)
    dataset_repository = DatasetRepository(db)
    return GeospatialService(repository, metadata_repository, dataset_repository)

@router.get(
    "/{dataset_id}/context",
    response_model=GeospatialContextResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Dataset Geospatial Context",
    description=(
        "Retrieves or dynamically computes the geographic bounding box, center, "
        "and footprint coordinate parameters for map visualization."
    )
)
def get_geospatial_context(
    dataset_id: str,
    service: GeospatialService = Depends(get_geospatial_service)
):
    return service.get_or_calculate_context(dataset_id)


# New Router for /api/geospatial session-linked queries
geospatial_session_router = APIRouter()

@geospatial_session_router.get(
    "/{session_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Consolidated Geospatial Profile",
    description="Consolidates geospatial profile, GeoJSON footprint, and administrative location context by session."
)
def get_consolidated_geospatial(
    session_id: str,
    db: Session = Depends(get_db)
):
    dataset_repo = DatasetRepository(db)
    datasets = dataset_repo.list_session_datasets(session_id)
    if not datasets:
        raise HTTPException(
            status_code=404,
            detail=f"No datasets registered for session ID {session_id}."
        )
    dataset = datasets[0]
    dataset_id = dataset.dataset_id

    metadata_repo = DatasetMetadataRepository(db)
    metadata = metadata_repo.get_by_dataset(dataset_id)
    if not metadata:
        raise HTTPException(
            status_code=404,
            detail=f"No metadata intelligence profile found for dataset ID {dataset_id}."
        )

    if metadata.metadata_status != "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="Coordinates unavailable. Run metadata extraction first."
        )

    # 1. Coordinate Intelligence
    from app.services.geospatial.coordinate_service import CoordinateService
    coord_service = CoordinateService()
    try:
        geospatial_profile = coord_service.generate_profile(dataset_id, metadata)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Coordinate calculation failed: {e}"
        )

    # 2. Footprint Intelligence
    from app.services.geospatial.footprint_service import FootprintService
    footprint_service = FootprintService()
    try:
        epsg = geospatial_profile.spatial_reference.split(":")[-1]
        epsg_code = int(epsg) if epsg.isdigit() else 32643
        footprint_coords = footprint_service.build_polygon_footprint(metadata, epsg_code)
        area_sq_km = footprint_service.calculate_footprint_area(
            metadata.raster_width, metadata.raster_height,
            metadata.pixel_size_x, metadata.pixel_size_y
        )
        centroid = footprint_service.generate_centroid(footprint_coords)
        footprint = footprint_service.generate_geojson(footprint_coords, area_sq_km, centroid)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Footprint generation failed: {e}"
        )

    # 3. Location Intelligence
    from app.repositories.location_repository import LocationRepository
    from app.services.location_service import LocationService
    location_repo = LocationRepository(db)
    geospatial_repo = GeospatialRepository(db)
    geospatial_service = GeospatialService(geospatial_repo, metadata_repo, dataset_repo)
    location_service = LocationService(location_repo, geospatial_repo, dataset_repo, geospatial_service)
    
    try:
        location_context = location_service.get_or_create_location_context(dataset_id)
        location = {
            "country": location_context.country,
            "state": location_context.state,
            "district": location_context.district,
            "location_summary": location_context.location_summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Location context retrieval failed: {e}"
        )

    return {
        "geospatial_profile": geospatial_profile.model_dump(),
        "footprint": footprint,
        "location": location
    }

@geospatial_session_router.get(
    "/{session_id}/footprint",
    status_code=status.HTTP_200_OK,
    summary="Get Geospatial Footprint GeoJSON",
    description="Generates and returns the GeoJSON footprint for the dataset registered in the session."
)
def get_footprint_geojson(
    session_id: str,
    db: Session = Depends(get_db)
):
    consolidated = get_consolidated_geospatial(session_id, db)
    return consolidated["footprint"]

