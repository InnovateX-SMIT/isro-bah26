import sys
import os
import sqlite3

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_6b.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 6B Cloud Classification Engine Verification...")
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

    # Track classification results for variation check
    dataset_results = []

    # 3. Test detection & classification on all 3 demo datasets
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

        # D. Guard clause check: classification before detection should fail clearly
        print("Verifying guard clause: Running classification before detection...")
        r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print(f"Success: Guard clause returned expected error: \"{r.json()['detail']}\"")

        # E. Run Cloud Detection
        print("Triggering Cloud Detection...")
        r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        det = r.json()
        print(f"Cloud Detection completed. Coverage: {det['cloud_coverage_percent']:.2f}%, regions: {det['candidate_region_count']}")

        # F. Run Cloud Classification
        print("Triggering Cloud Classification...")
        r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        cls_res = r.json()
        print("Cloud Classification Response:")
        print(f" - ID: {cls_res['classification_id']}")
        print(f" - Status: {cls_res['classification_status']}")
        print(f" - Thick Regions: {cls_res['thick_cloud_region_count']} ({cls_res['thick_cloud_area_percent']:.1f}%)")
        print(f" - Thin Regions: {cls_res['thin_cloud_region_count']} ({cls_res['thin_cloud_area_percent']:.1f}%)")
        print(f" - Cirrus Regions: {cls_res['cirrus_cloud_region_count']} ({cls_res['cirrus_cloud_area_percent']:.1f}%)")
        print(f" - Uncertain Regions: {cls_res['uncertain_region_count']} ({cls_res['uncertain_area_percent']:.1f}%)")
        print(f" - Method: {cls_res['classification_method']}")
        print(f" - Region Count details list size: {len(cls_res['region_details'])}")

        assert cls_res["classification_status"] == "completed"
        # Region counts must match sum of all regions returned
        region_sum = (cls_res["thick_cloud_region_count"] + 
                      cls_res["thin_cloud_region_count"] + 
                      cls_res["cirrus_cloud_region_count"] + 
                      cls_res["uncertain_region_count"])
        print(f" - Combined regions sum: {region_sum}")
        assert region_sum == len(cls_res["region_details"]), "Region sum mismatch with region details list"

        # Percentage sum check (if total regions > 0, sum must be ~100)
        if region_sum > 0:
            percent_sum = (cls_res["thick_cloud_area_percent"] + 
                           cls_res["thin_cloud_area_percent"] + 
                           cls_res["cirrus_cloud_area_percent"] + 
                           cls_res["uncertain_area_percent"])
            assert abs(percent_sum - 100.0) < 0.01, f"Percentages should sum to 100%, got {percent_sum}%"

        # Save results for variation check
        dataset_results.append(cls_res)

        # G. Verify output files on disk
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        tif_abs_path = os.path.join(workspace_root, cls_res["classification_map_path"])
        png_abs_path = os.path.join(workspace_root, cls_res["classification_preview_path"])

        print(f"Verifying files on disk:\n - TIFF: {tif_abs_path}\n - PNG: {png_abs_path}")
        assert os.path.exists(tif_abs_path), "TIFF classification map file does not exist!"
        assert os.path.exists(png_abs_path), "PNG classification preview file does not exist!"

        # H. Query GET Cloud Classification record
        print("Fetching cloud classification record...")
        r = client.get(f"/api/v1/cloud-classification/{dataset_id}")
        assert r.status_code == 200
        cls_fetched = r.json()
        assert cls_fetched["classification_id"] == cls_res["classification_id"]

        # I. Get Classification Preview Image Endpoint
        print("Streaming classification preview PNG file...")
        r = client.get(f"/api/v1/cloud-classification/{dataset_id}/preview")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
        assert len(r.content) > 0

        # J. Check Mission Control AFTER cloud classification
        print("Verifying Mission Control status and payload enrichment...")
        r = client.get(f"/api/v1/mission-control/{dataset_id}")
        assert r.status_code == 200
        mc_profile = r.json()
        assert mc_profile["status"]["cloud"] == "available"
        assert mc_profile["cloud"] is not None
        assert mc_profile["cloud"]["classification"] is not None
        assert mc_profile["cloud"]["classification"]["classification_id"] == cls_res["classification_id"]
        assert mc_profile["cloud"]["classification"]["thick_cloud_region_count"] == cls_res["thick_cloud_region_count"]

        # K. Verify lazy-generate-then-cache
        print("Re-running classification to verify caching...")
        r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
        assert r.status_code == 200
        cls_cached = r.json()
        assert cls_cached["classification_id"] == cls_res["classification_id"], "Cache miss or duplicate row created!"

        # L. Cascading Delete
        print("Performing dataset delete to test cascade behavior...")
        r = client.delete(f"/api/v1/datasets/{dataset_id}")
        assert r.status_code == 204

        # Check DB to confirm table rows were deleted
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cloud_classifications WHERE dataset_id = ?", (dataset_id,))
        count_cls = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_detections WHERE dataset_id = ?", (dataset_id,))
        count_det = cursor.fetchone()[0]
        conn.close()
        print(f"Remaining DB rows: cloud_classifications={count_cls}, cloud_detections={count_det}")
        assert count_cls == 0, "Cloud classification DB row was not deleted cascade-wise!"
        assert count_det == 0, "Cloud detection DB row was not deleted cascade-wise!"

        # Check disk to confirm files were purged
        class_dir = os.path.dirname(tif_abs_path)
        det_dir = os.path.join(workspace_root, "datasets", "cloud_detections", dataset_id)
        print(f"Checking disk purge at:\n - Class: {class_dir}\n - Det: {det_dir}")
        assert not os.path.exists(class_dir), "Cloud classification outputs directory not purged!"
        assert not os.path.exists(det_dir), "Cloud detection outputs directory not purged!"
        print(f"Dataset {idx} successfully verified and purged.")

    # 4. Verify class variation across datasets
    print_header("4. Check Heuristic Classification Variation")
    has_variation = False
    thick_percentages = [d["thick_cloud_area_percent"] for d in dataset_results if d["thick_cloud_region_count"] is not None]
    print(f"Thick Cloud area percentages across datasets: {thick_percentages}")
    
    # If they are not all exactly the same value, we have verified that thresholds yield variation
    if len(set(thick_percentages)) > 1:
        has_variation = True
        print("Success: Verified that classification thresholds yield variation across datasets.")
    else:
        # Check by counts
        thick_counts = [d["thick_cloud_region_count"] for d in dataset_results]
        print(f"Thick Cloud region counts across datasets: {thick_counts}")
        if len(set(thick_counts)) > 1:
            has_variation = True
            print("Success: Verified that classification thresholds yield variation by region counts.")
        else:
            print("Warning: All datasets generated identical classification summary counts.")

    assert has_variation, "No variation in classification results detected across different datasets!"

    print("\n==================================================")
    print(" ALL PHASE 6B CLOUD CLASSIFICATION ENGINE VERIFICATIONS PASSED!")
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
