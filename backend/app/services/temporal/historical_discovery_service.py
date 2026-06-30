from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.temporal_discovery_repository import TemporalDiscoveryRepository
from app.repositories.temporal_candidate_repository import TemporalCandidateRepository

from app.services.temporal.provider_registry import registry
from app.schemas.temporal_discovery import (
    TemporalDiscoveryResponse,
    TemporalCandidateResponse,
    TemporalCandidateListResponse
)
from app.schemas.session import SessionStatus

def parse_acquisition_date(date_str: str) -> date:
    """
    Parses various date formats from the metadata layer.
    Supported: DD-MMM-YYYY (e.g. 12-AUG-2025), YYYY-MM-DD, DD/MM/YYYY.
    """
    cleaned = date_str.strip()
    for fmt in ("%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unsupported acquisition date format: '{date_str}'")

class HistoricalDiscoveryService:
    """
    Coordinates searching and persisting historical reference candidates for a LISS-IV scene.
    Consumes outputs from Phase 3 (metadata) and Phase 4 (geospatial coordinates).
    """

    def __init__(self, db: Session):
        self.db = db
        self.dataset_repo = DatasetRepository(db)
        self.metadata_repo = DatasetMetadataRepository(db)
        self.geospatial_repo = GeospatialRepository(db)
        self.session_repo = AnalysisSessionRepository(db)
        self.discovery_repo = TemporalDiscoveryRepository(db)
        self.candidate_repo = TemporalCandidateRepository(db)

    def run_discovery(
        self,
        session_id: str,
        provider_name: Optional[str] = None,
        temporal_window_days: int = 30
    ) -> TemporalCandidateListResponse:
        """
        Executes historical imagery discovery using the registered provider.
        Saves discovery metadata and all matched candidates, and updates the parent session milestone.
        """
        # 1. Fetch registered datasets for the session
        datasets = self.dataset_repo.list_session_datasets(session_id)
        if not datasets:
            raise HTTPException(
                status_code=404,
                detail=f"No datasets registered under session {session_id}."
            )
        dataset = datasets[0]
        dataset_id = dataset.dataset_id

        # 2. Fetch metadata profile
        metadata = self.metadata_repo.get_by_dataset(dataset_id)
        if not metadata or metadata.metadata_status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail="Metadata extraction has not been completed. Run metadata extraction first."
            )
        if not metadata.acquisition_date:
            raise HTTPException(
                status_code=400,
                detail="Dataset metadata is missing an acquisition date."
            )

        # 3. Fetch geospatial context bounds
        geo_context = self.geospatial_repo.get_by_dataset(dataset_id)
        if not geo_context:
            raise HTTPException(
                status_code=400,
                detail="Geospatial context has not been calculated. Run geospatial calculation first."
            )

        # 4. Resolve target provider
        if provider_name:
            provider = registry.get_provider(provider_name)
            if not provider:
                raise HTTPException(
                    status_code=400,
                    detail=f"Requested provider '{provider_name}' is not registered."
                )
        else:
            provider = registry.get_primary_provider()
            if not provider:
                raise HTTPException(
                    status_code=500,
                    detail="No primary provider registered in ProviderRegistry."
                )

        # 5. Parse acquisition date and calculate temporal search windows
        try:
            target_date = parse_acquisition_date(metadata.acquisition_date)
        except ValueError as parse_err:
            raise HTTPException(
                status_code=400,
                detail=f"Failed parsing acquisition date: {parse_err}"
            )

        start_date = target_date - timedelta(days=temporal_window_days)
        end_date = target_date + timedelta(days=temporal_window_days)
        
        search_window_start = start_date.strftime("%Y-%m-%d")
        search_window_end = end_date.strftime("%Y-%m-%d")

        # 6. Initialize discovery record in status PENDING
        discovery = self.discovery_repo.create(
            session_id=session_id,
            dataset_id=dataset_id,
            provider_used=provider.name,
            search_window_start=search_window_start,
            search_window_end=search_window_end,
            status="PENDING"
        )

        try:
            # 7. Execute search
            coordinates = {"lat": geo_context.center_lat, "lon": geo_context.center_lon}
            original_bounding_box = [
                [geo_context.min_lon, geo_context.min_lat],
                [geo_context.max_lon, geo_context.max_lat]
            ]
            from app.core.config import settings
            from app.services.geospatial.utils import expand_bbox_by_km
            bounding_box = expand_bbox_by_km(original_bounding_box, buffer_km=settings.GEE_BUFFER_KM)
            
            # Call provider search
            search_results = provider.search_imagery(
                coordinates=coordinates,
                bounding_box=bounding_box,
                acquisition_date=metadata.acquisition_date
            )

            # 8. Filter results locally by parsed window bounds for realism/precision if desired,
            # but since provider.search_imagery already returns candidates, let's keep all.
            # Convert candidate schema instances to dict objects for repository persistence
            candidates_to_create = []
            for candidate in search_results:
                candidates_to_create.append({
                    "candidate_id": candidate.candidate_id,
                    "provider_name": candidate.provider_name,
                    "acquisition_date": candidate.acquisition_date,
                    "cloud_cover": candidate.cloud_cover,
                    "spatial_overlap": candidate.spatial_overlap,
                    "preview_url": candidate.preview_url,
                    "metadata": candidate.metadata
                })

            # 9. Bulk persist candidates
            db_candidates = self.candidate_repo.bulk_create(discovery.id, candidates_to_create)

            # 10. Update discovery to COMPLETED
            discovery = self.discovery_repo.update_status(
                discovery_id=discovery.id,
                status="COMPLETED",
                candidate_count=len(db_candidates)
            )

            # 11. Update session status milestone
            self.session_repo.update_status(
                session_id=session_id,
                status=SessionStatus.TEMPORAL_CONTEXT_RETRIEVED.value
            )

            # Prepare schemas response
            discovery_resp = TemporalDiscoveryResponse.model_validate(discovery)
            candidates_resp = [TemporalCandidateResponse.model_validate(c) for c in db_candidates]
            
            return TemporalCandidateListResponse(
                discovery=discovery_resp,
                candidate_count=len(candidates_resp),
                candidates=candidates_resp
            )

        except Exception as e:
            # Revert/mark run as FAILED on error
            self.discovery_repo.update_status(
                discovery_id=discovery.id,
                status="FAILED",
                candidate_count=0
            )
            # Propagate FastAPI-friendly or general error
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Historical discovery pipeline run failed: {e}"
            )

    def get_latest_discovery(self, session_id: str) -> TemporalDiscoveryResponse:
        """
        Retrieves the latest discovery run metadata.
        """
        discovery = self.discovery_repo.get_latest(session_id)
        if not discovery:
            raise HTTPException(
                status_code=404,
                detail=f"No discovery runs found for session {session_id}."
            )
        return TemporalDiscoveryResponse.model_validate(discovery)

    def get_discovery_candidates(self, session_id: str) -> TemporalCandidateListResponse:
        """
        Retrieves the candidate observations associated with the latest discovery run.
        """
        discovery = self.discovery_repo.get_latest(session_id)
        if not discovery:
            raise HTTPException(
                status_code=404,
                detail=f"No discovery runs found for session {session_id}."
            )

        candidates = self.candidate_repo.get_by_discovery(discovery.id)
        
        discovery_resp = TemporalDiscoveryResponse.model_validate(discovery)
        candidates_resp = [TemporalCandidateResponse.model_validate(c) for c in candidates]

        return TemporalCandidateListResponse(
            discovery=discovery_resp,
            candidate_count=len(candidates_resp),
            candidates=candidates_resp
        )
