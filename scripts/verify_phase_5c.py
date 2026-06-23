import sys
import os

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_5c.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.models.temporal_reference_stack import TemporalReferenceStack
from app.models.selected_reference import SelectedReference

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    print("Starting Phase 5C API Verification...")
    init_db()
    client = TestClient(app)

    # 1. Models and imports verification
    print_header("1. Verify Model Import & Persistence Schema")
    db = SessionLocal()
    try:
        # Check querying reference tables
        stack_count = db.query(TemporalReferenceStack).count()
        ref_count = db.query(SelectedReference).count()
        print(f"✓ Reference tables exist. Initial counts: stacks={stack_count}, selections={ref_count}")
    finally:
        db.close()

    # 2. Run previous phases dependency pipelines
    print_header("2. Run Dependency Pipelines (Discovery, Metadata, Geospatial)")
    
    # 2.1 Create session
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session_id = r.json()["session_id"]

    # 2.2 List demo datasets
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200
    demo_datasets = r.json()
    target_ds = demo_datasets[0]

    # 2.3 Register dataset
    register_payload = {
        "analysis_session_id": session_id,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    }
    r = client.post("/api/v1/datasets/register", json=register_payload)
    assert r.status_code == 201
    dataset_id = r.json()["dataset_id"]

    # 2.4 Run inspection, metadata, geospatial
    client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    client.get(f"/api/v1/geospatial/{dataset_id}/context")
    print("✓ Dependency metadata and geospatial pipelines completed.")

    # 2.5 Run discovery
    discovery_payload = {
        "provider_name": "GoogleEarthEngine",
        "temporal_window_days": 30
    }
    r = client.post(f"/api/v1/temporal/discover/{session_id}", json=discovery_payload)
    assert r.status_code == 200, f"Discovery failed: {r.text}"
    discovered_data = r.json()
    discovery_id = discovered_data["discovery"]["id"]
    candidate_count = discovered_data["candidate_count"]
    print(f"✓ Discovery completed. ID: {discovery_id}. Candidates found: {candidate_count}")

    # 3. Test reference selection execution (POST)
    print_header("3. Execute Reference Selection (POST /select)")
    selection_payload = {
        "num_references": 2,
        "weights": {
            "cloud_cover": 0.5,
            "temporal_distance": 0.3,
            "spatial_overlap": 0.1,
            "data_quality": 0.1
        }
    }
    r = client.post(f"/api/v1/temporal/select/{session_id}", json=selection_payload)
    assert r.status_code == 200, f"Reference selection failed: {r.text}"
    stack_data = r.json()

    # Assert stack fields
    assert "selected_count" in stack_data
    assert stack_data["selected_count"] == 2
    assert "selected_references" in stack_data
    
    selections = stack_data["selected_references"]
    assert len(selections) == 2, f"Expected 2 selected references, got {len(selections)}"
    
    # Assert ranking fields
    first_choice = selections[0]
    assert first_choice["rank_position"] == 1
    assert 0.0 <= first_choice["ranking_score"] <= 100.0
    assert "selection_reason" in first_choice
    assert "Selected due to" in first_choice["selection_reason"]
    assert "cloud cover" in first_choice["selection_reason"]
    assert "spatial overlap" in first_choice["selection_reason"]
    assert "temporal distance" in first_choice["selection_reason"]
    
    print("✓ Ranking score and selection reasons verified:")
    print(f"  - Rank 1 Selection Reason: {first_choice['selection_reason']}")
    print(f"  - Rank 1 Score: {first_choice['ranking_score']:.2f}")

    # 4. Verify Session status milestone
    print_header("4. Verify Analysis Session Milestone Status")
    r = client.get(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 200
    session_status = r.json()["status"]
    assert session_status == "REFERENCE_SELECTION_COMPLETE", f"Expected REFERENCE_SELECTION_COMPLETE, got {session_status}"
    print("✓ Session status updated to REFERENCE_SELECTION_COMPLETE.")

    # 5. Verify retrieve stack (GET /references)
    print_header("5. Retrieve Latest Stack (GET /references)")
    r = client.get(f"/api/v1/temporal/references/{session_id}")
    assert r.status_code == 200, f"GET stack failed: {r.text}"
    stack_retrieved = r.json()
    assert stack_retrieved["id"] == stack_data["id"]
    assert len(stack_retrieved["selected_references"]) == 2
    print("✓ Reference stack retrieved successfully.")

    # 6. Verify retrieve selected list (GET /references/selected)
    print_header("6. Retrieve Selected References List (GET /references/selected)")
    r = client.get(f"/api/v1/temporal/references/{session_id}/selected")
    assert r.status_code == 200, f"GET selected list failed: {r.text}"
    selected_list = r.json()
    assert len(selected_list) == 2
    assert selected_list[0]["rank_position"] == 1
    assert selected_list[1]["rank_position"] == 2
    print("✓ Selected references list retrieved and validated successfully.")

    print("\n==================================================")
    print(" ALL PHASE 5C VERIFICATIONS PASSED!")
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
