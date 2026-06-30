import math
import datetime
from typing import List

def expand_bbox_by_km(bbox: List[List[float]], buffer_km: float = 50.0) -> List[List[float]]:
    """
    Expands the bounding box [[min_lon, min_lat], [max_lon, max_lat]] outward
    by buffer_km on each of the four sides.
    Adjusts longitude degree-per-km by cos(latitude).
    """
    min_lon, min_lat = bbox[0]
    max_lon, max_lat = bbox[1]
    
    # Calculate latitude for cosine adjustment (center of the bounding box)
    center_lat = (min_lat + max_lat) / 2.0
    
    # Degrees of latitude per km (1 degree of latitude is approx 111.32 km)
    deg_lat_per_km = 1.0 / 111.32
    
    # Degrees of longitude per km at this latitude (1 degree of longitude = 111.32 * cos(lat) km)
    cos_lat = math.cos(math.radians(center_lat))
    if cos_lat > 0.001:
        deg_lon_per_km = 1.0 / (111.32 * cos_lat)
    else:
        deg_lon_per_km = 1.0 / 111.32
        
    lat_buffer = buffer_km * deg_lat_per_km
    lon_buffer = buffer_km * deg_lon_per_km
    
    return [
        [min_lon - lon_buffer, min_lat - lat_buffer],
        [max_lon + lon_buffer, max_lat + lat_buffer]
    ]

def parse_date_safely(date_str: str) -> datetime.date:
    """
    Parses various date formats from the metadata layer.
    Supported: DD-MMM-YYYY (e.g. 12-AUG-2025), YYYY-MM-DD, DD/MM/YYYY.
    """
    cleaned = date_str.strip()
    for fmt in ("%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unsupported acquisition date format: '{date_str}'")
