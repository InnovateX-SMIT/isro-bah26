import sys
import os
import uuid
import datetime
import shutil

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_11b.db"))
# Remove existing test DB if any
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except Exception:
        pass

os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from sqlalchemy import text

# Import models to build mock database entries
from app.models.session import AnalysisSession
from app.models.dataset import Dataset
from app.models.dataset_metadata import DatasetMetadata
from app.models.geospatial_context import GeospatialContext
from app.models.temporal_context import TemporalContext
from app.models.cloud_segmentation import CloudSegmentation
from app.models.reconstruction_run import ReconstructionRun
from app.models.confidence_estimation import ConfidenceEstimation
from app.models.reliability_score import ReliabilityScore
from app.models.temporal_discovery import TemporalDiscovery
from app.models.temporal_reference_stack import TemporalReferenceStack
from app.models.cloud_detection import CloudDetection
from app.models.cloud_classification import CloudClassification
from app.models.cloud_shadow import CloudShadow

print("Starting Phase 11B Report Export System Verification (Fast Mock Mode)...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Populate mock session database records using SQLAlchemy
    print_header("1. Populating mock database records")
    db = SessionLocal()
    
    # Disable foreign key checks for mock insertion sequence
    db.execute(text("PRAGMA foreign_keys=OFF"))

    session_id = "test-session-uuid-11b"
    dataset_id = "test-dataset-uuid-11b"
    recon_run_id = "test-recon-uuid-11b"
    confidence_id = "test-confidence-uuid-11b"

    # Create dummy files to avoid file missing errors during validation
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Previews and reconstruction outputs
    os.makedirs(os.path.join(workspace_root, "datasets", "uploaded"), exist_ok=True)
    os.makedirs(os.path.join(workspace_root, "datasets", "previews"), exist_ok=True)
    os.makedirs(os.path.join(workspace_root, "datasets", "reconstructions", session_id), exist_ok=True)
    
    dummy_tif_path = os.path.join(workspace_root, "datasets", "reconstructions", session_id, "reconstructed_image.tif")
    dummy_png_path = os.path.join(workspace_root, "datasets", "reconstructions", session_id, "reconstruction_preview.png")
    
    with open(dummy_tif_path, "w") as f:
        f.write("DUMMY TIFF")
    with open(dummy_png_path, "w") as f:
        f.write("DUMMY PNG")

    # Add Session
    session = AnalysisSession(
        session_id=session_id,
        status="completed"
    )
    db.add(session)

    # Add Dataset
    dataset = Dataset(
        dataset_id=dataset_id,
        analysis_session_id=session_id,
        dataset_name="R2F14JUL2025073870009500051SSANSTUC00GTDB",
        dataset_path="datasets/uploaded/dummy",
        dataset_type="LISS-IV",
        dataset_status="completed"
    )
    db.add(dataset)

    # Add Metadata
    metadata = DatasetMetadata(
        metadata_id="meta-uuid",
        dataset_id=dataset_id,
        coordinate_system="UTM",
        projection_name="Transverse Mercator",
        pixel_size_x=5.0,
        pixel_size_y=5.0,
        raster_width=2048,
        raster_height=2048,
        band_count=3,
        metadata_status="available"
    )
    db.add(metadata)

    # Add Geospatial Context
    geo_ctx = GeospatialContext(
        context_id="geo-uuid",
        dataset_id=dataset_id,
        center_lat=12.0,
        center_lon=80.0,
        min_lat=11.9,
        max_lat=12.1,
        min_lon=79.9,
        max_lon=80.1,
        epsg=32644,
        crs="EPSG:32644",
        projection="UTM"
    )
    db.add(geo_ctx)

    # Add Temporal Discovery (parent for reference stack)
    discovery = TemporalDiscovery(
        id="disc-uuid",
        session_id=session_id,
        dataset_id=dataset_id,
        provider_used="LocalCache",
        search_window_start="2025-06-01",
        search_window_end="2025-08-01",
        candidate_count=5,
        status="completed"
    )
    db.add(discovery)

    # Add Temporal Reference Stack (parent for temporal context)
    ref_stack = TemporalReferenceStack(
        id="stack-uuid",
        session_id=session_id,
        dataset_id=dataset_id,
        discovery_id="disc-uuid",
        selected_count=3,
        selection_strategy="DEFAULT"
    )
    db.add(ref_stack)

    # Add Temporal Context
    temp_ctx = TemporalContext(
        id="temp-uuid",
        session_id=session_id,
        dataset_id=dataset_id,
        reference_stack_id="stack-uuid",
        provider_count=1,
        reference_count=3,
        average_cloud_cover=15.0,
        average_temporal_distance=20.0,
        average_spatial_overlap=90.0,
        summary="Temporal context loaded from 3 low-cloud reference scenes.",
        metadata_json="{}"
    )
    db.add(temp_ctx)

    # Add Cloud Detection (parent for Cloud Classification)
    cloud_det = CloudDetection(
        detection_id="det-uuid",
        dataset_id=dataset_id,
        detection_status="completed"
    )
    db.add(cloud_det)

    # Add Cloud Classification (parent for Cloud Shadow)
    cloud_class = CloudClassification(
        classification_id="class-uuid",
        dataset_id=dataset_id,
        cloud_detection_id="det-uuid",
        classification_status="completed"
    )
    db.add(cloud_class)

    # Add Cloud Shadow (parent for Cloud Segmentation)
    cloud_shad = CloudShadow(
        shadow_id="shadow-uuid",
        dataset_id=dataset_id,
        cloud_classification_id="class-uuid",
        shadow_detection_status="completed"
    )
    db.add(cloud_shad)

    # Add Cloud Segmentation
    cloud_seg = CloudSegmentation(
        segmentation_id="seg-uuid",
        dataset_id=dataset_id,
        cloud_shadow_id="shadow-uuid",
        segmentation_status="completed",
        total_segmented_regions=10,
        total_cloud_pixels=5000,
        total_shadow_pixels=2000,
        largest_region_pixels=1000,
        smallest_region_pixels=10,
        mean_region_pixels=200,
        total_segmented_area_percent=12.5,
        reconstruction_ready=True
    )
    db.add(cloud_seg)

    # Add Reconstruction Run
    recon = ReconstructionRun(
        id=recon_run_id,
        session_id=session_id,
        dataset_id=dataset_id,
        reconstruction_status="COMPLETED",
        reconstruction_strategy="TELEA",
        reconstruction_method="cv2.INPAINT_TELEA",
        optimization_status="COMPLETED",
        execution_time_ms=1200,
        summary="Baseline reconstruction compiled via temporal-weighted inpainting.",
        output_image_path=f"datasets/reconstructions/{session_id}/reconstructed_image.tif",
        preview_image_path=f"datasets/reconstructions/{session_id}/reconstruction_preview.png"
    )
    db.add(recon)

    # Add Confidence Estimation
    confidence = ConfidenceEstimation(
        confidence_id=confidence_id,
        reconstruction_run_id=recon_run_id,
        dataset_id=dataset_id,
        confidence_status="completed",
        mean_confidence_score=92.5,
        low_confidence_area_percent=4.2,
        confidence_method="Temporal/Spectral Agreement Index",
        inference_basis="Calculated standard deviations across candidates."
    )
    db.add(confidence)

    # Add Reliability Score
    reliability = ReliabilityScore(
        reliability_id="rel-uuid",
        confidence_estimation_id=confidence_id,
        dataset_id=dataset_id,
        reliability_status="completed",
        dataset_reliability_score=92.5,
        dataset_reliability_tier="High",
        scoring_basis="Mock scoring basis"
    )

    db.add(reliability)

    db.commit()
    db.close()
    print("[SUCCESS] DB records initialized.")

    # 2. Verify Report Validation Endpoint
    print_header("2. Evaluate Report Validation Controller")
    val_payload = {
        "session_id": session_id,
        "report_type": "analysis"
    }
    r = client.post("/api/v1/reports/validate", json=val_payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    val_data = r.json()
    assert val_data["valid"] is True, f"Expected validation True, got {val_data}"
    print(f"[SUCCESS] Validation passed. Included layout segments: {val_data['sections']}")

    # Try invalid report validation
    val_payload["report_type"] = "invalid_report_type"
    r = client.post("/api/v1/reports/validate", json=val_payload)
    assert r.status_code == 200
    assert r.json()["valid"] is False, "Expected validation to fail for unrecognized report type"
    print("[SUCCESS] Unrecognized report type correctly rejected")

    # 3. Verify Report Requests
    print_header("3. Evaluate Report Compilation Layer (Analysis, Metadata, Reconstruction, Confidence)")
    report_types = ["analysis", "metadata", "reconstruction", "confidence"]
    
    for rtype in report_types:
        req_payload = {
            "session_id": session_id,
            "report_type": rtype
        }
        r = client.post("/api/v1/reports/request", json=req_payload)
        assert r.status_code == 200, f"Failed compilation for {rtype}: {r.text}"
        resp_data = r.json()
        assert resp_data["status"] == "COMPLETED", f"Expected COMPLETED status for {rtype}, got {resp_data}"
        print(f"[SUCCESS] {rtype.upper()} Report compiled. File size: {resp_data['file_size_bytes']} bytes")

    # 4. Verify Download Endpoint and PDF format structure
    print_header("4. Evaluate Download Attachment Endpoint & PDF Verification")
    r = client.get(f"/api/v1/reports/download/{session_id}/analysis")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert "Content-Disposition" in r.headers
    assert "attachment" in r.headers["Content-Disposition"]
    assert "analysis_report.pdf" in r.headers["Content-Disposition"]
    
    # Read the start of response to check for PDF magic bytes
    pdf_bytes = r.content
    assert pdf_bytes.startswith(b"%PDF"), "Generated file does not contain valid PDF magic headers"
    print("[SUCCESS] PDF file headers and content verified successfully.")

    # 5. Clean up temporary test files
    print_header("5. Cleaning up temporary test files")
    try:
        os.remove(dummy_tif_path)
        os.remove(dummy_png_path)
        shutil.rmtree(os.path.join(workspace_root, "datasets", "reports", session_id))
    except Exception:
        pass

    print("\n==================================================")
    print(" ALL REPORT EXPORT SYSTEM BACKEND VERIFICATION TESTS PASSED!")
    print("==================================================")

except AssertionError as err:
    print(f"\n[FAIL] Validation failed: {err}")
    sys.exit(1)
except Exception as err:
    print(f"\n[FAIL] Execution failed: {err}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    # Cleanup DB
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
