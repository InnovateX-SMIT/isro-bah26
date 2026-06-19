import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_2b.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 2B API Verification...")
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
    print(f"Discovered {len(demo_datasets)} demo datasets:")
    for ds in demo_datasets:
        print(ds["dataset_name"])
    assert len(demo_datasets) > 0, "No demo datasets discovered in datasets/demo!"
    
    # Target dataset: R2F12AUG2025074282009600051SSANSTUC00GTDD
    target_ds = None
    for ds in demo_datasets:
        if ds["dataset_name"] == "R2F12AUG2025074282009600051SSANSTUC00GTDD":
            target_ds = ds
            break
    
    if not target_ds:
        target_ds = demo_datasets[0]
        
    print(f"Selected target dataset: {target_ds['dataset_name']} at {target_ds['dataset_path']}")

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
    assert registered["dataset_status"] == "REGISTERED"

    # 4. Run dataset inspection
    print_header("4. Run Dataset Inspection")
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    inspection = r.json()
    print("Inspection Completed:")
    print(inspection)
    
    # Assert counts for demo dataset R2F12AUG2025074282009600051SSANSTUC00GTDD
    # Total: 11, TIF: 3, XML: 4, TXT: 2, META: 1, JPG: 1
    assert inspection["inspection_status"] == "COMPLETED"
    assert inspection["total_files"] == 11, f"Expected 11 files, got {inspection['total_files']}"
    assert inspection["total_tif_files"] == 3, f"Expected 3 TIF files, got {inspection['total_tif_files']}"
    assert inspection["total_xml_files"] == 4, f"Expected 4 XML files, got {inspection['total_xml_files']}"
    assert inspection["total_txt_files"] == 2, f"Expected 2 TXT files, got {inspection['total_txt_files']}"
    assert inspection["total_meta_files"] == 1, f"Expected 1 META file, got {inspection['total_meta_files']}"
    assert inspection["total_jpg_files"] == 1, f"Expected 1 JPG file, got {inspection['total_jpg_files']}"

    # 5. Retrieve Inspection Summary
    print_header("5. Retrieve Inspection Summary")
    r = client.get(f"/api/v1/dataset-inspection/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    retrieved_insp = r.json()
    assert retrieved_insp["inspection_id"] == inspection["inspection_id"]
    assert retrieved_insp["total_files"] == 11
    print("Inspection retrieved successfully.")

    # 6. List Discovered Files
    print_header("6. List Discovered Files")
    r = client.get(f"/api/v1/dataset-inspection/{dataset_id}/files")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    files_list = r.json()
    print(f"Retrieved {len(files_list)} files.")
    assert len(files_list) == 11, f"Expected 11 files in list, got {len(files_list)}"
    
    # Verify deterministic sorting (alphabetical by file_name)
    names = [f["file_name"] for f in files_list]
    sorted_names = sorted(names)
    assert names == sorted_names, "Files list is not ordered alphabetically!"
    print("Files list alphabetical sort verification passed.")
    print("Sample file entry:")
    print(files_list[0])

    # 7. Re-run Inspection and check overwrite
    print_header("7. Re-run Inspection (Overwrite Check)")
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    re_inspection = r.json()
    assert re_inspection["inspection_status"] == "COMPLETED"
    assert re_inspection["total_files"] == 11
    # Check that it updated/replaced the inspection record instead of duplicating
    r = client.get(f"/api/v1/dataset-inspection/{dataset_id}/files")
    assert len(r.json()) == 11, "Overwriting scan duplicated files in DB!"
    print("Overwrite run verification passed.")

    # 8. Delete inspection only
    print_header("8. Delete Inspection Only")
    r = client.delete(f"/api/v1/dataset-inspection/{dataset_id}")
    assert r.status_code == 204, f"Expected 204, got {r.status_code}"
    print("Inspection deleted successfully (HTTP 204).")

    # 9. Verify deletion of inspection and files
    print_header("9. Verify Deletion")
    r = client.get(f"/api/v1/dataset-inspection/{dataset_id}")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    r = client.get(f"/api/v1/dataset-inspection/{dataset_id}/files")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    
    # Check that dataset still exists (only inspection was deleted)
    r = client.get(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("Success: Inspection deleted, dataset registration remains intact.")

    # 10. Verify cascading delete (dataset delete cascades to inspection and files)
    print_header("10. Verify Cascading Deletion via Dataset Delete")
    # Re-run inspection to populate database records again
    r = client.post(f"/api/v1/dataset-inspection/run/{dataset_id}")
    assert r.status_code == 200
    
    # Confirm inspection exists
    r = client.get(f"/api/v1/dataset-inspection/{dataset_id}")
    assert r.status_code == 200
    
    # Delete dataset registration
    r = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 204
    
    # Confirm dataset is deleted
    r = client.get(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 404
    
    # Confirm inspection is deleted via cascade
    r = client.get(f"/api/v1/dataset-inspection/{dataset_id}")
    assert r.status_code == 404
    
    # Confirm files are deleted via cascade
    r = client.get(f"/api/v1/dataset-inspection/{dataset_id}/files")
    assert r.status_code == 404
    
    # Check that physical files on disk STILL exist (they must never be touched)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.abspath(os.path.join(current_dir, ".."))
    physical_path = os.path.join(workspace_root, target_ds["dataset_path"])
    assert os.path.exists(physical_path), f"CRITICAL: Physical path {physical_path} was deleted!"
    assert len(os.listdir(physical_path)) > 0, "CRITICAL: Physical directory contents were emptied!"
    print("Success: Cascade delete removed DB entries without modifying physical filesystem files.")

    print("\n==================================================")
    print(" ALL PHASE 2B VERIFICATIONS PASSED SUCCESSFULLY!")
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
