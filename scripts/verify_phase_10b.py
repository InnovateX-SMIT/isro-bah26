import sys
import os
import sqlite3
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_10b.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 10B Workflow Monitoring Verification...")
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

    # 2. Discover & Register Dataset
    print_header("2. Register Dataset")
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200
    demo_datasets = r.json()
    assert len(demo_datasets) > 0
    target_ds = demo_datasets[0]

    register_payload = {
        "analysis_session_id": session_id,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    }
    r = client.post("/api/v1/datasets/register", json=register_payload)
    assert r.status_code == 201
    dataset = r.json()
    dataset_id = dataset["dataset_id"]
    print(f"Registered dataset with ID: {dataset_id}")

    # 3. Run Partial Pipeline Stages: Ingest & Metadata Extraction
    print_header("3. Initialize Early Pipeline Layers")
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200

    # 4. Query Workflow Monitoring Endpoint
    print_header("4. Fetch Live Workflow Status")
    r = client.get(f"/api/v1/workflow/{session_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    workflow = r.json()

    print(f"Session ID: {workflow['session_id']}")
    print(f"Current Active Stage: {workflow['current_stage']}")
    print(f"Session Health: {workflow['session_health']}")
    print(f"Overall Progress: {workflow['overall_progress']}%")
    print(f"Total Cumulative Duration: {workflow['total_processing_time_ms']} ms")

    # Assert progress calculations are non-hardcoded and dynamic
    assert workflow["overall_progress"] > 0
    assert workflow["overall_progress"] < 100 # Not yet fully completed

    # 5. Verify Stage Details
    print_header("5. Evaluate Pipeline Nodes Status Engine")
    stages = {s["name"]: s for s in workflow["stages"]}

    expected_completed = ["Analysis Session", "Dataset Registration", "Inspection", "Validation", "Metadata Extraction"]
    expected_waiting_or_pending = ["Geospatial Intelligence", "Temporal Intelligence", "Cloud Intelligence", "Reconstruction", "Confidence", "Visualization"]

    print("\nProcessing Node States Check:")
    for name in expected_completed:
        assert name in stages, f"Stage {name} not found in stages!"
        print(f" - {name}: {stages[name]['status']} (Expected: completed)")
        assert stages[name]["status"] == "completed"

    for name in expected_waiting_or_pending:
        assert name in stages, f"Stage {name} not found in stages!"
        print(f" - {name}: {stages[name]['status']} (Expected: waiting, pending, or blocked)")
        assert stages[name]["status"] in ("waiting", "pending", "blocked")

    # 6. Verify Timeline & Logs
    print_header("6. Evaluate Execution Timelines & Dynamic Logs")
    print(f"Timeline item count: {len(workflow['timeline'])}")
    assert len(workflow["timeline"]) > 0

    print("\nLogs Output Feed:")
    for log in workflow["logs"][:8]: # Display first 8 logs
        print(f" [{log['timestamp']}] [{log['severity']}] [{log['stage']}] {log['event']}")

    # 7. Cleanup Test Context (Cascading Deletions)
    print_header("7. Tear Down and Cascade Session Purge")
    r = client.delete(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 204
    print("✓ Session context cleaned up successfully.")

    print("\n==================================================")
    print(" ALL PHASE 10B PIPELINE MONITORING TESTS PASSED!")
    print("==================================================")

except Exception as err:
    print(f"Validation failed with error: {err}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
