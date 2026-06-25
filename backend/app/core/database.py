from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# engine arguments for SQLite local database connection
connect_args = {}
if settings.SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args
)

# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    """
    Dependency generator yielding the database session context.
    Safely closes the connection upon completion of requests.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initialize SQLite database tables based on loaded models metadata.
    Does not impact running servers if tables already exist.
    """
    # Defer import of models to avoid circular import issues
    from app.models.session import AnalysisSession
    from app.models.dataset import Dataset
    from app.models.dataset_inspection import DatasetInspection
    from app.models.dataset_file import DatasetFile
    from app.models.dataset_metadata import DatasetMetadata
    from app.models.dataset_preview import DatasetPreview
    from app.models.geospatial_context import GeospatialContext
    from app.models.location_context import LocationContext
    from app.models.geospatial_context_profile import GeospatialContextProfile
    from app.models.temporal_discovery import TemporalDiscovery
    from app.models.temporal_candidate import TemporalCandidate
    from app.models.temporal_reference_stack import TemporalReferenceStack
    from app.models.selected_reference import SelectedReference
    from app.models.temporal_context import TemporalContext
    from app.models.cloud_detection import CloudDetection
    from app.models.cloud_classification import CloudClassification
    from app.models.cloud_shadow import CloudShadow
    from app.models.cloud_segmentation import CloudSegmentation
    from app.models.cloud_analytics import CloudAnalytics
    from app.models.reconstruction_run import ReconstructionRun
    from app.models.temporal_fusion_run import TemporalFusionRun
    from app.models.confidence_estimation import ConfidenceEstimation
    from app.models.reliability_score import ReliabilityScore
    Base.metadata.create_all(bind=engine)

    # Ensure new reconstruction_runs columns are present for Phase 7C compatibility
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check existing columns
            res = conn.execute(text("PRAGMA table_info(reconstruction_runs)"))
            cols = [row[1] for row in res.fetchall()]
            if cols:
                if "output_image_path" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN output_image_path VARCHAR"))
                if "preview_image_path" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN preview_image_path VARCHAR"))
                if "reconstruction_method" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN reconstruction_method VARCHAR"))
                if "execution_time_ms" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN execution_time_ms INTEGER"))
                if "optimization_status" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN optimization_status VARCHAR"))
                if "optimization_timestamp" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN optimization_timestamp DATETIME"))
                if "optimization_method" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN optimization_method VARCHAR"))
                if "optimized_output_path" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN optimized_output_path VARCHAR"))
                if "optimized_preview_path" not in cols:
                    conn.execute(text("ALTER TABLE reconstruction_runs ADD COLUMN optimized_preview_path VARCHAR"))
                conn.commit()
    except Exception as e:
        print(f"Migration warning for reconstruction_runs: {e}")










