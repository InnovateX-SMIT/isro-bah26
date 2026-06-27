import sys
import os
import sqlite3
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_10a.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 10A Mission Control Foundation Verification...")
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
    assert len(demo_datasets) > 0, "No demo datasets discovered in datasets/demo!"
    target_ds = demo_datasets[0]
    print(f"Selected target dataset: {target_ds['dataset_name']}")

    # 3. Register Dataset
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

    # 4. Trigger Inspection & Metadata
    print_header("4. Initialize Pipeline Context")
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200

    # 5. Retrieve Consolidated Mission Control Profile
    print_header("5. Retrieve Consolidated Profile Payload")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    profile = r.json()

    print("Profile keys check:")
    for k in ["dataset", "metadata", "geospatial", "location", "status", "timestamp", "summary"]:
        assert k in profile, f"Key '{k}' is missing from consolidated response!"
        print(f"✓ Key '{k}' is present in the API payload.")

    print(f"Consolidated Timestamp: {profile['timestamp']}")
    assert profile["timestamp"] is not None and len(profile["timestamp"]) > 0

    # Validate status layer indicators
    status_block = profile["status"]
    print("\nReadiness status checklist indicators:")
    for layer in ["metadata", "geospatial", "location", "context", "temporal", "cloud", "reconstruction", "confidence"]:
        assert layer in status_block, f"Readiness layer indicator '{layer}' not present in status block"
        print(f" - {layer.upper()}: {status_block[layer]}")

    # 6. Cleanup & Purge Session
    print_header("6. Delete Analysis Session (Cascading Purge)")
    r = client.delete(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 204
    print("✓ Session deleted successfully.")

    print("\n==================================================")
    print(" ALL PHASE 10A CONSOLIDATION TESTS PASSED!")
    print("==================================================")

except Exception as err:
    print(f"Validation failed with error: {err}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    # Cleanup SQLite db file
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
