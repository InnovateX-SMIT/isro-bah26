import sys
import os
import sqlite3

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_3d.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 3D Geospatial Mission Control API Verification...")
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
    assert len(demo_datasets) > 0, "No demo datasets discovered!"
    target_ds = demo_datasets[0]
    print(f"Selected target dataset: {target_ds['dataset_name']}")

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
    dataset_id = registered["dataset_id"]
    print(f"Registered Dataset ID: {dataset_id}")

    # 4. Query Mission Control (Partial Availability / Missing State Fallback Test)
    print_header("4. Query Mission Control with Missing Intelligence")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    profile = r.json()
    
    # Assert status values are missing
    print("Initial aggregated profile status:")
    print(profile["status"])
    assert profile["status"]["metadata"] == "missing"
    assert profile["status"]["geospatial"] == "missing"
    assert profile["status"]["location"] == "missing"
    assert profile["status"]["context"] == "missing"
    
    # Assert dynamic summary adapted gracefully
    print("Gracefully degraded summary:")
    print(f"\"{profile['summary']}\"")
    assert "geographical scene footprint" in profile["summary"]
    assert "pending" in profile["summary"]
    print("Fallback degradation successfully verified.")

    # 5. Run dataset inspection
    print_header("5. Run Dataset Inspection")
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("Inspection Completed.")

    # 6. Run metadata extraction
    print_header("6. Run Metadata Extraction")
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("Metadata extraction completed.")

    # 7. Query Mission Control (Lazy Cascade Verification)
    print_header("7. Query Mission Control (Full Lazy Pipeline Cascade)")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    full_profile = r.json()

    print("Consolidated Mission Control Profile status after lazy cascade:")
    print(full_profile["status"])
    
    # Assert all layers are now available
    assert full_profile["status"]["metadata"] == "available"
    assert full_profile["status"]["geospatial"] == "available"
    assert full_profile["status"]["location"] == "available"
    assert full_profile["status"]["context"] == "available"

    # Assert object structures
    assert full_profile["dataset"]["dataset_id"] == dataset_id
    assert full_profile["metadata"]["metadata_status"] == "COMPLETED"
    assert full_profile["geospatial"]["crs"] is not None
    assert full_profile["location"]["state"] == "Uttar Pradesh"
    assert full_profile["context"]["terrain_type"] == "Alluvial Plain"

    # Assert dynamic briefing generated with real values
    print("Dynamically generated briefing:")
    print(f"\"{full_profile['summary']}\"")
    assert "Uttar Pradesh" in full_profile["summary"]
    assert "alluvial plain" in full_profile["summary"]
    assert "resolution" in full_profile["summary"]

    # 8. Check that no Mission Control database tables were created (Stateless requirement)
    print_header("8. Verify Stateless DB Constraint")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    print("Active database tables:")
    print(tables)
    
    # Ensure no table containing "mission" or "control" exists
    for table in tables:
        assert "mission" not in table.lower() and "control" not in table.lower(), \
            f"Violated Stateless Constraint: found database table '{table}'!"
    print("Success: Verified that Mission Control is completely stateless (0 database tables created).")

    # 9. Clean up dataset
    print_header("9. Clean Up Registered Dataset")
    r = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 204

    print("\n==================================================")
    print(" ALL PHASE 3D MISSION CONTROL VERIFICATIONS PASSED!")
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
