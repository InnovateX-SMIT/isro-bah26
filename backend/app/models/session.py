import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class AnalysisSession(Base):
    """
    SQLAlchemy Model representing an isolated analysis and reconstruction session.
    Tracks session state, creation times, and modifications.
    """
    __tablename__ = "analysis_sessions"

    session_id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Unique identifier for the analysis session (UUIDv4 string)"
    )
    status = Column(
        String,
        nullable=False,
        default="created",
        doc="Current state of the session lifecycle (created, active, completed, failed)"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp of session initialization"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of the last status change or session modification"
    )

    # Relationship to Datasets
    datasets = relationship("Dataset", back_populates="session", cascade="all, delete-orphan")

