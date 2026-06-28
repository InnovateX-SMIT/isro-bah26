import os
import json
import shutil
import uuid
import tempfile
import datetime
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.services.reports.report_service import ReportService
from app.models.geospatial_context import GeospatialContext
from app.models.location_context import LocationContext
from app.models.temporal_context import TemporalContext
from app.models.selected_reference import SelectedReference
from app.models.cloud_segmentation import CloudSegmentation
from app.models.cloud_analytics import CloudAnalytics
from app.models.reconstruction_run import ReconstructionRun
from app.models.confidence_estimation import ConfidenceEstimation
from app.models.confidence_heatmap import ConfidenceHeatmap
from app.models.confidence_analytics import ConfidenceAnalytics
from app.models.dataset_preview import DatasetPreview
from app.schemas.package import PackageResponse, PackageValidationResponse


class PackageService:
    """
    Service layer coordinating the Analysis Package Export Subsystem (Phase 11C):
    1. Validates and discovers all ready outputs generated during an analysis session.
    2. Builds a professional structured directory: Metadata, Geospatial, Temporal, Cloud, Reconstruction, Confidence, Visualizations, Reports.
    3. Triggers on-the-fly PDF report compilations via ReportService.
    4. Generates a custom markdown README summary.
    5. Bundles everything into a compressed ZIP package.
    6. Manages state and progress updates in status.json to support async polling without database migration requirements.
    """

    def __init__(
        self,
        db: Session,
        session_repo: AnalysisSessionRepository,
        dataset_repo: DatasetRepository,
        metadata_repo: DatasetMetadataRepository,
        reconstruction_repo: ReconstructionRepository,
        report_service: ReportService
    ):
        self.db = db
        self.session_repo = session_repo
        self.dataset_repo = dataset_repo
        self.metadata_repo = metadata_repo
        self.reconstruction_repo = reconstruction_repo
        self.report_service = report_service

    def get_workspace_root(self) -> str:
        """
        Resolves the absolute path of the workspace root.
        """
        current_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

    def _get_packages_dir(self, session_id: str) -> str:
        """
        Returns the absolute path of the packages directory for a given session.
        """
        workspace_root = self.get_workspace_root()
        packages_dir = os.path.join(workspace_root, "datasets", "packages", session_id)
        os.makedirs(packages_dir, exist_ok=True)
        return packages_dir

    def _get_status_file_path(self, session_id: str) -> str:
        """
        Returns the path of the status.json file for a given session.
        """
        return os.path.join(self._get_packages_dir(session_id), "status.json")

    def _write_status(
        self,
        session_id: str,
        package_id: str,
        status: str,
        progress: int,
        message: str,
        file_path: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        error_message: Optional[str] = None,
        included_assets: Optional[List[str]] = None,
        created_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Helper writing state changes to the session's package status.json file.
        """
        status_path = self._get_status_file_path(session_id)
        
        # Load existing data if available
        existing_data = {}
        if os.path.exists(status_path):
            try:
                with open(status_path, "r") as f:
                    existing_data = json.load(f)
            except Exception:
                pass

        now_str = datetime.datetime.now().isoformat() + "Z"
        status_payload = {
            "package_id": package_id,
            "session_id": session_id,
            "status": status,
            "format": "ZIP",
            "file_path": file_path if file_path is not None else existing_data.get("file_path"),
            "file_size_bytes": file_size_bytes if file_size_bytes is not None else existing_data.get("file_size_bytes"),
            "progress": progress,
            "message": message,
            "error_message": error_message,
            "created_at": created_at or existing_data.get("created_at") or now_str,
            "updated_at": now_str,
            "included_assets": included_assets if included_assets is not None else existing_data.get("included_assets", [])
        }

        with open(status_path, "w") as f:
            json.dump(status_payload, f, indent=4)
        
        return status_payload

    def validate_package_request(self, session_id: str) -> PackageValidationResponse:
        """
        Queries all session tables to discover which layers and outputs are ready for packaging.
        Validation fails if no dataset is registerd or no metadata exists.
        """
        # Validate Session
        session = self.session_repo.get_by_id(session_id)
        if not session:
            return PackageValidationResponse(
                valid=False,
                message=f"Analysis session '{session_id}' not found.",
                available_assets=[],
                missing_assets=["Analysis Session"]
            )

        # Validate Dataset
        datasets = self.dataset_repo.list_session_datasets(session_id)
        if not datasets:
            return PackageValidationResponse(
                valid=False,
                message="No datasets registered under this session.",
                available_assets=[],
                missing_assets=["Dataset Registration"]
            )
        dataset = datasets[0]
        dataset_id = dataset.dataset_id

        # Scan for assets availability
        available_assets = ["Analysis Session", "Dataset Registration"]
        missing_assets = []

        # Check Metadata
        metadata = self.metadata_repo.get_by_dataset(dataset_id)
        if metadata:
            available_assets.append("Dataset Metadata")
        else:
            missing_assets.append("Dataset Metadata")

        # Check Geospatial Context
        geo_ctx = self.db.query(GeospatialContext).filter(GeospatialContext.dataset_id == dataset_id).first()
        if geo_ctx:
            available_assets.append("Geospatial Context")
        else:
            missing_assets.append("Geospatial Context")

        # Check Location Context
        loc_ctx = self.db.query(LocationContext).filter(LocationContext.dataset_id == dataset_id).first()
        if loc_ctx:
            available_assets.append("Location Context")
        else:
            missing_assets.append("Location Context")

        # Check Temporal Context
        temp_ctx = self.db.query(TemporalContext).filter(TemporalContext.dataset_id == dataset_id).first()
        if temp_ctx:
            available_assets.append("Temporal Context")
        else:
            missing_assets.append("Temporal Context")

        # Check Cloud Segmentation
        cloud_seg = self.db.query(CloudSegmentation).filter(CloudSegmentation.dataset_id == dataset_id).first()
        if cloud_seg and cloud_seg.segmentation_status == "completed":
            available_assets.append("Cloud Segmentation Mask")
            available_assets.append("Reconstruction Binary Mask")
        else:
            missing_assets.append("Cloud Segmentation & Masks")

        # Check Reconstruction
        recon = self.reconstruction_repo.get_latest_by_session(session_id)
        if recon and recon.reconstruction_status == "COMPLETED":
            available_assets.append("AI Reconstruction Output")
            if recon.optimization_status == "COMPLETED":
                available_assets.append("Optimized Spectral Output")
        else:
            missing_assets.append("Generative AI Reconstruction")

        # Check Confidence
        confidence = self.db.query(ConfidenceEstimation).filter(ConfidenceEstimation.dataset_id == dataset_id).first()
        if confidence and confidence.confidence_status == "completed":
            available_assets.append("Confidence Map")
            heatmap = self.db.query(ConfidenceHeatmap).filter(ConfidenceHeatmap.dataset_id == dataset_id).first()
            if heatmap and heatmap.heatmap_status == "completed":
                available_assets.append("Confidence Visual Heatmap")
                available_assets.append("Reliability Tiers Map")
        else:
            missing_assets.append("Confidence & Reliability Scores")

        # Check Previews
        preview = self.db.query(DatasetPreview).filter(DatasetPreview.dataset_id == dataset_id).first()
        if preview and preview.preview_status == "COMPLETED":
            available_assets.append("Dataset Visual Preview")

        # Package is valid to compile if at least metadata is populated.
        valid = len(available_assets) >= 3
        
        if valid:
            msg = "Ingestion telemetry locks verified. Package is ready to compile."
        else:
            msg = "Incomplete ingestion metrics. Minimum telemetry requires metadata registration."

        return PackageValidationResponse(
            valid=valid,
            message=msg,
            available_assets=available_assets,
            missing_assets=missing_assets
        )

    def trigger_package_generation(self, session_id: str, background_tasks) -> PackageResponse:
        """
        Triggers package generation as a background task. 
        Returns an initial PROCESSING response.
        """
        # Run validation
        validation = self.validate_package_request(session_id)
        if not validation.valid:
            raise HTTPException(status_code=400, detail=validation.message)

        # Create status and job ID
        package_id = str(uuid.uuid4())
        now_str = datetime.datetime.now().isoformat() + "Z"
        
        # Check if already running
        status_path = self._get_status_file_path(session_id)
        if os.path.exists(status_path):
            try:
                with open(status_path, "r") as f:
                    curr = json.load(f)
                    if curr.get("status") == "PROCESSING":
                        return PackageResponse.model_validate(curr)
            except Exception:
                pass

        # Write initial state
        initial_status = self._write_status(
            session_id=session_id,
            package_id=package_id,
            status="PROCESSING",
            progress=5,
            message="Initializing package compiler node...",
            created_at=now_str
        )

        # Enqueue background task
        background_tasks.add_task(
            self._compile_package_task,
            session_id=session_id,
            package_id=package_id,
            created_at=now_str
        )

        return PackageResponse(**initial_status)

    def get_package_status(self, session_id: str) -> PackageResponse:
        """
        Checks the status.json file for the given session to return processing details.
        """
        status_path = self._get_status_file_path(session_id)
        if not os.path.exists(status_path):
            # Try to return a valid schema stating not started
            return PackageResponse(
                package_id="N/A",
                session_id=session_id,
                status="PENDING",
                format="ZIP",
                progress=0,
                message="Awaiting operational compile command.",
                created_at=datetime.datetime.now().isoformat() + "Z",
                updated_at=datetime.datetime.now().isoformat() + "Z",
                included_assets=[]
            )

        try:
            with open(status_path, "r") as f:
                data = json.load(f)
                return PackageResponse(**data)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to read package status parameters: {str(e)}"
            )

    def get_package_file_path(self, session_id: str) -> str:
        """
        Resolves the absolute path of the generated ZIP package.
        """
        packages_dir = self._get_packages_dir(session_id)
        zip_path = os.path.join(packages_dir, f"analysis_package_{session_id}.zip")
        
        if not os.path.exists(zip_path):
            # Check status details
            status_path = self._get_status_file_path(session_id)
            if os.path.exists(status_path):
                try:
                    with open(status_path, "r") as f:
                        data = json.load(f)
                        if data.get("status") == "PROCESSING":
                            raise HTTPException(status_code=400, detail="Package generation is still processing.")
                except HTTPException:
                    raise
                except Exception:
                    pass
            raise HTTPException(status_code=404, detail="Analysis package ZIP file not found. Please compile it first.")
            
        return zip_path

    # --- Background Execution Core ---

    def _compile_package_task(self, session_id: str, package_id: str, created_at: str) -> None:
        """
        Background task running on-the-fly PDF creation, metadata compiling,
        physically duplicating file assets, and compressing the final zip.
        """
        workspace_root = self.get_workspace_root()
        packages_dir = self._get_packages_dir(session_id)
        
        temp_dir = tempfile.mkdtemp(prefix=f"pkg_build_{session_id[:8]}_")
        temp_pkg_root = os.path.join(temp_dir, "Analysis_Package")
        os.makedirs(temp_pkg_root, exist_ok=True)

        try:
            # 1. Discover registered dataset
            self._write_status(session_id, package_id, "PROCESSING", 10, "Gathering active registry nodes...", created_at=created_at)
            datasets = self.dataset_repo.list_session_datasets(session_id)
            dataset = datasets[0]
            dataset_id = dataset.dataset_id
            dataset_name = dataset.dataset_name

            included_assets = []

            # Subfolders mapping
            folders = {
                "Metadata": os.path.join(temp_pkg_root, "Metadata"),
                "Geospatial": os.path.join(temp_pkg_root, "Geospatial"),
                "Temporal": os.path.join(temp_pkg_root, "Temporal"),
                "Cloud": os.path.join(temp_pkg_root, "Cloud"),
                "Reconstruction": os.path.join(temp_pkg_root, "Reconstruction"),
                "Confidence": os.path.join(temp_pkg_root, "Confidence"),
                "Visualizations": os.path.join(temp_pkg_root, "Visualizations"),
                "Reports": os.path.join(temp_pkg_root, "Reports")
            }

            for f_dir in folders.values():
                os.makedirs(f_dir, exist_ok=True)

            # --- Gather Ingestion Metadata ---
            self._write_status(session_id, package_id, "PROCESSING", 20, "Compiling LISS-IV sensor metadata...", created_at=created_at)
            metadata = self.metadata_repo.get_by_dataset(dataset_id)
            if metadata:
                meta_json = {
                    "metadata_id": metadata.metadata_id,
                    "dataset_id": metadata.dataset_id,
                    "coordinate_system": metadata.coordinate_system,
                    "projection_name": metadata.projection_name,
                    "epsg_code": metadata.epsg_code,
                    "utm_zone": metadata.utm_zone,
                    "pixel_size_x": metadata.pixel_size_x,
                    "pixel_size_y": metadata.pixel_size_y,
                    "raster_width": metadata.raster_width,
                    "raster_height": metadata.raster_height,
                    "band_count": metadata.band_count,
                    "acquisition_date": metadata.acquisition_date,
                    "metadata_status": metadata.metadata_status
                }
                with open(os.path.join(folders["Metadata"], "dataset_metadata.json"), "w") as f:
                    json.dump(meta_json, f, indent=4)
                included_assets.append("Dataset Metadata JSON")

            # --- Gather Geospatial & Location Context ---
            self._write_status(session_id, package_id, "PROCESSING", 30, "Compiling coordinate and location summaries...", created_at=created_at)
            geo_ctx = self.db.query(GeospatialContext).filter(GeospatialContext.dataset_id == dataset_id).first()
            if geo_ctx:
                geo_json = {
                    "dataset_id": geo_ctx.dataset_id,
                    "center_lat": geo_ctx.center_lat,
                    "center_lon": geo_ctx.center_lon,
                    "min_lat": geo_ctx.min_lat,
                    "max_lat": geo_ctx.max_lat,
                    "min_lon": geo_ctx.min_lon,
                    "max_lon": geo_ctx.max_lon,
                    "crs": geo_ctx.crs,
                    "epsg": geo_ctx.epsg
                }
                with open(os.path.join(folders["Geospatial"], "geospatial_context.json"), "w") as f:
                    json.dump(geo_json, f, indent=4)
                included_assets.append("Geospatial Context JSON")

            loc_ctx = self.db.query(LocationContext).filter(LocationContext.dataset_id == dataset_id).first()
            if loc_ctx:
                loc_json = {
                    "dataset_id": loc_ctx.dataset_id,
                    "country": loc_ctx.country,
                    "state": loc_ctx.state,
                    "district": loc_ctx.district,
                    "administrative_region": loc_ctx.administrative_region,
                    "geographic_region": loc_ctx.geographic_region,
                    "location_summary": loc_ctx.location_summary
                }
                with open(os.path.join(folders["Geospatial"], "location_context.json"), "w") as f:
                    json.dump(loc_json, f, indent=4)
                included_assets.append("Location Context JSON")

            # --- Gather Temporal Context ---
            self._write_status(session_id, package_id, "PROCESSING", 40, "Gathering historical orbital references...", created_at=created_at)
            temp_ctx = self.db.query(TemporalContext).filter(TemporalContext.dataset_id == dataset_id).first()
            if temp_ctx:
                temp_json = {
                    "session_id": temp_ctx.session_id,
                    "dataset_id": temp_ctx.dataset_id,
                    "provider_count": temp_ctx.provider_count,
                    "reference_count": temp_ctx.reference_count,
                    "average_cloud_cover": temp_ctx.average_cloud_cover,
                    "average_temporal_distance": temp_ctx.average_temporal_distance,
                    "average_spatial_overlap": temp_ctx.average_spatial_overlap,
                    "summary": temp_ctx.summary
                }
                with open(os.path.join(folders["Temporal"], "temporal_context.json"), "w") as f:
                    json.dump(temp_json, f, indent=4)
                included_assets.append("Temporal Context JSON")

            # --- Gather Cloud Intelligence ---
            self._write_status(session_id, package_id, "PROCESSING", 50, "Duplicating cloud maps and segmentation metrics...", created_at=created_at)
            cloud_seg = self.db.query(CloudSegmentation).filter(CloudSegmentation.dataset_id == dataset_id).first()
            if cloud_seg and cloud_seg.segmentation_status == "completed":
                # Copy Masks
                for path_attr, name_file in [
                    ("segmentation_mask_path", "cloud_segmentation_mask.tif"),
                    ("segmentation_preview_path", "cloud_segmentation_preview.png"),
                    ("reconstruction_mask_path", "reconstruction_mask.tif")
                ]:
                    rel_p = getattr(cloud_seg, path_attr, None)
                    if rel_p:
                        abs_p = os.path.abspath(os.path.join(workspace_root, rel_p))
                        if os.path.exists(abs_p):
                            shutil.copy2(abs_p, os.path.join(folders["Cloud"], name_file))
                            included_assets.append(name_file)
                            # If it is a preview, copy to visualizations
                            if name_file.endswith(".png"):
                                shutil.copy2(abs_p, os.path.join(folders["Visualizations"], "cloud_mask_preview.png"))

                # Analytics JSON
                cloud_an = self.db.query(CloudAnalytics).filter(CloudAnalytics.dataset_id == dataset_id).first()
                if cloud_an:
                    an_json = {
                        "dataset_id": cloud_an.dataset_id,
                        "cloud_coverage_percent": cloud_an.total_cloud_coverage_percent,
                        "shadow_coverage_percent": cloud_an.total_shadow_coverage_percent,
                        "thick_cloud_percent": cloud_an.thick_cloud_percent,
                        "thin_cloud_percent": cloud_an.thin_cloud_percent,
                        "cirrus_cloud_percent": cloud_an.cirrus_cloud_percent,
                        "average_confidence": cloud_an.cloud_intelligence_score
                    }
                    with open(os.path.join(folders["Cloud"], "cloud_analytics.json"), "w") as f:
                        json.dump(an_json, f, indent=4)
                    included_assets.append("Cloud Analytics JSON")

            # --- Gather Reconstruction Outputs ---
            self._write_status(session_id, package_id, "PROCESSING", 60, "Gathering generative inpainting outputs...", created_at=created_at)
            recon = self.reconstruction_repo.get_latest_by_session(session_id)
            if recon and recon.reconstruction_status == "COMPLETED":
                # Copy baseline outputs
                for path_attr, name_file in [
                    ("output_image_path", "reconstructed_output.tif"),
                    ("preview_image_path", "reconstructed_preview.png"),
                    ("optimized_output_path", "optimized_output.tif"),
                    ("optimized_preview_path", "optimized_preview.png")
                ]:
                    rel_p = getattr(recon, path_attr, None)
                    if rel_p:
                        abs_p = os.path.abspath(os.path.join(workspace_root, rel_p))
                        if os.path.exists(abs_p):
                            shutil.copy2(abs_p, os.path.join(folders["Reconstruction"], name_file))
                            included_assets.append(name_file)
                            # Copy to visualizations
                            if name_file.endswith(".png"):
                                shutil.copy2(abs_p, os.path.join(folders["Visualizations"], name_file))

                # Configuration Info
                recon_json = {
                    "reconstruction_id": recon.id,
                    "session_id": recon.session_id,
                    "reconstruction_status": recon.reconstruction_status,
                    "reconstruction_method": recon.reconstruction_method,
                    "execution_time_ms": recon.execution_time_ms,
                    "optimization_status": recon.optimization_status,
                    "optimization_method": recon.optimization_method,
                    "summary": recon.summary
                }
                with open(os.path.join(folders["Reconstruction"], "reconstruction_run.json"), "w") as f:
                    json.dump(recon_json, f, indent=4)
                included_assets.append("Reconstruction Run JSON")

            # --- Gather Confidence Analytics ---
            self._write_status(session_id, package_id, "PROCESSING", 70, "Consolidating pixel reliability grids...", created_at=created_at)
            confidence = self.db.query(ConfidenceEstimation).filter(ConfidenceEstimation.dataset_id == dataset_id).first()
            if confidence and confidence.confidence_status == "completed":
                # Copy maps
                for path_attr, name_file in [
                    ("confidence_map_path", "confidence_map.tif"),
                    ("confidence_preview_path", "confidence_preview.png")
                ]:
                    rel_p = getattr(confidence, path_attr, None)
                    if rel_p:
                        abs_p = os.path.abspath(os.path.join(workspace_root, rel_p))
                        if os.path.exists(abs_p):
                            shutil.copy2(abs_p, os.path.join(folders["Confidence"], name_file))
                            included_assets.append(name_file)
                            if name_file.endswith(".png"):
                                shutil.copy2(abs_p, os.path.join(folders["Visualizations"], name_file))

                # Heatmaps & Reliability Map
                heatmap = self.db.query(ConfidenceHeatmap).filter(ConfidenceHeatmap.dataset_id == dataset_id).first()
                if heatmap and heatmap.heatmap_status == "completed":
                    for path_attr, name_file in [
                        ("confidence_overlay_path", "confidence_overlay.png"),
                        ("reliability_map_path", "reliability_map.png")
                    ]:
                        rel_p = getattr(heatmap, path_attr, None)
                        if rel_p:
                            abs_p = os.path.abspath(os.path.join(workspace_root, rel_p))
                            if os.path.exists(abs_p):
                                shutil.copy2(abs_p, os.path.join(folders["Confidence"], name_file))
                                included_assets.append(name_file)
                                shutil.copy2(abs_p, os.path.join(folders["Visualizations"], name_file))

                # Analytics JSON
                conf_an = self.db.query(ConfidenceAnalytics).filter(ConfidenceAnalytics.dataset_id == dataset_id).first()
                if conf_an:
                    an_json = {
                        "dataset_id": conf_an.dataset_id,
                        "analytics_status": conf_an.analytics_status,
                        "headline_summary": conf_an.headline_summary,
                        "report_basis": conf_an.report_basis,
                        "analytics_method": conf_an.analytics_method
                    }
                    with open(os.path.join(folders["Confidence"], "confidence_analytics.json"), "w") as f:
                        json.dump(an_json, f, indent=4)
                    included_assets.append("Confidence Analytics JSON")

                    # Copy nested JSON report files to Confidence folder if they exist on disk
                    for attr, filename in [
                        ("confidence_report_path", "confidence_report.json"),
                        ("confidence_summary_path", "confidence_summary.json"),
                        ("reliability_scorecard_path", "reliability_scorecard.json")
                    ]:
                        rel_p = getattr(conf_an, attr, None)
                        if rel_p:
                            abs_p = os.path.abspath(os.path.join(workspace_root, rel_p))
                            if os.path.exists(abs_p):
                                shutil.copy2(abs_p, os.path.join(folders["Confidence"], filename))
                                included_assets.append(filename)

            # --- Copy Dataset Visual Preview (Ingested Preview) ---
            preview = self.db.query(DatasetPreview).filter(DatasetPreview.dataset_id == dataset_id).first()
            if preview and preview.preview_status == "COMPLETED" and preview.preview_image_path:
                abs_p = os.path.abspath(os.path.join(workspace_root, preview.preview_image_path))
                if os.path.exists(abs_p):
                    shutil.copy2(abs_p, os.path.join(folders["Visualizations"], "dataset_preview.png"))
                    included_assets.append("Dataset Visual Preview")

            # --- Compile and Bundle PDF Reports ---
            self._write_status(session_id, package_id, "PROCESSING", 85, "Compiling production PDF reports on the fly...", created_at=created_at)
            
            report_types = ["analysis", "metadata", "reconstruction", "confidence"]
            for r_type in report_types:
                try:
                    val_res = self.report_service.validate_report_request(session_id, r_type)
                    if val_res.valid:
                        # Compile report (caches file)
                        self.report_service.compile_report(session_id, r_type)
                        # Resolve path
                        cached_p = self.report_service.get_report_file_path(session_id, r_type)
                        if os.path.exists(cached_p):
                            dest_name = f"{r_type}_report.pdf"
                            shutil.copy2(cached_p, os.path.join(folders["Reports"], dest_name))
                            included_assets.append(dest_name)
                except Exception as e:
                    # Log but continue compiling other files
                    print(f"Failed to append report '{r_type}' to package: {e}")

            # --- Generate README.md Markdown ---
            self._write_status(session_id, package_id, "PROCESSING", 90, "Writing master execution briefing README...", created_at=created_at)
            
            readme_content = self._generate_readme_text(
                session_id=session_id,
                dataset_name=dataset_name,
                metadata=metadata,
                geo_ctx=geo_ctx,
                loc_ctx=loc_ctx,
                temp_ctx=temp_ctx,
                cloud_seg=cloud_seg,
                recon=recon,
                confidence=confidence,
                included_assets=included_assets
            )

            with open(os.path.join(temp_pkg_root, "README.md"), "w") as f:
                f.write(readme_content)
            included_assets.append("README.md")

            # --- Create ZIP Archive ---
            self._write_status(session_id, package_id, "PROCESSING", 95, "Creating compressed ZIP package archive...", created_at=created_at)
            
            dest_zip_base = os.path.join(packages_dir, f"analysis_package_{session_id}")
            # shutil.make_archive automatically appends .zip extension
            shutil.make_archive(
                base_name=dest_zip_base,
                format="zip",
                root_dir=temp_dir,
                base_dir="Analysis_Package"
            )

            zip_full_path = dest_zip_base + ".zip"
            rel_zip_path = f"datasets/packages/{session_id}/analysis_package_{session_id}.zip"
            file_size = os.path.getsize(zip_full_path)

            # Success final status write
            self._write_status(
                session_id=session_id,
                package_id=package_id,
                status="COMPLETED",
                progress=100,
                message="Consolidated package generated and zipped successfully.",
                file_path=rel_zip_path,
                file_size_bytes=file_size,
                included_assets=included_assets,
                created_at=created_at
            )

        except Exception as e:
            # Handle failure
            print(f"Package compilation crashed: {e}")
            self._write_status(
                session_id=session_id,
                package_id=package_id,
                status="FAILED",
                progress=0,
                message="Compilation crashed.",
                error_message=str(e),
                created_at=created_at
            )
        finally:
            # Cleanup temp directory
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass

    def _generate_readme_text(
        self,
        session_id: str,
        dataset_name: str,
        metadata: Optional[Any],
        geo_ctx: Optional[Any],
        loc_ctx: Optional[Any],
        temp_ctx: Optional[Any],
        cloud_seg: Optional[Any],
        recon: Optional[Any],
        confidence: Optional[Any],
        included_assets: List[str]
    ) -> str:
        """
        Generates a beautiful scientific README.md context summary for the package.
        """
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        md = []
        md.append("# ISRO LISS-IV Satellite Image Inpaint Analysis Package")
        md.append("")
        md.append(f"**Generated on:** {now}")
        md.append(f"**Session ID:** `{session_id}`")
        md.append(f"**Target Dataset:** `{dataset_name}`")
        md.append("")
        md.append("---")
        md.append("")
        md.append("## Executive Ingestion Summary")
        md.append("")
        
        if metadata:
            md.append(f"- **Acquisition Date:** {metadata.acquisition_date or 'N/A'}")
            md.append(f"- **Resolution / Pixel size:** {metadata.pixel_size_x or 5.0}m x {metadata.pixel_size_y or 5.0}m")
            md.append(f"- **Grid Dimension:** {metadata.raster_width or 'N/A'} px (width) x {metadata.raster_height or 'N/A'} px (height)")
            md.append(f"- **CRS Projection:** {metadata.coordinate_system or 'UTM'} / EPSG:{metadata.epsg_code or 'N/A'}")
        else:
            md.append("- *Metadata registry ingestion details not available.*")
            
        if loc_ctx:
            md.append(f"- **Geographic Region:** {loc_ctx.district}, {loc_ctx.state}, {loc_ctx.country}")
            md.append(f"- **Location Summary:** {loc_ctx.location_summary}")

        md.append("")
        md.append("## Cloud & Obsuration Intelligence")
        md.append("")
        if cloud_seg:
            md.append(f"- **Obscured Cloud Area:** {cloud_seg.total_segmented_area_percent:.2f}%")
            md.append(f"- **Total Obscured Pixels:** {cloud_seg.total_cloud_pixels} px")
            md.append(f"- **Total Shadow Pixels:** {cloud_seg.total_shadow_pixels} px")
            md.append(f"- **Segmented Regions Detected:** {cloud_seg.total_segmented_regions}")
        else:
            md.append("- *Cloud segmentation analytics not available.*")

        md.append("")
        md.append("## Reconstruction Parameters")
        md.append("")
        if recon:
            md.append(f"- **Inpainting Method:** {recon.reconstruction_method}")
            md.append(f"- **Execution Time:** {recon.execution_time_ms} ms")
            md.append(f"- **Post-Spectral Optimization:** {recon.optimization_status}")
            if recon.summary:
                md.append(f"- **Operations Summary:** {recon.summary}")
        else:
            md.append("- *Inpaint reconstruction run details not available.*")

        md.append("")
        md.append("## Statistical Reliability Summary")
        md.append("")
        if confidence:
            md.append(f"- **Mean Reliability index:** {confidence.mean_confidence_score:.2f}%")
            md.append(f"- **Low Confidence Obscuration Area:** {confidence.low_confidence_area_percent:.2f}%")
            md.append(f"- **Estimation Method:** {confidence.confidence_method or 'Spectral Agreement Model'}")
        else:
            md.append("- *Reliability scoring parameters not available.*")

        md.append("")
        md.append("---")
        md.append("")
        md.append("## Package Manifest (Table of Contents)")
        md.append("")
        md.append("The consolidated ZIP package contains the following structured directories:")
        md.append("")
        md.append("1. **Metadata/**: Holds JSON outputs of raw metadata structures.")
        md.append("2. **Geospatial/**: Holds projection coordinate envelopes and reverse geocoding locations.")
        md.append("3. **Temporal/**: Holds historical orbital candidate search and reference stack details.")
        md.append("4. **Cloud/**: Holds physical TIFF segmentation masks, shadows, and analytics.")
        md.append("5. **Reconstruction/**: Holds generative baseline & spectral-optimized GeoTIFF grids.")
        md.append("6. **Confidence/**: Holds continuo us confidence maps, overlay composites, and reliability tier classifications.")
        md.append("7. **Visualizations/**: Includes browse-ready visual composite PNG images.")
        md.append("8. **Reports/**: Includes print-ready scientific PDF diagnostics reports.")
        md.append("")
        md.append("### Zipped File Inventory:")
        for asset in sorted(included_assets):
            md.append(f"- [x] `{asset}`")
        
        md.append("")
        md.append("---")
        md.append("*CONFIDENTIALITY NOTICE: This archive is generated by the AI-Powered Geospatial Reconstruction Platform Core. Operational data locks are verified under ISRO LISS-IV sensor requirements.*")
        
        return "\n".join(md)
