from sqlalchemy import create_engine
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
    Base.metadata.create_all(bind=engine)








