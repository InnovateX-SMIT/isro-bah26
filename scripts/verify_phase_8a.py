import sys
import os
import shutil
import json
import sqlite3

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_8a.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.models.reconstruction_run import ReconstructionRun
from app.models.confidence_estimation import ConfidenceEstimation
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.selected_reference_repository import SelectedReferenceRepository
from app.services.confidence_service import ConfidenceService

print("Starting Phase 8A Confidence Estimation Engine Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Setup prerequisite state using API client
    print_header("1. Setup Prerequisite Pipeline (Phases 1-7E)")
    
    # Create Analysis Session
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session_id = r.json()["session_id"]
    print(f"Session created: {session_id}")

    # Discover demo datasets
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200
    demo_datasets = r.json()
    assert len(demo_datasets) > 0
    target_ds = demo_datasets[0]

    # Register dataset
    register_payload = {
        "analysis_session_id": session_id,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    }
    r = client.post("/api/v1/datasets/register", json=register_payload)
    assert r.status_code == 201
    dataset_id = r.json()["dataset_id"]
    print(f"Registered dataset: {dataset_id}")

    # Run inspection, metadata, geospatial, temporal, and cloud layers
    client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    client.get(f"/api/v1/geospatial/{dataset_id}/context")
    client.get(f"/api/v1/location/{dataset_id}/context")
    client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    
    # Run temporal selection with num_references=3
    client.post(f"/api/v1/temporal/discover/{session_id}", json={"temporal_window_days": 30})
    client.post(f"/api/v1/temporal/select/{session_id}", json={"num_references": 3})
    client.post(f"/api/v1/temporal/context/{session_id}")
    
    # Run cloud layers
    client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
    client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
    client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
    client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
    client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")

    # Run reconstruction, optimization, evaluation
    client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "TELEA"})
    client.post(f"/api/v1/reconstruction/optimize/{session_id}")
    client.post(f"/api/v1/reconstruction/evaluate/{session_id}")
    print("Prerequisites setup completed.")

    # 2. Dynamically discover an existing completed reconstruction run
    print_header("2. Dynamically Discover Completed Reconstruction Run")
    db = SessionLocal()
    
    run_rec = db.query(ReconstructionRun).filter(
        ReconstructionRun.reconstruction_status == "COMPLETED",
        ReconstructionRun.dataset_id == dataset_id
    ).first()
    
    assert run_rec is not None, "Failed to discover completed reconstruction run in database."
    reconstruction_run_id = run_rec.id
    print(f"Dynamically discovered Reconstruction Run: {reconstruction_run_id} for dataset: {dataset_id}")

    # 3. Instantiate service layer to run verification end-to-end
    print_header("3. Run Confidence Estimation via Service Layer")
    confidence_repo = ConfidenceRepository(db)
    reconstruction_repo = ReconstructionRepository(db)
    cloud_segmentation_repo = CloudSegmentationRepository(db)
    cloud_classification_repo = CloudClassificationRepository(db)
    reference_stack_repo = TemporalReferenceStackRepository(db)
    selected_reference_repo = SelectedReferenceRepository(db)

    service = ConfidenceService(
        db=db,
        confidence_repo=confidence_repo,
        reconstruction_repo=reconstruction_repo,
        cloud_segmentation_repo=cloud_segmentation_repo,
        cloud_classification_repo=cloud_classification_repo,
        reference_stack_repo=reference_stack_repo,
        selected_reference_repo=selected_reference_repo
    )

    # Trigger confidence estimation first time
    conf_rec_1 = service.run_confidence_estimation(reconstruction_run_id)
    assert conf_rec_1 is not None
    assert conf_rec_1.confidence_status == "completed"
    confidence_id = conf_rec_1.confidence_id
    print(f"Confidence Estimation completed. Confidence ID: {confidence_id}")

    # 4. Assert lazy-cache works (second call returns same ID)
    print_header("4. Verify Lazy-Cache (No Duplication)")
    conf_rec_2 = service.run_confidence_estimation(reconstruction_run_id)
    assert conf_rec_2 is not None
    assert conf_rec_2.confidence_id == confidence_id, f"Lazy cache failed! Got different IDs: {conf_rec_2.confidence_id} vs {confidence_id}"
    print("Lazy-cache verified successfully. Second call returned same ID.")

    # 5. Assert filesystem files exist and are non-empty
    print_header("5. Verify Filesystem Output Artifacts")
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    tif_abs_path = os.path.abspath(os.path.join(workspace_root, conf_rec_1.confidence_map_path))
    png_abs_path = os.path.abspath(os.path.join(workspace_root, conf_rec_1.confidence_preview_path))

    print(f"Checking TIF path: {tif_abs_path}")
    assert os.path.exists(tif_abs_path), "Confidence map TIFF file does not exist!"
    assert os.path.getsize(tif_abs_path) > 0, "Confidence map TIFF file is empty!"

    print(f"Checking PNG path: {png_abs_path}")
    assert os.path.exists(png_abs_path), "Confidence preview PNG file does not exist!"
    assert os.path.getsize(png_abs_path) > 0, "Confidence preview PNG file is empty!"
    print("Filesystem output products verified successfully.")

    # 6. Assert metrics and inference basis constraints
    print_header("6. Verify Metrics and Inference Basis explainability")
    print(f"Mean Confidence Score: {conf_rec_1.mean_confidence_score}")
    print(f"Low Confidence Area %: {conf_rec_1.low_confidence_area_percent}")
    print(f"Inference Basis details:\n{conf_rec_1.inference_basis}")

    assert 0.0 <= conf_rec_1.mean_confidence_score <= 100.0
    assert 0.0 <= conf_rec_1.low_confidence_area_percent <= 100.0
    assert conf_rec_1.inference_basis != ""
    assert "Degraded mode" in conf_rec_1.inference_basis or "Temporal Agreement:" in conf_rec_1.inference_basis
    print("Metrics and explainability fields verified successfully.")

    # 7. Verify API endpoints
    print_header("7. Verify API Endpoints")
    # GET confidence record
    r = client.get(f"/api/v1/confidence/{reconstruction_run_id}")
    assert r.status_code == 200
    assert r.json()["confidence_id"] == confidence_id

    # GET image preview stream
    r = client.get(f"/api/v1/confidence/{reconstruction_run_id}/image")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"

    # GET mission control profile and check integration
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc_profile = r.json()
    assert mc_profile["status"]["confidence"] == "available"
    assert mc_profile["confidence"] is not None
    assert mc_profile["confidence"]["confidence_id"] == confidence_id
    assert "confidence estimation complete" in mc_profile["summary"].lower()
    print("API endpoints and Mission Control integration verified successfully.")

    # 8. Assert Cascade Delete behavior
    print_header("8. Verify Cascade Delete Behavior")
    # Deleting reconstruction run in database
    db.delete(run_rec)
    db.commit()
    print("Parent ReconstructionRun deleted from database.")

    # Try fetching the confidence record
    conf_after_delete = db.query(ConfidenceEstimation).filter(
        ConfidenceEstimation.confidence_id == confidence_id
    ).first()
    assert conf_after_delete is None, "Cascade delete failed! Confidence record still exists after parent run was deleted."
    print("Cascade delete verified successfully. ConfidenceEstimation record was removed.")

    # Clean up files from disk
    shutil.rmtree(os.path.join(workspace_root, f"datasets/confidence_estimations/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/reconstruction_evaluations/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_segmentations/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_shadows/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_classifications/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_detections/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/inspections/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/previews/{dataset_id}"), ignore_errors=True)
    print("Cleanup: Stored files deleted from disk.")

    print("\n==================================================")
    print(" ALL PHASE 8A ENGINE VERIFICATIONS PASSED!")
    print("==================================================")

except Exception as e:
    print(f"\nVerification failed with error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    db.close()
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print("\nCleanup: Test database file deleted.")
        except Exception as e:
            print(f"\nCleanup warning: Could not remove test database file: {e}")
