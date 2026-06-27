import sys
import os
import sqlite3
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_10c.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 10C Operational Analytics Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Setup Session Context
    print_header("1. Initialize Test Session Context")
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session = r.json()
    session_id = session["session_id"]
    print(f"Session created: {session_id}")

    # 2. Register Dataset
    print_header("2. Register Dataset Node")
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200
    demo_datasets = r.json()
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
    print(f"Registered dataset ID: {dataset_id}")

    # 3. Extract Metadata
    print_header("3. Initialize Early Metadata Context")
    client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")

    # 4. Trigger Consolidated Analytics API
    print_header("4. Fetch Operational Analytics Overview")
    r = client.get("/api/v1/analytics/overview")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    analytics = r.json()

    # 5. Assert Metric Blocks
    print_header("5. Evaluate Executive KPIs & Distributions")
    exec_metrics = analytics["executive"]
    print(f"Total sessions tracked: {exec_metrics['total_sessions']}")
    print(f"Total datasets tracked: {exec_metrics['total_datasets']}")
    print(f"Workflow completion rate: {exec_metrics['workflow_completion_rate']}%")
    assert exec_metrics["total_sessions"] == 1
    assert exec_metrics["total_datasets"] == 1

    # Check distribution maps
    ds_metrics = analytics["datasets"]
    print(f"Dataset type distribution: {ds_metrics['type_distribution']}")
    print(f"Coordinate reference systems: {ds_metrics['crs_distribution']}")
    assert "DEMO" in ds_metrics["type_distribution"]
    assert ds_metrics["type_distribution"]["DEMO"] == 1

    # Check workflow stage rates
    wf_metrics = analytics["workflow"]
    print("\nStage Completion Rates:")
    for stage, rate in list(wf_metrics["stage_completion_rates"].items())[:6]:
        print(f" - {stage}: {rate}%")
    assert "Analysis Session" in wf_metrics["stage_completion_rates"]

    # 6. Verify System Health Data
    print_header("6. Evaluate Node Health Parameters")
    health = analytics["system_health"]
    print(f"Database Connectivity: {health['db_connected']}")
    print(f"Storage Allocated bytes: {health['storage_used_bytes']}")
    print(f"Storage Free space bytes: {health['storage_free_bytes']}")
    assert health["api_available"] is True
    assert health["db_connected"] is True
    assert health["storage_used_bytes"] > 0

    # 7. Evaluate Trend Sequences
    print_header("7. Evaluate Dynamic Historical Trends")
    trends = analytics["trends"]
    print(f"Volume trend nodes: {len(trends['daily_volume'])}")
    print(f"Completion trend nodes: {len(trends['daily_completion'])}")
    assert len(trends["daily_volume"]) > 0
    assert len(trends["daily_completion"]) > 0

    # 8. Clean up Session context
    print_header("8. Cascade Delete Session context")
    r = client.delete(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 204
    print("✓ Test context purges successful.")

    print("\n==================================================")
    print(" ALL PHASE 10C OPERATIONAL ANALYTICS TESTS PASSED!")
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
