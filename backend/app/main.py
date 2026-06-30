from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Generative AI-Based Cloud Removal and Reconstruction for LISS-IV Satellite Imagery",
    version="1.0.0"
)

# CORS configuration
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

from app.core.initialization import initialize_directories

# Initialize SQLite database on startup
@app.on_event("startup")
def startup_event():
    initialize_directories()
    init_db()
    
    # Verify Earth Engine credentials on boot
    import ee
    try:
        # Check if project configuration can initialize
        ee.Initialize(project='isro-bah26')
        print("[STARTUP GEE] Google Earth Engine initialized successfully.")
    except Exception as e:
        print(f"[STARTUP GEE WARNING] GEE client initialization failed on boot: {e}")
        print("[STARTUP GEE WARNING] Verify that GOOGLE_APPLICATION_CREDENTIALS points to a valid Earth Engine service account key JSON.")

@app.on_event("shutdown")
def shutdown_event():
    """
    Explicitly dispose of the database connection pool on shutdown to avoid hangs.
    """
    from app.core.database import engine
    print("FastAPI shutting down: Disposing of database connections.")
    engine.dispose()


@app.get("/health", status_code=200, tags=["Health Check"])
def health_check():
    """
    Comprehensive deployment health and readiness check.
    Verifies backend status, SQLite database, storage write capabilities, and GEE.
    """
    from sqlalchemy import text
    from app.core.database import SessionLocal
    import os
    import ee

    checks = {
        "database": "unknown",
        "storage": "unknown",
        "earth_engine": "unknown"
    }

    # 1. Database Check
    db = None
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
    finally:
        if db:
            db.close()

    # 2. Storage Check
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        if workspace_root == "/":
            if os.path.exists("/app"):
                workspace_root = "/app"
        test_file = os.path.join(workspace_root, "datasets", ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        checks["storage"] = "healthy"
    except Exception as e:
        checks["storage"] = f"unhealthy: {str(e)}"

    # 3. Google Earth Engine Check
    try:
        # Verify if ee credentials are set
        import ee
        # We don't perform active network queries to avoid slowing down health checks, 
        # but we verify GEE library initialization state.
        if hasattr(ee, "data") and ee.data and hasattr(ee.data, "_credentials") and ee.data._credentials:
            checks["earth_engine"] = "healthy"
        else:
            checks["earth_engine"] = "uninitialized"
    except Exception as e:
        checks["earth_engine"] = f"unhealthy: {str(e)}"

    # 4. Demo Datasets Check
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        if workspace_root == "/":
            if os.path.exists("/app"):
                workspace_root = "/app"
        demo_dir = os.path.join(workspace_root, "datasets", "demo")
        if not os.path.exists(demo_dir):
            checks["demo_datasets"] = "unhealthy: demo directory is missing"
        elif not os.path.isdir(demo_dir):
            checks["demo_datasets"] = "unhealthy: demo path is not a directory"
        else:
            subdirs = [
                os.path.join(demo_dir, d) 
                for d in os.listdir(demo_dir) 
                if os.path.isdir(os.path.join(demo_dir, d)) and not d.startswith(".")
            ]
            if not subdirs:
                checks["demo_datasets"] = "healthy: directory exists but no demo scenes found"
            else:
                invalid_demos = []
                required = ["band2.tif", "band3.tif", "band4.tif", "band_meta.txt"]
                for sd in subdirs:
                    files = [f.lower() for f in os.listdir(sd)]
                    missing = [r for r in required if r not in files]
                    if missing:
                        invalid_demos.append(f"{os.path.basename(sd)} (missing: {', '.join(missing)})")
                if invalid_demos:
                    checks["demo_datasets"] = f"unhealthy: some scenes are missing required files: {'; '.join(invalid_demos)}"
                else:
                    checks["demo_datasets"] = "healthy"
    except Exception as e:
        checks["demo_datasets"] = f"unhealthy: {str(e)}"

    is_core_healthy = checks["database"] == "healthy" and checks["storage"] == "healthy"

    if not is_core_healthy:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=500,
            detail={
                "status": "unhealthy",
                "details": checks
            }
        )

    return {
        "status": "healthy",
        "details": checks
    }

# Include version 1 API routing
app.include_router(api_router, prefix=settings.API_V1_STR)

# Include Phase 4 geospatial API routing
from app.api.v1.geospatial import geospatial_session_router
app.include_router(geospatial_session_router, prefix="/api/geospatial", tags=["Geospatial Session Integration"])

