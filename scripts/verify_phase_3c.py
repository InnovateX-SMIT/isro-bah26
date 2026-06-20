import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_3c.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db
from app.services.geospatial_context.knowledge_base import REGIONAL_CONTEXT_MAPPINGS

print("Starting Phase 3C Geospatial Context Profile API Verification...")
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

    # 6. Retrieve Geospatial Context Profile
    # NOTE: This should automatically trigger lazy generation of Coordinates and Location Context under the hood!
    print_header("6. Retrieve Geospatial Context Profile (Lazy Pipeline Cascade)")
    r = client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    profile = r.json()
    print("Geospatial Context Profile Generated:")
    print(profile)

    # Assert structural compliance
    assert profile["dataset_id"] == dataset_id
    assert profile["terrain_type"] == "Alluvial Plain"
    assert profile["environment_type"] == "Agricultural Landscape"
    assert profile["dominant_landscape"] == "Cultivated Agricultural Fields"
    assert profile["hydrology_context"] == "River-influenced plain with drainage networks"
    assert profile["agricultural_context"] == "High agricultural activity with extensive irrigation"
    assert profile["urbanization_context"] == "Low to Moderate"
    assert isinstance(profile["regional_characteristics"], list)
    assert len(profile["regional_characteristics"]) == 4
    
    # Assert explainability elements
    assert profile["inference_basis"] == "rule-based regional heuristic"
    caveat = "should be treated as contextual guidance rather than verified ground survey data."
    assert caveat in profile["context_summary"]
    
    # Verify mapping source matching REGIONAL_CONTEXT_MAPPINGS
    kb_indo_gangetic = REGIONAL_CONTEXT_MAPPINGS["indo-gangetic plain"]
    assert profile["terrain_type"] == kb_indo_gangetic["terrain_type"]
    assert profile["environment_type"] == kb_indo_gangetic["environment_type"]
    print("Geospatial Context Profile traits and disclaimers verified.")

    # 7. Check that Location and Coordinate Contexts were lazily created
    print_header("7. Check Lazy Location Context Verification")
    r = client.get(f"/api/v1/location/{dataset_id}/context")
    assert r.status_code == 200
    location = r.json()
    assert location["state"] == "Uttar Pradesh"
    print("Success: Location Context was successfully generated by the profile cascade.")

    # 8. Retrieve Context Profile again (Read from DB Check)
    print_header("8. Retrieve Context Profile Again (Database Cache Check)")
    r = client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    assert r.status_code == 200
    cache_profile = r.json()
    assert cache_profile["context_summary"] == profile["context_summary"]
    print("Database retrieval cache verification passed.")

    # 9. Delete dataset registration (Verify cascading deletion of context profile)
    print_header("9. Delete Dataset & Verify Context Profile Cascade")
    r = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert r.status_code == 204, f"Expected 204, got {r.status_code}"
    
    # Try retrieving context profile now - should be 404 because dataset doesn't exist
    r = client.get(f"/api/v1/geospatial-context/{dataset_id}/profile")
    assert r.status_code == 404, f"Expected 404 on deleted dataset, got {r.status_code}"
    print("Success: Dataset delete cascaded to delete database GeospatialContextProfile record.")

    print("\n==================================================")
    print(" ALL PHASE 3C GEOSPATIAL CONTEXT VERIFICATIONS PASSED!")
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
