import sys
import os
import sqlite3
import json
import shutil

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_12b.db"))
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

print("Starting Phase 12B Workflow Validation Verification...")
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

    # 2. Run Workflow Validation on New Empty Session (Expect Invalid/Pending states)
    print_header("2. Run Validation on Empty Session")
    r = client.get(f"/api/v1/workflow/validate/{session_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    val_res = r.json()
    
    print(f"Overall Valid: {val_res['overall_valid']}")
    print(f"Upload component valid: {val_res['upload']['valid']} (Msg: {val_res['upload']['message']})")
    print(f"Metadata component valid: {val_res['metadata']['valid']} (Msg: {val_res['metadata']['message']})")
    print(f"Temporal component valid: {val_res['temporal']['valid']} (Msg: {val_res['temporal']['message']})")
    print(f"Reconstruction component valid: {val_res['reconstruction']['valid']} (Msg: {val_res['reconstruction']['message']})")
    print(f"Export component valid: {val_res['export']['valid']} (Msg: {val_res['export']['message']})")
    
    # Assertions for initial invalid state
    assert val_res["overall_valid"] is False, "Expected overall_valid to be False for new empty session"
    assert val_res["upload"]["valid"] is False, "Expected upload valid to be False"
    assert val_res["metadata"]["valid"] is False, "Expected metadata valid to be False"
    assert val_res["temporal"]["valid"] is False, "Expected temporal valid to be False"
    assert val_res["reconstruction"]["valid"] is False, "Expected reconstruction valid to be False"
    assert val_res["export"]["valid"] is False, "Expected export valid to be False"
    print("✓ Verification succeeded for empty session validation states.")

    # 3. Discover Demo Datasets
    print_header("3. Discover Demo Datasets")
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

    # 4. Trigger Orchestrated Workflow Run (Happy Path)
    print_header("4. Trigger Orchestrated Workflow Run")
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

    # 5. Run Workflow Validation on Completed Session (Expect Valid / Verified state)
    print_header("5. Run Validation on Completed Session")
    r = client.get(f"/api/v1/workflow/validate/{session_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    val_res = r.json()

    print(f"Overall Valid: {val_res['overall_valid']}")
    print(f"Upload component valid: {val_res['upload']['valid']} (Msg: {val_res['upload']['message']})")
    print(f"Metadata component valid: {val_res['metadata']['valid']} (Msg: {val_res['metadata']['message']})")
    print(f"Temporal component valid: {val_res['temporal']['valid']} (Msg: {val_res['temporal']['message']})")
    print(f"Reconstruction component valid: {val_res['reconstruction']['valid']} (Msg: {val_res['reconstruction']['message']})")
    print(f"Export component valid: {val_res['export']['valid']} (Msg: {val_res['export']['message']})")

    # Assertions for final validated state
    assert val_res["upload"]["valid"] is True, f"Expected upload valid to be True, msg: {val_res['upload']['message']}"
    assert val_res["metadata"]["valid"] is True, f"Expected metadata valid to be True, msg: {val_res['metadata']['message']}"
    assert val_res["temporal"]["valid"] is True, f"Expected temporal valid to be True, msg: {val_res['temporal']['message']}"
    assert val_res["reconstruction"]["valid"] is True, f"Expected reconstruction valid to be True, msg: {val_res['reconstruction']['message']}"
    assert val_res["export"]["valid"] is True, f"Expected export valid to be True, msg: {val_res['export']['message']}"
    assert val_res["overall_valid"] is True, "Expected overall_valid to be True for completed session"

    # 6. Validate detailed metrics
    print_header("6. Evaluate Granular Diagnostic Details")
    print("Ingestion upload details:")
    print(json.dumps(val_res["upload"]["details"], indent=2))
    assert val_res["upload"]["details"]["readability_check"] == "PASSED"
    assert val_res["upload"]["details"]["validation_status"] in ("VALIDATED", "READY", "COMPLETED")

    print("\nMetadata extraction details:")
    print(json.dumps(val_res["metadata"]["details"], indent=2))
    assert val_res["metadata"]["details"]["metadata_extracted"] == "AVAILABLE"
    assert val_res["metadata"]["details"]["location_context"] == "AVAILABLE"
    assert val_res["metadata"]["details"]["epsg"] is not None

    print("\nTemporal stack details:")
    print(json.dumps(val_res["temporal"]["details"], indent=2))
    assert val_res["temporal"]["details"]["selected_count"] > 0
    assert val_res["temporal"]["details"]["temporal_context_profile"] == "AVAILABLE"

    print("\nAI reconstruction details:")
    print(json.dumps(val_res["reconstruction"]["details"], indent=2))
    assert val_res["reconstruction"]["details"]["reconstruction_tif"] == "AVAILABLE"
    assert val_res["reconstruction"]["details"]["reconstruction_png"] == "AVAILABLE"
    assert val_res["reconstruction"]["details"]["reliability_scoring"] == "COMPLETED"

    print("\nExport & package details:")
    print(json.dumps(val_res["export"]["details"], indent=2))
    assert val_res["export"]["details"]["raster_export_valid"] is True
    assert val_res["export"]["details"]["package_export_valid"] is True
    assert len(val_res["export"]["details"]["available_reports"]) > 0

    print("\n✓ Granular diagnostic details matched expected database and file parameters.")

    # 7. Clean Up database artifacts
    print_header("7. Database Teardown & Purge")
    r = client.delete(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 204
    
    # Remove test DB files
    if os.path.exists(db_path):
        os.remove(db_path)
    
    print("\nPhase 12B Workflow Validation Verification PASSED successfully!")
    sys.exit(0)

except Exception as e:
    print(f"\nPhase 12B Workflow Validation Verification FAILED: {e}")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    import traceback
    traceback.print_exc()
    sys.exit(1)
