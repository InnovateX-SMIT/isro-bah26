import sys
import os
import sqlite3
import json
import shutil
import time
import numpy as np
import rasterio

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_12g.db"))
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except Exception:
        pass

os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 12G Quality Assessment & Confidence Intelligence Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" TEST: {title}")
    print(f"==================================================")

try:
    # ----------------------------------------------------
    # Step 1: Initialize workflow session
    # ----------------------------------------------------
    print_header("1. Trigger Complete Workflow Run")
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
    
    # Run full orchestrated pipeline
    run_payload = {
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"],
        "temporal_window_days": 30,
        "num_references": 3,
        "reconstruction_strategy": "DEFAULT"
    }
    
    r = client.post(f"/api/v1/workflow/run/{session_id}", json=run_payload)
    assert r.status_code == 200, f"Workflow failed: {r.text}"
    run_result = r.json()
    assert run_result["status"] == "completed"
    print("Orchestrated workflow completed successfully.")
    
    dataset_id = run_result["stages"][1]["outputs"]["dataset_id"]
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # ----------------------------------------------------
    # Step 2: Validate Technical Analytics
    # ----------------------------------------------------
    print_header("2. Validate Technical Analytics Artifact")
    analytics_path = os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}/reconstruction_analytics.json")
    assert os.path.exists(analytics_path), "reconstruction_analytics.json is missing!"
    
    with open(analytics_path, "r") as f:
        analytics = json.load(f)
    print("Loaded Analytics:")
    print(json.dumps(analytics, indent=2))
    
    assert "cloud_coverage_percent" in analytics
    assert "memory_usage_mb" in analytics
    assert "processing_duration_ms" in analytics
    assert "inference_duration_ms" in analytics
    assert "tile_processing_statistics" in analytics
    assert analytics["tile_processing_statistics"]["total_tiles"] > 0
    assert analytics["reconstruction_success"] is True
    print("✓ Technical analytics verified.")

    # ----------------------------------------------------
    # Step 3: Validate Scientific Quality Metrics
    # ----------------------------------------------------
    print_header("3. Validate Scientific Quality Metrics (PSNR/SSIM/MAE/RMSE/SAM)")
    metrics_path = os.path.join(workspace_root, f"datasets/reconstruction_evaluations/{dataset_id}/quality_metrics.json")
    assert os.path.exists(metrics_path), "quality_metrics.json is missing!"
    
    with open(metrics_path, "r") as f:
        metrics = json.load(f)
    print("Loaded Quality Metrics:")
    print(json.dumps(metrics, indent=2))
    
    assert "psnr" in metrics
    assert "ssim" in metrics
    assert "mae" in metrics
    assert "rmse" in metrics
    assert "sam_degrees" in metrics
    
    assert isinstance(metrics["psnr"], float)
    assert 0.0 <= metrics["ssim"] <= 1.0
    assert metrics["mae"] >= 0.0
    assert metrics["rmse"] >= 0.0
    assert metrics["sam_degrees"] >= 0.0
    
    # Check that they are merged into evaluation report
    report_path = os.path.join(workspace_root, f"datasets/reconstruction_evaluations/{dataset_id}/evaluation_report.json")
    with open(report_path, "r") as f:
        report = json.load(f)
    assert "reconstruction_analytics" in report
    assert "inference_duration_ms" in report["reconstruction_analytics"]
    print("✓ Scientific quality metrics and analytics report verified.")

    # ----------------------------------------------------
    # Step 4: Validate Confidence Heatmap & Guided Smoothing
    # ----------------------------------------------------
    print_header("4. Validate Confidence Map & Guided Smoothing Outputs")
    # Query GET metrics route to ensure it serves the correct JSON flat list
    r = client.get(f"/api/v1/workflow/validate/{session_id}")
    assert r.status_code == 200
    val_res = r.json()
    print(f"Mean Confidence Score in validation response: {val_res['reconstruction']['details']['mean_confidence']}%")
    assert val_res["reconstruction"]["details"]["mean_confidence"] > 0
    
    # Check spatial files on disk
    conf_tif = os.path.join(workspace_root, f"datasets/confidence_estimations/{dataset_id}/confidence_map.tif")
    conf_png = os.path.join(workspace_root, f"datasets/confidence_estimations/{dataset_id}/confidence_preview.png")
    
    assert os.path.exists(conf_tif), "Confidence GeoTIFF map is missing!"
    assert os.path.exists(conf_png), "Confidence preview PNG is missing!"
    
    # Verify values inside the confidence GeoTIFF
    with rasterio.open(conf_tif) as src:
        c_map = src.read(1)
        print(f"Confidence map dimensions: {src.width}x{src.height}")
        print(f"Confidence map value range: min={c_map.min():.2f}, max={c_map.max():.2f}")
        assert c_map.min() >= 0.0 and c_map.max() <= 100.0
        
    print("✓ Confidence map spatial outputs successfully validated.")

    # Teardown
    print_header("5. Teardown and Cleanup")
    client.delete(f"/api/v1/analysis/{session_id}")
    if os.path.exists(db_path):
        os.remove(db_path)
    print("Cleaned up database.")
    
    print("\n==================================================")
    print(" ALL PHASE 12G QUALITY ASSESSMENT & CONFIDENCE VERIFICATIONS PASSED!")
    print("==================================================")
    sys.exit(0)

except Exception as e:
    print(f"\nPhase 12G Quality Assessment & Confidence Verification FAILED: {e}")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    import traceback
    traceback.print_exc()
    sys.exit(1)
