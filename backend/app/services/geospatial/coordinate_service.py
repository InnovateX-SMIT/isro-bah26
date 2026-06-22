import math
import pyproj
from app.services.geospatial.geospatial_profile import GeospatialProfile, BoundingBox

class CoordinateService:
    """
    Coordinate Intelligence Service (Phase 4A)
    Validates, normalizes, and interprets spatial coordinate data from satellite imagery metadata.
    """

    def validate_coordinates(self, lon: float, lat: float) -> bool:
        """
        Validates that coordinate parameters are finite numbers and lie within 
        logical geographic ranges (lon: [-180, 180], lat: [-90, 90]).
        """
        if math.isnan(lon) or math.isnan(lat) or math.isinf(lon) or math.isinf(lat):
            return False
        if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
            return False
        return True

    def interpret_crs(self, epsg_code: int | None, coordinate_system: str | None, projection_name: str | None, utm_zone: int | None) -> dict:
        """
        Interprets Coordinate Reference System metadata to establish EPSG codes,
        projection descriptions, hemispheres, and spatial reference definitions.
        """
        # Resolve EPSG code if not direct
        resolved_epsg = epsg_code
        if not resolved_epsg:
            if utm_zone:
                resolved_epsg = 32600 + utm_zone
            elif coordinate_system and "wgs" in coordinate_system.lower():
                resolved_epsg = 4326

        # Determine Hemisphere
        hemisphere = "Northern"
        if resolved_epsg and (32701 <= resolved_epsg <= 32760):
            hemisphere = "Southern"
        
        # Determine UTM Zone String
        utm_zone_str = None
        if utm_zone:
            suffix = "S" if hemisphere == "Southern" else "N"
            utm_zone_str = f"{utm_zone}{suffix}"

        # Resolve descriptions
        resolved_crs = coordinate_system or ("WGS 84" if resolved_epsg in (4326, 32643) else "Unknown CRS")
        resolved_proj = projection_name or (f"UTM Zone {utm_zone_str}" if utm_zone_str else "Projected")
        spatial_ref = f"EPSG:{resolved_epsg}" if resolved_epsg else "Unknown Reference"

        return {
            "epsg": resolved_epsg,
            "crs": resolved_crs,
            "projection": resolved_proj,
            "utm_zone": utm_zone_str,
            "hemisphere": hemisphere,
            "spatial_reference": spatial_ref
        }

    def generate_profile(self, dataset_id: str, metadata) -> GeospatialProfile:
        """
        Consumes raw dataset metadata from Phase 3, coordinates transforming 
        from projected spatial boundaries into geographic coordinate structures.
        """
        if (
            metadata.origin_x is None or 
            metadata.origin_y is None or 
            metadata.pixel_size_x is None or 
            metadata.pixel_size_y is None or 
            metadata.raster_width is None or 
            metadata.raster_height is None
        ):
            raise ValueError(
                "Dataset metadata is missing required coordinate boundary dimensions or pixel resolutions."
            )

        # 1. Resolve CRS
        crs_info = self.interpret_crs(
            epsg_code=metadata.epsg_code,
            coordinate_system=metadata.coordinate_system,
            projection_name=metadata.projection_name,
            utm_zone=metadata.utm_zone
        )

        epsg = crs_info["epsg"]
        if not epsg:
            raise ValueError("Projection reference system (EPSG code) could not be resolved from metadata.")

        # 2. Transform boundary extent to geographic WGS84
        try:
            transformer = pyproj.Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)
        except Exception as pyproj_err:
            raise RuntimeError(f"Could not instantiate transformer for EPSG {epsg}: {pyproj_err}")

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

            # Center calculation
            x_ctr = origin_x + (width * pixel_x) / 2.0
            y_ctr = origin_y + (height * pixel_y) / 2.0
            center_lon, center_lat = transformer.transform(x_ctr, y_ctr)
        except Exception as transf_err:
            raise RuntimeError(f"Geospatial coordinate transformation failed: {transf_err}")

        # 3. Validate coordinates
        for lon, lat in [(lon_ul, lat_ul), (lon_ur, lat_ur), (lon_lr, lat_lr), (lon_ll, lat_ll), (center_lon, center_lat)]:
            if not self.validate_coordinates(lon, lat):
                raise ValueError(f"Coordinate validation failed: out-of-bounds or non-finite values (lon={lon}, lat={lat}).")

        # 4. Construct Bounding Box
        min_lat = min(lat_ul, lat_ur, lat_lr, lat_ll)
        max_lat = max(lat_ul, lat_ur, lat_lr, lat_ll)
        min_lon = min(lon_ul, lon_ur, lon_lr, lon_ll)
        max_lon = max(lon_ul, lon_ur, lon_lr, lon_ll)

        bbox = BoundingBox(
            min_lat=min_lat,
            min_lon=min_lon,
            max_lat=max_lat,
            max_lon=max_lon
        )

        return GeospatialProfile(
            dataset_id=dataset_id,
            center_lat=center_lat,
            center_lon=center_lon,
            bbox=bbox,
            crs=crs_info["crs"],
            projection=crs_info["projection"],
            utm_zone=crs_info["utm_zone"],
            hemisphere=crs_info["hemisphere"],
            spatial_reference=crs_info["spatial_reference"]
        )
