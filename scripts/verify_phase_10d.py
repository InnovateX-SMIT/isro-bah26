import os
import sys

print("Starting Phase 10D Mission Control Experience Verification...")

workspace_file = "frontend/src/components/mission-control/MissionControlWorkspace.tsx"
skeleton_file = "frontend/src/components/mission-control/MissionControlSkeleton.tsx"
page_file = "frontend/src/app/mission-control/page.tsx"

def assert_file_contains(filepath, substring, label):
    assert os.path.exists(filepath), f"Missing file: {filepath}"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    assert substring in content, f"Validation failed: {label} is missing from {filepath}"
    print(f"✓ Verified: {label}")

try:
    # 1. Verify Skeleton component exists
    print("\n--- 1. Evaluating Loading Skeleton Architecture ---")
    assert_file_contains(skeleton_file, "MissionControlSkeleton", "MissionControlSkeleton export")
    assert_file_contains(skeleton_file, "animate-pulse", "Pulse animation utility")
    assert_file_contains(skeleton_file, "Dataset Panel", "Dataset grid skeleton section")

    # 2. Verify Page uses Skeleton
    print("\n--- 2. Evaluating Page Loading Controllers ---")
    assert_file_contains(page_file, "MissionControlSkeleton", "Skeleton component import")
    assert_file_contains(page_file, "<MissionControlSkeleton />", "Skeleton tag insertion")

    # 3. Verify Local Settings Customization
    print("\n--- 3. Evaluating Workspace Customization Engine ---")
    assert_file_contains(workspace_file, "isro_workspace_collapsed", "LocalStorage collapsed workspace settings")
    assert_file_contains(workspace_file, "collapseAll", "Collapse all control action")
    assert_file_contains(workspace_file, "restoreAll", "Restore all control action")
    assert_file_contains(workspace_file, "togglePanel", "Minimize panel toggle action")

    # 4. Verify Operator Session Experience & Favorites
    print("\n--- 4. Evaluating Session Experience Controllers ---")
    assert_file_contains(workspace_file, "isro_favorite_datasets", "LocalStorage favorite dataset list")
    assert_file_contains(workspace_file, "isro_recent_sessions", "LocalStorage recent sessions history list")
    assert_file_contains(workspace_file, "toggleFavorite", "Dataset favorite action toggle")

    # 5. Verify Highlights & Search
    print("\n--- 5. Evaluating Highlights Search Filtering ---")
    assert_file_contains(workspace_file, "searchQuery", "Workspace filter search text state")
    assert_file_contains(workspace_file, "checkHighlight", "Panel highlight search logic")
    assert_file_contains(workspace_file, "border-cyan-400", "Highlighted visual glow class")

    # 6. Verify Toast Alerts
    print("\n--- 6. Evaluating Operational Toast Alerts ---")
    assert_file_contains(workspace_file, "notifications", "Dismissible notification alerts list state")
    assert_file_contains(workspace_file, "dismissNotification", "Dismiss alert toggle action")

    print("\n==================================================")
    print(" ALL PHASE 10D OPERATIONAL EXPERIENCE TESTS PASSED!")
    print("==================================================")

except AssertionError as err:
    print(f"\n❌ Validation failed: {err}")
    sys.exit(1)
except Exception as err:
    print(f"\n❌ Execution failed: {err}")
    sys.exit(1)
