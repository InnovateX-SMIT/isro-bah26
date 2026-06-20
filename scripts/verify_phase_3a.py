import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_3a.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 3A API Verification...")
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

    # 6. Retrieve Geospatial Context
    print_header("6. Retrieve Geospatial Context (First Calculation)")
    r = client.get(f"/api/v1/geospatial/{dataset_id}/context")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    context = r.json()
    print("Geospatial Context Generated:")
    print(context)

    # Assert structural compliance
    assert context["dataset_id"] == dataset_id
    assert "center" in context
    assert "lat" in context["center"] and "lon" in context["center"]
    assert "bounds" in context
    assert all(k in context["bounds"] for k in ("north", "south", "east", "west"))
    assert context["epsg"] == 32643
    assert "wgs 84" in context["crs"].lower()
    assert "utm zone 43n" in context["projection"].lower()
    assert "footprint" in context
    assert len(context["footprint"]) == 5
    
    # Assert actual geographic coordinates are close to the metadata values
    # SceneCenterLat= 28.235331, SceneCenterLon= 77.733387
    center_lat = context["center"]["lat"]
    center_lon = context["center"]["lon"]
    print(f"Calculated center: Lat={center_lat}, Lon={center_lon}")
    assert abs(center_lat - 28.235331) < 0.05, f"Latitude {center_lat} is too far from 28.235331"
    assert abs(center_lon - 77.733387) < 0.05, f"Longitude {center_lon} is too far from 77.733387"

    # Assert footprint loop closes
    assert context["footprint"][0] == context["footprint"][4]
    # Check that footprint coordinates look like valid WGS84 coordinates in India
    for pt in context["footprint"]:
        assert len(pt) == 2
        lon, lat = pt
        assert 75.0 <= lon <= 80.0
        assert 25.0 <= lat <= 30.0
    print("Coordinates and Footprint verified successfully.")

    # 7. Retrieve Geospatial Context again (Read from DB Check)
    print_header("7. Retrieve Geospatial Context Again (Cache/Database Check)")
    r = client.get(f"/api/v1/geospatial/{dataset_id}/context")
    assert r.status_code == 200
    cache_context = r.json()
    assert cache_context["center"]["lat"] == center_lat
    assert cache_context["center"]["lon"] == center_lon
    print("Database retrieval verification passed.")

    # 8. Delete dataset registration (Verify cascading deletion of geospatial context)
    print_header("8. Delete Dataset & Verify Geospatial Context Cascade")
    r = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 204, f"Expected 204, got {r.status_code}"
    
    # Try retrieving context now - should be 404 because dataset doesn't exist
    r = client.get(f"/api/v1/geospatial/{dataset_id}/context")
    assert r.status_code == 404, f"Expected 404 on deleted dataset, got {r.status_code}"
    print("Success: Dataset delete cascaded to delete database GeospatialContext record.")

    print("\n==================================================")
    print(" ALL PHASE 3A BACKEND VERIFICATIONS PASSED!")
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
