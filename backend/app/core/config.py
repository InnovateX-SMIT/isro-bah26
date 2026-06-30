from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI-Powered Geospatial Reconstruction Platform"
    
    # Database Configuration (SQLite local-first default)
    SQLALCHEMY_DATABASE_URL: str = "sqlite:///./platform.db"
    
    # CORS Origins (to connect with frontend)
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # GEE Configuration
    GEE_BUFFER_KM: float = 50.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
