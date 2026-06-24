import sys
import os
import sqlite3
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_6e.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 6E Cloud Analytics Engine Verification...")
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

    # 3. Test steps on all 3 demo datasets
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

        # D. Guard clause check 1: analytics before detection/classification/shadow/segmentation should fail clearly
        print("Verifying guard clause: Running analytics before detection/classification/shadow/segmentation...")
        r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print(f"Success: Guard clause returned expected error: \"{r.json()['detail']}\"")

        # E. Run Cloud Detection
        print("Triggering Cloud Detection...")
        r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        det = r.json()
        print(f"Cloud Detection completed. Coverage: {det['cloud_coverage_percent']:.2f}%")

        # Guard clause check 2: after detection but before classification/shadow/segmentation
        r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

        # F. Run Cloud Classification
        print("Triggering Cloud Classification...")
        r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        cls_res = r.json()
        print("Cloud Classification Completed.")

        # Guard clause check 3: after classification but before shadow/segmentation
        r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

        # G. Run Cloud Shadow Detection
        print("Triggering Cloud Shadow Detection...")
        r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        sh_res = r.json()
        print("Cloud Shadow Completed.")

        # Guard clause check 4: after shadow but before segmentation
        r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

        # H. Run Cloud Segmentation
        print("Triggering Cloud Segmentation...")
        r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        seg_res = r.json()
        print(f"Cloud Segmentation Completed. Target Area: {seg_res['total_segmented_area_percent']:.2f}%")

        # I. Run Cloud Analytics
        print("Triggering Cloud Analytics...")
        r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        analytics_res = r.json()
        
        print("Cloud Analytics Response:")
        print(f" - ID: {analytics_res['analytics_id']}")
        print(f" - Status: {analytics_res['analytics_status']}")
        print(f" - Complexity Score: {analytics_res['scene_cloud_complexity_score']:.2f}")
        print(f" - Difficulty: {analytics_res['scene_reconstruction_difficulty']}")
        print(f" - Burden Index: {analytics_res['cloud_burden_index']:.2f}")
        print(f" - Cloud Intelligence Score: {analytics_res['cloud_intelligence_score']:.2f}")
        print(f" - Reconstruction Readiness: {analytics_res['reconstruction_readiness']}")
        print(f" - High Priority Objects: {analytics_res['high_priority_objects']}")
        print(f" - Medium Priority Objects: {analytics_res['medium_priority_objects']}")
        print(f" - Low Priority Objects: {analytics_res['low_priority_objects']}")

        assert analytics_res["analytics_status"] == "completed"
        assert analytics_res["reconstruction_readiness"] is True
        assert analytics_res["scene_reconstruction_difficulty"] in ("LOW", "MEDIUM", "HIGH", "EXTREME")
        assert 0.0 <= analytics_res["scene_cloud_complexity_score"] <= 100.0
        assert 0.0 <= analytics_res["cloud_burden_index"] <= 100.0
        assert 0.0 <= analytics_res["cloud_intelligence_score"] <= 100.0

        # Save results
        dataset_results.append(analytics_res)

        # J. Verify output files on disk
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        analytics_dir = os.path.join(workspace_root, "datasets", "cloud_analytics", dataset_id)
        summary_path = os.path.join(analytics_dir, "analytics_summary.json")
        recs_path = os.path.join(analytics_dir, "mission_recommendations.json")
        report_path = os.path.join(analytics_dir, "analytics_report.json")

        print(f"Verifying files on disk:\n - Summary: {summary_path}\n - Recommendations: {recs_path}\n - Report: {report_path}")
        assert os.path.exists(summary_path), "analytics_summary.json file does not exist!"
        assert os.path.exists(recs_path), "mission_recommendations.json file does not exist!"
        assert os.path.exists(report_path), "analytics_report.json file does not exist!"

        # Read files and verify valid JSON structure
        with open(summary_path, "r", encoding="utf-8") as f:
            summary_data = json.load(f)
            assert "coverage_metrics" in summary_data
            assert "difficulty_metrics" in summary_data
            assert "priority_metrics" in summary_data
            assert "cloud_composition" in summary_data
            assert "shadow_composition" in summary_data
            assert "recommendations" in summary_data

        with open(recs_path, "r", encoding="utf-8") as f:
            recs_data = json.load(f)
            assert "recommendations" in recs_data
            assert isinstance(recs_data["recommendations"], list)

        with open(report_path, "r", encoding="utf-8") as f:
            report_data = json.load(f)
            assert report_data["dataset_id"] == dataset_id
            assert report_data["reconstruction_readiness"] is True
            assert "summary" in report_data

        # K. Query GET Cloud Analytics record
        print("Fetching cloud analytics record...")
        r = client.get(f"/api/v1/cloud-analytics/{dataset_id}")
        assert r.status_code == 200
        analytics_fetched = r.json()
        assert analytics_fetched["analytics_id"] == analytics_res["analytics_id"]

        # L. Check Mission Control AFTER cloud analytics
        print("Verifying Mission Control status and payload enrichment...")
        r = client.get(f"/api/v1/mission-control/{dataset_id}")
        assert r.status_code == 200
        mc_profile = r.json()
        assert mc_profile["status"]["cloud"] == "available"
        assert mc_profile["cloud"] is not None
        assert mc_profile["cloud"]["analytics"] is not None
        
        analytics_mc = mc_profile["cloud"]["analytics"]
        assert analytics_mc["analytics_status"] == "completed"
        assert analytics_mc["complexity_score"] == analytics_res["scene_cloud_complexity_score"]
        assert analytics_mc["difficulty"] == analytics_res["scene_reconstruction_difficulty"]
        assert analytics_mc["burden_index"] == analytics_res["cloud_burden_index"]
        assert analytics_mc["reconstruction_readiness"] is True

        # M. Verify Caching
        print("Re-running cloud analytics to verify caching...")
        r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
        assert r.status_code == 200
        analytics_cached = r.json()
        assert analytics_cached["analytics_id"] == analytics_res["analytics_id"], "Cache miss or duplicate row created!"

        # N. Cascading Delete
        print("Performing dataset delete to test cascade behavior...")
        r = client.delete(f"/api/v1/datasets/{dataset_id}")
        assert r.status_code == 204

        # Check DB to confirm table rows were deleted
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cloud_analytics WHERE dataset_id = ?", (dataset_id,))
        count_analytics = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_segmentations WHERE dataset_id = ?", (dataset_id,))
        count_seg = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_shadows WHERE dataset_id = ?", (dataset_id,))
        count_sh = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_classifications WHERE dataset_id = ?", (dataset_id,))
        count_cls = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cloud_detections WHERE dataset_id = ?", (dataset_id,))
        count_det = cursor.fetchone()[0]
        conn.close()
        
        print(f"Remaining DB rows: cloud_analytics={count_analytics}, cloud_segmentations={count_seg}, cloud_shadows={count_sh}, cloud_classifications={count_cls}, cloud_detections={count_det}")
        assert count_analytics == 0, "Cloud analytics DB row was not deleted cascade-wise!"
        assert count_seg == 0, "Cloud segmentation DB row was not deleted cascade-wise!"
        assert count_sh == 0, "Cloud shadow DB row was not deleted cascade-wise!"
        assert count_cls == 0, "Cloud classification DB row was not deleted cascade-wise!"
        assert count_det == 0, "Cloud detection DB row was not deleted cascade-wise!"

        # Check disk to confirm files were purged
        assert not os.path.exists(analytics_dir), "Cloud analytics outputs directory not purged!"
        print(f"Dataset {idx} successfully verified and purged.")

    print("\n==================================================")
    print(" ALL PHASE 6E CLOUD ANALYTICS ENGINE VERIFICATIONS PASSED!")
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
