import sys
import os
import sqlite3
import json
import shutil
import time
import numpy as np
import rasterio

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_12d.db"))
# Remove existing test DB if any
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except Exception:
        pass

os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db
from app.services.temporal.provider_registry import registry
from app.services.temporal.providers.base import TemporalProvider

print("Starting Phase 12D Failure Testing...")
init_db()

client = TestClient(app)

# Register mock ZeroCandidateProvider for testing zero-candidate scenarios
class ZeroCandidateProvider(TemporalProvider):
    @property
    def name(self) -> str:
        return "ZeroCandidateProvider"

    @property
    def is_primary(self) -> bool:
        return False

    @property
    def description(self) -> str:
        return "Mock provider returning zero candidates"

    def health_check(self) -> bool:
        return True

    def search_imagery(self, coordinates, bounding_box, acquisition_date):
        return []

    def get_reference(self, candidate_id):
        return {}

registry.register_provider(ZeroCandidateProvider())

# Create test failures directory
failures_base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets", "test_failures"))
if os.path.exists(failures_base):
    shutil.rmtree(failures_base)
os.makedirs(failures_base, exist_ok=True)

def print_header(title):
    print(f"\n==================================================")
    print(f" TEST: {title}")
    print(f"==================================================")

try:
    # ----------------------------------------------------
    # Test 1: Invalid/Non-existent Dataset Path
    # ----------------------------------------------------
    print_header("1. Non-existent/Invalid Dataset Path")
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session_id_1 = r.json()["session_id"]
    
    run_payload = {
        "dataset_name": "Nonexistent Dataset",
        "dataset_path": "datasets/test_failures/nonexistent_path",
        "dataset_type": "DEMO"
    }
    
    r = client.post(f"/api/v1/workflow/run/{session_id_1}", json=run_payload)
    # The orchestrator handles stage exceptions and returns the failed state
    assert r.status_code == 200
    run_state = r.json()
    print(f"Orchestration status: {run_state['status']}")
    assert run_state["status"] == "failed"
    
    # Register Dataset stage should have failed
    register_stage = next(s for s in run_state["stages"] if s["name"] == "Register Dataset")
    print(f"Register Dataset Stage status: {register_stage['status']}")
    print(f"Error Summary: {register_stage['error_summary']}")
    assert register_stage["status"] == "failed"
    assert "does not exist" in register_stage["error_summary"].lower()
    
    # Validation Endpoint check
    r = client.get(f"/api/v1/workflow/validate/{session_id_1}")
    val_res = r.json()
    assert val_res["overall_valid"] is False
    assert "does not exist" in val_res["upload"]["message"].lower() or "not registered" in val_res["upload"]["message"].lower()
    print("✓ Test 1: Invalid dataset path handled successfully.")

    # ----------------------------------------------------
    # Test 2: Corrupted Dataset
    # ----------------------------------------------------
    print_header("2. Corrupted Dataset (Invalid TIFF headers)")
    corrupt_dir = os.path.join(failures_base, "corrupted_dataset")
    os.makedirs(corrupt_dir, exist_ok=True)
    with open(os.path.join(corrupt_dir, "corrupt.tif"), "wb") as f:
        f.write(b"NOT_A_VALID_TIFF_FILE_DATA_RANDOM_BYTES")
    
    r = client.post("/api/v1/analysis")
    session_id_2 = r.json()["session_id"]
    
    run_payload = {
        "dataset_name": "Corrupted Dataset",
        "dataset_path": "datasets/test_failures/corrupted_dataset",
        "dataset_type": "DEMO"
    }
    
    r = client.post(f"/api/v1/workflow/run/{session_id_2}", json=run_payload)
    assert r.status_code == 200
    run_state = r.json()
    print(f"Orchestration status: {run_state['status']}")
    assert run_state["status"] == "failed"
    
    # Generate Preview stage should fail because of corrupted TIFF
    preview_stage = next(s for s in run_state["stages"] if s["name"] == "Generate Preview")
    print(f"Generate Preview Stage status: {preview_stage['status']}")
    print(f"Error Summary: {preview_stage['error_summary']}")
    assert preview_stage["status"] == "failed"
    
    # Validation Endpoint check
    r = client.get(f"/api/v1/workflow/validate/{session_id_2}")
    val_res = r.json()
    assert val_res["overall_valid"] is False
    print(f"DEBUG: val_res['upload'] = {val_res['upload']}")
    assert val_res["upload"]["valid"] is False
    assert "failed" in val_res["upload"]["message"].lower() or "readability" in val_res["upload"]["message"].lower() or "corrupt" in val_res["upload"]["message"].lower() or "incomplete" in val_res["upload"]["message"].lower()
    print("✓ Test 2: Corrupted dataset handled successfully.")

    # ----------------------------------------------------
    # Test 3: Missing Metadata and Coordinates
    # ----------------------------------------------------
    print_header("3. Missing Metadata and Coordinates")
    missing_dir = os.path.join(failures_base, "missing_metadata_coords")
    os.makedirs(missing_dir, exist_ok=True)
    
    # Create a TIFF with NO coordinate references (no CRS or transformation bounds)
    tif_path = os.path.join(missing_dir, "raster.tif")
    with rasterio.open(
        tif_path,
        "w",
        driver="GTiff",
        height=50,
        width=50,
        count=1,
        dtype=rasterio.uint8
    ) as dst:
        dst.write(np.zeros((1, 50, 50), dtype=np.uint8))
        
    r = client.post("/api/v1/analysis")
    session_id_3 = r.json()["session_id"]
    
    run_payload = {
        "dataset_name": "Missing Meta Coords Dataset",
        "dataset_path": "datasets/test_failures/missing_metadata_coords",
        "dataset_type": "DEMO"
    }
    
    r = client.post(f"/api/v1/workflow/run/{session_id_3}", json=run_payload)
    assert r.status_code == 200
    run_state = r.json()
    
    # Run validation checks
    r = client.get(f"/api/v1/workflow/validate/{session_id_3}")
    val_res = r.json()
    print(f"Validation Overall Valid: {val_res['overall_valid']}")
    print(f"Metadata Valid: {val_res['metadata']['valid']}")
    print(f"Metadata Msg: {val_res['metadata']['message']}")
    
    assert val_res["overall_valid"] is False
    assert val_res["metadata"]["valid"] is False
    assert any(term in val_res["metadata"]["message"].lower() for term in ["missing", "blocked", "unprojected", "georeferenced"])
    print("✓ Test 3: Missing metadata and coordinates handled successfully.")

    # ----------------------------------------------------
    # Test 4: Missing Historical References
    # ----------------------------------------------------
    print_header("4. Missing Historical References")
    # Discover first valid demo dataset to use its path
    r = client.get("/api/v1/datasets/demo")
    demo_ds = r.json()[0]
    
    r = client.post("/api/v1/analysis")
    session_id_4 = r.json()["session_id"]
    
    # Let's run the orchestrated workflow but we force ZeroCandidateProvider for GEE/Local reference lookup.
    # To do this, we can run up to "Generate Location Context" or run the service dynamically.
    # Actually, we can run the pipeline up to reference selection, but with provider set to ZeroCandidateProvider.
    # Let's call the specific endpoints step-by-step to trigger the Reference Selection error:
    
    # Step A: Register dataset
    r = client.post(f"/api/v1/datasets/register", json={
        "analysis_session_id": session_id_4,
        "dataset_name": demo_ds["dataset_name"],
        "dataset_path": demo_ds["dataset_path"],
        "dataset_type": "DEMO"
    })
    assert r.status_code == 201
    dataset_id = r.json()["dataset_id"]
    
    # Step B: Run inspection
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    print(f"DEBUG: inspect status = {r.status_code}, response = {r.text}")
    assert r.status_code == 200
    
    # Step C: Extract metadata
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200
    
    # Step D: Generate geospatial context
    r = client.get(f"/api/v1/geospatial/{dataset_id}/context")
    assert r.status_code == 200
    
    # Step E: Trigger discovery with ZeroCandidateProvider
    r = client.post(
        f"/api/v1/temporal/discover/{session_id_4}",
        json={"provider_name": "ZeroCandidateProvider", "temporal_window_days": 30}
    )
    assert r.status_code == 200
    disc_data = r.json()
    print(f"Candidates discovered: {disc_data['candidate_count']}")
    assert disc_data["candidate_count"] == 0
    
    # Step F: Run Reference Selection (should raise 400 error)
    r = client.post(
        f"/api/v1/temporal/select/{session_id_4}",
        json={"num_references": 3}
    )
    print(f"Reference Selection status: {r.status_code}")
    print(f"Reference Selection message: {r.json()['detail']}")
    assert r.status_code == 400
    assert "no candidate observations discovered" in r.json()["detail"].lower()
    
    # Check workflow validation status
    r = client.get(f"/api/v1/workflow/validate/{session_id_4}")
    val_res = r.json()
    assert val_res["overall_valid"] is False
    assert val_res["temporal"]["valid"] is False
    assert any(term in val_res["temporal"]["message"].lower() for term in ["zero", "0", "pending"])
    print("✓ Test 4: Missing historical references handled successfully.")

    # ----------------------------------------------------
    # Clean Up
    # ----------------------------------------------------
    print_header("5. Clean Up")
    if os.path.exists(failures_base):
        shutil.rmtree(failures_base)
        
    for sid in [session_id_1, session_id_2, session_id_3, session_id_4]:
        client.delete(f"/api/v1/analysis/{sid}")
        
    if os.path.exists(db_path):
        os.remove(db_path)
        
    print("\nPhase 12D Failure Testing PASSED successfully!")
    sys.exit(0)

except Exception as e:
    print(f"\nPhase 12D Failure Testing FAILED: {e}")
    if os.path.exists(failures_base):
        try:
            shutil.rmtree(failures_base)
        except Exception:
            pass
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    import traceback
    traceback.print_exc()
    sys.exit(1)
