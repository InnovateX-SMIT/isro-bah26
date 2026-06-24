import sys
import os
import sqlite3
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_7c.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 7C Reconstruction Model Integration Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Create session
    print_header("1. Create Analysis Session")
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201, f"Expected 201, got {r.status_code}"
    session = r.json()
    session_id = session["session_id"]
    print(f"Session created with ID: {session_id}")

    # 2. Discover demo datasets
    print_header("2. Discover Demo Datasets")
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    demo_datasets = r.json()
    assert len(demo_datasets) > 0, "No demo datasets found."
    target_ds = demo_datasets[0]
    print(f"Discovered demo dataset: {target_ds['dataset_name']}")

    # 3. Register dataset
    print_header("3. Register Target Dataset")
    register_payload = {
        "analysis_session_id": session_id,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    }
    r = client.post("/api/v1/datasets/register", json=register_payload)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}"
    dataset = r.json()
    dataset_id = dataset["dataset_id"]
    print(f"Registered dataset with ID: {dataset_id}")

    # Run inspection, metadata, geospatial context
    print("Running inspection, metadata, geospatial profile setup...")
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200
    r = client.get(f"/api/v1/geospatial/{dataset_id}/context")
    assert r.status_code == 200
    r = client.get(f"/api/v1/location/{dataset_id}/context")
    assert r.status_code == 200
    r = client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    assert r.status_code == 200

    # Discover references, select stack, generate temporal context
    print("Running temporal intelligence discovery, selection, context setup...")
    r = client.post(f"/api/v1/temporal/discover/{session_id}", json={"temporal_window_days": 30})
    assert r.status_code == 200
    r = client.post(f"/api/v1/temporal/select/{session_id}", json={"num_references": 3})
    assert r.status_code == 200
    r = client.post(f"/api/v1/temporal/context/{session_id}")
    assert r.status_code in (200, 201)

    # Run cloud intelligence layers
    print("Running cloud intelligence layers...")
    r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
    assert r.status_code == 200

    # 4. Execute Reconstruction Model Integration Pipeline (POST)
    print_header("4. Run Reconstruction Pipeline (POST)")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "TELEA"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    rec_data = r.json()
    print("Reconstruction pipeline triggered successfully. Response:")
    print(json.dumps(rec_data, indent=2))

    # Assert basic structure
    assert "run" in rec_data
    assert "package" in rec_data
    run_info = rec_data["run"]
    assert run_info["reconstruction_status"] == "COMPLETED"
    assert "output_image_path" in run_info
    assert "preview_image_path" in run_info
    assert run_info["reconstruction_method"] == "cv2.INPAINT_TELEA"
    assert "execution_time_ms" in run_info

    # 5. Verify Filesystem Artifacts Created
    print_header("5. Verify Filesystem Artifacts")
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    tif_abs_path = os.path.join(workspace_root, run_info["output_image_path"])
    png_abs_path = os.path.join(workspace_root, run_info["preview_image_path"])
    meta_abs_path = os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}/reconstruction_metadata.json")

    print(f"Checking reconstructed TIFF: {tif_abs_path}")
    assert os.path.exists(tif_abs_path), "reconstructed_image.tif does not exist on disk!"
    
    print(f"Checking preview PNG: {png_abs_path}")
    assert os.path.exists(png_abs_path), "reconstruction_preview.png does not exist on disk!"
    
    print(f"Checking metadata JSON: {meta_abs_path}")
    assert os.path.exists(meta_abs_path), "reconstruction_metadata.json does not exist on disk!"

    # Verify JSON contents
    with open(meta_abs_path, "r") as f:
        meta_payload = json.load(f)
    assert meta_payload["source_dataset"] == dataset_id
    assert meta_payload["reconstruction_method"] == "cv2.INPAINT_TELEA"
    print("Filesystem artifacts successfully verified.")

    # 6. Fetch reconstruction status, output info, and preview via API
    print_header("6. Fetch Output and Preview via API GET routes")
    
    # GET status
    r = client.get(f"/api/v1/reconstruction/{session_id}")
    assert r.status_code == 200
    fetched_run = r.json()
    assert fetched_run["reconstruction_status"] == "COMPLETED"
    assert fetched_run["output_image_path"] == run_info["output_image_path"]

    # GET output info
    r = client.get(f"/api/v1/reconstruction/{session_id}/output")
    assert r.status_code == 200
    output_info = r.json()
    assert output_info["session_id"] == session_id
    assert output_info["output_image_path"] == run_info["output_image_path"]
    assert output_info["preview_image_path"] == run_info["preview_image_path"]
    assert output_info["reconstruction_method"] == "cv2.INPAINT_TELEA"
    print("GET output info route returned correct fields.")

    # GET preview image
    r = client.get(f"/api/v1/reconstruction/{session_id}/preview")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert len(r.content) > 0
    print("GET preview image route successfully served raw PNG bytes.")

    # 7. Verify Mission Control Integration
    print_header("7. Verify Mission Control Integration")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc = r.json()
    
    assert mc["status"]["reconstruction"] == "available"
    assert mc["reconstruction"] is not None
    assert mc["reconstruction"]["reconstruction_status"] == "COMPLETED"
    assert mc["reconstruction"]["reconstruction_method"] == "cv2.INPAINT_TELEA"
    assert mc["reconstruction"]["preview_image_path"] == run_info["preview_image_path"]
    print("Mission Control integration verified: status is available and details are populated.")

    # 8. Test Delete API
    print_header("8. Test Reconstruction Delete Endpoint")
    r = client.delete(f"/api/v1/reconstruction/{session_id}")
    assert r.status_code == 204
    
    # Verify in DB
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM reconstruction_runs WHERE session_id = ?", (session_id,))
    count = cursor.fetchone()[0]
    assert count == 0, "Reconstruction runs were not deleted by delete endpoint!"
    print("Delete endpoint successfully cleared reconstruction runs in database.")
    conn.close()

    # Clean up generated files from disk
    import shutil
    rec_dir = os.path.dirname(tif_abs_path)
    if os.path.exists(rec_dir):
        shutil.rmtree(rec_dir)
        print("Cleaned up generated filesystem directory.")

    print("\n==================================================")
    print(" ALL PHASE 7C RECONSTRUCTION ENGINE VERIFICATIONS PASSED!")
    print("==================================================")

except Exception as e:
    print(f"\nValidation failed with error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print("\nCleanup: Test database file deleted.")
        except Exception as e:
            print(f"\nCleanup warning: Could not remove test database file: {e}")
