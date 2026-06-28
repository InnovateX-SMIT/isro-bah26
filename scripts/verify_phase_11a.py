import sys
import os
import sqlite3
import json
import shutil

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_11a.db"))
# Remove existing test DB if any
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except Exception:
        pass

os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.repositories.reconstruction_repository import ReconstructionRepository

print("Starting Phase 11A Raster Export System Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Create Session
    print_header("1. Create Analysis Session")
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201, f"Expected 201, got {r.status_code}"
    session = r.json()
    session_id = session["session_id"]
    print(f"Session created: {session_id}")

    # 2. Discover demo datasets
    print_header("2. Discover Demo Datasets")
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    demo_datasets = r.json()
    assert len(demo_datasets) > 0, "No demo datasets found."
    
    target_ds = None
    for ds in demo_datasets:
        if "JUL" in ds["dataset_name"].upper():
            target_ds = ds
            break
            
    if target_ds is None:
        target_ds = demo_datasets[0]
        
    print(f"Selected demo dataset: {target_ds['dataset_name']}")

    # 3. Register Dataset
    print_header("3. Register Target Dataset")
    register_payload = {
        "analysis_session_id": session_id,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    }
    r = client.post("/api/v1/datasets/register", json=register_payload)
    assert r.status_code == 201
    dataset_id = r.json()["dataset_id"]
    print(f"Registered dataset: {dataset_id}")

    # 4. Run prerequisite analysis phases (Inspection -> Metadata -> Geospatial -> Temporal -> Cloud -> Reconstruction -> Confidence)
    print_header("4. Initialize Pipeline Prerequisites")
    client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    client.get(f"/api/v1/geospatial/{dataset_id}/context")
    client.get(f"/api/v1/location/{dataset_id}/context")
    client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    
    client.post(f"/api/v1/temporal/discover/{session_id}", json={"temporal_window_days": 30})
    client.post(f"/api/v1/temporal/select/{session_id}", json={"num_references": 3})
    client.post(f"/api/v1/temporal/context/{session_id}")
    
    client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
    client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
    client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
    client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
    client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")

    print("Running Baseline Reconstruction & Post-Optimizations...")
    client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "TELEA"})
    client.post(f"/api/v1/reconstruction/optimize/{session_id}")
    client.post(f"/api/v1/reconstruction/evaluate/{session_id}")

    db = SessionLocal()
    recon_repo = ReconstructionRepository(db)
    run_rec = recon_repo.get_by_dataset(dataset_id)
    assert run_rec is not None
    recon_run_id = run_rec.id

    print("Running Confidence Estimation...")
    r = client.post(f"/api/v1/confidence/run/{recon_run_id}")
    assert r.status_code == 200
    confidence_id = r.json()["confidence_id"]

    print("Running Reliability Scoring & Heatmaps...")
    r = client.post(f"/api/v1/reliability/run/{confidence_id}")
    assert r.status_code == 200
    reliability_id = r.json()["reliability_id"]

    r = client.post(f"/api/v1/confidence-heatmap/run/{reliability_id}")
    assert r.status_code == 200
    print("✓ Prerequisites built successfully.")

    # 5. Verify Exports Validation Endpoint
    print_header("5. Evaluate Export Validation Controller")
    val_payload = {
        "session_id": session_id,
        "layer": "reconstruction",
        "format": "GeoTIFF"
    }
    r = client.post("/api/v1/exports/validate", json=val_payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    val_data = r.json()
    assert val_data["valid"] is True, f"Expected validation True, got {val_data}"
    print(f"✓ Layer Validation Passed: {val_data['message']}")

    # Try invalid layer validation
    val_payload["layer"] = "invalid_layer"
    r = client.post("/api/v1/exports/validate", json=val_payload)
    assert r.status_code == 200
    assert r.json()["valid"] is False, "Expected validation to fail for invalid layer"
    print("✓ Invalid Layer validation correctly returned false")

    # 6. Verify Export Request & Compilation
    print_header("6. Evaluate Export Compilation Layer")
    req_payload = {
        "session_id": session_id,
        "layer": "reconstruction",
        "format": "GeoTIFF"
    }
    r = client.post("/api/v1/exports/request", json=req_payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    exp_data = r.json()
    assert exp_data["status"] == "COMPLETED", f"Expected COMPLETED, got {exp_data}"
    export_id = exp_data["export_id"]
    print(f"✓ Reconstruction Export GeoTIFF created. ID: {export_id}")
    print(f"  File registered: {exp_data['file_path']}, Size: {exp_data['file_size_bytes']} bytes")

    # Try PNG format
    req_payload["format"] = "PNG"
    r = client.post("/api/v1/exports/request", json=req_payload)
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"
    print("✓ Reconstruction Export PNG compiled successfully.")

    # Try JPG format
    req_payload["format"] = "JPG"
    r = client.post("/api/v1/exports/request", json=req_payload)
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"
    print("✓ Reconstruction Export JPG compiled successfully.")

    # Test confidence_overlay georeferencing conversion to TIFF
    print_header("7. Test PNG overlay georeferencing transformation to GeoTIFF")
    req_payload = {
        "session_id": session_id,
        "layer": "confidence_overlay",
        "format": "GeoTIFF"
    }
    r = client.post("/api/v1/exports/request", json=req_payload)
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"
    print("✓ Georeferenced overlay compiled to GeoTIFF successfully.")

    # 8. Verify Status Endpoint
    print_header("8. Evaluate Status Endpoint")
    r = client.get(f"/api/v1/exports/status/{export_id}")
    assert r.status_code == 200
    assert r.json()["export_id"] == export_id
    print("✓ Status retrieved successfully.")

    # 9. Verify Download Endpoint
    print_header("9. Evaluate Download Attachment Endpoint")
    r = client.get(f"/api/v1/exports/download/{export_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert "Content-Disposition" in r.headers
    assert f"attachment; filename=" in r.headers["Content-Disposition"]
    print("✓ Download attachment headers verified.")
    
    # 10. Clean up generated exports directory
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    exports_dir = os.path.join(workspace_root, "datasets", "exports")
    if os.path.exists(exports_dir):
        try:
            # We preserve the folder but check that it contains subfolders
            subfolders = os.listdir(exports_dir)
            print(f"Generated exports catalog subfolders: {subfolders}")
        except Exception:
            pass

    print("\n==================================================")
    print(" ALL RASTER EXPORT SYSTEM BACKEND VERIFICATION TESTS PASSED!")
    print("==================================================")

except AssertionError as err:
    print(f"\n❌ Validation failed: {err}")
    sys.exit(1)
except Exception as err:
    print(f"\n❌ Execution failed: {err}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    # Cleanup DB
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
