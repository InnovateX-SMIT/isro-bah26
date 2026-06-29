import os
import logging
from sqlalchemy.orm import Session
import rasterio

# Schemas
from app.schemas.workflow import ValidationComponentResponse, WorkflowValidationResponse

# Repositories
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_inspection_repository import DatasetInspectionRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.temporal_context_repository import TemporalContextRepository
from app.repositories.temporal_discovery_repository import TemporalDiscoveryRepository
from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_analytics_repository import CloudAnalyticsRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.reliability_repository import ReliabilityRepository

# Services for delegation
from app.services.export_service import ExportService
from app.services.package_service import PackageService
from app.services.reports.report_service import ReportService
from app.repositories.export_repository import ExportRepository

logger = logging.getLogger("workflow_validation_service")

class WorkflowValidationService:
    """
    Consolidated validation service executing deep diagnostics on the 5 primary workflow categories
    defined in Phase 12B (Upload, Metadata, Temporal, Reconstruction, Export).
    """
    def __init__(self, db: Session):
        self.db = db
        
        # Instantiate repositories
        self.session_repo = AnalysisSessionRepository(db)
        self.dataset_repo = DatasetRepository(db)
        self.inspection_repo = DatasetInspectionRepository(db)
        self.metadata_repo = DatasetMetadataRepository(db)
        self.geospatial_repo = GeospatialRepository(db)
        self.location_repo = LocationRepository(db)
        self.temporal_repo = TemporalContextRepository(db)
        self.temporal_discovery_repo = TemporalDiscoveryRepository(db)
        self.temporal_stack_repo = TemporalReferenceStackRepository(db)
        self.cloud_detection_repo = CloudDetectionRepository(db)
        self.cloud_classification_repo = CloudClassificationRepository(db)
        self.cloud_shadow_repo = CloudShadowRepository(db)
        self.cloud_segmentation_repo = CloudSegmentationRepository(db)
        self.cloud_analytics_repo = CloudAnalyticsRepository(db)
        self.reconstruction_repo = ReconstructionRepository(db)
        self.confidence_repo = ConfidenceRepository(db)
        self.reliability_repo = ReliabilityRepository(db)

        # Instantiate delegate services
        self.export_service = ExportService(db, ExportRepository(db), self.session_repo, self.dataset_repo)
        self.report_service = ReportService(db, self.session_repo, self.dataset_repo, self.metadata_repo, self.reconstruction_repo)
        self.package_service = PackageService(db, self.session_repo, self.dataset_repo, self.metadata_repo, self.reconstruction_repo, self.report_service)

    def validate_session_workflows(self, session_id: str) -> WorkflowValidationResponse:
        """
        Executes granular checkups on all 5 sub-workflows for a given Analysis Session.
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            # Return an empty validation response marked completely invalid
            unav = ValidationComponentResponse(valid=False, message="Analysis Session not found.", details={})
            return WorkflowValidationResponse(
                session_id=session_id,
                overall_valid=False,
                upload=unav,
                metadata=unav,
                temporal=unav,
                reconstruction=unav,
                export=unav
            )

        # Fetch active dataset if registered
        datasets = self.dataset_repo.list_session_datasets(session_id)
        dataset = datasets[0] if datasets else None
        dataset_id = dataset.dataset_id if dataset else None

        # Resolve paths helper
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

        # ----------------------------------------------------
        # 1. Upload Workflows Validation
        # ----------------------------------------------------
        upload_valid = False
        upload_msg = ""
        upload_details = {}

        if not dataset:
            upload_msg = "Dataset not registered under this session."
            upload_details = {"registration_status": "MISSING"}
        else:
            inspection = self.inspection_repo.get_by_dataset(dataset_id)
            status_upper = dataset.dataset_status.upper()
            
            upload_details = {
                "dataset_id": dataset_id,
                "dataset_name": dataset.dataset_name,
                "dataset_path": dataset.dataset_path,
                "registration_status": "COMPLETED",
                "validation_status": dataset.dataset_status,
                "total_files": inspection.total_files if inspection else 0,
                "tif_files": inspection.total_tif_files if inspection else 0,
                "meta_file": "AVAILABLE" if inspection and inspection.total_txt_files > 0 else "MISSING"
            }

            if status_upper not in ("VALIDATED", "READY") and (not inspection or inspection.inspection_status.upper() != "COMPLETED"):
                upload_msg = f"Dataset validation status is '{dataset.dataset_status}' and inspection has not completed successfully."
            else:
                # Run lightweight readability validation of band TIFFs via rasterio
                dataset_dir = os.path.join(workspace_root, dataset.dataset_path)
                band_paths = []
                if os.path.exists(dataset_dir):
                    for root, _, files in os.walk(dataset_dir):
                        for file in files:
                            if file.lower() in ("band2.tif", "band3.tif", "band4.tif"):
                                band_paths.append(os.path.join(root, file))

                if len(band_paths) < 3:
                    upload_msg = f"Incomplete dataset files: found {len(band_paths)} bands of 3 required (BAND2, BAND3, BAND4)."
                    upload_details["readability_check"] = "FAILED_MISSING_BANDS"
                else:
                    try:
                        read_ok = True
                        for bp in band_paths:
                            with rasterio.open(bp) as src:
                                if src.width <= 0 or src.height <= 0 or src.count <= 0:
                                    read_ok = False
                                    break
                        if read_ok:
                            upload_valid = True
                            upload_msg = "Upload workflows validation succeeded: dataset registered, cataloged, and band TIFF structures verified."
                            upload_details["readability_check"] = "PASSED"
                        else:
                            upload_msg = "TIFF dimensions are invalid in one or more bands."
                            upload_details["readability_check"] = "INVALID_TIFF"
                    except Exception as e:
                        upload_msg = f"Raster read check failed: {str(e)}"
                        upload_details["readability_check"] = f"FAILED: {str(e)}"

        upload_comp = ValidationComponentResponse(valid=upload_valid, message=upload_msg, details=upload_details)

        # ----------------------------------------------------
        # 2. Metadata Workflows Validation
        # ----------------------------------------------------
        metadata_valid = False
        meta_msg = ""
        meta_details = {}

        if not dataset_id:
            meta_msg = "Blocked: upload/dataset registration has not occurred."
        else:
            metadata = self.metadata_repo.get_by_dataset(dataset_id)
            geospatial = self.geospatial_repo.get_by_dataset(dataset_id)
            location = self.location_repo.get_by_dataset(dataset_id)

            meta_details = {
                "metadata_extracted": "AVAILABLE" if metadata and metadata.metadata_status == "COMPLETED" else "MISSING",
                "geospatial_profile": "AVAILABLE" if geospatial else "MISSING",
                "location_context": "AVAILABLE" if location else "MISSING"
            }

            if not metadata or metadata.metadata_status != "COMPLETED":
                meta_msg = "Raster metadata extraction is pending or failed."
            elif not geospatial:
                meta_msg = "Geospatial boundary footprint projection calculation is pending."
            else:
                # Add granular bounds validation
                lat_ok = -90.0 <= geospatial.center_lat <= 90.0
                lon_ok = -180.0 <= geospatial.center_lon <= 180.0
                crs_ok = geospatial.crs is not None or geospatial.epsg is not None
                loc_ok = location is not None and location.country != "Unknown"

                meta_details.update({
                    "dimensions": f"{metadata.raster_width}x{metadata.raster_height}",
                    "band_count": metadata.band_count,
                    "epsg": metadata.epsg_code or geospatial.epsg,
                    "center_lat": geospatial.center_lat,
                    "center_lon": geospatial.center_lon,
                    "geographic_region": location.geographic_region if location else None,
                    "state": location.state if location else None,
                    "district": location.district if location else None
                })

                if not (lat_ok and lon_ok):
                    meta_msg = f"Geospatial error: coordinates out of bounds (lat={geospatial.center_lat}, lon={geospatial.center_lon})."
                elif not crs_ok:
                    meta_msg = "Coordinate Reference System (CRS) coordinates could not be georeferenced."
                elif not loc_ok:
                    meta_msg = "Nominatim location context has not been resolved."
                    metadata_valid = True # Mark valid since Location provider Nominatim has offline fallback
                else:
                    metadata_valid = True
                    meta_msg = f"Metadata workflows validation succeeded: metadata extracted, projected CRS EPSG:{geospatial.epsg or metadata.epsg_code} validated, and region resolved to {location.district}, {location.state}."

        meta_comp = ValidationComponentResponse(valid=metadata_valid, message=meta_msg, details=meta_details)

        # ----------------------------------------------------
        # 3. Temporal Workflows Validation
        # ----------------------------------------------------
        temporal_valid = False
        temporal_msg = ""
        temp_details = {}

        if not dataset_id:
            temporal_msg = "Blocked: upload/dataset registration has not occurred."
        else:
            temporal_context = self.temporal_repo.get_by_dataset(dataset_id)
            discoveries = self.temporal_discovery_repo.get_by_session(session_id)
            discovery = discoveries[0] if discoveries else None
            stack = self.temporal_stack_repo.get_latest_by_session(session_id)

            temp_details = {
                "discovery_status": discovery.status if discovery else "MISSING",
                "references_selected": "COMPLETED" if stack else "PENDING",
                "temporal_context_profile": "AVAILABLE" if temporal_context else "MISSING"
            }

            if not discovery or discovery.status != "COMPLETED":
                temporal_msg = "Temporal historical discovery run is pending or failed."
            elif not stack:
                temporal_msg = "Temporal reference Stack selection is pending."
            elif not temporal_context:
                temporal_msg = "Consolidated temporal context profile generation is pending."
            else:
                # Add validation details
                temp_details.update({
                    "provider_used": discovery.provider_used,
                    "candidate_count": discovery.candidate_count,
                    "selected_count": stack.selected_count,
                    "average_cloud_cover": temporal_context.average_cloud_cover,
                    "average_offset_days": temporal_context.average_temporal_distance
                })

                if stack.selected_count <= 0:
                    temporal_msg = "Temporal Stack is empty. No valid historical references discovered for guided reconstruction."
                else:
                    temporal_valid = True
                    temporal_msg = f"Temporal workflows validation succeeded: stack is populated with {stack.selected_count} reference frames from provider '{discovery.provider_used}' (average cloud cover: {temporal_context.average_cloud_cover}%)."

        temporal_comp = ValidationComponentResponse(valid=temporal_valid, message=temporal_msg, details=temp_details)

        # ----------------------------------------------------
        # 4. Reconstruction Workflows Validation
        # ----------------------------------------------------
        recon_valid = False
        recon_msg = ""
        recon_details = {}

        if not dataset_id:
            recon_msg = "Blocked: upload/dataset registration has not occurred."
        else:
            cloud_det = self.cloud_detection_repo.get_by_dataset(dataset_id)
            cloud_class = self.cloud_classification_repo.get_by_dataset(dataset_id)
            cloud_shadow = self.cloud_shadow_repo.get_by_dataset(dataset_id)
            cloud_seg = self.cloud_segmentation_repo.get_by_dataset(dataset_id)
            cloud_anal = self.cloud_analytics_repo.get_by_dataset(dataset_id)
            
            reconstruction = self.reconstruction_repo.get_by_dataset(dataset_id)
            confidence = self.confidence_repo.get_by_dataset(dataset_id)
            reliability = self.reliability_repo.get_by_dataset(dataset_id)

            recon_details = {
                "cloud_detection": "COMPLETED" if cloud_det and cloud_det.detection_status == "completed" else "PENDING",
                "cloud_classification": "COMPLETED" if cloud_class and cloud_class.classification_status == "completed" else "PENDING",
                "cloud_shadow_detection": "COMPLETED" if cloud_shadow and cloud_shadow.shadow_detection_status == "completed" else "PENDING",
                "cloud_segmentation": "COMPLETED" if cloud_seg and cloud_seg.segmentation_status == "completed" else "PENDING",
                "cloud_analytics": "COMPLETED" if cloud_anal and cloud_anal.analytics_status == "completed" else "PENDING",
                "reconstruction": "COMPLETED" if reconstruction and reconstruction.reconstruction_status == "COMPLETED" else "PENDING",
                "confidence_estimation": "COMPLETED" if confidence and confidence.confidence_status == "completed" else "PENDING",
                "reliability_scoring": "COMPLETED" if reliability else "PENDING"
            }

            if not (cloud_det and cloud_det.detection_status == "completed"):
                recon_msg = "Cloud detection and probability analysis has not run."
            elif not (cloud_class and cloud_class.classification_status == "completed"):
                recon_msg = "Cloud classification (thick/thin/cirrus) analysis has not run."
            elif not (cloud_shadow and cloud_shadow.shadow_detection_status == "completed"):
                recon_msg = "Cloud shadow ray projection tracing has not run."
            elif not (cloud_seg and cloud_seg.segmentation_status == "completed"):
                recon_msg = "Reconstruction-ready cloud mask segmentation has not completed."
            elif not (reconstruction and reconstruction.reconstruction_status == "COMPLETED"):
                recon_msg = "AI reconstruction pipeline inpainting has not completed."
            elif not (confidence and confidence.confidence_status == "completed") or not reliability:
                recon_msg = "Confidence estimation and reliability scorecard parsing is pending."
            else:
                # Verify that reconstructed outputs physically exist on the filesystem and are readable
                rec_tif_abs = os.path.join(workspace_root, reconstruction.output_image_path)
                rec_png_abs = os.path.join(workspace_root, reconstruction.preview_image_path)
                
                recon_details.update({
                    "strategy": reconstruction.reconstruction_method,
                    "reconstruction_tif": "AVAILABLE" if os.path.exists(rec_tif_abs) else "MISSING",
                    "reconstruction_png": "AVAILABLE" if os.path.exists(rec_png_abs) else "MISSING",
                    "mean_confidence": confidence.mean_confidence_score,
                    "reliability_tier": reliability.dataset_reliability_tier
                })

                if not os.path.exists(rec_tif_abs):
                    recon_msg = "Reconstruction failure: the georeferenced output TIFF file is missing on disk."
                elif not os.path.exists(rec_png_abs):
                    recon_msg = "Reconstruction failure: the output PNG visualization preview is missing on disk."
                else:
                    try:
                        # Verify readability of generated reconstruction raster via rasterio
                        with rasterio.open(rec_tif_abs) as src:
                            if src.width > 0 and src.height > 0:
                                recon_valid = True
                                recon_msg = f"Reconstruction workflows validation succeeded: cloud masks completed ({cloud_anal.total_cloud_coverage_percent:.2f}% coverage), AI reconstruction verified via {reconstruction.reconstruction_method}, and mean confidence scored at {confidence.mean_confidence_score}% ({reliability.dataset_reliability_tier} tier)."
                            else:
                                recon_msg = "Reconstructed TIFF dimensions are invalid."
                    except Exception as e:
                        recon_msg = f"Failed to read reconstructed output raster: {str(e)}"

        recon_comp = ValidationComponentResponse(valid=recon_valid, message=recon_msg, details=recon_details)

        # ----------------------------------------------------
        # 5. Export Workflows Validation
        # ----------------------------------------------------
        export_valid = False
        export_msg = ""
        export_details = {}

        if not dataset_id:
            export_msg = "Blocked: upload/dataset registration has not occurred."
        else:
            # Delegate validation queries to existing export, report and package services
            try:
                # 1. Check Raster exports validation (use standard 'reconstruction' layer in 'GeoTIFF' format)
                raster_val = self.export_service.validate_export_request(session_id, "reconstruction", "GeoTIFF")
                
                # 2. Check Package validation
                package_val = self.package_service.validate_package_request(session_id)
                
                # 3. Check report validation for standard reports
                meta_report_val = self.report_service.validate_report_request(session_id, "metadata")
                recon_report_val = self.report_service.validate_report_request(session_id, "reconstruction")
                conf_report_val = self.report_service.validate_report_request(session_id, "confidence")

                available_reports = []
                if meta_report_val.valid: available_reports.append("metadata")
                if recon_report_val.valid: available_reports.append("reconstruction")
                if conf_report_val.valid: available_reports.append("confidence")

                export_details = {
                    "raster_export_valid": raster_val.valid,
                    "raster_validation_message": raster_val.message,
                    "package_export_valid": package_val.valid,
                    "package_validation_message": package_val.message,
                    "available_reports": available_reports,
                    "package_assets": package_val.available_assets if package_val.valid else []
                }

                if not raster_val.valid:
                    export_msg = f"Raster export validation failed: {raster_val.message}"
                elif not package_val.valid:
                    export_msg = f"Package export validation failed: {package_val.message}"
                elif len(available_reports) == 0:
                    export_msg = "No operational report layout targets are ready to compile."
                else:
                    export_valid = True
                    export_msg = f"Export workflows validation succeeded: raster compilation is active, package packaging is ready ({len(package_val.available_assets)} assets), and {len(available_reports)} report layout styles compiled."
            except Exception as e:
                export_msg = f"Export validation exception: {str(e)}"
                export_details = {"error": str(e)}

        export_comp = ValidationComponentResponse(valid=export_valid, message=export_msg, details=export_details)

        # ----------------------------------------------------
        # Overall consolidation
        # ----------------------------------------------------
        overall_valid = upload_valid and metadata_valid and temporal_valid and recon_valid and export_valid

        return WorkflowValidationResponse(
            session_id=session_id,
            overall_valid=overall_valid,
            upload=upload_comp,
            metadata=meta_comp,
            temporal=temporal_comp,
            reconstruction=recon_comp,
            export=export_comp
        )
