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

# Initialize SQLite database on startup
@app.on_event("startup")
def startup_event():
    init_db()

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
    Core health check endpoint returning status.
    Called by frontend connection state check.
    """
    return {"status": "healthy"}

# Include version 1 API routing
app.include_router(api_router, prefix=settings.API_V1_STR)

# Include Phase 4 geospatial API routing
from app.api.v1.geospatial import geospatial_session_router
app.include_router(geospatial_session_router, prefix="/api/geospatial", tags=["Geospatial Session Integration"])

