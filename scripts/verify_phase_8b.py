import sys
import os
import shutil
import json
import sqlite3

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_8b.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.models.confidence_estimation import ConfidenceEstimation
from app.models.reliability_score import ReliabilityScore
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.selected_reference_repository import SelectedReferenceRepository
from app.repositories.reliability_repository import ReliabilityRepository

from app.services.confidence_service import ConfidenceService
from app.services.reliability_service import ReliabilityService

print("Starting Phase 8B Reliability Scoring Engine Verification...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Setup prerequisite state using July demo dataset
    print_header("1. Setup Prerequisite Pipeline (Phases 1-8A) using July Dataset")
    
    # Create Analysis Session
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201
    session_id = r.json()["session_id"]
    print(f"Session created: {session_id}")

    # Discover demo datasets and find a July one
    r = client.get("/api/v1/datasets/demo")
    assert r.status_code == 200
    demo_datasets = r.json()
    assert len(demo_datasets) > 0
    
    target_ds = None
    for ds in demo_datasets:
        if "JUL" in ds["dataset_name"].upper():
            target_ds = ds
            break
            
    if target_ds is None:
        target_ds = demo_datasets[0]
        
    print(f"Selected demo dataset: {target_ds['dataset_name']}")

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
    
    # Run temporal selection
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
    
    # Run confidence estimation
    db = SessionLocal()
    recon_repo = ReconstructionRepository(db)
    run_rec = recon_repo.get_by_dataset(dataset_id)
    assert run_rec is not None
    
    confidence_repo = ConfidenceRepository(db)
    cloud_segmentation_repo = CloudSegmentationRepository(db)
    cloud_classification_repo = CloudClassificationRepository(db)
    reference_stack_repo = TemporalReferenceStackRepository(db)
    selected_reference_repo = SelectedReferenceRepository(db)

    conf_service = ConfidenceService(
        db=db,
        confidence_repo=confidence_repo,
        reconstruction_repo=recon_repo,
        cloud_segmentation_repo=cloud_segmentation_repo,
        cloud_classification_repo=cloud_classification_repo,
        reference_stack_repo=reference_stack_repo,
        selected_reference_repo=selected_reference_repo
    )
    conf_rec = conf_service.run_confidence_estimation(run_rec.id)
    assert conf_rec is not None
    confidence_estimation_id = conf_rec.confidence_id
    print(f"Confidence Estimation completed. Confidence ID: {confidence_estimation_id}")

    # 2. Dynamically discover an existing completed ConfidenceEstimation
    print_header("2. Dynamically Discover Completed Confidence Estimation")
    db_conf = db.query(ConfidenceEstimation).filter(
        ConfidenceEstimation.confidence_status == "completed",
        ConfidenceEstimation.confidence_id == confidence_estimation_id
    ).first()
    
    assert db_conf is not None, "Failed to discover completed ConfidenceEstimation in database."
    print(f"Dynamically discovered ConfidenceEstimation ID: {db_conf.confidence_id}")

    # 3. Instantiate reliability service layer to run verification
    print_header("3. Run Reliability Scoring via Service Layer")
    reliability_repo = ReliabilityRepository(db)
    
    rel_service = ReliabilityService(
        db=db,
        reliability_repo=reliability_repo,
        confidence_repo=confidence_repo,
        cloud_segmentation_repo=cloud_segmentation_repo
    )

    # Trigger scoring first time
    rel_rec_1 = rel_service.run_reliability_scoring(db_conf.confidence_id)
    assert rel_rec_1 is not None
    assert rel_rec_1.reliability_status == "completed"
    reliability_id = rel_rec_1.reliability_id
    print(f"Reliability Scoring completed. Reliability ID: {reliability_id}")

    # 4. Assert lazy-cache works (second call returns same ID)
    print_header("4. Verify Lazy-Cache (No Duplication)")
    rel_rec_2 = rel_service.run_reliability_scoring(db_conf.confidence_id)
    assert rel_rec_2 is not None
    assert rel_rec_2.reliability_id == reliability_id, f"Lazy cache failed! Got different IDs: {rel_rec_2.reliability_id} vs {reliability_id}"
    print("Lazy-cache verified successfully. Second call returned same ID.")

    # 5. Assert metrics, tiers and inference basis constraints
    print_header("5. Verify Metrics, Tiers, and Scoring Basis explainability")
    print(f"Dataset Reliability Score: {rel_rec_1.dataset_reliability_score}")
    print(f"Dataset Reliability Tier: {rel_rec_1.dataset_reliability_tier}")
    print(f"Reconstruction Reliability Score: {rel_rec_1.reconstruction_reliability_score}")
    print(f"Scoring Basis details:\n{rel_rec_1.scoring_basis}")

    assert 0.0 <= rel_rec_1.dataset_reliability_score <= 100.0
    assert 0.0 <= rel_rec_1.reconstruction_reliability_score <= 100.0
    
    # Verify tier matches score banding
    score = rel_rec_1.dataset_reliability_score
    if score >= 75.0:
        expected_tier = "High"
    elif score >= 50.0:
        expected_tier = "Moderate"
    elif score >= 25.0:
        expected_tier = "Low"
    else:
        expected_tier = "Very Low"
        
    assert rel_rec_1.dataset_reliability_tier == expected_tier, f"Expected tier {expected_tier}, got {rel_rec_1.dataset_reliability_tier}"
    assert rel_rec_1.scoring_basis != ""
    assert "blends spatial/spectral output data usability" in rel_rec_1.scoring_basis
    print("Metrics, Tiers and scoring explainability verified successfully.")

    # 6. Verify region list counts
    print_header("6. Verify Region-Level Reliability Metrics count")
    seg_db = cloud_segmentation_repo.get_by_dataset(dataset_id)
    expected_regions = json.loads(seg_db.region_details_json)
    expected_region_count = len(expected_regions)
    
    regions_list = json.loads(rel_rec_1.region_reliability_json)
    print(f"Expected Region Count: {expected_region_count}, Actual: {len(regions_list)}")
    assert len(regions_list) == expected_region_count, f"Region count mismatch: {len(regions_list)} vs {expected_region_count}"
    
    for reg in regions_list:
        print(f"  Region ID {reg['region_id']}: Mean Confidence={reg['mean_confidence']}, Tier={reg['reliability_tier']}, Area={reg['area_px']} px")
        assert 0.0 <= reg["mean_confidence"] <= 100.0
        assert reg["reliability_tier"] in ("High", "Moderate", "Low", "Very Low")
        assert reg["area_px"] > 0
    print("Region-level scores mapped and verified successfully.")

    # 7. Verify API endpoints
    print_header("7. Verify API Endpoints")
    # GET reliability score
    r = client.get(f"/api/v1/reliability/{confidence_estimation_id}")
    assert r.status_code == 200
    res_data = r.json()
    assert res_data["reliability_id"] == reliability_id
    assert "region_reliability" in res_data
    assert len(res_data["region_reliability"]) == expected_region_count
    print("API endpoints returned successfully structured, parsed JSON lists.")

    # GET mission control profile and check integration
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc_profile = r.json()
    assert mc_profile["status"]["reliability"] == "available"
    assert mc_profile["reliability"] is not None
    assert mc_profile["reliability"]["reliability_id"] == reliability_id
    assert "reliability is rated as" in mc_profile["summary"].lower()
    print("Mission Control integration verified successfully.")

    # 8. Assert Cascade Delete behavior
    print_header("8. Verify Cascade Delete Behavior")
    # Deleting confidence estimation in database
    db.delete(db_conf)
    db.commit()
    print("Parent ConfidenceEstimation deleted from database.")

    # Try fetching the reliability record
    rel_after_delete = db.query(ReliabilityScore).filter(
        ReliabilityScore.reliability_id == reliability_id
    ).first()
    assert rel_after_delete is None, "Cascade delete failed! Reliability record still exists after parent confidence run was deleted."
    print("Cascade delete verified successfully. ReliabilityScore record was removed.")

    # Clean up files from disk
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
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
    print(" ALL PHASE 8B ENGINE VERIFICATIONS PASSED!")
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
