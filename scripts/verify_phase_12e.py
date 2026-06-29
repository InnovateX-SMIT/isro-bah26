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
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_12e.db"))
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

print("Starting Phase 12E AI Reconstruction Improvement Verification...")
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

# Register if not already present
if not any(p.name == "ZeroCandidateProvider" for p in registry.list_providers()):
    registry.register_provider(ZeroCandidateProvider())

def print_header(title):
    print(f"\n==================================================")
    print(f" TEST: {title}")
    print(f"==================================================")

try:
    # ----------------------------------------------------
    # Test 1: Deep Learning U-Net Reconstruction Workflow
    # ----------------------------------------------------
    print_header("1. Deep Learning U-Net Reconstruction Workflow")
    
    # Create session
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session_id = r.json()["session_id"]
    print(f"Session created: {session_id}")
    
    # Discover datasets
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200
    demo_datasets = r.json()
    assert len(demo_datasets) > 0
    target_ds = demo_datasets[0]
    print(f"Selected dataset: {target_ds['dataset_name']}")
    
    # Trigger full workflow with strategy="DEFAULT" (triggers U-Net model)
    run_payload = {
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"],
        "temporal_window_days": 30,
        "num_references": 3,
        "reconstruction_strategy": "DEFAULT" # triggers U-Net model
    }
    
    start_time = time.time()
    r = client.post(f"/api/v1/workflow/run/{session_id}", json=run_payload)
    elapsed = time.time() - start_time
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    run_result = r.json()
    
    print(f"Workflow status: {run_result['status']}")
    print(f"Total processing time: {run_result['total_processing_time_ms']} ms")
    print(f"Wall-clock execution time: {elapsed:.2f} seconds")
    
    assert run_result["status"] == "completed"
    
    # Check that U-Net model was compiled and used
    recon_stage = next(s for s in run_result["stages"] if s["name"] == "Reconstruction")
    assert recon_stage["status"] == "completed"
    
    dataset_id = run_result["stages"][1]["outputs"]["dataset_id"]
    
    # Verify outputs in the database reconstruction run
    r = client.get(f"/api/v1/reconstruction/{session_id}")
    assert r.status_code == 200
    rec_run = r.json()
    print(f"Reconstruction Method Used: {rec_run['reconstruction_method']}")
    assert "U-Net" in rec_run["reconstruction_method"] or "Autoencoder" in rec_run["reconstruction_method"]
    
    # Verify files created on disk
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    tif_path = os.path.join(workspace_root, rec_run["output_image_path"])
    png_path = os.path.join(workspace_root, rec_run["preview_image_path"])
    onnx_path = os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}/reconstruction_model.onnx")
    pt_path = os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}/reconstruction_model.pt")
    
    assert os.path.exists(tif_path), "Reconstructed GeoTIFF is missing!"
    assert os.path.exists(png_path), "Preview PNG is missing!"
    assert os.path.exists(pt_path), "Compiled TorchScript model is missing!"
    
    # Verify the GeoTIFF matches raster specifications (3 bands)
    with rasterio.open(tif_path) as src:
        assert src.count == 3
        print(f"Verified output GeoTIFF dimensions: {src.width}x{src.height}, Bands: {src.count}")
        
    print("✓ Test 1: Deep Learning U-Net reconstruction successfully ran and saved models.")

    # ----------------------------------------------------
    # Test 2: Graceful Execution with Zero Temporal Imagery
    # ----------------------------------------------------
    print_header("2. Graceful Execution with Zero Temporal Imagery Candidates")
    
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session_id_2 = r.json()["session_id"]
    print(f"Session created: {session_id_2}")
    
    # Trigger full workflow with ZeroCandidateProvider forced
    run_payload_2 = {
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"],
        # Triggering the zero candidates fallback requires ZeroCandidateProvider
        # We will discover via the provider registry which resolves provider based on name
        "reconstruction_strategy": "DEFAULT"
    }
    
    # Before running workflow, we can register ZeroCandidateProvider as primary or delete GEE
    # Actually, we can run step by step to simulate it correctly
    
    # Step A: Register dataset
    r = client.post(f"/api/v1/datasets/register", json={
        "analysis_session_id": session_id_2,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    })
    assert r.status_code == 201
    dataset_id_2 = r.json()["dataset_id"]
    
    # Step B: Run inspection & metadata
    client.post(f"/api/v1/dataset-inspection/run/{dataset_id_2}")
    client.post(f"/api/v1/dataset-metadata/run/{dataset_id_2}")
    client.get(f"/api/v1/geospatial/{dataset_id_2}/context")
    client.get(f"/api/v1/location/{dataset_id_2}/context")
    client.get(f"/api/v1/geospatial-context/{dataset_id_2}/profile")
    
    # Step C: Discovery using ZeroCandidateProvider specifically to ensure 0 candidates
    r = client.post(
        f"/api/v1/temporal/discover/{session_id_2}",
        json={"provider_name": "ZeroCandidateProvider", "temporal_window_days": 30}
    )
    assert r.status_code == 200
    assert r.json()["candidate_count"] == 0
    
    # Step D: run the stage executor for temporal context generation
    # Which we modified to handle zero candidates scenario
    from app.services.execution_context import ExecutionContext
    from app.services.stage_executor import StageExecutor
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    exec_context = ExecutionContext(
        db=db,
        session_id=session_id_2,
        dataset_name=target_ds["dataset_name"],
        dataset_path=target_ds["dataset_path"],
        dataset_type=target_ds["dataset_type"],
        temporal_window_days=30,
        num_references=3,
        reconstruction_strategy="DEFAULT"
    )
    exec_context.dataset_id = dataset_id_2
    
    stage_executor = StageExecutor()
    print("Executing Generate Temporal Context stage with 0 candidates...")
    temp_res = stage_executor.execute_generate_temporal_context(exec_context)
    print("Temporal stage completed successfully. Outputs:")
    print(json.dumps(temp_res, indent=2))
    assert temp_res["reference_count"] == 0
    
    # Step E: run cloud layers
    client.post(f"/api/v1/cloud-detection/run/{dataset_id_2}")
    client.post(f"/api/v1/cloud-classification/run/{dataset_id_2}")
    client.post(f"/api/v1/cloud-shadow/run/{dataset_id_2}")
    client.post(f"/api/v1/cloud-segmentation/run/{dataset_id_2}")
    client.post(f"/api/v1/cloud-analytics/run/{dataset_id_2}")
    
    # Step F: Run Reconstruction stage (should succeed with 0 temporal relevance / spatial only)
    print("Executing Reconstruction stage with 0 temporal references...")
    recon_res = stage_executor.execute_reconstruction(exec_context)
    print("Reconstruction stage completed successfully. Outputs:")
    print(json.dumps(recon_res, indent=2))
    assert "report" in recon_res
    # Verify in DB
    from app.repositories.reconstruction_repository import ReconstructionRepository
    recon_repo = ReconstructionRepository(db)
    run_rec = recon_repo.get_latest_by_session(session_id_2)
    assert run_rec is not None
    assert run_rec.reconstruction_status == "COMPLETED"
    
    # Run downstream stages to populate validation targets
    stage_executor.execute_confidence_estimation(exec_context)
    stage_executor.execute_mission_control_update(exec_context)
    stage_executor.execute_export_preparation(exec_context)
    
    # Step G: Run validation endpoint
    r = client.get(f"/api/v1/workflow/validate/{session_id_2}")
    assert r.status_code == 200
    val_res = r.json()
    print(f"Overall Valid with 0 temporal imagery: {val_res['overall_valid']}")
    print(f"Temporal component validation message: {val_res['temporal']['message']}")
    
    assert val_res["temporal"]["valid"] is True
    assert val_res["overall_valid"] is True
    
    print("✓ Test 2: Graceful fallback and validation success with zero candidates verified.")

    # ----------------------------------------------------
    # Clean Up
    # ----------------------------------------------------
    print_header("3. Teardown and Cleanup")
    client.delete(f"/api/v1/analysis/{session_id}")
    client.delete(f"/api/v1/analysis/{session_id_2}")
    
    if os.path.exists(db_path):
        os.remove(db_path)
        print("Cleaned up test database.")
        
    print("\n==================================================")
    print(" ALL PHASE 12E AI RECONSTRUCTION VERIFICATIONS PASSED!")
    print("==================================================")
    sys.exit(0)

except Exception as e:
    print(f"\nPhase 12E AI Reconstruction Verification FAILED: {e}")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    import traceback
    traceback.print_exc()
    sys.exit(1)
