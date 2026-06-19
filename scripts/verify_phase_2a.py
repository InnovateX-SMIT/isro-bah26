import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_2a.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 2A API Verification...")
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
        print(ds)
    assert len(demo_datasets) > 0, "No demo datasets discovered in datasets/demo!"
    target_ds = demo_datasets[0]

    # 3. Register dataset
    print_header("3. Register Dataset under Session")
    register_payload = {
        "analysis_session_id": session_id,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    }
    r = client.post("/api/v1/datasets/register", json=register_payload)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}"
    registered = r.json()
    print("Registered Dataset:")
    print(registered)
    dataset_id = registered["dataset_id"]
    assert registered["dataset_status"] == "REGISTERED"
    assert registered["analysis_session_id"] == session_id

    # 4. Retrieve dataset
    print_header("4. Retrieve Registered Dataset")
    r = client.get(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    retrieved = r.json()
    assert retrieved["dataset_id"] == dataset_id
    print(f"Retrieved Dataset name: {retrieved['dataset_name']}")

    # 5. List datasets
    print_header("5. List All Registered Datasets")
    r = client.get("/api/v1/datasets")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    all_datasets = r.json()
    print(f"Total registered datasets count: {len(all_datasets)}")
    assert len(all_datasets) >= 1

    # 6. List session datasets
    print_header("6. List Session Datasets")
    r = client.get(f"/api/v1/datasets/session/{session_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    session_datasets = r.json()
    print(f"Datasets under session {session_id}: {len(session_datasets)}")
    assert len(session_datasets) == 1

    # 7. Reject duplicates
    print_header("7. Reject Duplicate Registration")
    r = client.post("/api/v1/datasets/register", json=register_payload)
    print(f"HTTP Status: {r.status_code}")
    print(f"Message: {r.json()}")
    assert r.status_code == 409, f"Expected 409, got {r.status_code}"
    print("Success: Correctly blocked duplicate registration.")

    # 8. Delete registration
    print_header("8. Delete Dataset Registration")
    r = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 204, f"Expected 204, got {r.status_code}"
    print("Registration purged successfully (HTTP 204).")

    # 9. Verify deletion
    print_header("9. Verify Deletion")
    r = client.get(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    print("Success: Checked deleted registration correctly returns 404.")

    print("\n==================================================")
    print(" ALL PHASE 2A VERIFICATIONS PASSED SUCCESSFULLY!")
    print("==================================================")

except Exception as e:
    print(f"\nValidation failed with error: {e}")
    sys.exit(1)

finally:
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print("\nCleanup: Test database file deleted.")
        except Exception as e:
            print(f"\nCleanup warning: Could not remove test database file: {e}")
