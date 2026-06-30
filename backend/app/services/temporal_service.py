import os
import json
import numpy as np
import rasterio
from PIL import Image
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.temporal_candidate import TemporalCandidate
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


# In-memory progress tracking database for active sessions
progress_tracker = {}


class TemporalService:
    """
    Orchestration service layer for the Temporal intelligence provider framework.
    Coordinates registering, retrieving, and performing health/online checks on all providers.
    In Phase 5B, acts as orchestrator for HistoricalDiscoveryService operations.
    """

    def __init__(self):
        self.registry = registry

    def get_progress(self, session_id: str) -> dict:
        """
        Retrieves current discovery or selection progress status.
        """
        return progress_tracker.get(session_id, {"stage": "idle", "completed": 0, "total": 0})

    def set_progress(self, session_id: str, stage: str, completed: int, total: int):
        """
        Updates current discovery or selection progress status.
        """
        progress_tracker[session_id] = {
            "stage": stage,
            "completed": completed,
            "total": total
        }

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
        try:
            self.set_progress(session_id, "initializing_search", 0, 3)
            discovery_service = HistoricalDiscoveryService(db)
            self.set_progress(session_id, "querying_catalog", 1, 3)
            res = discovery_service.run_discovery(
                session_id=session_id,
                provider_name=provider_name,
                temporal_window_days=temporal_window_days
            )
            self.set_progress(session_id, "completed", 3, 3)
            return res
        except Exception as e:
            self.set_progress(session_id, f"failed: {str(e)}", 0, 3)
            raise e

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

    def get_candidate_geotiff_path(self, candidate: TemporalCandidate) -> Optional[str]:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        
        cand_metadata = {}
        if candidate.metadata_json:
            try:
                cand_metadata = json.loads(candidate.metadata_json)
            except Exception:
                pass
        
        cached_file_path = None
        for key in ["cache_path", "local_path", "tif_path", "file_path"]:
            if key in cand_metadata:
                cached_file_path = cand_metadata[key]
                break
            if "metadata" in cand_metadata and isinstance(cand_metadata["metadata"], dict) and key in cand_metadata["metadata"]:
                cached_file_path = cand_metadata["metadata"][key]
                break
                
        if not cached_file_path and candidate.candidate_id:
            cached_file_path = f"datasets/temporal_references/{candidate.candidate_id}.tif"
            
        if not cached_file_path:
            return None
            
        # Standardize GEE mock paths
        if "var/cache/temporal" in cached_file_path or "var\\cache\\temporal" in cached_file_path:
            filename = os.path.basename(cached_file_path)
            cached_file_path = f"datasets/temporal_references/{filename}"
            
        if cached_file_path.startswith("/") or cached_file_path.startswith("\\"):
            cached_file_path = cached_file_path[1:]
            
        abs_path = os.path.abspath(os.path.join(workspace_root, cached_file_path))
        
        # If the constructed path does not exist, trigger download for GEE candidates
        if not os.path.exists(abs_path):
            if candidate.provider_name == "GoogleEarthEngine":
                try:
                    expanded_bbox = cand_metadata.get("expanded_bbox")
                    if not expanded_bbox:
                        from sqlalchemy.orm import object_session
                        from app.repositories.geospatial_repository import GeospatialRepository
                        from app.services.geospatial.utils import expand_bbox_by_km
                        from app.core.config import settings
                        db = object_session(candidate)
                        if db:
                            geo_repo = GeospatialRepository(db)
                            geo_context = geo_repo.get_by_dataset(candidate.discovery.dataset_id)
                            if geo_context:
                                original_bbox = [
                                    [geo_context.min_lon, geo_context.min_lat],
                                    [geo_context.max_lon, geo_context.max_lat]
                                ]
                                expanded_bbox = expand_bbox_by_km(original_bbox, buffer_km=settings.GEE_BUFFER_KM)
                    if expanded_bbox:
                        print(f"Lazy fetching GEE candidate {candidate.candidate_id} to cache path {abs_path}...")
                        from app.services.temporal.providers.gee_provider import GoogleEarthEngineProvider
                        provider = GoogleEarthEngineProvider()
                        provider.download_image(candidate.candidate_id, abs_path, expanded_bbox)
                except Exception as fetch_err:
                    print(f"[Error] Failed to dynamically fetch GEE candidate {candidate.candidate_id}: {fetch_err}")

        # If the constructed path does not exist, run a smart dynamic search fallback
        if not os.path.exists(abs_path):
            sensor = cand_metadata.get("sensor", "")
            path_row = cand_metadata.get("path_row", "").replace("_", "")
            tile_id = cand_metadata.get("tile_id", "")
            
            ref_dir = os.path.join(workspace_root, "datasets", "temporal_references")
            if os.path.exists(ref_dir):
                # Search loop
                for root, dirs, files in os.walk(ref_dir):
                    if "previews" in root:
                        continue
                    for file in files:
                        if file.lower().endswith(".tif"):
                            full_file_path = os.path.abspath(os.path.join(root, file))
                            # Match rules:
                            if path_row and path_row in file:
                                return full_file_path
                            if tile_id and tile_id in file:
                                return full_file_path
                            if sensor and "landsat" in sensor.lower() and "lc08" in file.lower():
                                return full_file_path
                            if sensor and "sentinel" in sensor.lower() and ("s2" in file.lower() or "copernicus" in root.lower()):
                                return full_file_path
                
                # Absolute fallback: return the first .tif file found
                for root, dirs, files in os.walk(ref_dir):
                    if "previews" in root:
                        continue
                    for file in files:
                        if file.lower().endswith(".tif"):
                            return os.path.abspath(os.path.join(root, file))
                            
        return abs_path

    def get_candidate_preview_path(self, candidate: TemporalCandidate, db: Optional[Session] = None) -> str:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        
        session_id = candidate.discovery.session_id
        previews_dir = os.path.join(workspace_root, "datasets", "temporal_references", "previews", session_id)
        os.makedirs(previews_dir, exist_ok=True)
        
        preview_png_path = os.path.join(previews_dir, f"{candidate.id}.png")
        
        # Check cache: return path if already processed
        if os.path.exists(preview_png_path):
            print(f"[CACHE HIT] get_candidate_preview_path: preview already exists at {preview_png_path}. Skipping GEE request.")
            return preview_png_path
            
        print(f"[CACHE MISS] get_candidate_preview_path: preview does not exist at {preview_png_path}. Fetching from GEE...")
            
        # Get uploaded dataset path to align extents
        uploaded_dataset_path = None
        if db is not None:
            from app.models.dataset import Dataset
            dataset_id = candidate.discovery.dataset_id
            dataset = db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
            if dataset and dataset.dataset_path:
                uploaded_dataset_path = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))
        else:
            from sqlalchemy.orm import object_session
            cand_db = object_session(candidate)
            if cand_db:
                from app.models.dataset import Dataset
                dataset_id = candidate.discovery.dataset_id
                dataset = cand_db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
                if dataset and dataset.dataset_path:
                    uploaded_dataset_path = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))
                    
        if not uploaded_dataset_path:
            raise ValueError("Could not resolve uploaded dataset path from candidate metadata.")
            
        # Find any band file of the uploaded dataset
        uploaded_band_file = None
        for root, _, files in os.walk(uploaded_dataset_path):
            for file in files:
                if file.lower() in ["band2.tif", "band3.tif", "band4.tif"]:
                    uploaded_band_file = os.path.join(root, file)
                    break
            if uploaded_band_file:
                break
                
        if not uploaded_band_file:
            raise FileNotFoundError(f"No band files found in uploaded dataset path: {uploaded_dataset_path}")
            
        import rasterio
        from rasterio.warp import transform_bounds
        
        # Read uploaded image spatial reference metadata
        with rasterio.open(uploaded_band_file) as src_up:
            dest_crs = src_up.crs
            dest_bounds = src_up.bounds
            
        # Transform UTM bounds of the uploaded dataset to EPSG:4326 (WGS84)
        try:
            min_lon, min_lat, max_lon, max_lat = transform_bounds(dest_crs, "EPSG:4326", *dest_bounds)
            native_bbox = [[min_lon, min_lat], [max_lon, max_lat]]
        except Exception as e:
            raise RuntimeError(f"Failed to transform user dataset bounds to WGS84: {e}")

        # Expand bounds
        from app.core.config import settings
        from app.services.geospatial.utils import expand_bbox_by_km
        expanded_bbox = expand_bbox_by_km(native_bbox, buffer_km=settings.GEE_BUFFER_KM)
        
        import requests
        
        # Determine bands and stretch based on sensor metadata
        sensor = ""
        if candidate.metadata_json:
            try:
                cand_metadata = json.loads(candidate.metadata_json)
                sensor = cand_metadata.get("sensor", "").lower()
            except Exception:
                pass
                
        if "landsat" in sensor or "landsat" in candidate.candidate_id.lower():
            bands = ['SR_B4', 'SR_B3', 'SR_B2']
        else:
            bands = ['B4', 'B3', 'B2']
            
        min_val = 0.0
        max_val = 0.3
        
        # Get thumbnail URL directly from GEE
        from app.services.temporal.providers.gee_provider import GoogleEarthEngineProvider
        provider = GoogleEarthEngineProvider()
        
        try:
            thumb_url = provider.get_thumbnail_url(
                candidate_id=candidate.candidate_id,
                region_geometry=expanded_bbox,
                bands=bands,
                min_val=min_val,
                max_val=max_val,
                dimensions=1024
            )
            
            # Fetch the PNG image bytes from Google's servers
            res = requests.get(thumb_url, timeout=60)
            if res.status_code != 200:
                raise RuntimeError(f"Failed to fetch thumbnail image from GEE: HTTP {res.status_code} - {res.text}")
                
            with open(preview_png_path, "wb") as f:
                f.write(res.content)
        except Exception as e:
            import traceback
            print("ERROR in get_candidate_preview_path:")
            traceback.print_exc()
            raise e
            
        return preview_png_path


