import sys
import os
import sqlite3
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_7d.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 7D Reconstruction Optimization Verification...")
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

    # 4. Run prerequisite analysis phases (Inspection -> Metadata -> Geospatial -> Temporal -> Cloud)
    print_header("4. Run Prerequisite Intelligence Layers (Phases 1-6)")
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
    print("Prerequisites initialized successfully.")

    # 5. Error Handling: Run optimization before running baseline reconstruction
    print_header("5. Test Error Handling (Optimize before Reconstruction)")
    r = client.post(f"/api/v1/reconstruction/optimize/{session_id}")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"Success: Correctly rejected optimization request before baseline reconstruction with error: {r.json()['detail']}")

    # 6. Run Baseline Reconstruction (Phase 7C)
    print_header("6. Run Baseline Reconstruction (Phase 7C)")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "TELEA"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    rec_data = r.json()
    print("Baseline reconstruction completed successfully.")

    # 7. Run Reconstruction Optimization (Phase 7D)
    print_header("7. Run Reconstruction Optimization (Phase 7D)")
    r = client.post(f"/api/v1/reconstruction/optimize/{session_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    opt_data = r.json()
    print("Reconstruction optimization completed. Response:")
    print(json.dumps(opt_data, indent=2))

    # Assert model schemas
    assert "run" in opt_data
    assert "report" in opt_data
    run_info = opt_data["run"]
    report_info = opt_data["report"]

    assert run_info["optimization_status"] == "COMPLETED"
    assert "optimized_output_path" in run_info
    assert "optimized_preview_path" in run_info
    assert "optimization_method" in run_info

    # 8. Verify Filesystem Artifacts Created
    print_header("8. Verify Stored Filesystem Artifacts")
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    tif_abs_path = os.path.join(workspace_root, run_info["optimized_output_path"])
    png_abs_path = os.path.join(workspace_root, run_info["optimized_preview_path"])
    report_abs_path = os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}/optimization_report.json")

    print(f"Checking optimized GeoTIFF: {tif_abs_path}")
    assert os.path.exists(tif_abs_path), "optimized_reconstruction.tif does not exist!"
    
    print(f"Checking optimized preview PNG: {png_abs_path}")
    assert os.path.exists(png_abs_path), "optimized_preview.png does not exist!"
    
    print(f"Checking optimization report JSON: {report_abs_path}")
    assert os.path.exists(report_abs_path), "optimization_report.json does not exist!"

    # Verify JSON contents
    with open(report_abs_path, "r") as f:
        report_payload = json.load(f)
    assert len(report_payload["optimization_methods"]) == 3
    assert "boundary_discontinuity_before" in report_payload["metrics"]
    assert "boundary_discontinuity_after" in report_payload["metrics"]
    assert "improvement_percent" in report_payload["metrics"]
    
    print("Filesystem artifacts verified.")
    print(f"  Boundary Seam Discontinuity Before: {report_payload['metrics']['boundary_discontinuity_before']:.4f}")
    print(f"  Boundary Seam Discontinuity After:  {report_payload['metrics']['boundary_discontinuity_after']:.4f}")
    print(f"  Quality Improvement Achieved:       {report_payload['metrics']['improvement_percent']:.2f}%")

    # 9. Verify API GET routes for optimized output info and streaming preview
    print_header("9. Verify API GET Routes for Optimized Output")
    
    # GET optimized output info
    r = client.get(f"/api/v1/reconstruction/{session_id}/optimized-output")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    out_info = r.json()
    assert out_info["session_id"] == session_id
    assert out_info["optimization_status"] == "COMPLETED"
    assert out_info["optimized_output_path"] == run_info["optimized_output_path"]
    assert out_info["optimized_preview_path"] == run_info["optimized_preview_path"]
    print("GET optimized-output returned correct metadata details.")

    # GET optimized preview streaming bytes
    r = client.get(f"/api/v1/reconstruction/{session_id}/optimized-preview")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert len(r.content) > 0
    print("GET optimized-preview successfully served raw PNG bytes.")

    # 10. Verify Mission Control Integration
    print_header("10. Verify Mission Control Integration")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc = r.json()
    
    assert mc["status"]["reconstruction"] == "available"
    assert mc["reconstruction"] is not None
    assert mc["reconstruction"]["optimization_status"] == "COMPLETED"
    assert mc["reconstruction"]["optimization_method"] == run_info["optimization_method"]
    assert mc["reconstruction"]["optimized_output_path"] == run_info["optimized_output_path"]
    assert mc["reconstruction"]["optimized_preview_path"] == run_info["optimized_preview_path"]
    print("Mission Control integration verified: status available, optimization properties present.")
    print("Dynamic briefing containing optimization:")
    print(f"  \"{mc['summary']}\"")

    # Clean up generated files from disk
    import shutil
    rec_dir = os.path.dirname(tif_abs_path)
    if os.path.exists(rec_dir):
        shutil.rmtree(rec_dir)
        print("\nCleaned up generated filesystem directory.")

    print("\n==================================================")
    print(" ALL PHASE 7D OPTIMIZATION VERIFICATIONS PASSED!")
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
