import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_2d.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 2D API Verification...")
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
    print("Metadata extraction completed.")

    # 6. Generate Preview
    print_header("6. Generate Dataset Preview")
    r = client.post(f"/api/v1/dataset-preview/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    preview = r.json()
    print("Preview Generated:")
    print(preview)
    
    assert preview["preview_status"] == "COMPLETED"
    assert preview["preview_width"] == 1024, f"Expected width 1024, got {preview['preview_width']}"
    assert preview["preview_height"] > 0
    assert preview["band_count"] == 3, f"Expected band count 3 (RGB stack), got {preview['band_count']}"
    assert preview["preview_image_path"] == f"datasets/previews/{dataset_id}/preview.png"
    assert preview["thumbnail_path"] == f"datasets/previews/{dataset_id}/thumbnail.png"
    
    # 7. Validate physical files on disk
    print_header("7. Validate Physical Preview Files on Disk")
    current_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.abspath(os.path.join(current_dir, ".."))
    
    preview_png = os.path.join(workspace_root, preview["preview_image_path"])
    thumbnail_png = os.path.join(workspace_root, preview["thumbnail_path"])
    
    assert os.path.exists(preview_png), f"preview.png not found at {preview_png}!"
    assert os.path.exists(thumbnail_png), f"thumbnail.png not found at {thumbnail_png}!"
    print(f"Success: preview.png size: {os.path.getsize(preview_png)} bytes")
    print(f"Success: thumbnail.png size: {os.path.getsize(thumbnail_png)} bytes")

    # 8. Retrieve Preview Record
    print_header("8. Retrieve Preview Summary")
    r = client.get(f"/api/v1/dataset-preview/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    retrieved = r.json()
    assert retrieved["preview_id"] == preview["preview_id"]
    print("Preview summary retrieved successfully.")

    # 9. Retrieve Image and Thumbnail streams
    print_header("9. Retrieve Image & Thumbnail Streams")
    r_img = client.get(f"/api/v1/dataset-preview/{dataset_id}/image")
    assert r_img.status_code == 200, f"Expected 200, got {r_img.status_code}"
    assert len(r_img.content) > 0, "Preview image stream returned empty body!"
    
    r_thumb = client.get(f"/api/v1/dataset-preview/{dataset_id}/thumbnail")
    assert r_thumb.status_code == 200, f"Expected 200, got {r_thumb.status_code}"
    assert len(r_thumb.content) > 0, "Thumbnail stream returned empty body!"
    print("Image stream size:", len(r_img.content), "bytes")
    print("Thumbnail stream size:", len(r_thumb.content), "bytes")

    # 10. Re-run Preview (Overwrite Check)
    print_header("10. Re-run Preview (Overwrite Check)")
    r = client.post(f"/api/v1/dataset-preview/run/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    re_preview = r.json()
    assert re_preview["preview_status"] == "COMPLETED"
    assert re_preview["preview_id"] == preview["preview_id"], "Re-run generated a duplicate preview record instead of updating!"
    print("Overwrite run verification passed.")

    # 11. Delete Preview record (should also clean up generated files)
    print_header("11. Delete Preview Assets Only")
    r = client.delete(f"/api/v1/dataset-preview/{dataset_id}")
    assert r.status_code == 204, f"Expected 204, got {r.status_code}"
    print("Preview deleted successfully (HTTP 204).")

    # 12. Verify DB deletion and disk cleanup
    print_header("12. Verify Preview Purged")
    r = client.get(f"/api/v1/dataset-preview/{dataset_id}")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    
    assert not os.path.exists(preview_png), "preview.png on disk was NOT deleted!"
    assert not os.path.exists(thumbnail_png), "thumbnail.png on disk was NOT deleted!"
    
    # Verify dataset registration still exists
    r = client.get(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("Success: Preview record and disk folder purged, dataset registration remains intact.")

    # 13. Verify cascading delete of preview on dataset delete
    print_header("13. Verify Cascading Deletion via Dataset Delete")
    # Re-run preview generation
    r = client.post(f"/api/v1/dataset-preview/run/{dataset_id}")
    assert r.status_code == 200
    
    # Confirm preview PNG is back on disk
    assert os.path.exists(preview_png)
    
    # Delete dataset registration
    r = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 204
    
    # Confirm dataset, inspection, metadata, and preview are all deleted from DB
    r = client.get(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 404
    r = client.get(f"/api/v1/dataset-preview/{dataset_id}")
    assert r.status_code == 404
    
    # Verify preview PNG on disk is cleaned up via cascade hook / service cascade trigger (or manual rmtree on dataset delete)
    # Wait, the dataset delete cascade deletes the preview DB row, but the dataset deletion API is `/api/v1/datasets/{dataset_id}`.
    # Does the dataset deletion API call `delete_preview` service? Let's check `backend/app/services/dataset_service.py` to see if it deletes metadata or previews on disk!
    # If not, let's make sure it does or check how cascades are handled.
    # Wait, let's verify if the verification script passes. Let's write the check:
    # If the file still exists, we might need to modify dataset_service to call delete_preview.
    # Let's check if the directory is purged.
    print("Verifying preview disk files cleaned up on dataset registration purge...")
    assert not os.path.exists(preview_png), "preview.png on disk was NOT deleted on dataset delete cascade!"
    assert not os.path.exists(thumbnail_png), "thumbnail.png on disk was NOT deleted on dataset delete cascade!"
    
    # Verify raw files are untouched
    physical_path = os.path.join(workspace_root, target_ds["dataset_path"])
    assert os.path.exists(physical_path), f"CRITICAL: Physical raw path {physical_path} was deleted!"
    print("Success: Cascade delete successfully cleaned database records and physical preview images.")

    print("\n==================================================")
    print(" ALL PHASE 2D VERIFICATIONS PASSED SUCCESSFULLY!")
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
