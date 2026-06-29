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
        aligned_tiff_path = os.path.join(previews_dir, "aligned_reference.tif")
        
        # Check cache: return path if already processed
        if os.path.exists(preview_png_path) and os.path.exists(aligned_tiff_path):
            return preview_png_path
            
        geotiff_path = self.get_candidate_geotiff_path(candidate)
        if not geotiff_path or not os.path.exists(geotiff_path):
            raise FileNotFoundError(f"Historical GeoTIFF not found on disk at {geotiff_path}")
            
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
        from rasterio.warp import reproject, Resampling, transform_bounds
        
        # Read uploaded image spatial reference metadata
        with rasterio.open(uploaded_band_file) as src_up:
            dest_crs = src_up.crs
            dest_transform = src_up.transform
            dest_width = src_up.width
            dest_height = src_up.height
            dest_bounds = src_up.bounds
            
        # Open historical GeoTIFF
        with rasterio.open(geotiff_path) as src_hist:
            # Check geographic overlap
            try:
                up_left, up_bottom, up_right, up_top = transform_bounds(dest_crs, src_hist.crs, *dest_bounds)
                hist_left, hist_bottom, hist_right, hist_top = src_hist.bounds
                overlap = (
                    up_left < hist_right and
                    up_right > hist_left and
                    up_bottom < hist_top and
                    up_top > hist_bottom
                )
                if not overlap:
                    print(f"[Warning] Bounding box overlap check failed for {candidate.candidate_id}")
            except Exception as e:
                print(f"[Warning] Overlap calculation failed: {e}")
                
            # Dynamic Band Mapping
            # Check sensor type or provider to map B4, B3, B2 (Red, Green, Blue)
            sensor = ""
            cand_metadata = {}
            if candidate.metadata_json:
                try:
                    cand_metadata = json.loads(candidate.metadata_json)
                    sensor = cand_metadata.get("sensor", "").lower()
                except Exception:
                    pass
            
            # Map B4, B3, B2 to 1-based indices dynamically based on provider/sensor metadata
            r_idx, g_idx, b_idx = None, None, None
            usable_bands = cand_metadata.get("usable_bands", [])
            if len(usable_bands) == src_hist.count:
                try:
                    r_idx = usable_bands.index("B4") + 1
                    g_idx = usable_bands.index("B3") + 1
                    b_idx = usable_bands.index("B2") + 1
                except ValueError:
                    pass
                    
            if r_idx is None or g_idx is None or b_idx is None:
                # Fallbacks based on typical provider/sensor bands
                if "sentinel" in sensor or "copernicus" in candidate.provider_name.lower():
                    # Sentinel-2 standard bands usually order: B2, B3, B4, B8 (1, 2, 3, 4)
                    if src_hist.count >= 3:
                        r_idx, g_idx, b_idx = 3, 2, 1
                elif "landsat" in sensor or "google" in candidate.provider_name.lower():
                    # Landsat-8 standard bands usually order: B2, B3, B4, B5 (1, 2, 3, 4)
                    if src_hist.count >= 3:
                        r_idx, g_idx, b_idx = 3, 2, 1
                        
            # absolute default index fallback if mapping couldn't be resolved
            if r_idx is None or g_idx is None or b_idx is None:
                if src_hist.count >= 4:
                    r_idx, g_idx, b_idx = 4, 3, 2
                elif src_hist.count == 3:
                    r_idx, g_idx, b_idx = 3, 2, 1
                else:
                    # Duplicate single band for grayscale preview
                    r_idx, g_idx, b_idx = 1, 1, 1
            
            # Warp/Crop/Resample historical reference bands to matching destination array
            dest_data = np.zeros((3, dest_height, dest_width), dtype=src_hist.dtypes[0])
            for band_num, source_idx in [(1, r_idx), (2, g_idx), (3, b_idx)]:
                reproject(
                    source=rasterio.band(src_hist, source_idx),
                    destination=dest_data[band_num - 1],
                    src_transform=src_hist.transform,
                    src_crs=src_hist.crs,
                    dst_transform=dest_transform,
                    dst_crs=dest_crs,
                    resampling=Resampling.bilinear
                )
                
            # Save the aligned GeoTIFF alongside the PNG for future scientific use
            out_profile = {
                "driver": "GTiff",
                "dtype": src_hist.dtypes[0],
                "nodata": src_hist.nodata,
                "width": dest_width,
                "height": dest_height,
                "count": 3,
                "crs": dest_crs,
                "transform": dest_transform,
                "compress": "lzw"
            }
            with rasterio.open(aligned_tiff_path, "w", **out_profile) as dst_tiff:
                for b_num in range(1, 4):
                    dst_tiff.write(dest_data[b_num - 1], b_num)
                    
        # Stretch between 2nd and 98th percentile for visualization
        def stretch_band(band_data):
            valid_pixels = band_data[band_data > 0]
            if len(valid_pixels) == 0:
                valid_pixels = band_data
            p2 = np.percentile(valid_pixels, 2)
            p98 = np.percentile(valid_pixels, 98)
            
            if p98 > p2:
                stretched = (band_data.astype(np.float32) - p2) / (p98 - p2) * 255.0
                return np.clip(stretched, 0, 255).astype(np.uint8)
            return np.zeros_like(band_data, dtype=np.uint8)
            
        r_norm = stretch_band(dest_data[0])
        g_norm = stretch_band(dest_data[1])
        b_norm = stretch_band(dest_data[2])
        
        rgb_stack = np.stack([r_norm, g_norm, b_norm], axis=-1)
        img = Image.fromarray(rgb_stack)
        img.save(preview_png_path, "PNG")
        
        return preview_png_path


