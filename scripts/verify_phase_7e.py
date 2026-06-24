import sys
import os
import sqlite3
import json
import shutil

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_7e.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 7E Reconstruction Evaluation Verification...")
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
    print(f"Discovered demo dataset: {target_ds['dataset_name']}")

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

    # 4. Error Handling: Run evaluation before prerequisite steps
    print_header("4. Test Error Handling (Evaluate before Reconstruction & Optimization)")
    r = client.post(f"/api/v1/reconstruction/evaluate/{session_id}")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"Success: Correctly rejected evaluation before baseline/optimization: {r.json()['detail']}")

    # 5. Run prerequisite analysis phases (Inspection -> Metadata -> Geospatial -> Temporal -> Cloud)
    print_header("5. Run Prerequisite Intelligence Layers (Phases 1-6)")
    client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    client.get(f"/api/v1/geospatial/{dataset_id}/context")
    client.get(f"/api/v1/location/{dataset_id}/context")
    client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    client.post(f"/api/v1/temporal/discover/{session_id}", json={"temporal_window_days": 30})
    client.post(f"/api/v1/temporal/select/{session_id}", json={"num_references": 3})
    client.post(f"/api/v1/temporal/context/{session_id}")
    client.post(f"/api/v1/cloud-detection/run/{dataset_id}")
    client.post(f"/api/v1/cloud-classification/run/{dataset_id}")
    client.post(f"/api/v1/cloud-shadow/run/{dataset_id}")
    client.post(f"/api/v1/cloud-segmentation/run/{dataset_id}")
    client.post(f"/api/v1/cloud-analytics/run/{dataset_id}")
    print("Prerequisites initialized.")

    # 6. Run Baseline Reconstruction (Phase 7C)
    print_header("6. Run Baseline Reconstruction (Phase 7C)")
    r = client.post(f"/api/v1/reconstruction/run/{session_id}", json={"strategy": "TELEA"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("Baseline reconstruction completed.")

    # 7. Error Handling: Run evaluation before optimization
    print_header("7. Test Error Handling (Evaluate before Optimization)")
    r = client.post(f"/api/v1/reconstruction/evaluate/{session_id}")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"Success: Correctly rejected evaluation before optimization: {r.json()['detail']}")

    # 8. Run Reconstruction Optimization (Phase 7D)
    print_header("8. Run Reconstruction Optimization (Phase 7D)")
    r = client.post(f"/api/v1/reconstruction/optimize/{session_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("Reconstruction optimization completed.")

    # 9. Run Reconstruction Evaluation (Phase 7E)
    print_header("9. Run Reconstruction Evaluation (Phase 7E)")
    r = client.post(f"/api/v1/reconstruction/evaluate/{session_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    eval_results = r.json()
    print("Reconstruction evaluation completed successfully. Response summary keys:")
    print(list(eval_results.keys()))

    # Verify response schema
    assert "report" in eval_results
    assert "summary" in eval_results
    assert "metrics" in eval_results
    assert "scorecard" in eval_results

    # 10. Verify Filesystem Artifacts Created
    print_header("10. Verify Stored Filesystem Artifacts")
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    eval_dir = os.path.join(workspace_root, f"datasets/reconstruction_evaluations/{dataset_id}")
    
    report_file = os.path.join(eval_dir, "evaluation_report.json")
    summary_file = os.path.join(eval_dir, "evaluation_summary.json")
    metrics_file = os.path.join(eval_dir, "quality_metrics.json")
    scorecard_file = os.path.join(eval_dir, "reconstruction_scorecard.json")

    for fpath in [report_file, summary_file, metrics_file, scorecard_file]:
        print(f"Checking file: {fpath}")
        assert os.path.exists(fpath), f"File {fpath} does not exist!"

    # Verify JSON contents
    with open(metrics_file, "r") as f:
        metrics_data = json.load(f)
    print(f"Metrics payload: {json.dumps(metrics_data, indent=2)}")
    
    assert 0 <= metrics_data["reconstruction_coverage"] <= 100
    assert 0 <= metrics_data["completeness_score"] <= 100
    assert 0 <= metrics_data["boundary_quality_score"] <= 100
    assert 0 <= metrics_data["spatial_consistency_score"] <= 100
    assert 0 <= metrics_data["temporal_agreement_score"] <= 100
    assert 0 <= metrics_data["structural_preservation_score"] <= 100
    assert 0 <= metrics_data["artifact_score"] <= 100
    assert 0 <= metrics_data["overall_score"] <= 100

    with open(scorecard_file, "r") as f:
        scorecard_data = json.load(f)
    print(f"Scorecard payload: {json.dumps(scorecard_data, indent=2)}")
    assert "grades" in scorecard_data
    assert "overall_grade" in scorecard_data
    assert scorecard_data["dataset_id"] == dataset_id

    # 11. Verify GET routes
    print_header("11. Verify API GET Routes for Evaluation")

    # GET /api/v1/reconstruction/{session_id}/evaluation
    r = client.get(f"/api/v1/reconstruction/{session_id}/evaluation")
    assert r.status_code == 200
    assert r.json()["dataset_information"]["epsg_code"] is not None

    # GET /api/v1/reconstruction/{session_id}/evaluation/metrics
    r = client.get(f"/api/v1/reconstruction/{session_id}/evaluation/metrics")
    assert r.status_code == 200
    assert "overall_score" in r.json()

    # GET /api/v1/reconstruction/{session_id}/evaluation/scorecard
    r = client.get(f"/api/v1/reconstruction/{session_id}/evaluation/scorecard")
    assert r.status_code == 200
    assert "grades" in r.json()

    # GET /api/v1/reconstruction/{session_id}/evaluation/status
    r = client.get(f"/api/v1/reconstruction/{session_id}/evaluation/status")
    assert r.status_code == 200
    assert r.json()["evaluation_status"] == "COMPLETED"

    # 12. Verify Mission Control Integration
    print_header("12. Verify Mission Control Integration")
    r = client.get(f"/api/v1/mission-control/{dataset_id}")
    assert r.status_code == 200
    mc = r.json()
    
    assert mc["status"]["reconstruction"] == "available"
    assert mc["reconstruction"] is not None
    assert mc["reconstruction"]["evaluation_completed"] is True
    assert mc["reconstruction"]["overall_score"] == eval_results["summary"]["overall_score"]
    assert mc["reconstruction"]["evaluation_summary"] == eval_results["summary"]["summary_text"]
    assert mc["reconstruction"]["evaluation_metrics"] is not None
    
    print("Mission Control details verified:")
    print(f"  Overall Score: {mc['reconstruction']['overall_score']}")
    print(f"  Briefing Text: \"{mc['summary']}\"")
    # Verify the evaluation summary text is inside the briefing
    assert eval_results["summary"]["summary_text"] in mc["summary"]
    print("Briefing text verified successfully.")

    # Clean up generated files from disk
    shutil.rmtree(eval_dir, ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/reconstructions/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/cloud_segmentations/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/inspections/{dataset_id}"), ignore_errors=True)
    shutil.rmtree(os.path.join(workspace_root, f"datasets/previews/{dataset_id}"), ignore_errors=True)
    print("\nCleaned up generated filesystem directory.")

    print("\n==================================================")
    print(" ALL PHASE 7E EVALUATION VERIFICATIONS PASSED!")
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
