import sys
import os
import sqlite3

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_6d.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 6D Cloud Segmentation Engine Verification...")
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

    # 3. Test detection, classification, shadow & segmentation on all 3 demo datasets
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

        # D. Guard clause check 1: segmentation before detection/classification should fail clearly
        print("Verifying guard clause 1: Running segmentation before any cloud steps...")
        r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print(f"Success: Guard clause 1 returned expected error: \"{r.json()['detail']}\"")

        # E. Run Cloud Detection
        print("Triggering Cloud Detection...")
        r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        det = r.json()
        print(f"Cloud Detection completed. Coverage: {det['cloud_coverage_percent']:.2f}%")

        # F. Guard clause check 2: segmentation before classification/shadow should fail
        print("Verifying guard clause 2: Running segmentation after detection but before classification...")
        r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print(f"Success: Guard clause 2 returned expected error: \"{r.json()['detail']}\"")

        # G. Run Cloud Classification
        print("Triggering Cloud Classification...")
        r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        cls_res = r.json()
        print("Cloud Classification Completed.")

        # H. Guard clause check 3: segmentation before shadow should fail
        print("Verifying guard clause 3: Running segmentation after classification but before shadow...")
        r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print(f"Success: Guard clause 3 returned expected error: \"{r.json()['detail']}\"")

        # I. Run Cloud Shadow Detection
        print("Triggering Cloud Shadow Detection...")
        r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        sh_res = r.json()
        print("Cloud Shadow Completed.")

        # J. Run Cloud Segmentation
        print("Triggering Cloud Segmentation...")
        r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        seg_res = r.json()
        print("Cloud Segmentation Response:")
        print(f" - ID: {seg_res['segmentation_id']}")
        print(f" - Status: {seg_res['segmentation_status']}")
        print(f" - Regions: {seg_res['total_segmented_regions']}")
        print(f" - Cloud Pixels: {seg_res['total_cloud_pixels']}")
        print(f" - Shadow Pixels: {seg_res['total_shadow_pixels']}")
        print(f" - Largest Region (px): {seg_res['largest_region_pixels']}")
        print(f" - Smallest Region (px): {seg_res['smallest_region_pixels']}")
        print(f" - Mean Region (px): {seg_res['mean_region_pixels']:.2f}")
        print(f" - Area %: {seg_res['total_segmented_area_percent']:.4f}%")
        print(f" - Reconstruction Ready: {seg_res['reconstruction_ready']}")
        print(f" - Region details size: {len(seg_res['region_details'])}")

        assert seg_res["segmentation_status"] == "completed"
        assert seg_res["reconstruction_ready"] is True
        assert seg_res["total_segmented_regions"] == len(seg_res["region_details"]), "Regions count mismatch with list size!"

        # Verify object priorities exist
        for obj in seg_res["region_details"]:
            assert "reconstruction_priority" in obj, "Object is missing reconstruction_priority field!"
            assert obj["reconstruction_priority"] in ("HIGH", "MEDIUM", "LOW"), f"Invalid priority: {obj['reconstruction_priority']}"

        # Save results
        dataset_results.append(seg_res)

        # K. Verify output files on disk
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        seg_tif_abs = os.path.join(workspace_root, seg_res["segmentation_mask_path"])
        rec_tif_abs = os.path.join(workspace_root, seg_res["reconstruction_mask_path"])
        png_abs = os.path.join(workspace_root, seg_res["segmentation_preview_path"])

        print(f"Verifying files on disk:\n - Seg TIFF: {seg_tif_abs}\n - Rec TIFF: {rec_tif_abs}\n - PNG: {png_abs}")
        assert os.path.exists(seg_tif_abs), "TIFF segmentation mask file does not exist!"
        assert os.path.exists(rec_tif_abs), "TIFF reconstruction mask file does not exist!"
        assert os.path.exists(png_abs), "PNG segmentation preview file does not exist!"

        # L. Query GET Cloud Segmentation record
        print("Fetching cloud segmentation record...")
        r = client.get(f"/api/v1/cloud-segmentation/{dataset_id}")
        assert r.status_code == 200
        seg_fetched = r.json()
        assert seg_fetched["segmentation_id"] == seg_res["segmentation_id"]

        # M. Stream Segmentation Preview PNG Endpoint
        print("Streaming segmentation preview PNG file...")
        r = client.get(f"/api/v1/cloud-segmentation/{dataset_id}/preview")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
        assert len(r.content) > 0

        # N. Check Mission Control AFTER cloud segmentation
        print("Verifying Mission Control status and payload enrichment...")
        r = client.get(f"/api/v1/mission-control/{dataset_id}")
        assert r.status_code == 200
        mc_profile = r.json()
        assert mc_profile["status"]["cloud"] == "available"
        assert mc_profile["cloud"] is not None
        assert mc_profile["cloud"]["classification"] is not None
        assert mc_profile["cloud"]["shadow"] is not None
        assert mc_profile["cloud"]["segmentation"] is not None
        
        seg_mc = mc_profile["cloud"]["segmentation"]
        assert seg_mc["segmentation_status"] == "completed"
        assert seg_mc["total_segmented_regions"] == seg_res["total_segmented_regions"]
        assert seg_mc["segmented_area_percent"] == seg_res["total_segmented_area_percent"]
        assert seg_mc["reconstruction_ready"] is True
        assert seg_mc["largest_region"] == seg_res["largest_region_pixels"]
        assert seg_mc["reconstruction_mask_available"] is True

        # O. Verify Caching
        print("Re-running cloud segmentation to verify caching...")
        r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
        assert r.status_code == 200
        seg_cached = r.json()
        assert seg_cached["segmentation_id"] == seg_res["segmentation_id"], "Cache miss or duplicate row created!"

        # P. Cascading Delete
        print("Performing dataset delete to test cascade behavior...")
        r = client.delete(f"/api/v1/datasets/{dataset_id}")
        assert r.status_code == 204

        # Check DB to confirm table rows were deleted
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cloud_segmentations WHERE dataset_id = ?", (dataset_id,))
        count_seg = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_shadows WHERE dataset_id = ?", (dataset_id,))
        count_sh = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_classifications WHERE dataset_id = ?", (dataset_id,))
        count_cls = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_detections WHERE dataset_id = ?", (dataset_id,))
        count_det = cursor.fetchone()[0]
        conn.close()
        
        print(f"Remaining DB rows: cloud_segmentations={count_seg}, cloud_shadows={count_sh}, cloud_classifications={count_cls}, cloud_detections={count_det}")
        assert count_seg == 0, "Cloud segmentation DB row was not deleted cascade-wise!"
        assert count_sh == 0, "Cloud shadow DB row was not deleted cascade-wise!"
        assert count_cls == 0, "Cloud classification DB row was not deleted cascade-wise!"
        assert count_det == 0, "Cloud detection DB row was not deleted cascade-wise!"

        # Check disk to confirm files were purged
        seg_dir = os.path.dirname(seg_tif_abs)
        shadow_dir = os.path.join(workspace_root, "datasets", "cloud_shadows", dataset_id)
        class_dir = os.path.join(workspace_root, "datasets", "cloud_classifications", dataset_id)
        det_dir = os.path.join(workspace_root, "datasets", "cloud_detections", dataset_id)
        print(f"Checking disk purge:\n - Seg: {seg_dir}\n - Shadow: {shadow_dir}\n - Class: {class_dir}\n - Det: {det_dir}")
        assert not os.path.exists(seg_dir), "Cloud segmentation outputs directory not purged!"
        assert not os.path.exists(shadow_dir), "Cloud shadow outputs directory not purged!"
        assert not os.path.exists(class_dir), "Cloud classification outputs directory not purged!"
        assert not os.path.exists(det_dir), "Cloud detection outputs directory not purged!"
        
        print(f"Dataset {idx} successfully verified and purged.")

    print("\n==================================================")
    print(" ALL PHASE 6D CLOUD SEGMENTATION ENGINE VERIFICATIONS PASSED!")
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
