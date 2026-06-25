import sys
import os
import shutil
import json
import sqlite3
import rasterio
from PIL import Image

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_8c_8d.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.models.reliability_score import ReliabilityScore
from app.models.confidence_heatmap import ConfidenceHeatmap
from app.models.confidence_analytics import ConfidenceAnalytics
from app.repositories.reconstruction_repository import ReconstructionRepository

print("Starting Combined Phase 8C & 8D Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Setup prerequisite state using July demo dataset (Phases 1-8B)
    print_header("1. Setup Prerequisite Pipeline (Phases 1-8B) using July Dataset")
    
    # Create Analysis Session
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session_id = r.json()["session_id"]
    print(f"Session created: {session_id}")

    # Discover demo datasets and find a July one
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200
    demo_datasets = r.json()
    assert len(demo_datasets) > 0
    
    target_ds = None
    for ds in demo_datasets:
        if "JUL" in ds["dataset_name"].upper():
            target_ds = ds
            break
            
    if target_ds is None:
        target_ds = demo_datasets[0]
        
    print(f"Selected demo dataset: {target_ds['dataset_name']}")

    # Register dataset
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

    # Run execution pipeline
    print("Running Inspection...")
    client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    print("Running Metadata...")
    client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    client.get(f"/api/v1/geospatial/{dataset_id}/context")
    client.get(f"/api/v1/location/{dataset_id}/context")
    client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    
    print("Running Temporal Stack...")
    client.post(f"/api/v1/temporal/discover/{session_id}", json={"temporal_window_days": 30})
    client.post(f"/api/v1/temporal/select/{session_id}", json={"num_references": 3})
    client.post(f"/api/v1/temporal/context/{session_id}")
    
    print("Running Cloud Layers...")
    client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
    client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
    client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
    client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
    client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")

    print("Running Reconstruction & Optimization...")
    client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "TELEA"})
    client.post(f"/api/v1/reconstruction/optimize/{session_id}")
    client.post(f"/api/v1/reconstruction/evaluate/{session_id}")

    db = SessionLocal()
    recon_repo = ReconstructionRepository(db)
    run_rec = recon_repo.get_by_dataset(dataset_id)
    assert run_rec is not None
    recon_run_id = run_rec.id

    # Run Phase 8A
    print("Running Phase 8A Confidence Estimation...")
    r = client.post(f"/api/v1/confidence/run/{recon_run_id}")
    assert r.status_code == 200
    confidence_id = r.json()["confidence_id"]
    print(f"Confidence Estimation completed. ID: {confidence_id}")

    # Run Phase 8B
    print("Running Phase 8B Reliability Scoring...")
    r = client.post(f"/api/v1/reliability/run/{confidence_id}")
    assert r.status_code == 200
    reliability_id = r.json()["reliability_id"]
    print(f"Reliability Scoring completed. ID: {reliability_id}")

    # 2. Run Phase 8C Confidence Heatmaps
    print_header("2. Run Phase 8C Confidence Heatmaps")
    r = client.post(f"/api/v1/confidence-heatmap/run/{reliability_id}")
    assert r.status_code == 200
    heatmap_data = r.json()
    heatmap_id = heatmap_data["heatmap_id"]
    print(f"Confidence Heatmap record created. ID: {heatmap_id}")
    print(f"Confidence Overlay Path: {heatmap_data['confidence_overlay_path']}")
    print(f"Reliability Map Path: {heatmap_data['reliability_map_path']}")
    assert heatmap_data["heatmap_status"] == "completed"

    # Verify Lazy Cache
    print("Verifying Lazy-Cache (No Duplication) for Heatmaps...")
    r = client.post(f"/api/v1/confidence-heatmap/run/{reliability_id}")
    assert r.status_code == 200
    assert r.json()["heatmap_id"] == heatmap_id
    print("Lazy-cache verified successfully.")

    # Verify Visual outputs on disk
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    overlay_abs = os.path.join(workspace_root, heatmap_data["confidence_overlay_path"])
    rel_map_abs = os.path.join(workspace_root, heatmap_data["reliability_map_path"])
    
    assert os.path.exists(overlay_abs), f"Confidence overlay PNG not found: {overlay_abs}"
    assert os.path.exists(rel_map_abs), f"Reliability map PNG not found: {rel_map_abs}"
    assert os.path.getsize(overlay_abs) > 0, "Confidence overlay PNG is empty"
    assert os.path.getsize(rel_map_abs) > 0, "Reliability map PNG is empty"

    # Verify pixel dimensions match the original reconstruction mask
    from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
    seg_repo = CloudSegmentationRepository(db)
    seg_rec = seg_repo.get_by_dataset(dataset_id)
    assert seg_rec is not None and seg_rec.reconstruction_mask_path is not None
    
    mask_abs_path = os.path.join(workspace_root, seg_rec.reconstruction_mask_path)
    with rasterio.open(mask_abs_path) as src:
        expected_width = src.width
        expected_height = src.height

    with Image.open(overlay_abs) as img:
        w_overlay, h_overlay = img.size
    with Image.open(rel_map_abs) as img:
        w_rel, h_rel = img.size

    print(f"Expected Dimensions: {expected_width}x{expected_height}")
    print(f"Confidence Overlay Dimensions: {w_overlay}x{h_overlay}")
    print(f"Reliability Map Dimensions: {w_rel}x{h_rel}")
    assert w_overlay == expected_width and h_overlay == expected_height
    assert w_rel == expected_width and h_rel == expected_height

    # Verify legend contains required mapping structure
    assert heatmap_data["legend"] is not None
    assert "confidence_heatmap" in heatmap_data["legend"]
    assert "reliability_map" in heatmap_data["legend"]
    assert "High" in heatmap_data["legend"]["reliability_map"]["tiers"]
    print("Legend JSON structures verified successfully.")

    # 3. Run Phase 8D Confidence Analytics
    print_header("3. Run Phase 8D Confidence Analytics")
    r = client.post(f"/api/v1/confidence-analytics/run/{heatmap_id}")
    assert r.status_code == 200
    analytics_data = r.json()
    analytics_id = analytics_data["analytics_id"]
    print(f"Confidence Analytics record created. ID: {analytics_id}")
    print(f"Headline Summary: {analytics_data['headline_summary']}")
    assert analytics_data["analytics_status"] == "completed"
    
    # Assert headline contains the tier
    tier_string = db.query(ReliabilityScore).filter_by(reliability_id=reliability_id).first().dataset_reliability_tier
    assert tier_string in analytics_data["headline_summary"]
    print(f"Headline Summary validation passed. Contains tier '{tier_string}'.")

    # Verify Lazy Cache
    print("Verifying Lazy-Cache (No Duplication) for Analytics...")
    r = client.post(f"/api/v1/confidence-analytics/run/{heatmap_id}")
    assert r.status_code == 200
    assert r.json()["analytics_id"] == analytics_id
    print("Lazy-cache verified successfully.")

    # Verify reports on disk
    report_abs = os.path.join(workspace_root, analytics_data["confidence_report_path"])
    summary_abs = os.path.join(workspace_root, analytics_data["confidence_summary_path"])
    scorecard_abs = os.path.join(workspace_root, analytics_data["reliability_scorecard_path"])

    assert os.path.exists(report_abs), f"Report JSON not found: {report_abs}"
    assert os.path.exists(summary_abs), f"Summary JSON not found: {summary_abs}"
    assert os.path.exists(scorecard_abs), f"Scorecard JSON not found: {scorecard_abs}"

    # Verify valid JSON structures
    with open(report_abs, "r") as f:
        rep = json.load(f)
        assert "confidence" in rep and "reliability" in rep and "heatmap" in rep
    with open(summary_abs, "r") as f:
        sum_rep = json.load(f)
        assert sum_rep["dataset_reliability_tier"] == tier_string
        assert "region_tier_counts" in sum_rep
    with open(scorecard_abs, "r") as f:
        card = json.load(f)
        assert "grades" in card and "overall_grade" in card
    print("All report files exist and are syntactically valid JSON.")

    # 4. Verify API File Streaming
    print_header("4. Verify API File Streaming Endpoints")
    # GET confidence overlay image
    r = client.get(f"/api/v1/confidence-heatmap/{reliability_id}/overlay")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    print("Confidence Overlay API stream success.")

    # GET reliability map image
    r = client.get(f"/api/v1/confidence-heatmap/{reliability_id}/reliability-map")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    print("Reliability Map API stream success.")

    # GET full analytics JSON report file
    r = client.get(f"/api/v1/confidence-analytics/{heatmap_id}/report")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/json"
    print("Full report JSON API stream success.")

    # 5. Verify Mission Control Integration
    print_header("5. Verify Mission Control Integration")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc = r.json()
    assert mc["status"]["confidence_heatmap"] == "available"
    assert mc["status"]["confidence_analytics"] == "available"
    assert mc["confidence_heatmap"] is not None
    assert mc["confidence_heatmap"]["confidence_overlay_path"] == heatmap_data["confidence_overlay_path"]
    assert mc["confidence_analytics"] is not None
    assert mc["confidence_analytics"]["headline_summary"] == analytics_data["headline_summary"]
    
    # Assert operational briefing contains the headline summary
    assert analytics_data["headline_summary"] in mc["summary"]
    print("Mission Control Response integration verified successfully.")

    # 6. Verify Cascade Delete Behavior
    print_header("6. Verify Cascade Delete Behavior")
    # Deleting the grandparent ReliabilityScore in the database
    db_rel = db.query(ReliabilityScore).filter_by(reliability_id=reliability_id).first()
    assert db_rel is not None
    db.delete(db_rel)
    db.commit()
    print("Parent ReliabilityScore record deleted from database.")

    # Assert downstream rows in confidence_heatmaps and confidence_analytics are cascade deleted
    assert db.query(ConfidenceHeatmap).filter_by(heatmap_id=heatmap_id).first() is None
    assert db.query(ConfidenceAnalytics).filter_by(analytics_id=analytics_id).first() is None
    print("Grandparent/Parent cascade delete verified successfully.")

    # Clean up files from disk
    shutil.rmtree(os.path.join(workspace_root, f"datasets/confidence_analytics/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/confidence_heatmaps/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/confidence_estimations/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/reconstruction_evaluations/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_segmentations/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_shadows/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_classifications/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_detections/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/inspections/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/previews/{dataset_id}"), ignore_errors=True)
    print("Cleanup: Stored files deleted from disk.")

    print("\n==================================================")
    print(" ALL COMBINED PHASE 8C & 8D VERIFICATIONS PASSED!")
    print("==================================================")

except Exception as e:
    print(f"\nVerification failed with error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    db.close()
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print("\nCleanup: Test database file deleted.")
        except Exception as e:
            print(f"\nCleanup warning: Could not remove test database file: {e}")
