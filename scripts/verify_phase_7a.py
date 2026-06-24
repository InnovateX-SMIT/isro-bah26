import sys
import os
import sqlite3
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_7a.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 7A Reconstruction Framework Foundation Verification...")
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
        print(f" - {ds['dataset_name']}")
    assert len(demo_datasets) > 0, "No demo datasets found."
    target_ds = demo_datasets[0]

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

    # 4. Guard Clause: Run Reconstruction before other layers are computed (should fail with 400)
    print_header("4. Test Prerequisite Guard Clauses")
    print("Triggering reconstruction run on new session before context/cloud analytics are computed...")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "DEFAULT"})
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"Success: Guard clause returned expected error: \"{r.json()['detail']}\"")

    # Run inspection & metadata
    print("\nRunning dataset inspection...")
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200

    print("Running metadata extraction...")
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200

    print("Calculating geospatial and location contexts...")
    r = client.get(f"/api/v1/geospatial/{dataset_id}/context")
    assert r.status_code == 200
    r = client.get(f"/api/v1/location/{dataset_id}/context")
    assert r.status_code == 200
    r = client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    assert r.status_code == 200

    # Still missing temporal context and cloud analytics, should still fail
    print("Triggering reconstruction run after metadata but before temporal context...")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"Success: Guard clause returned expected error: \"{r.json()['detail']}\"")

    # Discover and select temporal references, generate temporal context package
    print("\nRunning temporal discovery...")
    r = client.post(f"/api/v1/temporal/discover/{session_id}", json={"temporal_window_days": 30})
    assert r.status_code == 200, f"Temporal discovery failed: status={r.status_code}, content={r.text}"

    print("Running temporal reference selection...")
    r = client.post(f"/api/v1/temporal/select/{session_id}", json={"num_references": 3})
    assert r.status_code == 200, f"Temporal select failed: status={r.status_code}, content={r.text}"

    print("Generating temporal context...")
    r = client.post(f"/api/v1/temporal/context/{session_id}")
    assert r.status_code in (200, 201), f"Temporal context generation failed: status={r.status_code}, content={r.text}"

    # Still missing cloud intelligence outputs, should fail
    print("Triggering reconstruction run after temporal but before cloud analytics...")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"Success: Guard clause returned expected error: \"{r.json()['detail']}\"")

    # Run Cloud Intelligence Layers
    print("\nRunning cloud detection...")
    r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
    assert r.status_code == 200

    print("Running cloud classification...")
    r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
    assert r.status_code == 200

    print("Running cloud shadow detection...")
    r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
    assert r.status_code == 200

    print("Running cloud segmentation...")
    r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
    assert r.status_code == 200

    print("Running cloud analytics...")
    r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
    assert r.status_code == 200

    # 5. Run Reconstruction Pipeline
    print_header("5. Run Reconstruction Pipeline Foundation")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "SUPER_RESOLUTION"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    reconstruction_data = r.json()
    
    print("Reconstruction pipeline ran successfully. Response payload:")
    print(json.dumps(reconstruction_data, indent=2))
    
    # Assert fields in response
    assert "run" in reconstruction_data
    assert "package" in reconstruction_data
    run_info = reconstruction_data["run"]
    package_info = reconstruction_data["package"]
    
    assert run_info["reconstruction_status"] == "COMPLETED"
    assert run_info["reconstruction_strategy"] == "SUPER_RESOLUTION"
    assert "reconstruction framework initialized successfully" in run_info["summary"].lower()
    
    assert "metadata_profile" in package_info
    assert "geospatial_profile" in package_info
    assert "temporal_profile" in package_info
    assert "cloud_intelligence_profile" in package_info
    assert package_info["reconstruction_strategy"] == "SUPER_RESOLUTION"

    # 6. Fetch run status and summary
    print_header("6. Fetch Run Status and Summary via APIs")
    r = client.get(f"/api/v1/reconstruction/{session_id}")
    assert r.status_code == 200
    fetched_run = r.json()
    assert fetched_run["id"] == run_info["id"]
    assert fetched_run["reconstruction_status"] == "COMPLETED"
    
    r = client.get(f"/api/v1/reconstruction/{session_id}/summary")
    assert r.status_code == 200
    fetched_summary = r.json()
    assert fetched_summary["session_id"] == session_id
    assert fetched_summary["reconstruction_status"] == "COMPLETED"
    assert fetched_summary["summary"] == run_info["summary"]
    print("Reconstruction status and summary successfully verified via GET requests.")

    # 7. Verify Mission Control Integration
    print_header("7. Verify Mission Control Integration")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc = r.json()
    
    assert mc["status"]["reconstruction"] == "available"
    assert mc["reconstruction"] is not None
    assert mc["reconstruction"]["reconstruction_status"] == "COMPLETED"
    assert mc["reconstruction"]["reconstruction_strategy"] == "SUPER_RESOLUTION"
    
    # Briefing summary assertions
    briefing = mc["summary"]
    print(f"Mission Control Dynamic Briefing:\n\"{briefing}\"")
    assert run_info["summary"] in briefing
    print("Mission Control integration verified: status is available, data wrapped, summary appended.")

    # 8. Test Delete API
    print_header("8. Test Reconstruction Delete Endpoint")
    r = client.delete(f"/api/v1/reconstruction/{session_id}")
    assert r.status_code == 204
    
    # Verify runs are deleted in SQLite
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM reconstruction_runs WHERE session_id = ?", (session_id,))
    count = cursor.fetchone()[0]
    assert count == 0, "Reconstruction runs were not deleted by delete endpoint!"
    print("Delete endpoint successfully cleared reconstruction runs.")

    # 9. Test Cascading Delete on Session Purge
    print_header("9. Test Cascading Delete on Session Purge")
    print("Re-creating reconstruction run...")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "DEFAULT"})
    assert r.status_code == 200
    
    # Verify in DB
    cursor.execute("SELECT COUNT(*) FROM reconstruction_runs WHERE session_id = ?", (session_id,))
    count = cursor.fetchone()[0]
    assert count == 1, "Failed to re-create reconstruction run."
    
    # Delete the Analysis Session
    print("Deleting Analysis Session...")
    r = client.delete(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 204
    
    # Check DB again
    cursor.execute("SELECT COUNT(*) FROM reconstruction_runs WHERE session_id = ?", (session_id,))
    count = cursor.fetchone()[0]
    assert count == 0, "Reconstruction runs were not deleted cascade-wise when session was deleted!"
    conn.close()
    print("Cascading delete successfully verified: reconstruction runs purged.")

    print("\n==================================================")
    print(" ALL PHASE 7A RECONSTRUCTION FRAMEWORK VERIFICATIONS PASSED!")
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
