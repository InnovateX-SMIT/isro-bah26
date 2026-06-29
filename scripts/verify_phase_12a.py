import sys
import os
import sqlite3
import json
import shutil

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_12a.db"))
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

print("Starting Phase 12A System Integration Foundation Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Create Analysis Session
    print_header("1. Create Analysis Session")
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201, f"Expected 201, got {r.status_code}"
    session = r.json()
    session_id = session["session_id"]
    print(f"Session created with ID: {session_id}")

    # 2. Discover Demo Datasets
    print_header("2. Discover Demo Datasets")
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    demo_datasets = r.json()
    assert len(demo_datasets) > 0, "No demo datasets found"
    
    # We will pick a dataset with "JUL" or simply the first one
    target_ds = None
    for ds in demo_datasets:
        if "JUL" in ds["dataset_name"].upper():
            target_ds = ds
            break
    if not target_ds:
        target_ds = demo_datasets[0]
    print(f"Selected demo dataset: {target_ds['dataset_name']}")

    # 3. Trigger Orchestrated Workflow Run (Happy Path)
    print_header("3. Trigger Orchestrated Workflow Run")
    run_payload = {
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"],
        "temporal_window_days": 30,
        "num_references": 3,
        "reconstruction_strategy": "TELEA"
    }
    
    r = client.post(f"/api/v1/workflow/run/{session_id}", json=run_payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    run_result = r.json()
    
    print(f"Workflow status: {run_result['status']}")
    print(f"Overall progress: {run_result['overall_progress']}%")
    print(f"Total processing time: {run_result['total_processing_time_ms']} ms")
    
    # Assert successful orchestration completion
    assert run_result["status"] == "completed", f"Expected completed, got {run_result['status']}"
    assert run_result["overall_progress"] == 100.0, f"Expected 100%, got {run_result['overall_progress']}"
    assert len(run_result["stages"]) == 18, f"Expected 18 stages, got {len(run_result['stages'])}"
    
    # Assert all stages are completed
    print("\nVerifying all stages completed successfully:")
    for stage in run_result["stages"]:
        print(f" - {stage['name']}: {stage['status']} ({stage['duration_ms']:.2f} ms)")
        assert stage["status"] == "completed", f"Expected completed status for {stage['name']}, got {stage['status']}"

    # Get dataset ID from context outputs
    dataset_id = run_result["stages"][1]["outputs"]["dataset_id"]
    print(f"\nResolved dataset ID: {dataset_id}")

    # 4. Verify Live Workflow Status Endpoint (Regression test)
    print_header("4. Verify Live Workflow Monitoring Endpoint")
    r = client.get(f"/api/v1/workflow/{session_id}")
    assert r.status_code == 200
    wf_profile = r.json()
    assert wf_profile["overall_progress"] == 100.0
    assert wf_profile["session_health"] == "HEALTHY"
    print("✓ Live workflow profile matches completed orchestrated status.")

    # 5. Verify Mission Control Synchronization
    print_header("5. Evaluate Mission Control Synchronization")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc_profile = r.json()
    
    print(f"Mission Control Status Overview:")
    print(f" - Metadata: {mc_profile['status']['metadata']}")
    print(f" - Geospatial: {mc_profile['status']['geospatial']}")
    print(f" - Location: {mc_profile['status']['location']}")
    print(f" - Temporal: {mc_profile['status']['temporal']}")
    print(f" - Cloud: {mc_profile['status']['cloud']}")
    print(f" - Reconstruction: {mc_profile['status']['reconstruction']}")
    print(f" - Confidence: {mc_profile['status']['confidence']}")
    
    # Ensure all statuses are available/completed
    assert mc_profile["status"]["metadata"] == "available"
    assert mc_profile["status"]["geospatial"] == "available"
    assert mc_profile["status"]["location"] == "available"
    assert mc_profile["status"]["temporal"] == "available"
    assert mc_profile["status"]["cloud"] == "available"
    assert mc_profile["status"]["reconstruction"] == "available"
    assert mc_profile["status"]["confidence"] == "available"
    print("✓ Mission Control is fully synchronized with database states.")

    # 6. Verify Export Readiness (Package Validation)
    print_header("6. Evaluate Export & Package Validation")
    val_payload = {
        "session_id": session_id,
        "layer": "reconstruction",
        "format": "GeoTIFF"
    }
    r = client.post("/api/v1/exports/validate", json=val_payload)
    assert r.status_code == 200
    assert r.json()["valid"] is True
    print("✓ Export layer validation is ready.")
    
    package_payload = {
        "session_id": session_id
    }
    r = client.post("/api/v1/packages/validate", json=package_payload)
    assert r.status_code == 200
    package_val = r.json()
    assert package_val["valid"] is True
    print(f"✓ Packaging validation is ready. Available assets: {package_val['available_assets']}")

    # 7. Evaluate Error / Failure Handling (Negative test)
    print_header("7. Evaluate Orchestrator Error Handling & Status Propagation")
    # Create a new session
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    err_session_id = r.json()["session_id"]
    
    # Trigger run with invalid dataset path to force registration/inspection failure
    err_payload = {
        "dataset_name": "Failure Dataset",
        "dataset_path": "datasets/demo/non_existent_folder",
        "dataset_type": "DEMO"
    }
    r = client.post(f"/api/v1/workflow/run/{err_session_id}", json=err_payload)
    assert r.status_code == 200
    err_result = r.json()
    
    print(f"Workflow status on error: {err_result['status']}")
    print(f"Overall progress on error: {err_result['overall_progress']}%")
    
    assert err_result["status"] == "failed"
    assert err_result["overall_progress"] < 100.0
    
    # Check that failed stage is 'Register Dataset' or 'Inspect Dataset'
    failed_stages = [s for s in err_result["stages"] if s["status"] == "failed"]
    blocked_stages = [s for s in err_result["stages"] if s["status"] == "blocked"]
    
    print(f"Failed stage count: {len(failed_stages)}")
    for f in failed_stages:
        print(f" - Failed: {f['name']} (Error: {f['error_summary']})")
    print(f"Blocked stage count: {len(blocked_stages)}")
    
    assert len(failed_stages) > 0, "Expected at least one failed stage"
    assert len(blocked_stages) > 0, "Expected subsequent stages to be blocked"
    print("✓ Orchestrator successfully captured failure and updated stages status without crashing.")

    # 8. Clean Up database artifacts
    print_header("8. Database Teardown & Cascading Purge Check")
    r = client.delete(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 204
    r = client.delete(f"/api/v1/analysis/{err_session_id}")
    assert r.status_code == 204
    
    # Remove files generated under datasets/previews / exports if any
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Remove test DB files
    if os.path.exists(db_path):
        os.remove(db_path)
    
    print("\nPhase 12A System Integration Verification PASSED successfully!")
    sys.exit(0)

except Exception as e:
    print(f"\nPhase 12A System Integration Verification FAILED: {e}")
    # Cleanup DB files if failed
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    import traceback
    traceback.print_exc()
    sys.exit(1)
