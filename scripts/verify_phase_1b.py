import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Configure test database
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_phase_1b.db"))
os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

print("Starting Phase 1B API Validation Tasks...")
init_db()

client = TestClient(app)

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Create session
    print_header("1. Create First Analysis Session")
    r = client.post("/api/v1/analysis")
    assert r.status_code == 201, f"Expected 201, got {r.status_code}"
    session1 = r.json()
    print("Session 1 Created:")
    print(session1)
    s1_id = session1["session_id"]
    assert session1["status"] == "created"

    import time
    time.sleep(1.1)

    # 2. Create second session
    print_header("2. Create Second Analysis Session")
    r = client.post("/api/v1/analysis")

    assert r.status_code == 201, f"Expected 201, got {r.status_code}"
    session2 = r.json()
    print("Session 2 Created:")
    print(session2)
    s2_id = session2["session_id"]
    assert session2["status"] == "created"

    # 3. List sessions
    print_header("3. List All Sessions")
    r = client.get("/api/v1/analysis")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    sessions_list = r.json()
    print(f"Found {len(sessions_list)} sessions in listing.")
    assert len(sessions_list) >= 2
    # Ensure DESC ordering (second session created last should be first in results)
    assert sessions_list[0]["session_id"] == s2_id
    print("Listing order verification passed (Newest first).")

    # 4. Get session by ID
    print_header("4. Get Session 1 by ID")
    r = client.get(f"/api/v1/analysis/{s1_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    retrieved1 = r.json()
    assert retrieved1["session_id"] == s1_id
    print(f"Successfully retrieved Session {s1_id} with status '{retrieved1['status']}'.")

    # 5. Update status created -> active
    print_header("5. Update Status: created -> active")
    r = client.patch(f"/api/v1/analysis/{s1_id}", json={"status": "active"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    updated_act = r.json()
    print("Session 1 status updated:")
    print(updated_act)
    assert updated_act["status"] == "active"

    # 6. Update status active -> completed
    print_header("6. Update Status: active -> completed")
    r = client.patch(f"/api/v1/analysis/{s1_id}", json={"status": "completed"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    updated_comp = r.json()
    print("Session 1 status updated:")
    print(updated_comp)
    assert updated_comp["status"] == "completed"

    # 7. Attempt invalid transition completed -> active
    print_header("7. Attempt Invalid Transition: completed -> active")
    r = client.patch(f"/api/v1/analysis/{s1_id}", json={"status": "active"})
    print(f"HTTP Status: {r.status_code}")
    print(f"Error Message: {r.json()}")
    assert r.status_code == 409, f"Expected 409, got {r.status_code}"
    print("Success: Correctly rejected invalid transition.")

    # 8. Delete completed session
    print_header("8. Delete Completed Session 1")
    r = client.delete(f"/api/v1/analysis/{s1_id}")
    assert r.status_code == 204, f"Expected 204, got {r.status_code}"
    print("Session 1 deleted successfully (HTTP 204).")

    # 9. Verify deletion
    print_header("9. Verify Deletion")
    r = client.get(f"/api/v1/analysis/{s1_id}")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    print("Success: Verified session no longer exists.")

    # Verify active deletion constraint
    print_header("10. Verify Deletion Constraint (Active Session)")
    # Transition session 2 to active first
    client.patch(f"/api/v1/analysis/{s2_id}", json={"status": "active"})
    r = client.delete(f"/api/v1/analysis/{s2_id}")
    print(f"HTTP Status on Active Delete: {r.status_code}")
    print(f"Error Message: {r.json()}")
    assert r.status_code == 409, f"Expected 409, got {r.status_code}"
    print("Success: Correctly rejected active session deletion.")

    print("\n==================================================")
    print(" ALL PHASE 1B VERIFICATIONS PASSED SUCCESSFULLY!")
    print("==================================================")

except Exception as e:
    print(f"\nValidation failed with error: {e}")
    sys.exit(1)

finally:
    # Clean up test database file
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print("\nCleanup: Test database file deleted.")
        except Exception as e:
            print(f"\nCleanup warning: Could not remove test database file: {e}")
