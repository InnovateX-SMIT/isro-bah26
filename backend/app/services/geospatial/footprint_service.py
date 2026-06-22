import pyproj

class FootprintService:
    """
    Footprint Intelligence Service (Phase 4B)
    Responsible for generating geographic footprints, calculating spatial area and centroids,
    and constructing GeoJSON feature representations.
    """

    def calculate_footprint_area(self, width: int, height: int, pixel_size_x: float, pixel_size_y: float) -> float:
        """
        Calculates the geographic footprint area in square kilometers from projection pixel scales.
        """
        if not width or not height or not pixel_size_x or not pixel_size_y:
            return 0.0
        area_sq_m = (width * abs(pixel_size_x)) * (height * abs(pixel_size_y))
        return area_sq_m / 1_000_000.0

    def generate_centroid(self, footprint_coords: list[list[float]]) -> dict:
        """
        Calculates the polygon centroid from the outer ring footprint vertices.
        """
        if not footprint_coords or len(footprint_coords) < 3:
            return {"lat": 0.0, "lon": 0.0}
        
        # Exclude closing coordinate if it matches the start
        vertices = footprint_coords[:-1] if footprint_coords[0] == footprint_coords[-1] else footprint_coords
        lats = [pt[1] for pt in vertices]
        lons = [pt[0] for pt in vertices]
        return {
            "lat": sum(lats) / len(lats),
            "lon": sum(lons) / len(lons)
        }

    def build_polygon_footprint(self, metadata, epsg_code: int) -> list[list[float]]:
        """
        Transforms coordinate extents from projected grid coordinates to geographic coordinates,
        returning a closed polygon coordinate list.
        """
        try:
            transformer = pyproj.Transformer.from_crs(f"EPSG:{epsg_code}", "EPSG:4326", always_xy=True)
        except Exception as pyproj_err:
            raise RuntimeError(f"Could not instantiate transformer for EPSG {epsg_code}: {pyproj_err}")

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
        except Exception as transf_err:
            raise RuntimeError(f"Footprint coordinate transformation failed: {transf_err}")

        return [
            [lon_ul, lat_ul],
            [lon_ur, lat_ur],
            [lon_lr, lat_lr],
            [lon_ll, lat_ll],
            [lon_ul, lat_ul]  # Closed polygon loop
        ]

    def generate_geojson(self, footprint_coords: list[list[float]], area_sq_km: float, centroid: dict) -> dict:
        """
        Assembles spatial metrics and coordinates into a standard GeoJSON Feature dictionary.
        """
        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [footprint_coords]
            },
            "properties": {
                "area_sq_km": area_sq_km,
                "centroid": centroid
            }
        }
