import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_2c.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 2C API Verification...")
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
    assert len(demo_datasets) > 0, "No demo datasets discovered!"
    
    # Target dataset: R2F12AUG2025074282009600051SSANSTUC00GTDD
    target_ds = None
    for ds in demo_datasets:
        if ds["dataset_name"] == "R2F12AUG2025074282009600051SSANSTUC00GTDD":
            target_ds = ds
            break
    
    if not target_ds:
        target_ds = demo_datasets[0]
        
    print(f"Selected target dataset: {target_ds['dataset_name']}")

    # 3. Register dataset
    print_header("3. Register Dataset under Session")
    register_payload = {
        "analysis_session_id": session_id,
        "dataset_name": target_ds["dataset_name"],
        "dataset_path": target_ds["dataset_path"],
        "dataset_type": target_ds["dataset_type"]
    }
    r = client.post("/api/v1/datasets/register", json=register_payload)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}"
    registered = r.json()
    dataset_id = registered["dataset_id"]
    print(f"Registered Dataset ID: {dataset_id}")

    # 4. Run dataset inspection
    print_header("4. Run Dataset Inspection")
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("Inspection Completed.")

    # 5. Run metadata extraction
    print_header("5. Run Metadata Extraction")
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    metadata = r.json()
    print("Metadata Extracted:")
    print(metadata)
    
    # Assert values for R2F12AUG2025074282009600051SSANSTUC00GTDD
    assert metadata["metadata_status"] == "COMPLETED"
    assert metadata["band_count"] == 3, f"Expected 3 bands, got {metadata['band_count']}"
    assert metadata["raster_width"] == 18058, f"Expected 18058 width, got {metadata['raster_width']}"
    assert metadata["raster_height"] == 17039, f"Expected 17039 height, got {metadata['raster_height']}"
    assert metadata["utm_zone"] == 43, f"Expected UTM zone 43, got {metadata['utm_zone']}"
    assert metadata["epsg_code"] == 32643, f"Expected EPSG 32643, got {metadata['epsg_code']}"
    assert metadata["acquisition_date"] == "12-AUG-2025", f"Expected '12-AUG-2025', got {metadata['acquisition_date']}"
    assert "wgs 84" in metadata["coordinate_system"].lower(), f"Expected WGS 84 in CRS, got {metadata['coordinate_system']}"
    assert "utm" in metadata["projection_name"].lower(), f"Expected UTM in Projection, got {metadata['projection_name']}"

    # 6. Retrieve Metadata Summary
    print_header("6. Retrieve Metadata Summary")
    r = client.get(f"/api/v1/dataset-metadata/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    retrieved_meta = r.json()
    assert retrieved_meta["metadata_id"] == metadata["metadata_id"]
    assert retrieved_meta["epsg_code"] == 32643
    print("Metadata retrieved successfully.")

    # 7. Re-run Metadata Extraction (Overwrite Check)
    print_header("7. Re-run Metadata Extraction (Overwrite Check)")
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    re_metadata = r.json()
    assert re_metadata["metadata_status"] == "COMPLETED"
    assert re_metadata["metadata_id"] == metadata["metadata_id"], "Re-run generated a duplicate metadata record instead of overwriting!"
    print("Overwrite run verification passed.")

    # 8. Delete Metadata Only
    print_header("8. Delete Metadata Only")
    r = client.delete(f"/api/v1/dataset-metadata/{dataset_id}")
    assert r.status_code == 204, f"Expected 204, got {r.status_code}"
    print("Metadata deleted successfully (HTTP 204).")

    # 9. Verify deletion of metadata
    print_header("9. Verify Deletion")
    r = client.get(f"/api/v1/dataset-metadata/{dataset_id}")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    
    # Check that dataset registration is still intact
    r = client.get(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("Success: Metadata deleted, dataset registration remains intact.")

    # 10. Verify cascading delete (dataset delete cascades to metadata)
    print_header("10. Verify Cascading Deletion via Dataset Delete")
    # Re-run metadata to populate database records again
    r = client.post(f"/api/v1/dataset-metadata/run/{dataset_id}")
    assert r.status_code == 200
    
    # Confirm metadata exists
    r = client.get(f"/api/v1/dataset-metadata/{dataset_id}")
    assert r.status_code == 200
    
    # Delete dataset registration
    r = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 204
    
    # Confirm dataset is deleted
    r = client.get(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 404
    
    # Confirm metadata is deleted via cascade
    r = client.get(f"/api/v1/dataset-metadata/{dataset_id}")
    assert r.status_code == 404
    
    # Check that physical files on disk STILL exist
    current_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.abspath(os.path.join(current_dir, ".."))
    physical_path = os.path.join(workspace_root, target_ds["dataset_path"])
    assert os.path.exists(physical_path), f"CRITICAL: Physical path {physical_path} was deleted!"
    assert len(os.listdir(physical_path)) > 0, "CRITICAL: Physical files were deleted!"
    print("Success: Cascade delete removed DB metadata entries without modifying physical filesystem files.")

    print("\n==================================================")
    print(" ALL PHASE 2C VERIFICATIONS PASSED SUCCESSFULLY!")
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
