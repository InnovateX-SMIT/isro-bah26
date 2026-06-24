import sys
import os
import sqlite3

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_6a.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 6A Cloud Detection Engine Verification...")
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
    print(f"Discovered {len(demo_datasets)} demo datasets:")
    for ds in demo_datasets:
        print(f" - {ds['dataset_name']}")
    assert len(demo_datasets) == 3, f"Expected 3 demo datasets, found {len(demo_datasets)}"

    # 3. Test detection on all 3 demo datasets
    for idx, target_ds in enumerate(demo_datasets, 1):
        print_header(f"Testing Dataset {idx}/3: {target_ds['dataset_name']}")
        
        # A. Register dataset
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
        print(f"Registered with ID: {dataset_id}")

        # B. Run Dataset Inspection
        print("Running dataset inspection...")
        r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # C. Run Metadata Extraction
        print("Running metadata extraction...")
        r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"

        # D. Check Mission Control BEFORE cloud detection
        print("Verifying Mission Control status is 'not_run' for cloud...")
        r = client.get(f"/api/v1/mission-control/{dataset_id}")
        assert r.status_code == 200
        mc_profile = r.json()
        assert mc_profile["status"]["cloud"] == "not_run"
        assert mc_profile["cloud"] is None

        # E. Run Cloud Detection
        print("Triggering Cloud Detection...")
        r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        det = r.json()
        print("Cloud Detection Response:")
        print(f" - ID: {det['detection_id']}")
        print(f" - Status: {det['detection_status']}")
        print(f" - Cloud Coverage: {det['cloud_coverage_percent']:.2f}%")
        print(f" - Mean Cloud Probability: {det['mean_cloud_probability']:.4f}")
        print(f" - Candidate Regions: {det['candidate_region_count']}")
        print(f" - Method: {det['detection_method']}")
        
        assert det["detection_status"] == "completed"
        assert 0.0 <= det["cloud_coverage_percent"] <= 100.0
        assert 0.0 <= det["mean_cloud_probability"] <= 1.0
        assert det["candidate_region_count"] >= 0
        assert det["probability_map_path"] is not None

        # F. Verify files exist on disk
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        tif_abs_path = os.path.join(workspace_root, det["probability_map_path"])
        png_abs_path = tif_abs_path.replace(".tif", ".png")

        print(f"Verifying files on disk:\n - TIFF: {tif_abs_path}\n - PNG: {png_abs_path}")
        assert os.path.exists(tif_abs_path), "TIFF probability map file does not exist!"
        assert os.path.exists(png_abs_path), "PNG probability map file does not exist!"

        # G. Query GET Cloud Detection record
        print("Fetching cloud detection record...")
        r = client.get(f"/api/v1/cloud-detection/{dataset_id}")
        assert r.status_code == 200
        det_fetched = r.json()
        assert det_fetched["detection_id"] == det["detection_id"]

        # H. Get Probability Map Image Endpoint
        print("Streaming probability map PNG file...")
        r = client.get(f"/api/v1/cloud-detection/{dataset_id}/probability-map")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
        assert len(r.content) > 0

        # I. Check Mission Control AFTER cloud detection
        print("Verifying Mission Control status is 'available' for cloud...")
        r = client.get(f"/api/v1/mission-control/{dataset_id}")
        assert r.status_code == 200
        mc_profile = r.json()
        assert mc_profile["status"]["cloud"] == "available"
        assert mc_profile["cloud"] is not None
        assert mc_profile["cloud"]["cloud_coverage_percent"] == det["cloud_coverage_percent"]

        # J. Verify lazy-generate-then-cache (duplicate call should yield same ID)
        print("Re-running detection to verify caching...")
        r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
        assert r.status_code == 200
        det_cached = r.json()
        assert det_cached["detection_id"] == det["detection_id"], "Cache miss or duplicate row created!"

        # K. Cascading Delete
        print("Performing dataset delete to test cascade behavior...")
        r = client.delete(f"/api/v1/datasets/{dataset_id}")
        assert r.status_code == 204

        # Check DB to confirm table row was deleted
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cloud_detections WHERE dataset_id = ?", (dataset_id,))
        count = cursor.fetchone()[0]
        conn.close()
        print(f"Rows remaining in cloud_detections for dataset {dataset_id}: {count}")
        assert count == 0, "Cloud detection database row was not deleted cascade-wise!"

        # Check disk to confirm files were purged
        det_dir = os.path.dirname(tif_abs_path)
        print(f"Checking disk purge at: {det_dir}")
        assert not os.path.exists(det_dir), "Cloud detection outputs directory was not purged on delete!"
        print(f"Dataset {idx} successfully verified and purged.")

    print("\n==================================================")
    print(" ALL PHASE 6A CLOUD DETECTION ENGINE VERIFICATIONS PASSED!")
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
