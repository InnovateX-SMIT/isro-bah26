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


def initialize_earth_engine() -> bool:
    """
    Attempts to initialize Earth Engine API.
    If settings.GEE_SERVICE_ACCOUNT_KEY is configured and the file exists,
    authenticates using Earth Engine's native ServiceAccountCredentials.
    Otherwise, falls back to default GEE/user-level initialization.
    """
    import ee
    import json

    # 1. Resolve key path with robust fallbacks
    current_dir = os.path.dirname(os.path.abspath(__file__)) # app/core
    workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

    key_path = settings.GEE_SERVICE_ACCOUNT_KEY
    resolved_path = None
    if key_path:
        # Try local machine parent path
        test_path = os.path.abspath(os.path.join(workspace_root, key_path))
        if os.path.exists(test_path) and os.path.isfile(test_path):
            resolved_path = test_path
        else:
            # Try app parent directory (e.g. /app inside container)
            app_parent = os.path.abspath(os.path.join(current_dir, "..", ".."))
            test_path2 = os.path.abspath(os.path.join(app_parent, key_path))
            if os.path.exists(test_path2) and os.path.isfile(test_path2):
                resolved_path = test_path2
            else:
                # Try stripped key path (credentials/...) relative to app parent
                stripped = key_path.replace("backend/", "")
                test_path3 = os.path.abspath(os.path.join(app_parent, stripped))
                if os.path.exists(test_path3) and os.path.isfile(test_path3):
                    resolved_path = test_path3

    # 2. Check if key file exists
    if resolved_path and os.path.exists(resolved_path) and os.path.isfile(resolved_path):
        try:
            # Parse the service account email directly from the key JSON
            with open(resolved_path, "r", encoding="utf-8") as f:
                key_data = json.load(f)
                email = key_data.get("client_email")
            
            if not email:
                raise ValueError("Missing 'client_email' in the service account JSON key.")
            
            # Use native ServiceAccountCredentials from Earth Engine
            credentials = ee.ServiceAccountCredentials(email, resolved_path)
            ee.Initialize(credentials=credentials, project='isro-bah26')
            print(f"[STARTUP GEE] Native Service Account auth successful. Client email: {email}")
            return True
        except Exception as e:
            print(f"[STARTUP GEE ERROR] Service Account auth failed: {e}")
            print("[STARTUP GEE WARNING] Falling back to default initialization.")
    else:
        if key_path:
            print(f"[STARTUP GEE INFO] Service account key file not found at config path: {key_path}")
    
    # 3. Fallback to default user authentication
    try:
        ee.Initialize(project='isro-bah26')
        print("[STARTUP GEE] Earth Engine initialized successfully using default/user credentials.")
        return True
    except Exception as e:
        print(f"[STARTUP GEE ERROR] Default Earth Engine initialization failed: {e}")
        return False


