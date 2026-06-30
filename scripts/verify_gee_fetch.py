import sys
import os
import json
import math
import numpy as np
import rasterio
import importlib

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Point SQLALCHEMY_DATABASE_URL to the real sqlite db inside backend directory
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "platform.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

# Dynamically import all models in app.models to register them in SQLAlchemy metadata registry
models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "app", "models"))
if os.path.exists(models_dir):
    for file in os.listdir(models_dir):
        if file.endswith(".py") and file != "__init__.py":
            module_name = f"app.models.{file[:-3]}"
            try:
                importlib.import_module(module_name)
            except Exception as import_err:
                print(f"[Warning] Failed to import {module_name}: {import_err}")

from app.core.database import SessionLocal
from app.models.dataset import Dataset
from app.models.geospatial_context import GeospatialContext
from app.services.temporal.providers.gee_provider import GoogleEarthEngineProvider
from app.services.geospatial.utils import expand_bbox_by_km

def calculate_bbox_dimensions_km(bbox):
    """
    Computes width and height in km of a bounding box [[min_lon, min_lat], [max_lon, max_lat]].
    """
    min_lon, min_lat = bbox[0]
    max_lon, max_lat = bbox[1]
    
    # Center latitude
    lat = (min_lat + max_lat) / 2.0
    
    # Lat/Lon to km conversions
    lat_deg_len = 111.32
    lon_deg_len = 111.32 * math.cos(math.radians(lat))
    
    width_km = (max_lon - min_lon) * lon_deg_len
    height_km = (max_lat - min_lat) * lat_deg_len
    
    return width_km, height_km

def main():
    print("==================================================")
    print(" Running GEE Fetch Verification Script")
    print("==================================================")
    
    db = SessionLocal()
    try:
        # 1. Discover registered dataset dynamically
        dataset = db.query(Dataset).first()
        if not dataset:
            print("[Error] No dataset registered in database.")
            sys.exit(1)
            
        print(f"[OK] Found active dataset: {dataset.dataset_name} (ID: {dataset.dataset_id})")
        
        # Load geospatial context
        geo = db.query(GeospatialContext).filter(GeospatialContext.dataset_id == dataset.dataset_id).first()
        if not geo:
            print("[Error] No geospatial context found for dataset.")
            sys.exit(1)
            
        native_bbox = [[geo.min_lon, geo.min_lat], [geo.max_lon, geo.max_lat]]
        native_w, native_h = calculate_bbox_dimensions_km(native_bbox)
        
        print("\n1. Bounding Box Dimensions:")
        print(f"   Native Bbox:   {native_bbox}")
        print(f"   Native Size:   {native_w:.2f} km x {native_h:.2f} km")
        
        # 2. Compute expanded bounding box (Task A)
        expanded_bbox = expand_bbox_by_km(native_bbox, buffer_km=50.0)
        expanded_w, expanded_h = calculate_bbox_dimensions_km(expanded_bbox)
        print(f"   Expanded Bbox: {expanded_bbox}")
        print(f"   Expanded Size: {expanded_w:.2f} km x {expanded_h:.2f} km")
        
        # 3. Call GEE Provider Search
        print("\n2. Querying Google Earth Engine catalog...")
        provider = GoogleEarthEngineProvider()
        coordinates = {"lat": geo.center_lat, "lon": geo.center_lon}
        
        # Get target acquisition date
        acq_date = "2025-07-14"
        if dataset.dataset_metadata and dataset.dataset_metadata.acquisition_date:
            acq_date = dataset.dataset_metadata.acquisition_date
            
        candidates = provider.search_imagery(
            coordinates=coordinates,
            bounding_box=expanded_bbox,
            acquisition_date=acq_date
        )
        
        if not candidates:
            print("[Error] No historical GEE candidates returned.")
            sys.exit(1)
            
        best_cand = candidates[0]
        print(f"[OK] Found {len(candidates)} candidates. Best: {best_cand.candidate_id} (Cloud: {best_cand.cloud_cover}%)")
        
        # 4. Fetch/Download GEE Image (Task B)
        dest_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets", "temporal_references", "verification_fetch.tif"))
        print(f"\n3. Downloading GEE candidate to: {dest_path}")
        
        # Trigger download
        provider.download_image(best_cand.candidate_id, dest_path, expanded_bbox)
        
        if not os.path.exists(dest_path):
            print(f"[Error] Download failed. Image not found at {dest_path}")
            sys.exit(1)
            
        print("[OK] Image downloaded successfully.")
        
        # 5. Print pixel statistics and verify correctness
        print("\n4. Image Statistics & Verification:")
        with rasterio.open(dest_path) as src:
            print(f"   Shape:        {src.shape}")
            print(f"   CRS:          {src.crs}")
            print(f"   Band Count:   {src.count}")
            
            # Read bands and crop/mask to native bounding box to verify main region data validity
            try:
                # Convert WGS84 native bounds to pixel window
                native_bounds = (geo.min_lon, geo.min_lat, geo.max_lon, geo.max_lat)
                window = src.window(*native_bounds)
                cropped_data = src.read(window=window)
                print(f"   Cropped dataset area shape: {cropped_data.shape}")
            except Exception as crop_err:
                print(f"[Warning] Slicing native window failed: {crop_err}, checking full extent instead")
                cropped_data = src.read()
            
            corrupted = False
            for b in range(1, src.count + 1):
                band_data = cropped_data[b - 1]
                # Exclude NaNs if any
                valid_data = band_data[~np.isnan(band_data)]
                
                # Check zero pixel count
                total_pixels = valid_data.size
                zero_pixels = (valid_data == 0).sum()
                zero_pct = (zero_pixels / total_pixels) * 100.0
                
                print(f"   Band {b}: min={np.nanmin(valid_data):.4f}, max={np.nanmax(valid_data):.4f}, mean={np.nanmean(valid_data):.4f}")
                print(f"   Band {b} Black/Zero pixels: {zero_pct:.2f}% ({zero_pixels} / {total_pixels})")
                
                if zero_pct > 10.0:
                    print(f"   [Error] Band {b} has {zero_pct:.2f}% black pixels (exceeds 10% threshold)")
                    corrupted = True
            
            if corrupted:
                print("\n[FAIL] Image verification failed. Exit status: non-zero.")
                sys.exit(1)
            else:
                print("\n[SUCCESS] GEE Fetch verification passed. Pixel stats conform to quality standards.")
                sys.exit(0)
                
    except Exception as run_err:
        print(f"[Error] Verification run failed: {run_err}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
