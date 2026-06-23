from typing import List, Optional
from app.services.temporal.provider_registry import registry
# Import temporal to trigger package auto-registration
import app.services.temporal
from app.schemas.temporal import ProviderInfoResponse, SystemHealthResponse, ProviderHealthStatus

class TemporalService:
    """
    Orchestration service layer for the Temporal intelligence provider framework.
    Coordinates registering, retrieving, and performing health/online checks on all providers.
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
