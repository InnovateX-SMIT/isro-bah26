from typing import List, Optional
from sqlalchemy.orm import Session
from app.services.temporal.provider_registry import registry
# Import temporal to trigger package auto-registration
import app.services.temporal
from app.schemas.temporal import ProviderInfoResponse, SystemHealthResponse, ProviderHealthStatus
from app.schemas.temporal_discovery import (
    TemporalDiscoveryResponse,
    TemporalCandidateListResponse
)
from app.services.temporal.historical_discovery_service import HistoricalDiscoveryService

class TemporalService:
    """
    Orchestration service layer for the Temporal intelligence provider framework.
    Coordinates registering, retrieving, and performing health/online checks on all providers.
    In Phase 5B, acts as orchestrator for HistoricalDiscoveryService operations.
    """

    def __init__(self):
        self.registry = registry

    def get_available_providers(self) -> List[ProviderInfoResponse]:
        """
        Retrieves metadata profiles for all registered providers.
        """
        providers = self.registry.list_providers()
        return [
            ProviderInfoResponse(
                name=p.name,
                is_primary=p.is_primary,
                description=p.description
            )
            for p in providers
        ]

    def get_primary_provider(self) -> Optional[ProviderInfoResponse]:
        """
        Retrieves the profile of the primary provider.
        """
        p = self.registry.get_primary_provider()
        if not p:
            return None
        return ProviderInfoResponse(
            name=p.name,
            is_primary=p.is_primary,
            description=p.description
        )

    def provider_health_status(self) -> SystemHealthResponse:
        """
        Performs diagnostic checks against all registered providers and compiles a health report.
        """
        providers = self.registry.list_providers()
        statuses = []
        overall_healthy = True

        for p in providers:
            try:
                healthy = p.health_check()
            except Exception as e:
                healthy = False

            if not healthy:
                overall_healthy = False

            statuses.append(
                ProviderHealthStatus(
                    name=p.name,
                    healthy=healthy,
                    details={"status": "online" if healthy else "offline"}
                )
            )

        return SystemHealthResponse(
            status="healthy" if overall_healthy else "unhealthy",
            providers=statuses
        )

    def run_discovery(
        self,
        session_id: str,
        db: Session,
        provider_name: Optional[str] = None,
        temporal_window_days: int = 30
    ) -> TemporalCandidateListResponse:
        """
        Triggers and executes historical satellite imagery discovery.
        """
        discovery_service = HistoricalDiscoveryService(db)
        return discovery_service.run_discovery(
            session_id=session_id,
            provider_name=provider_name,
            temporal_window_days=temporal_window_days
        )

    def get_discovery(self, session_id: str, db: Session) -> TemporalDiscoveryResponse:
        """
        Retrieves metadata details of the latest discovery run.
        """
        discovery_service = HistoricalDiscoveryService(db)
        return discovery_service.get_latest_discovery(session_id)

    def get_candidates(self, session_id: str, db: Session) -> TemporalCandidateListResponse:
        """
        Retrieves candidate observations from the latest discovery run.
        """
        discovery_service = HistoricalDiscoveryService(db)
        return discovery_service.get_discovery_candidates(session_id)

