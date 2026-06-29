import sys
import os
import sqlite3
import json
import shutil
import time

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_12c.db"))
# Remove existing test DB if any
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except Exception:
        pass

os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 12C Performance Optimization Verification...")
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
    
    target_ds = None
    for ds in demo_datasets:
        if "JUL" in ds["dataset_name"].upper():
            target_ds = ds
            break
    if not target_ds:
        target_ds = demo_datasets[0]
    print(f"Selected demo dataset: {target_ds['dataset_name']}")

    # 3. Trigger Orchestrated Workflow Run
    print_header("3. Trigger Orchestrated Workflow Run")
    run_payload = {
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"],
        "temporal_window_days": 30,
        "num_references": 3,
        "reconstruction_strategy": "TELEA"
    }
    
    start_time = time.time()
    r = client.post(f"/api/v1/workflow/run/{session_id}", json=run_payload)
    total_run_time = time.time() - start_time
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    run_result = r.json()
    
    print(f"Workflow status: {run_result['status']}")
    print(f"Overall progress: {run_result['overall_progress']}%")
    print(f"Total backend processing time reported: {run_result['total_processing_time_ms']} ms")
    print(f"Wall-clock run time: {total_run_time:.2f} seconds")
    
    # Assert successful orchestration completion
    assert run_result["status"] == "completed", f"Expected completed, got {run_result['status']}"
    
    # Find Cloud Shadow Detection stage and verify its duration
    shadow_stage = next(s for s in run_result["stages"] if s["name"] == "Cloud Shadow Detection")
    print(f"\nCloud Shadow Detection stage details:")
    print(f" - Status: {shadow_stage['status']}")
    print(f" - Duration: {shadow_stage['duration_ms']:.2f} ms ({shadow_stage['duration_ms']/1000:.2f} seconds)")
    
    # Assert that shadow detection executes in under 25 seconds (previously took 170+ seconds)
    max_optimized_time_seconds = 25.0
    duration_seconds = shadow_stage['duration_ms'] / 1000.0
    print(f"Checking if duration ({duration_seconds:.2f}s) <= limit ({max_optimized_time_seconds:.2f}s)...")
    assert duration_seconds <= max_optimized_time_seconds, f"Optimized cloud shadow execution was too slow: {duration_seconds:.2f} seconds"
    print("✓ Performance check passed! Direct coordinate offsets significantly optimized execution.")

    # 4. Clean Up database artifacts
    print_header("4. Database Teardown")
    r = client.delete(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 204
    
    if os.path.exists(db_path):
        os.remove(db_path)
    
    print("\nPhase 12C Performance Optimization Verification PASSED successfully!")
    sys.exit(0)

except Exception as e:
    print(f"\nPhase 12C Performance Optimization Verification FAILED: {e}")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    import traceback
    traceback.print_exc()
    sys.exit(1)
