import os
from app.core.config import settings

def initialize_directories():
    """
    Verify and automatically create all required folders for storage.
    Ensures that manual directory creation is never required.
    """
    # 1. Resolve workspace root
    current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/app/core
    workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

    # If workspace_root is the root of the container filesystem,
    # the folders will be created under '/datasets'.
    print(f"[STARTUP] Initializing directories. Workspace root: {workspace_root}")

    folders = [
        "datasets",
        "datasets/demo",
        "datasets/uploaded",
        "datasets/previews",
        "datasets/cloud_detections",
        "datasets/cloud_classifications",
        "datasets/cloud_shadows",
        "datasets/cloud_segmentations",
        "datasets/cloud_analytics",
        "datasets/reconstructions",
        "datasets/reconstruction_evaluations",
        "datasets/confidence_heatmaps",
        "datasets/confidence_estimations",
        "datasets/confidence_analytics",
        "datasets/temporal_references",
        "datasets/temporal_references/previews",
        "datasets/reports",
        "datasets/packages",
        "datasets/exports",
    ]

    for folder in folders:
        path = os.path.abspath(os.path.join(workspace_root, folder))
        if not os.path.exists(path):
            try:
                os.makedirs(path, exist_ok=True)
                print(f"[CREATED] Directory: {path}")
            except Exception as e:
                print(f"[ERROR] Failed to create directory {path}: {e}")
        else:
            print(f"[EXISTS] Directory: {path}")

    # 2. Ensure database parent directory exists
    if settings.SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        db_path = settings.SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
        if db_path and not db_path.startswith(":memory:"):
            db_dir = os.path.dirname(os.path.abspath(db_path))
            if db_dir and not os.path.exists(db_dir):
                try:
                    os.makedirs(db_dir, exist_ok=True)
                    print(f"[CREATED] Database Directory: {db_dir}")
                except Exception as e:
                    print(f"[ERROR] Failed to create database directory {db_dir}: {e}")

    # 3. Validate pre-seeded Demo Datasets
    demo_dir = os.path.abspath(os.path.join(workspace_root, "datasets", "demo"))
    if not os.path.exists(demo_dir):
        print(f"[WARN] Demo datasets directory is missing: {demo_dir}")
    else:
        try:
            demo_folders = [
                d for d in os.listdir(demo_dir)
                if os.path.isdir(os.path.join(demo_dir, d)) and not d.startswith(".")
            ]
            print(f"[STARTUP] Discovered {len(demo_folders)} demo dataset folders in {demo_dir}")
            required_files = ["band2.tif", "band3.tif", "band4.tif", "band_meta.txt"]
            for folder in demo_folders:
                folder_path = os.path.join(demo_dir, folder)
                files_in_folder = [f.lower() for f in os.listdir(folder_path)]
                missing_files = [r for r in required_files if r not in files_in_folder]
                if missing_files:
                    print(f"[WARN] Demo dataset '{folder}' is incomplete. Missing: {', '.join(missing_files)}")
                else:
                    print(f"[INFO] Demo dataset '{folder}' verified successfully.")
        except Exception as err:
            print(f"[ERROR] Failed to validate demo datasets: {err}")

