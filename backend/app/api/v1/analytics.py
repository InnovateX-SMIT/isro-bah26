from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.analytics import AnalyticsOverviewResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(
    tags=["Operational Analytics"]
)

@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_operational_overview(db: Session = Depends(get_db)):
    """
    Consolidated analytics overview returning executive KPIs, dataset distributions,
    workflow durations, cloud cover spreads, and system health specs.
    """
    service = AnalyticsService(db)
    return service.get_overview_analytics()
