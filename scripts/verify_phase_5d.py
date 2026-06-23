import sys
import os
import json

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_5d.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.models.temporal_context import TemporalContext
from app.schemas.session import SessionStatus

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    print("Starting Phase 5D API Verification...")
    init_db()
    client = TestClient(app)

    # 1. Models and imports verification
    print_header("1. Verify Model Import & Persistence Schema")
    db = SessionLocal()
    try:
        # Check querying context tables
        context_count = db.query(TemporalContext).count()
        print(f"✓ Context tables exist. Initial count: contexts={context_count}")
    finally:
        db.close()

    # 2. Run previous phases dependency pipelines
    print_header("2. Run Dependency Pipelines (Discovery, Metadata, Geospatial, Selection)")
    
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

    # 2.5 Run discovery
    discovery_payload = {
        "provider_name": "GoogleEarthEngine",
        "temporal_window_days": 30
    }
    client.post(f"/api/v1/temporal/discover/{session_id}", json=discovery_payload)

    # 2.6 Run reference selection
    selection_payload = {
        "num_references": 3,
        "weights": {
            "cloud_cover": 0.4,
            "temporal_distance": 0.3,
            "spatial_overlap": 0.2,
            "data_quality": 0.1
        }
    }
    r = client.post(f"/api/v1/temporal/select/{session_id}", json=selection_payload)
    assert r.status_code == 200, f"Selection failed: {r.text}"
    selected_count = r.json()["selected_count"]
    print(f"✓ References selected: count={selected_count}")

    # 2.7 Verify status before context generation
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc_data = r.json()
    assert mc_data["status"]["temporal"] == "missing"
    print("✓ Mission control status initially lists 'temporal' as 'missing'.")

    # 3. Test context generation execution (POST /context)
    print_header("3. Execute Context Generation (POST /context)")
    r = client.post(f"/api/v1/temporal/context/{session_id}")
    assert r.status_code == 201, f"Context generation failed: {r.text}"
    package_data = r.json()

    # Assert package fields
    assert "selected_references" in package_data
    assert len(package_data["selected_references"]) == selected_count
    assert "provider_summary" in package_data
    assert "cloud_statistics" in package_data
    assert "temporal_statistics" in package_data
    assert "spatial_statistics" in package_data
    assert "context_summary" in package_data
    assert "reference_metadata" in package_data
    
    context_summary = package_data["context_summary"]
    print("✓ Package metrics successfully generated:")
    print(f"  - Summary: {context_summary}")
    print(f"  - Provider counts: {package_data['provider_summary']['provider_counts']}")
    print(f"  - Avg Cloud Cover: {package_data['cloud_statistics']['average']:.2f}%")
    print(f"  - Avg Temp Distance: {package_data['temporal_statistics']['average']:.1f} days")
    print(f"  - Avg Spatial Overlap: {package_data['spatial_statistics']['average']:.2f}%")

    # 4. Verify Session status milestone
    print_header("4. Verify Analysis Session Milestone Status")
    r = client.get(f"/api/v1/analysis/{session_id}")
    assert r.status_code == 200
    session_status = r.json()["status"]
    assert session_status == SessionStatus.TEMPORAL_CONTEXT_GENERATED.value, f"Expected TEMPORAL_CONTEXT_GENERATED, got {session_status}"
    print("✓ Session status updated to TEMPORAL_CONTEXT_GENERATED.")

    # 5. Retrieve Context record (GET /context)
    print_header("5. Retrieve Flat Context Record (GET /context)")
    r = client.get(f"/api/v1/temporal/context/{session_id}")
    assert r.status_code == 200, f"GET flat context failed: {r.text}"
    flat_record = r.json()
    assert flat_record["session_id"] == session_id
    assert flat_record["dataset_id"] == dataset_id
    assert flat_record["provider_count"] == len(package_data["provider_summary"]["providers_represented"])
    assert flat_record["reference_count"] == selected_count
    print("✓ Flat temporal context record retrieved successfully.")

    # 6. Retrieve Summary (GET /context/summary)
    print_header("6. Retrieve Briefing Summary (GET /context/summary)")
    r = client.get(f"/api/v1/temporal/context/{session_id}/summary")
    assert r.status_code == 200, f"GET summary failed: {r.text}"
    assert r.json() == context_summary
    print("✓ Text summary endpoint returns correct string.")

    # 7. Retrieve Full Statistics Package (GET /context/statistics)
    print_header("7. Retrieve Detailed Package (GET /context/statistics)")
    r = client.get(f"/api/v1/temporal/context/{session_id}/statistics")
    assert r.status_code == 200, f"GET statistics failed: {r.text}"
    retrieved_package = r.json()
    assert retrieved_package["context_summary"] == context_summary
    assert len(retrieved_package["selected_references"]) == selected_count
    print("✓ Full analytics payload successfully retrieved.")

    # 8. Verify Mission Control Integration
    print_header("8. Verify Mission Control Integration")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc_data = r.json()
    
    assert mc_data["status"]["temporal"] == "available", f"Expected available temporal status, got {mc_data['status']['temporal']}"
    assert mc_data["temporal"] is not None
    assert mc_data["temporal"]["id"] == flat_record["id"]
    
    # Assert briefing includes the temporal context briefing text
    assert context_summary in mc_data["summary"], "Briefing summary should contain the temporal summary briefing."
    
    print("✓ Mission control status lists 'temporal' as 'available'.")
    print("✓ Mission control 'temporal' object contains the validated TemporalContextResponse.")
    print("✓ Dynamic briefing includes the temporal briefing summary.")

    print("\n==================================================")
    print(" ALL PHASE 5D VERIFICATIONS PASSED!")
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
