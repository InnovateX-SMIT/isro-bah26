import sys
import os
import sqlite3
import json
import shutil
import time
from PIL import Image
import rasterio

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_12f.db"))
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except Exception:
        pass

os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 12F AI Reconstruction Refinement & Previews Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" TEST: {title}")
    print(f"==================================================")

try:
    # Create session
    print_header("1. Initialize Workflow and Run Reconstruction")
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session_id = r.json()["session_id"]
    print(f"Session created: {session_id}")
    
    # Discover datasets
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200
    demo_datasets = r.json()
    assert len(demo_datasets) > 0
    target_ds = demo_datasets[0]
    print(f"Selected dataset: {target_ds['dataset_name']}")
    
    # Run full workflow with strategy="DEFAULT" (triggers new OLA stitching, Retinex matching, guided feathering)
    run_payload = {
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"],
        "temporal_window_days": 30,
        "num_references": 3,
        "reconstruction_strategy": "DEFAULT"
    }
    
    start_time = time.time()
    r = client.post(f"/api/v1/workflow/run/{session_id}", json=run_payload)
    elapsed = time.time() - start_time
    assert r.status_code == 200
    run_result = r.json()
    
    print(f"Workflow status: {run_result['status']}")
    print(f"Total processing time: {run_result['total_processing_time_ms']} ms")
    print(f"Wall-clock execution time: {elapsed:.2f} seconds")
    assert run_result["status"] == "completed"
    
    # Get database reconstruction run details
    r = client.get(f"/api/v1/reconstruction/{session_id}")
    assert r.status_code == 200
    rec_run = r.json()
    print(f"Reconstruction Method Used: {rec_run['reconstruction_method']}")
    assert "U-Net" in rec_run["reconstruction_method"]
    
    dataset_id = run_result["stages"][1]["outputs"]["dataset_id"]
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Check generated files
    tif_path = os.path.join(workspace_root, rec_run["output_image_path"])
    preview_path = os.path.join(workspace_root, rec_run["preview_image_path"])
    thumbnail_path = os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}/reconstruction_thumbnail.png")
    comparison_path = os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}/before_after_comparison.png")
    
    print_header("2. Verify Reconstruction Preview and Thumbnail Assets")
    assert os.path.exists(tif_path), "Reconstructed GeoTIFF missing"
    assert os.path.exists(preview_path), "Reconstruction preview PNG missing"
    assert os.path.exists(thumbnail_path), "Reconstruction thumbnail PNG missing"
    assert os.path.exists(comparison_path), "Before vs After comparison PNG missing"
    
    print("Files found on disk:")
    print(f" - GeoTIFF: {rec_run['output_image_path']}")
    print(f" - Preview: {rec_run['preview_image_path']}")
    print(f" - Thumbnail: datasets/reconstructions/{dataset_id}/reconstruction_thumbnail.png")
    print(f" - Comparison: datasets/reconstructions/{dataset_id}/before_after_comparison.png")
    
    # Verify thumbnail size
    with Image.open(thumbnail_path) as thumb_img:
        w_t, h_t = thumb_img.size
        print(f"Verified thumbnail dimensions: {w_t}x{h_t}")
        assert max(w_t, h_t) <= 256, f"Thumbnail dimensions {w_t}x{h_t} exceed max size 256!"
        
    # Verify before-after side-by-side size
    with Image.open(preview_path) as prev_img:
        w_p, h_p = prev_img.size
        with Image.open(comparison_path) as comp_img:
            w_c, h_c = comp_img.size
            print(f"Verified preview size: {w_p}x{h_p}")
            print(f"Verified comparison size: {w_c}x{h_c}")
            assert h_c == h_p, "Comparison height must match preview height!"
            assert w_c == (2 * w_p + 5), f"Comparison width {w_c} should be exactly (2 * {w_p} + 5) due to side-by-side format!"
            
    print("✓ Test: Visual preview, thumbnail, and comparison assets match GIS-ready specs.")

    # Teardown
    print_header("3. Teardown and Cleanup")
    client.delete(f"/api/v1/analysis/{session_id}")
    if os.path.exists(db_path):
        os.remove(db_path)
    print("Cleaned up database.")
    
    print("\n==================================================")
    print(" ALL PHASE 12F AI POST-PROCESSING VERIFICATIONS PASSED!")
    print("==================================================")
    sys.exit(0)

except Exception as e:
    print(f"\nPhase 12F AI Post-Processing Verification FAILED: {e}")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    import traceback
    traceback.print_exc()
    sys.exit(1)
