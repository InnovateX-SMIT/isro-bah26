import math
from fastapi import HTTPException
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.geospatial_context import GeospatialContextResponse

class GeospatialService:
    """
    Service layer coordinating spatial intelligence calculations, coordinate 
    transformations from projected UTM space to WGS84 latitude/longitude, 
    and storing findings in SQLite via GeospatialRepository.
    """
    def __init__(
        self,
        repository: GeospatialRepository,
        metadata_repository: DatasetMetadataRepository,
        dataset_repository: DatasetRepository
    ):
        self.repository = repository
        self.metadata_repository = metadata_repository
        self.dataset_repository = dataset_repository

    def get_or_calculate_context(self, dataset_id: str) -> GeospatialContextResponse:
        """
        Retrieves existing geospatial context or computes and saves it dynamically 
        if not yet populated. Perform coordinate transformation using pyproj.
        """
        # 1. Verify Dataset exists
        dataset = self.dataset_repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset registration {dataset_id} not found."
            )

        # 2. Fetch pre-existing context if saved
        db_context = self.repository.get_by_dataset(dataset_id)

        # 3. Load dataset metadata
        metadata = self.metadata_repository.get_by_dataset(dataset_id)
        if not metadata:
            raise HTTPException(
                status_code=404,
                detail=f"No metadata intelligence profile found for dataset ID {dataset_id}. Extract metadata first."
            )

        if metadata.metadata_status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail=f"Metadata extraction status is '{metadata.metadata_status}'. Run metadata extraction first."
            )

        # 4. Check that raster boundaries and size parameters are complete
        if (
            metadata.origin_x is None or 
            metadata.origin_y is None or 
            metadata.pixel_size_x is None or 
            metadata.pixel_size_y is None or 
            metadata.raster_width is None or 
            metadata.raster_height is None
        ):
            raise HTTPException(
                status_code=400,
                detail="Dataset metadata is incomplete: missing bounds, resolution, or dimension parameters."
            )

        # 5. Resolve source projection EPSG code
        epsg_code = metadata.epsg_code
        if not epsg_code:
            if metadata.utm_zone:
                epsg_code = 32600 + metadata.utm_zone
            elif metadata.coordinate_system and "wgs" in metadata.coordinate_system.lower():
                epsg_code = 4326

        if not epsg_code:
            raise HTTPException(
                status_code=400,
                detail="Dataset projection system EPSG code cannot be resolved from metadata."
            )

        # 6. Instantiate Coordinate Transformer (source EPSG to EPSG:4326 WGS84)
        import pyproj
        try:
            transformer = pyproj.Transformer.from_crs(f"EPSG:{epsg_code}", "EPSG:4326", always_xy=True)
        except Exception as pyproj_err:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize coordinate transformer for EPSG {epsg_code}: {pyproj_err}"
            )

        # 7. Calculate raster boundary corners and transform to geographic WGS84
        origin_x = metadata.origin_x
        origin_y = metadata.origin_y
        pixel_x = metadata.pixel_size_x
        pixel_y = metadata.pixel_size_y
        width = metadata.raster_width
        height = metadata.raster_height

        x_ul, y_ul = origin_x, origin_y
        x_ur, y_ur = origin_x + width * pixel_x, origin_y
        x_lr, y_lr = origin_x + width * pixel_x, origin_y + height * pixel_y
        x_ll, y_ll = origin_x, origin_y + height * pixel_y

        try:
            lon_ul, lat_ul = transformer.transform(x_ul, y_ul)
            lon_ur, lat_ur = transformer.transform(x_ur, y_ur)
            lon_lr, lat_lr = transformer.transform(x_lr, y_lr)
            lon_ll, lat_ll = transformer.transform(x_ll, y_ll)

            # Center calculation using center of projected extent
            x_ctr = origin_x + (width * pixel_x) / 2.0
            y_ctr = origin_y + (height * pixel_y) / 2.0
            center_lon, center_lat = transformer.transform(x_ctr, y_ctr)

        except Exception as transf_err:
            raise HTTPException(
                status_code=500,
                detail=f"Coordinate transformation failed: {transf_err}"
            )

        # Validate non-finite coordinate values
        for lon, lat in [(lon_ul, lat_ul), (lon_ur, lat_ur), (lon_lr, lat_lr), (lon_ll, lat_ll)]:
            if math.isnan(lon) or math.isnan(lat) or math.isinf(lon) or math.isinf(lat):
                raise HTTPException(
                    status_code=400,
                    detail="Transformation returned non-finite coordinate parameters."
                )
            if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
                raise HTTPException(
                    status_code=400,
                    detail=f"Transformation returned out-of-bounds coordinates: lon={lon}, lat={lat}"
                )

        # Calculate bounds in lat/lon space
        min_lat = min(lat_ul, lat_ur, lat_lr, lat_ll)
        max_lat = max(lat_ul, lat_ur, lat_lr, lat_ll)
        min_lon = min(lon_ul, lon_ur, lon_lr, lon_ll)
        max_lon = max(lon_ul, lon_ur, lon_lr, lon_ll)

        # 8. Save context if not exists or if inputs changed
        if not db_context:
            context_data = {
                "center_lat": center_lat,
                "center_lon": center_lon,
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon,
                "epsg": epsg_code,
                "crs": metadata.coordinate_system,
                "projection": metadata.projection_name
            }
            db_context = self.repository.save_context(dataset_id, context_data)

        # 9. Return structured response matching requirements
        return GeospatialContextResponse(
            dataset_id=dataset_id,
            center={
                "lat": db_context.center_lat,
                "lon": db_context.center_lon
            },
            bounds={
                "north": db_context.max_lat,
                "south": db_context.min_lat,
                "east": db_context.max_lon,
                "west": db_context.min_lon
            },
            crs=db_context.crs,
            epsg=db_context.epsg,
            projection=db_context.projection,
            footprint=[
                [lon_ul, lat_ul],
                [lon_ur, lat_ur],
                [lon_lr, lat_lr],
                [lon_ll, lat_ll],
                [lon_ul, lat_ul]
            ]
        )

    def delete_context(self, dataset_id: str) -> bool:
        """
        Deletes the geospatial context record from database.
        """
        return self.repository.delete_by_dataset(dataset_id)
