import sys
import os
import sqlite3

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_6c.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 6C Cloud Shadow Detection Engine Verification...")
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

    # Track results
    dataset_results = []

    # 3. Test detection, classification & shadow detection on all 3 demo datasets
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

        # D. Guard clause check: shadow detection before classification should fail clearly
        print("Verifying guard clause: Running shadow detection before classification...")
        r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print(f"Success: Guard clause returned expected error: \"{r.json()['detail']}\"")

        # E. Run Cloud Detection
        print("Triggering Cloud Detection...")
        r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        det = r.json()
        print(f"Cloud Detection completed. Coverage: {det['cloud_coverage_percent']:.2f}%, regions: {det['candidate_region_count']}")

        # F. Guard clause check 2: shadow detection before classification (but after detection) should still fail
        print("Verifying guard clause 2: Running shadow detection after detection but before classification...")
        r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print(f"Success: Guard clause 2 returned expected error: \"{r.json()['detail']}\"")

        # G. Run Cloud Classification
        print("Triggering Cloud Classification...")
        r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        cls_res = r.json()
        print("Cloud Classification Completed.")

        # H. Run Cloud Shadow Detection
        print("Triggering Cloud Shadow Detection...")
        r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        sh_res = r.json()
        print("Cloud Shadow Response:")
        print(f" - ID: {sh_res['shadow_id']}")
        print(f" - Status: {sh_res['shadow_detection_status']}")
        print(f" - Solar Geometry Used: {sh_res['solar_geometry_available']}")
        print(f" - Shadow Regions: {sh_res['shadow_region_count']}")
        print(f" - Total Shadow Area Percent: {sh_res['total_shadow_area_percent']:.4f}%")
        print(f" - Linked Shadow Regions: {sh_res['linked_shadow_region_count']}")
        print(f" - Unlinked Shadow Regions: {sh_res['unlinked_shadow_region_count']}")
        print(f" - Mean Shadow-to-Cloud Area Ratio: {sh_res['mean_shadow_to_cloud_area_ratio']}")
        print(f" - Method: {sh_res['detection_method']}")
        print(f" - Region details size: {len(sh_res['region_details'])}")

        assert sh_res["shadow_detection_status"] == "completed"
        assert sh_res["solar_geometry_available"] is True
        
        region_sum = sh_res["linked_shadow_region_count"] + sh_res["unlinked_shadow_region_count"]
        assert region_sum == len(sh_res["region_details"]), "Linked + Unlinked mismatch with region details list size!"

        # Save results
        dataset_results.append(sh_res)

        # I. Verify output files on disk
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        tif_abs_path = os.path.join(workspace_root, sh_res["shadow_mask_path"])
        png_abs_path = os.path.join(workspace_root, sh_res["shadow_preview_path"])

        print(f"Verifying files on disk:\n - TIFF: {tif_abs_path}\n - PNG: {png_abs_path}")
        assert os.path.exists(tif_abs_path), "TIFF shadow mask file does not exist!"
        assert os.path.exists(png_abs_path), "PNG shadow preview file does not exist!"

        # J. Query GET Cloud Shadow record
        print("Fetching cloud shadow record...")
        r = client.get(f"/api/v1/cloud-shadow/{dataset_id}")
        assert r.status_code == 200
        sh_fetched = r.json()
        assert sh_fetched["shadow_id"] == sh_res["shadow_id"]

        # K. Stream Shadow Preview PNG Endpoint
        print("Streaming shadow preview PNG file...")
        r = client.get(f"/api/v1/cloud-shadow/{dataset_id}/preview")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
        assert len(r.content) > 0

        # L. Check Mission Control AFTER shadow detection
        print("Verifying Mission Control status and payload enrichment...")
        r = client.get(f"/api/v1/mission-control/{dataset_id}")
        assert r.status_code == 200
        mc_profile = r.json()
        assert mc_profile["status"]["cloud"] == "available"
        assert mc_profile["cloud"] is not None
        assert mc_profile["cloud"]["classification"] is not None
        assert mc_profile["cloud"]["shadow"] is not None
        assert mc_profile["cloud"]["shadow"]["shadow_id"] == sh_res["shadow_id"]
        assert mc_profile["cloud"]["shadow"]["shadow_region_count"] == sh_res["shadow_region_count"]

        # M. Verify Cache hit
        print("Re-running shadow detection to verify caching...")
        r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
        assert r.status_code == 200
        sh_cached = r.json()
        assert sh_cached["shadow_id"] == sh_res["shadow_id"], "Cache miss or duplicate row created!"

        # N. Cascading Delete
        print("Performing dataset delete to test cascade behavior...")
        r = client.delete(f"/api/v1/datasets/{dataset_id}")
        assert r.status_code == 204

        # Check DB to confirm table rows were deleted
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cloud_shadows WHERE dataset_id = ?", (dataset_id,))
        count_sh = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_classifications WHERE dataset_id = ?", (dataset_id,))
        count_cls = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_detections WHERE dataset_id = ?", (dataset_id,))
        count_det = cursor.fetchone()[0]
        conn.close()
        
        print(f"Remaining DB rows: cloud_shadows={count_sh}, cloud_classifications={count_cls}, cloud_detections={count_det}")
        assert count_sh == 0, "Cloud shadow DB row was not deleted cascade-wise!"
        assert count_cls == 0, "Cloud classification DB row was not deleted cascade-wise!"
        assert count_det == 0, "Cloud detection DB row was not deleted cascade-wise!"

        # Check disk to confirm files were purged
        shadow_dir = os.path.dirname(tif_abs_path)
        class_dir = os.path.join(workspace_root, "datasets", "cloud_classifications", dataset_id)
        det_dir = os.path.join(workspace_root, "datasets", "cloud_detections", dataset_id)
        print(f"Checking disk purge at:\n - Shadow: {shadow_dir}\n - Class: {class_dir}\n - Det: {det_dir}")
        assert not os.path.exists(shadow_dir), "Cloud shadow outputs directory not purged!"
        assert not os.path.exists(class_dir), "Cloud classification outputs directory not purged!"
        assert not os.path.exists(det_dir), "Cloud detection outputs directory not purged!"
        
        print(f"Dataset {idx} successfully verified and purged.")

    print("\n==================================================")
    print(" ALL PHASE 6C CLOUD SHADOW DETECTION ENGINE VERIFICATIONS PASSED!")
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
