import sys
import os

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_5b.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.models.temporal_discovery import TemporalDiscovery
from app.models.temporal_candidate import TemporalCandidate

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    print("Starting Phase 5B API Verification...")
    init_db()
    client = TestClient(app)

    # 1. Models and imports verification
    print_header("1. Verify Model Import & Persistence Schema")
    db = SessionLocal()
    try:
        # Check that we can query both tables (will fail if schema creation failed)
        disc_count = db.query(TemporalDiscovery).count()
        cand_count = db.query(TemporalCandidate).count()
        print(f"✓ Table schemas exist. Initial counts: discoveries={disc_count}, candidates={cand_count}")
    finally:
        db.close()

    # 2. Setup session and dataset dependencies
    print_header("2. Run Dependency Pipelines (Session, Dataset, Inspection, Metadata, Geospatial)")
    
    # 2.1 Create session
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201, f"Create session failed: {r.text}"
    session = r.json()
    session_id = session["session_id"]
    print(f"✓ Analysis session created: {session_id}")

    # 2.2 List demo datasets
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200, f"List demo datasets failed: {r.text}"
    demo_datasets = r.json()
    target_ds = demo_datasets[0]
    print(f"✓ Target demo dataset: {target_ds['dataset_name']}")

    # 2.3 Register dataset
    register_payload = {
        "analysis_session_id": session_id,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    }
    r = client.post("/api/v1/datasets/register", json=register_payload)
    assert r.status_code == 201, f"Register dataset failed: {r.text}"
    registered = r.json()
    dataset_id = registered["dataset_id"]
    print(f"✓ Registered dataset: {dataset_id}")

    # 2.4 Run inspection
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200, f"Inspection failed: {r.text}"
    print("✓ Inspection pipeline completed.")

    # 2.5 Run metadata extraction
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200, f"Metadata extraction failed: {r.text}"
    print("✓ Metadata extraction completed.")

    # 2.6 Retrieve geospatial context
    r = client.get(f"/api/v1/geospatial/{dataset_id}/context")
    assert r.status_code == 200, f"Geospatial context generation failed: {r.text}"
    print("✓ Geospatial context bounds generated.")

    # 3. Test discovery execution (POST)
    print_header("3. Execute Historical Discovery (POST /discover)")
    discovery_payload = {
        "provider_name": "GoogleEarthEngine",
        "temporal_window_days": 30
    }
    r = client.post(f"/api/v1/temporal/discover/{session_id}", json=discovery_payload)
    assert r.status_code == 200, f"Discovery POST failed: {r.text}"
    discovery_results = r.json()
    
    # Assert return structures
    assert "discovery" in discovery_results, "Response missing 'discovery' element"
    assert "candidates" in discovery_results, "Response missing 'candidates' element"
    assert "candidate_count" in discovery_results, "Response missing 'candidate_count' element"

    disc_meta = discovery_results["discovery"]
    candidates = discovery_results["candidates"]
    candidate_count = discovery_results["candidate_count"]

    assert disc_meta["status"] == "COMPLETED", f"Expected discovery COMPLETED, got {disc_meta['status']}"
    assert disc_meta["provider_used"] == "GoogleEarthEngine"
    assert candidate_count > 0, "No candidates returned by GoogleEarthEngine provider"
    assert len(candidates) == candidate_count, f"Candidate list mismatch: returned={len(candidates)}, count={candidate_count}"
    
    # Assert candidate fields conform to contract
    first_candidate = candidates[0]
    assert "candidate_id" in first_candidate
    assert "acquisition_date" in first_candidate
    assert "cloud_cover" in first_candidate
    assert "spatial_overlap" in first_candidate
    assert "metadata" in first_candidate
    print(f"✓ Discovery executed successfully. Discovered {candidate_count} candidates.")

    # 4. Verify Session status update milestone
    print_header("4. Verify Analysis Session Milestone Update")
    r = client.get(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 200, f"Failed to retrieve session: {r.text}"
    session_status = r.json()["status"]
    assert session_status == "TEMPORAL_CONTEXT_RETRIEVED", f"Session status was not updated to milestone TEMPORAL_CONTEXT_RETRIEVED, got: {session_status}"
    print("✓ Analysis session status updated to TEMPORAL_CONTEXT_RETRIEVED.")

    # 5. Verify Discovery Retrieval (GET /discover)
    print_header("5. Retrieve Latest Discovery Run (GET /discover)")
    r = client.get(f"/api/v1/temporal/discover/{session_id}")
    assert r.status_code == 200, f"GET discovery failed: {r.text}"
    retrieved_disc = r.json()
    assert retrieved_disc["id"] == disc_meta["id"]
    assert retrieved_disc["status"] == "COMPLETED"
    print("✓ Latest discovery run retrieved successfully.")

    # 6. Verify Discovery Candidates Retrieval (GET /discover/.../candidates)
    print_header("6. Retrieve Candidates List (GET /discover/candidates)")
    r = client.get(f"/api/v1/temporal/discover/{session_id}/candidates")
    assert r.status_code == 200, f"GET candidates list failed: {r.text}"
    retrieved_list = r.json()
    assert retrieved_list["discovery"]["id"] == disc_meta["id"]
    assert retrieved_list["candidate_count"] == candidate_count
    assert len(retrieved_list["candidates"]) == len(candidates)
    
    # Ensure metadata dictionaries were deserialized correctly from SQLite text column
    assert isinstance(retrieved_list["candidates"][0]["metadata"], dict), "Candidate metadata field not deserialized to dictionary"
    print("✓ Discovered candidates retrieved and validated successfully.")

    print("\n==================================================")
    print(" ALL PHASE 5B VERIFICATIONS PASSED!")
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
