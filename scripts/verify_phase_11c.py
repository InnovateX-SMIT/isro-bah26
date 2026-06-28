import sys
import os
import uuid
import datetime
import shutil
import time

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_11c.db"))
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
from app.models.location_context import LocationContext
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
from app.models.confidence_heatmap import ConfidenceHeatmap
from app.models.confidence_analytics import ConfidenceAnalytics
from app.models.cloud_analytics import CloudAnalytics
from app.models.dataset_preview import DatasetPreview

print("Starting Phase 11C Analysis Package Export System Verification...")
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

    session_id = "test-session-uuid-11c"
    dataset_id = "test-dataset-uuid-11c"
    recon_run_id = "test-recon-uuid-11c"
    confidence_id = "test-confidence-uuid-11c"

    # Create dummy files to avoid file missing errors during validation
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Paths for dummy files
    dummy_files = [
        ("datasets/reconstructions/test-session-uuid-11c/reconstructed_image.tif", "DUMMY RECON TIFF"),
        ("datasets/reconstructions/test-session-uuid-11c/reconstruction_preview.png", "DUMMY RECON PNG"),
        ("datasets/reconstructions/test-session-uuid-11c/optimized_reconstructed.tif", "DUMMY OPT TIFF"),
        ("datasets/reconstructions/test-session-uuid-11c/optimized_preview.png", "DUMMY OPT PNG"),
        ("datasets/cloud_segmentations/cloud_mask.tif", "DUMMY CLOUD TIFF"),
        ("datasets/cloud_segmentations/cloud_preview.png", "DUMMY CLOUD PNG"),
        ("datasets/cloud_segmentations/reconstruction_mask.tif", "DUMMY TARGET TIFF"),
        ("datasets/confidence_estimations/confidence_map.tif", "DUMMY CONF TIFF"),
        ("datasets/confidence_estimations/confidence_preview.png", "DUMMY CONF PNG"),
        ("datasets/confidence_heatmaps/confidence_overlay.png", "DUMMY OVERLAY PNG"),
        ("datasets/confidence_heatmaps/reliability_map.png", "DUMMY REL PNG"),
        ("datasets/previews/dataset_preview.png", "DUMMY PREVIEW PNG")
    ]
    
    for rel_path, content in dummy_files:
        full_p = os.path.join(workspace_root, rel_path)
        os.makedirs(os.path.dirname(full_p), exist_ok=True)
        with open(full_p, "w") as f:
            f.write(content)

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
        metadata_status="available",
        acquisition_date="12-AUG-2025"
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

    # Add Location Context
    loc_ctx = LocationContext(
        id="loc-uuid",
        dataset_id=dataset_id,
        country="India",
        state="Tamil Nadu",
        district="Chennai",
        administrative_region="Southern India",
        geographic_region="Coromandel Coast",
        location_summary="Coastal region Chennai"
    )
    db.add(loc_ctx)

    # Add Temporal Discovery
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

    # Add Temporal Reference Stack
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

    # Add Cloud Detection
    cloud_det = CloudDetection(
        detection_id="det-uuid",
        dataset_id=dataset_id,
        detection_status="completed"
    )
    db.add(cloud_det)

    # Add Cloud Classification
    cloud_class = CloudClassification(
        classification_id="class-uuid",
        dataset_id=dataset_id,
        cloud_detection_id="det-uuid",
        classification_status="completed"
    )
    db.add(cloud_class)

    # Add Cloud Shadow
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
        reconstruction_ready=True,
        segmentation_mask_path="datasets/cloud_segmentations/cloud_mask.tif",
        segmentation_preview_path="datasets/cloud_segmentations/cloud_preview.png",
        reconstruction_mask_path="datasets/cloud_segmentations/reconstruction_mask.tif"
    )
    db.add(cloud_seg)

    # Add Cloud Analytics
    cloud_an = CloudAnalytics(
        analytics_id="cloud-an-uuid",
        dataset_id=dataset_id,
        cloud_segmentation_id="seg-uuid",
        analytics_status="completed",
        total_cloud_coverage_percent=12.5,
        total_shadow_coverage_percent=5.0,
        thick_cloud_percent=8.0,
        thin_cloud_percent=3.5,
        cirrus_cloud_percent=1.0,
        cloud_intelligence_score=94.0
    )
    db.add(cloud_an)

    # Add Reconstruction Run
    recon = ReconstructionRun(
        id=recon_run_id,
        session_id=session_id,
        dataset_id=dataset_id,
        reconstruction_status="COMPLETED",
        reconstruction_strategy="TELEA",
        reconstruction_method="cv2.INPAINT_TELEA",
        optimization_status="COMPLETED",
        optimization_method="SPECTRAL_CONSTRAINTS",
        execution_time_ms=1200,
        summary="Baseline reconstruction compiled via temporal-weighted inpainting.",
        output_image_path=f"datasets/reconstructions/{session_id}/reconstructed_image.tif",
        preview_image_path=f"datasets/reconstructions/{session_id}/reconstruction_preview.png",
        optimized_output_path=f"datasets/reconstructions/{session_id}/optimized_reconstructed.tif",
        optimized_preview_path=f"datasets/reconstructions/{session_id}/optimized_preview.png"
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
        inference_basis="Calculated standard deviations across candidates.",
        confidence_map_path="datasets/confidence_estimations/confidence_map.tif",
        confidence_preview_path="datasets/confidence_estimations/confidence_preview.png"
    )
    db.add(confidence)

    # Add Confidence Heatmap
    heatmap = ConfidenceHeatmap(
        heatmap_id="heatmap-uuid",
        reliability_score_id="rel-uuid",
        dataset_id=dataset_id,
        heatmap_status="completed",
        confidence_overlay_path="datasets/confidence_heatmaps/confidence_overlay.png",
        reliability_map_path="datasets/confidence_heatmaps/reliability_map.png",
        basis="Visual overlay alpha-blended based on reliability thresholds."
    )
    db.add(heatmap)

    # Add Confidence Analytics
    conf_an = ConfidenceAnalytics(
        analytics_id="conf-an-uuid",
        confidence_heatmap_id="heatmap-uuid",
        dataset_id=dataset_id,
        analytics_status="completed",
        report_basis="Mock report basis",
        headline_summary="Mock headline"
    )
    db.add(conf_an)

    # Add Reliability Score
    reliability = ReliabilityScore(
        reliability_id="rel-uuid",
        confidence_estimation_id=confidence_id,
        dataset_id=dataset_id,
        reliability_status="completed",
        dataset_reliability_score=92.5,
        dataset_reliability_tier="High",
        scoring_basis="Calculated index matches High Tier."
    )
    db.add(reliability)

    # Add Dataset Preview
    preview = DatasetPreview(
        preview_id="preview-uuid",
        dataset_id=dataset_id,
        preview_status="COMPLETED",
        preview_image_path="datasets/previews/dataset_preview.png",
        thumbnail_path="datasets/previews/dataset_preview.png"
    )
    db.add(preview)

    db.commit()
    db.close()
    print("[SUCCESS] DB records initialized.")

    # 2. Evaluate Package Validation Controller
    print_header("2. Evaluate Package Validation Controller")
    val_payload = {
        "session_id": session_id,
        "format": "ZIP"
    }
    r = client.post("/api/v1/packages/validate", json=val_payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    val_data = r.json()
    assert val_data["valid"] is True, f"Expected validation True, got {val_data}"
    print(f"[SUCCESS] Validation checks passed. Available assets checklist: {val_data['available_assets']}")

    # 3. Evaluate Package Request Endpoint
    print_header("3. Evaluate Package Async Request Controller")
    r = client.post("/api/v1/packages/request", json=val_payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    req_data = r.json()
    assert req_data["status"] == "PROCESSING", f"Expected PROCESSING status, got {req_data['status']}"
    print(f"[SUCCESS] Packaging enqueued. Job ID: {req_data['package_id']}")

    # 4. Evaluate Package Status Polling Endpoint
    print_header("4. Evaluate Package Status Polling Endpoint")
    max_retries = 5
    status_data = None
    for i in range(max_retries):
        time.sleep(1) # wait for bg task execution
        r = client.get(f"/api/v1/packages/status/{session_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        status_data = r.json()
        print(f"Polling try {i+1}: status = {status_data['status']}, progress = {status_data['progress']}%, msg = {status_data['message']}")
        if status_data["status"] == "COMPLETED":
            break
            
    assert status_data["status"] == "COMPLETED", f"Expected COMPLETED status after polling, got {status_data}"
    print(f"[SUCCESS] Packaging compiled in background. Zipped file path: {status_data['file_path']} | Size: {status_data['file_size_bytes']} bytes")
    print(f"Included package assets: {status_data['included_assets']}")

    # 5. Evaluate Package Download Endpoint
    print_header("5. Evaluate Package ZIP Download Endpoint")
    r = client.get(f"/api/v1/packages/download/{session_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.headers["content-type"] == "application/zip", f"Expected application/zip, got {r.headers['content-type']}"
    assert f"Analysis_Package_" in r.headers["Content-Disposition"]
    
    # Read the start of response to check for ZIP magic bytes (PK..)
    zip_bytes = r.content
    assert zip_bytes.startswith(b"PK\x03\x04"), "Generated file does not contain valid ZIP magic headers"
    print("[SUCCESS] ZIP file headers and content verified successfully.")

    # 6. Verify ZIP structure matches the layout requirement
    import zipfile
    import io
    print_header("6. Verify Package ZIP Internal Directory Layout")
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        namelist = zf.namelist()
        print("Zipped directory structure:")
        for name in namelist:
            print(f" - {name}")
            
        # Ensure README is present
        assert "Analysis_Package/README.md" in namelist, "Missing README.md"
        # Ensure directories exist
        assert any(x.startswith("Analysis_Package/Metadata/") for x in namelist), "Missing Metadata directory content"
        assert any(x.startswith("Analysis_Package/Geospatial/") for x in namelist), "Missing Geospatial directory content"
        assert any(x.startswith("Analysis_Package/Temporal/") for x in namelist), "Missing Temporal directory content"
        assert any(x.startswith("Analysis_Package/Cloud/") for x in namelist), "Missing Cloud directory content"
        assert any(x.startswith("Analysis_Package/Reconstruction/") for x in namelist), "Missing Reconstruction directory content"
        assert any(x.startswith("Analysis_Package/Confidence/") for x in namelist), "Missing Confidence directory content"
        assert any(x.startswith("Analysis_Package/Visualizations/") for x in namelist), "Missing Visualizations directory content"
        assert any(x.startswith("Analysis_Package/Reports/") for x in namelist), "Missing Reports directory content"
        
    print("[SUCCESS] Zipped package folders structured correctly.")

    # 7. Clean up temporary test files
    print_header("7. Cleaning up temporary test files")
    for rel_path, _ in dummy_files:
        try:
            os.remove(os.path.join(workspace_root, rel_path))
        except Exception:
            pass
    try:
        shutil.rmtree(os.path.join(workspace_root, "datasets", "reconstructions", session_id))
        shutil.rmtree(os.path.join(workspace_root, "datasets", "reports", session_id))
        shutil.rmtree(os.path.join(workspace_root, "datasets", "packages", session_id))
    except Exception:
        pass

    print("\n==================================================")
    print(" ALL PACKAGE EXPORT SYSTEM BACKEND VERIFICATION TESTS PASSED!")
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
