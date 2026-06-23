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
from app.schemas.temporal_reference import (
    ReferenceStackResponse,
    SelectedReferenceResponse
)
from app.services.temporal.historical_discovery_service import HistoricalDiscoveryService
from app.schemas.temporal_context import (
    TemporalContextPackageResponse,
    TemporalContextResponse
)


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

    def run_reference_selection(
        self,
        session_id: str,
        db: Session,
        num_references: int = 5,
        custom_weights: Optional[dict] = None
    ) -> ReferenceStackResponse:
        """
        Triggers weighted evaluation and ranks discovered candidates for reference selection.
        """
        from app.services.temporal.reference_selection_service import ReferenceSelectionService
        selection_service = ReferenceSelectionService(db)
        return selection_service.select_references(
            session_id=session_id,
            num_references=num_references,
            custom_weights=custom_weights
        )

    def get_reference_stack(self, session_id: str, db: Session) -> ReferenceStackResponse:
        """
        Retrieves the latest generated reference stack details.
        """
        from app.services.temporal.reference_selection_service import ReferenceSelectionService
        selection_service = ReferenceSelectionService(db)
        return selection_service.get_latest_stack(session_id)

    def get_selected_references(self, session_id: str, db: Session) -> list[SelectedReferenceResponse]:
        """
        Retrieves all selected references list with individual ranking reasons.
        """
        from app.services.temporal.reference_selection_service import ReferenceSelectionService
        selection_service = ReferenceSelectionService(db)
        return selection_service.get_selected_references_list(session_id)

    def generate_temporal_context(self, session_id: str, db: Session) -> TemporalContextPackageResponse:
        """
        Generates and saves the Temporal Context Package for the session.
        """
        from app.services.temporal.temporal_context_service import TemporalContextService
        context_service = TemporalContextService(db)
        return context_service.generate_temporal_context(session_id)

    def get_temporal_context(self, session_id: str, db: Session) -> Optional[TemporalContextResponse]:
        """
        Retrieves the flat temporal context record for the session if it exists.
        """
        from app.services.temporal.temporal_context_service import TemporalContextService
        context_service = TemporalContextService(db)
        return context_service.get_temporal_context(session_id)

    def get_temporal_context_package(self, session_id: str, db: Session) -> TemporalContextPackageResponse:
        """
        Retrieves the detailed Temporal Context Package for the session.
        """
        from app.services.temporal.temporal_context_service import TemporalContextService
        context_service = TemporalContextService(db)
        return context_service.get_temporal_context_package(session_id)

    def get_temporal_summary(self, session_id: str, db: Session) -> str:
        """
        Retrieves the briefing summary of the temporal context package.
        """
        from app.services.temporal.temporal_context_service import TemporalContextService
        context_service = TemporalContextService(db)
        package = context_service.get_temporal_context_package(session_id)
        return package.context_summary


