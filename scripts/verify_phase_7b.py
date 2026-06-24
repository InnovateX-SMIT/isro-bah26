import sys
import os
import sqlite3
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_7b.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 7B Temporal Fusion Engine Verification...")
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

    # 4. Prerequisite Guard Clauses Checks
    print_header("4. Test Prerequisite Guard Clauses")
    
    # Check 1: Missing Reconstruction Framework Run (Phase 7A)
    print("Testing Check 1: Run temporal fusion before Phase 7A reconstruction framework run...")
    r = client.post(f"/api/v1/temporal-fusion/run/{session_id}")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"Success: Guard clause returned expected error: \"{r.json()['detail']}\"")

    # Run inspection, metadata, geospatial context
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200
    r = client.get(f"/api/v1/geospatial/{dataset_id}/context")
    assert r.status_code == 200
    r = client.get(f"/api/v1/location/{dataset_id}/context")
    assert r.status_code == 200
    r = client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    assert r.status_code == 200

    # Discover references, select stack, generate temporal context
    r = client.post(f"/api/v1/temporal/discover/{session_id}", json={"temporal_window_days": 30})
    assert r.status_code == 200
    r = client.post(f"/api/v1/temporal/select/{session_id}", json={"num_references": 3})
    assert r.status_code == 200
    r = client.post(f"/api/v1/temporal/context/{session_id}")
    assert r.status_code in (200, 201)

    # Run cloud intelligence layers
    r = client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
    assert r.status_code == 200
    r = client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
    assert r.status_code == 200

    # Reconstruction run not complete yet
    print("Testing Check 2: Run temporal fusion with temporal context & cloud analytics, but missing reconstruction framework...")
    r = client.post(f"/api/v1/temporal-fusion/run/{session_id}")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"Success: Guard clause returned expected error: \"{r.json()['detail']}\"")

    # Run Phase 7A Reconstruction Framework
    print("\nRunning Reconstruction Framework Run (Phase 7A)...")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}")
    assert r.status_code == 200

    # 5. Run Temporal Fusion Pipeline
    print_header("5. Run Temporal Fusion Engine Pipeline")
    r = client.post(f"/api/v1/temporal-fusion/run/{session_id}", json={"strategy": "WEIGHTED_AVERAGE"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    fusion_data = r.json()
    
    print("Temporal Fusion Engine ran successfully. Response payload:")
    print(json.dumps(fusion_data, indent=2))
    
    # Assert fields in response
    assert "run" in fusion_data
    assert "package" in fusion_data
    run_info = fusion_data["run"]
    package_info = fusion_data["package"]
    
    assert run_info["fusion_status"] == "COMPLETED"
    assert run_info["fusion_strategy"] == "WEIGHTED_AVERAGE"
    assert "temporal fusion package generated successfully" in run_info["guidance_summary"].lower()
    
    # Verify package properties
    assert "temporal_reference_count" in package_info
    assert "temporal_distribution" in package_info
    assert "average_cloud_cover" in package_info
    assert "temporal_relevance" in package_info
    assert "spatial_overlap_summary" in package_info
    assert "reconstruction_guidance" in package_info
    assert package_info["reconstruction_guidance"]["strategy"] == "WEIGHTED_AVERAGE"

    # 6. Fetch run status and summary via GET APIs
    print_header("6. Fetch Temporal Fusion Status and Summary")
    r = client.get(f"/api/v1/temporal-fusion/{session_id}")
    assert r.status_code == 200
    fetched_run = r.json()
    assert fetched_run["id"] == run_info["id"]
    assert fetched_run["fusion_status"] == "COMPLETED"
    
    r = client.get(f"/api/v1/temporal-fusion/{session_id}/summary")
    assert r.status_code == 200
    fetched_summary = r.json()
    assert fetched_summary["session_id"] == session_id
    assert fetched_summary["fusion_status"] == "COMPLETED"
    assert fetched_summary["guidance_summary"] == run_info["guidance_summary"]
    print("Temporal fusion status and summary successfully verified via GET requests.")

    # 7. Verify Mission Control Integration
    print_header("7. Verify Mission Control Integration")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc = r.json()
    
    assert mc["status"]["temporal_fusion"] == "available"
    assert mc["temporal_fusion"] is not None
    assert mc["temporal_fusion"]["fusion_status"] == "COMPLETED"
    assert mc["temporal_fusion"]["fusion_strategy"] == "WEIGHTED_AVERAGE"
    
    # Briefing summary assertions
    briefing = mc["summary"]
    print(f"Mission Control Dynamic Briefing:\n\"{briefing}\"")
    assert run_info["guidance_summary"] in briefing
    print("Mission Control integration verified: status is available, data wrapped, summary appended.")

    # 8. Test Delete API
    print_header("8. Test Temporal Fusion Delete Endpoint")
    r = client.delete(f"/api/v1/temporal-fusion/{session_id}")
    assert r.status_code == 204
    
    # Verify runs are deleted in SQLite
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM temporal_fusion_runs WHERE session_id = ?", (session_id,))
    count = cursor.fetchone()[0]
    assert count == 0, "Temporal fusion runs were not deleted by delete endpoint!"
    print("Delete endpoint successfully cleared temporal fusion runs.")

    # 9. Test Cascading Delete on Session Purge
    print_header("9. Test Cascading Delete on Session Purge")
    print("Re-creating temporal fusion run...")
    r = client.post(f"/api/v1/temporal-fusion/run/{session_id}", json={"strategy": "DEFAULT"})
    assert r.status_code == 200
    
    # Verify in DB
    cursor.execute("SELECT COUNT(*) FROM temporal_fusion_runs WHERE session_id = ?", (session_id,))
    count = cursor.fetchone()[0]
    assert count == 1, "Failed to re-create temporal fusion run."
    
    # Delete the Analysis Session
    print("Deleting Analysis Session...")
    r = client.delete(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 204
    
    # Check DB again
    cursor.execute("SELECT COUNT(*) FROM temporal_fusion_runs WHERE session_id = ?", (session_id,))
    count = cursor.fetchone()[0]
    assert count == 0, "Temporal fusion runs were not deleted cascade-wise when session was deleted!"
    
    # Verify reconstruction runs are also deleted cascade-wise (Phase 7A model cascade check)
    cursor.execute("SELECT COUNT(*) FROM reconstruction_runs WHERE session_id = ?", (session_id,))
    count_rec = cursor.fetchone()[0]
    assert count_rec == 0, "Reconstruction runs were not deleted cascade-wise!"
    
    conn.close()
    print("Cascading delete successfully verified: temporal fusion and reconstruction runs purged.")

    print("\n==================================================")
    print(" ALL PHASE 7B TEMPORAL FUSION ENGINE VERIFICATIONS PASSED!")
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
