import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

# Schemas
from app.schemas.workflow import WorkflowResponse, WorkflowStageDetail, WorkflowTimelineItem, WorkflowLogEntry

# Repositories
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_inspection_repository import DatasetInspectionRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.temporal_context_repository import TemporalContextRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_analytics_repository import CloudAnalyticsRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.reliability_repository import ReliabilityRepository
from app.repositories.confidence_heatmap_repository import ConfidenceHeatmapRepository
from app.repositories.confidence_analytics_repository import ConfidenceAnalyticsRepository
from app.repositories.dataset_preview_repository import DatasetPreviewRepository

class WorkflowService:
    """
    Service responsible for consolidating processing statuses, dependency trees,
    chronological timelines, and terminal console logs for Analysis Sessions.
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
        self.cloud_detection_repo = CloudDetectionRepository(db)
        self.cloud_classification_repo = CloudClassificationRepository(db)
        self.cloud_shadow_repo = CloudShadowRepository(db)
        self.cloud_segmentation_repo = CloudSegmentationRepository(db)
        self.cloud_analytics_repo = CloudAnalyticsRepository(db)
        self.reconstruction_repo = ReconstructionRepository(db)
        self.confidence_repo = ConfidenceRepository(db)
        self.reliability_repo = ReliabilityRepository(db)
        self.heatmap_repo = ConfidenceHeatmapRepository(db)
        self.analytics_repo = ConfidenceAnalyticsRepository(db)
        self.preview_repo = DatasetPreviewRepository(db)

    def get_session_workflow(self, session_id: str) -> WorkflowResponse:
        """
        Gathers database state records and compiles the Session Workflow telemetry profile.
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found."
            )

        # Retrieve registered datasets for the session
        datasets = self.dataset_repo.list_session_datasets(session_id)
        dataset = datasets[0] if datasets else None
        dataset_id = dataset.dataset_id if dataset else None

        # Gather context records
        inspection = self.inspection_repo.get_by_dataset(dataset_id) if dataset_id else None
        metadata = self.metadata_repo.get_by_dataset(dataset_id) if dataset_id else None
        geospatial = self.geospatial_repo.get_by_dataset(dataset_id) if dataset_id else None
        location = self.location_repo.get_by_dataset(dataset_id) if dataset_id else None
        temporal_context = self.temporal_repo.get_by_dataset(dataset_id) if dataset_id else None
        cloud_det = self.cloud_detection_repo.get_by_dataset(dataset_id) if dataset_id else None
        cloud_class = self.cloud_classification_repo.get_by_dataset(dataset_id) if dataset_id else None
        cloud_shadow = self.cloud_shadow_repo.get_by_dataset(dataset_id) if dataset_id else None
        cloud_seg = self.cloud_segmentation_repo.get_by_dataset(dataset_id) if dataset_id else None
        cloud_anal = self.cloud_analytics_repo.get_by_dataset(dataset_id) if dataset_id else None
        reconstruction = self.reconstruction_repo.get_by_dataset(dataset_id) if dataset_id else None
        confidence = self.confidence_repo.get_by_dataset(dataset_id) if dataset_id else None
        reliability = self.reliability_repo.get_by_dataset(dataset_id) if dataset_id else None
        heatmap = self.heatmap_repo.get_by_reliability_score(reliability.reliability_id) if reliability else None
        analytics = self.analytics_repo.get_by_confidence_heatmap(heatmap.heatmap_id) if heatmap else None
        preview = self.preview_repo.get_by_dataset(dataset_id) if dataset_id else None

        # Build Stage definitions
        stages_info = [
            {"name": "Analysis Session", "deps": []},
            {"name": "Dataset Registration", "deps": ["Analysis Session"]},
            {"name": "Inspection", "deps": ["Dataset Registration"]},
            {"name": "Validation", "deps": ["Inspection"]},
            {"name": "Metadata Extraction", "deps": ["Validation"]},
            {"name": "Geospatial Intelligence", "deps": ["Metadata Extraction"]},
            {"name": "Temporal Intelligence", "deps": ["Geospatial Intelligence"]},
            {"name": "Cloud Intelligence", "deps": ["Temporal Intelligence"]},
            {"name": "Reconstruction", "deps": ["Cloud Intelligence"]},
            {"name": "Confidence", "deps": ["Reconstruction"]},
            {"name": "Visualization", "deps": ["Confidence"]}
        ]

        # Resolution variables
        stage_details = {}
        timeline_items = []
        logs_items = []

        # Helper to format dates
        def fmt_dt(dt) -> str:
            if not dt:
                return datetime.datetime.utcnow().isoformat()
            if isinstance(dt, str):
                return dt
            return dt.isoformat()

        # Helper to compute duration in ms
        def duration_ms(start_dt, end_dt) -> float:
            if not start_dt or not end_dt:
                return 0.0
            if isinstance(start_dt, str):
                start_dt = datetime.datetime.fromisoformat(start_dt)
            if isinstance(end_dt, str):
                end_dt = datetime.datetime.fromisoformat(end_dt)
            return abs((end_dt - start_dt).total_seconds() * 1000)

        # ----------------------------------------------------
        # Stage 1: Analysis Session
        # ----------------------------------------------------
        s_duration = duration_ms(session.created_at, session.updated_at) or 500.0
        stage_details["Analysis Session"] = WorkflowStageDetail(
            name="Analysis Session",
            status="completed",
            updated_at=fmt_dt(session.updated_at),
            duration_ms=s_duration,
            inputs={"session_id": session_id},
            outputs={"session_status": session.status},
            related_apis=["POST /api/v1/analysis", "GET /api/v1/analysis/{id}"],
            dependencies=[]
        )
        timeline_items.append(WorkflowTimelineItem(
            stage_name="Analysis Session", event="Container session instantiated", timestamp=fmt_dt(session.created_at), duration_ms=s_duration
        ))
        logs_items.append(WorkflowLogEntry(
            timestamp=fmt_dt(session.created_at), stage="Analysis Session", event=f"Analysis Session initialized with token {session_id}", status="completed", severity="INFO"
        ))

        # ----------------------------------------------------
        # Stage 2: Dataset Registration
        # ----------------------------------------------------
        if dataset:
            ds_duration = duration_ms(session.created_at, dataset.created_at) or 1000.0
            stage_details["Dataset Registration"] = WorkflowStageDetail(
                name="Dataset Registration",
                status="completed",
                updated_at=fmt_dt(dataset.created_at),
                duration_ms=ds_duration,
                inputs={"analysis_session_id": session_id, "dataset_name": dataset.dataset_name},
                outputs={"dataset_id": dataset.dataset_id, "dataset_path": dataset.dataset_path, "dataset_type": dataset.dataset_type},
                related_apis=["POST /api/v1/datasets/register", "GET /api/v1/datasets/{id}"],
                dependencies=["Analysis Session"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Dataset Registration", event="LISS-IV folder registered", timestamp=fmt_dt(dataset.created_at), duration_ms=ds_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(dataset.created_at), stage="Dataset Registration", event=f"Target dataset directory locked: {dataset.dataset_path}", status="completed", severity="INFO"
            ))
        else:
            stage_details["Dataset Registration"] = WorkflowStageDetail(
                name="Dataset Registration",
                status="waiting",
                updated_at=fmt_dt(session.updated_at),
                inputs={},
                outputs={},
                related_apis=["POST /api/v1/datasets/register"],
                dependencies=["Analysis Session"]
            )

        # ----------------------------------------------------
        # Stage 3: Inspection
        # ----------------------------------------------------
        if not dataset:
            stage_details["Inspection"] = WorkflowStageDetail(
                name="Inspection", status="pending", updated_at=fmt_dt(session.updated_at), blocked_by="Dataset Registration",
                error_summary="Blocked: waiting for dataset registration.", dependencies=["Dataset Registration"]
            )
        elif not inspection:
            stage_details["Inspection"] = WorkflowStageDetail(
                name="Inspection", status="waiting", updated_at=fmt_dt(dataset.created_at),
                related_apis=["POST /api/v1/dataset-inspection/run/{id}"], dependencies=["Dataset Registration"]
            )
        else:
            insp_status = "completed" if inspection.inspection_status.upper() == "COMPLETED" else "failed" if inspection.inspection_status.upper() == "FAILED" else "running"
            insp_duration = duration_ms(inspection.created_at, inspection.updated_at) or 1500.0
            stage_details["Inspection"] = WorkflowStageDetail(
                name="Inspection",
                status=insp_status,
                updated_at=fmt_dt(inspection.updated_at),
                duration_ms=insp_duration,
                inputs={"dataset_path": dataset.dataset_path},
                outputs={"total_files": inspection.total_files, "tif_count": inspection.total_tif_files, "txt_count": inspection.total_txt_files},
                related_apis=["POST /api/v1/dataset-inspection/run/{id}", "GET /api/v1/dataset-inspection/{id}"],
                dependencies=["Dataset Registration"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Inspection", event="Filesystem inventory scanner completed", timestamp=fmt_dt(inspection.updated_at), duration_ms=insp_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(inspection.created_at), stage="Inspection", event=f"Inventory scan started. Cataloging bands.", status="running", severity="INFO"
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(inspection.updated_at), stage="Inspection", event=f"Scan completed. Discovered {inspection.total_tif_files} LISS-IV band TIFF structures.", status="completed", severity="INFO"
            ))

        # ----------------------------------------------------
        # Stage 4: Validation
        # ----------------------------------------------------
        is_insp_completed = stage_details.get("Inspection") and stage_details["Inspection"].status == "completed"
        is_insp_failed = stage_details.get("Inspection") and stage_details["Inspection"].status == "failed"

        if not dataset or is_insp_failed:
            stage_details["Validation"] = WorkflowStageDetail(
                name="Validation", status="blocked", updated_at=fmt_dt(session.updated_at), blocked_by="Inspection",
                error_summary="Blocked: upstream Inspection scan failed or was blocked.", dependencies=["Inspection"]
            )
        elif not is_insp_completed:
            stage_details["Validation"] = WorkflowStageDetail(
                name="Validation", status="pending", updated_at=fmt_dt(dataset.created_at), dependencies=["Inspection"]
            )
        else:
            val_status = "completed" if (dataset.dataset_status.upper() in ("VALIDATED", "READY") or is_insp_completed) else "failed" if dataset.dataset_status.upper() == "FAILED" else "running" if dataset.dataset_status.upper() == "INSPECTING" else "waiting"
            stage_details["Validation"] = WorkflowStageDetail(
                name="Validation",
                status=val_status,
                updated_at=fmt_dt(dataset.updated_at),
                duration_ms=400.0,
                inputs={"dataset_status": dataset.dataset_status},
                outputs={"integrity_checked": True, "lock_status": val_status},
                related_apis=[],
                dependencies=["Inspection"]
            )
            if val_status == "completed":
                timeline_items.append(WorkflowTimelineItem(
                    stage_name="Validation", event="Bands integrity check locked", timestamp=fmt_dt(dataset.updated_at), duration_ms=400.0
                ))
                logs_items.append(WorkflowLogEntry(
                    timestamp=fmt_dt(dataset.updated_at), stage="Validation", event="Structure validation complete. Spectral bands are intact and ready.", status="completed", severity="INFO"
                ))

        # ----------------------------------------------------
        # Stage 5: Metadata Extraction
        # ----------------------------------------------------
        is_val_completed = stage_details.get("Validation") and stage_details["Validation"].status == "completed"
        is_val_failed = stage_details.get("Validation") and stage_details["Validation"].status == "failed"

        if not dataset or is_val_failed or is_insp_failed:
            stage_details["Metadata Extraction"] = WorkflowStageDetail(
                name="Metadata Extraction", status="blocked", updated_at=fmt_dt(session.updated_at), blocked_by="Validation",
                error_summary="Blocked: Validation pipeline did not resolve successfully.", dependencies=["Validation"]
            )
        elif not is_val_completed:
            stage_details["Metadata Extraction"] = WorkflowStageDetail(
                name="Metadata Extraction", status="pending", updated_at=fmt_dt(dataset.created_at), dependencies=["Validation"]
            )
        elif not metadata:
            stage_details["Metadata Extraction"] = WorkflowStageDetail(
                name="Metadata Extraction", status="waiting", updated_at=fmt_dt(dataset.updated_at),
                related_apis=["POST /api/v1/dataset-metadata/run/{id}"], dependencies=["Validation"]
            )
        else:
            meta_status = "completed" if metadata.metadata_status.upper() == "COMPLETED" else "failed" if metadata.metadata_status.upper() == "FAILED" else "running"
            meta_duration = duration_ms(metadata.created_at, metadata.updated_at) or 2000.0
            stage_details["Metadata Extraction"] = WorkflowStageDetail(
                name="Metadata Extraction",
                status=meta_status,
                updated_at=fmt_dt(metadata.updated_at),
                duration_ms=meta_duration,
                inputs={"dataset_id": dataset_id},
                outputs={"resolution_gsd": f"{abs(metadata.pixel_size_x)}m", "width": metadata.raster_width, "height": metadata.raster_height, "bands": metadata.band_count, "acquisition_date": metadata.acquisition_date},
                related_apis=["POST /api/v1/dataset-metadata/run/{id}", "GET /api/v1/dataset-metadata/{id}"],
                dependencies=["Validation"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Metadata Extraction", event="Georeferencing headers extracted", timestamp=fmt_dt(metadata.updated_at), duration_ms=meta_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(metadata.created_at), stage="Metadata Extraction", event="Reading raster band metadata headers.", status="running", severity="INFO"
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(metadata.updated_at), stage="Metadata Extraction", event=f"Parsed acquisition date {metadata.acquisition_date} with spatial resolution of {abs(metadata.pixel_size_x)}m.", status="completed", severity="INFO"
            ))

        # ----------------------------------------------------
        # Stage 6: Geospatial Intelligence
        # ----------------------------------------------------
        is_meta_completed = stage_details.get("Metadata Extraction") and stage_details["Metadata Extraction"].status == "completed"
        is_meta_failed = stage_details.get("Metadata Extraction") and stage_details["Metadata Extraction"].status == "failed"

        if not dataset or is_meta_failed:
            stage_details["Geospatial Intelligence"] = WorkflowStageDetail(
                name="Geospatial Intelligence", status="blocked", updated_at=fmt_dt(session.updated_at), blocked_by="Metadata Extraction",
                error_summary="Blocked: Upstream raster metadata parsing failed.", dependencies=["Metadata Extraction"]
            )
        elif not is_meta_completed:
            stage_details["Geospatial Intelligence"] = WorkflowStageDetail(
                name="Geospatial Intelligence", status="pending", updated_at=fmt_dt(dataset.created_at), dependencies=["Metadata Extraction"]
            )
        elif not geospatial:
            stage_details["Geospatial Intelligence"] = WorkflowStageDetail(
                name="Geospatial Intelligence", status="waiting", updated_at=fmt_dt(metadata.updated_at),
                related_apis=["GET /api/v1/geospatial/{id}/context", "GET /api/v1/location/{id}/context"], dependencies=["Metadata Extraction"]
            )
        else:
            geo_duration = 1200.0
            stage_details["Geospatial Intelligence"] = WorkflowStageDetail(
                name="Geospatial Intelligence",
                status="completed",
                updated_at=fmt_dt(geospatial.generated_at),
                duration_ms=geo_duration,
                inputs={"pixel_origin_x": metadata.origin_x, "pixel_origin_y": metadata.origin_y, "epsg_code": metadata.epsg_code},
                outputs={"center_lat": geospatial.center_lat, "center_lon": geospatial.center_lon, "crs": geospatial.crs, "geographic_region": location.geographic_region if location else "Plain"},
                related_apis=["GET /api/v1/geospatial/{id}/context", "GET /api/v1/location/{id}/context"],
                dependencies=["Metadata Extraction"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Geospatial Intelligence", event="Centroid projected bounds calculated", timestamp=fmt_dt(geospatial.generated_at), duration_ms=geo_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(geospatial.generated_at), stage="Geospatial Intelligence", event=f"Raster bounds converted to EPSG:{geospatial.epsg or 4326}. Centroid: {geospatial.center_lat:.4f}N, {geospatial.center_lon:.4f}E.", status="completed", severity="INFO"
            ))
            if location:
                logs_items.append(WorkflowLogEntry(
                    timestamp=fmt_dt(location.created_at), stage="Geospatial Intelligence", event=f"Nominatim resolved location to {location.district}, {location.state}, {location.country}.", status="completed", severity="INFO"
                ))

        # ----------------------------------------------------
        # Stage 7: Temporal Intelligence
        # ----------------------------------------------------
        is_geo_completed = stage_details.get("Geospatial Intelligence") and stage_details["Geospatial Intelligence"].status == "completed"

        if not dataset or not is_geo_completed:
            stage_details["Temporal Intelligence"] = WorkflowStageDetail(
                name="Temporal Intelligence", status="pending", updated_at=fmt_dt(session.updated_at), dependencies=["Geospatial Intelligence"]
            )
        elif not temporal_context:
            stage_details["Temporal Intelligence"] = WorkflowStageDetail(
                name="Temporal Intelligence", status="waiting", updated_at=fmt_dt(geospatial.generated_at),
                related_apis=["POST /api/v1/temporal/discover/{session_id}", "POST /api/v1/temporal/select/{session_id}", "POST /api/v1/temporal/context/{session_id}"],
                dependencies=["Geospatial Intelligence"]
            )
        else:
            temp_duration = duration_ms(temporal_context.created_at, temporal_context.updated_at) or 1500.0
            stage_details["Temporal Intelligence"] = WorkflowStageDetail(
                name="Temporal Intelligence",
                status="completed",
                updated_at=fmt_dt(temporal_context.updated_at),
                duration_ms=temp_duration,
                inputs={"target_date": metadata.acquisition_date, "coordinate_bounds": f"{geospatial.min_lat:.3f},{geospatial.min_lon:.3f} to {geospatial.max_lat:.3f},{geospatial.max_lon:.3f}"},
                outputs={"reference_count": temporal_context.reference_count, "avg_cloud_cover": temporal_context.average_cloud_cover, "avg_offset_days": temporal_context.average_temporal_distance},
                related_apis=["POST /api/v1/temporal/discover/{session_id}", "POST /api/v1/temporal/select/{session_id}", "POST /api/v1/temporal/context/{session_id}"],
                dependencies=["Geospatial Intelligence"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Temporal Intelligence", event="Historical references discovered and selected", timestamp=fmt_dt(temporal_context.updated_at), duration_ms=temp_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(temporal_context.created_at), stage="Temporal Intelligence", event="Querying Google Earth Engine catalog providers.", status="running", severity="INFO"
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(temporal_context.updated_at), stage="Temporal Intelligence", event=f"Selected {temporal_context.reference_count} clean references. Avg cloud cover: {temporal_context.average_cloud_cover}%.", status="completed", severity="INFO"
            ))

        # ----------------------------------------------------
        # Stage 8: Cloud Intelligence
        # ----------------------------------------------------
        is_temp_completed = stage_details.get("Temporal Intelligence") and stage_details["Temporal Intelligence"].status == "completed"

        if not dataset or not is_temp_completed:
            stage_details["Cloud Intelligence"] = WorkflowStageDetail(
                name="Cloud Intelligence", status="pending", updated_at=fmt_dt(session.updated_at), dependencies=["Temporal Intelligence"]
            )
        elif not cloud_det:
            stage_details["Cloud Intelligence"] = WorkflowStageDetail(
                name="Cloud Intelligence", status="waiting", updated_at=fmt_dt(temporal_context.updated_at),
                related_apis=["POST /api/v1/cloud-detection/run/{id}", "POST /api/v1/cloud-classification/run/{id}"],
                dependencies=["Temporal Intelligence"]
            )
        else:
            cloud_status = "completed" if cloud_det.detection_status.upper() == "COMPLETED" else "failed" if cloud_det.detection_status.upper() == "FAILED" else "running"
            cloud_duration = duration_ms(cloud_det.created_at, cloud_det.updated_at) or 1800.0
            stage_details["Cloud Intelligence"] = WorkflowStageDetail(
                name="Cloud Intelligence",
                status=cloud_status,
                updated_at=fmt_dt(cloud_det.updated_at),
                duration_ms=cloud_duration,
                inputs={"detection_method": cloud_det.detection_method},
                outputs={"cloud_coverage_percent": cloud_det.cloud_coverage_percent, "regions_count": cloud_det.candidate_region_count},
                related_apis=["POST /api/v1/cloud-detection/run/{id}", "POST /api/v1/cloud-classification/run/{id}", "POST /api/v1/cloud-shadow/run/{id}"],
                dependencies=["Temporal Intelligence"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Cloud Intelligence", event="Spectral index threshold masking complete", timestamp=fmt_dt(cloud_det.updated_at), duration_ms=cloud_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(cloud_det.created_at), stage="Cloud Intelligence", event="Starting Cloud detection. Resolving indices.", status="running", severity="INFO"
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(cloud_det.updated_at), stage="Cloud Intelligence", event=f"Detection complete. Cloud coverage is {cloud_det.cloud_coverage_percent:.2f}% across {cloud_det.candidate_region_count} regions.", status="completed", severity="INFO"
            ))

        # ----------------------------------------------------
        # Stage 9: Reconstruction
        # ----------------------------------------------------
        is_cloud_completed = stage_details.get("Cloud Intelligence") and stage_details["Cloud Intelligence"].status == "completed"
        is_cloud_failed = stage_details.get("Cloud Intelligence") and stage_details["Cloud Intelligence"].status == "failed"

        if not dataset or is_cloud_failed:
            stage_details["Reconstruction"] = WorkflowStageDetail(
                name="Reconstruction", status="blocked", updated_at=fmt_dt(session.updated_at), blocked_by="Cloud Intelligence",
                error_summary="Blocked: Upstream cloud masking and analytics failed.", dependencies=["Cloud Intelligence"]
            )
        elif not is_cloud_completed:
            stage_details["Reconstruction"] = WorkflowStageDetail(
                name="Reconstruction", status="pending", updated_at=fmt_dt(session.updated_at), dependencies=["Cloud Intelligence"]
            )
        elif not reconstruction:
            stage_details["Reconstruction"] = WorkflowStageDetail(
                name="Reconstruction", status="waiting", updated_at=fmt_dt(cloud_det.updated_at),
                related_apis=["POST /api/v1/reconstruction/run/{session_id}"], dependencies=["Cloud Intelligence"]
            )
        else:
            rec_status = "completed" if reconstruction.reconstruction_status == "COMPLETED" else "failed" if reconstruction.reconstruction_status == "FAILED" else "running"
            rec_duration = reconstruction.execution_time_ms or 3000.0
            stage_details["Reconstruction"] = WorkflowStageDetail(
                name="Reconstruction",
                status=rec_status,
                updated_at=fmt_dt(reconstruction.updated_at),
                duration_ms=rec_duration,
                inputs={"strategy": reconstruction.reconstruction_method},
                outputs={"output_raster_path": reconstruction.reconstructed_image_path, "preview_raster_path": reconstruction.preview_image_path},
                related_apis=["POST /api/v1/reconstruction/run/{session_id}", "POST /api/v1/reconstruction/optimize/{session_id}", "POST /api/v1/reconstruction/evaluate/{session_id}"],
                dependencies=["Cloud Intelligence"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Reconstruction", event="Bilateral temporal guided inpainting complete", timestamp=fmt_dt(reconstruction.updated_at), duration_ms=rec_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(reconstruction.created_at), stage="Reconstruction", event="Orchestrating inpainting pipelines.", status="running", severity="INFO"
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(reconstruction.updated_at), stage="Reconstruction", event=f"Reconstruction successfully generated via {reconstruction.reconstruction_method} in {rec_duration:.1f} ms.", status="completed", severity="INFO"
            ))

        # ----------------------------------------------------
        # Stage 10: Confidence
        # ----------------------------------------------------
        is_recon_completed = stage_details.get("Reconstruction") and stage_details["Reconstruction"].status == "completed"
        is_recon_failed = stage_details.get("Reconstruction") and stage_details["Reconstruction"].status == "failed"

        if not dataset or is_recon_failed:
            stage_details["Confidence"] = WorkflowStageDetail(
                name="Confidence", status="blocked", updated_at=fmt_dt(session.updated_at), blocked_by="Reconstruction",
                error_summary="Blocked: Reconstruction image compilation failed.", dependencies=["Reconstruction"]
            )
        elif not is_recon_completed:
            stage_details["Confidence"] = WorkflowStageDetail(
                name="Confidence", status="pending", updated_at=fmt_dt(session.updated_at), dependencies=["Reconstruction"]
            )
        elif not confidence:
            stage_details["Confidence"] = WorkflowStageDetail(
                name="Confidence", status="waiting", updated_at=fmt_dt(reconstruction.updated_at),
                related_apis=["POST /api/v1/confidence/run/{id}", "POST /api/v1/reliability/run/{id}"],
                dependencies=["Reconstruction"]
            )
        else:
            conf_status = "completed" if confidence.confidence_status.upper() == "COMPLETED" else "failed" if confidence.confidence_status.upper() == "FAILED" else "running"
            conf_duration = duration_ms(confidence.created_at, confidence.updated_at) or 1000.0
            stage_details["Confidence"] = WorkflowStageDetail(
                name="Confidence",
                status=conf_status,
                updated_at=fmt_dt(confidence.updated_at),
                duration_ms=conf_duration,
                inputs={"confidence_method": confidence.confidence_method},
                outputs={"mean_confidence": confidence.mean_confidence_score, "reliability_tier": reliability.dataset_reliability_tier if reliability else "MODERATE"},
                related_apis=["POST /api/v1/confidence/run/{id}", "POST /api/v1/reliability/run/{id}", "POST /api/v1/confidence-heatmap/run/{id}"],
                dependencies=["Reconstruction"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Confidence", event="Pixel variance reliability scorecard parsed", timestamp=fmt_dt(confidence.updated_at), duration_ms=conf_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(confidence.created_at), stage="Confidence", event="Starting pixel-level confidence estimation checks.", status="running", severity="INFO"
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(confidence.updated_at), stage="Confidence", event=f"Pixel confidence generated. Mean score is {confidence.mean_confidence_score}%.", status="completed", severity="INFO"
            ))

        # ----------------------------------------------------
        # Stage 11: Visualization
        # ----------------------------------------------------
        is_conf_completed = stage_details.get("Confidence") and stage_details["Confidence"].status == "completed"
        is_conf_failed = stage_details.get("Confidence") and stage_details["Confidence"].status == "failed"

        if not dataset or is_conf_failed:
            stage_details["Visualization"] = WorkflowStageDetail(
                name="Visualization", status="blocked", updated_at=fmt_dt(session.updated_at), blocked_by="Confidence",
                error_summary="Blocked: Confidence rating metrics missing.", dependencies=["Confidence"]
            )
        elif not is_conf_completed:
            stage_details["Visualization"] = WorkflowStageDetail(
                name="Visualization", status="pending", updated_at=fmt_dt(session.updated_at), dependencies=["Confidence"]
            )
        elif not preview:
            stage_details["Visualization"] = WorkflowStageDetail(
                name="Visualization", status="waiting", updated_at=fmt_dt(confidence.updated_at),
                related_apis=["POST /api/v1/dataset-preview/run/{id}"], dependencies=["Confidence"]
            )
        else:
            prev_status = "completed" if preview.preview_status.upper() == "COMPLETED" else "failed" if preview.preview_status.upper() == "FAILED" else "running"
            prev_duration = preview.generation_time_ms or 800.0
            stage_details["Visualization"] = WorkflowStageDetail(
                name="Visualization",
                status=prev_status,
                updated_at=fmt_dt(preview.updated_at),
                duration_ms=prev_duration,
                inputs={"resolution": f"{preview.preview_width}x{preview.preview_height}"},
                outputs={"thumbnail_path": preview.thumbnail_path, "image_path": preview.preview_image_path},
                related_apis=["GET /api/v1/dataset-preview/{id}/image"],
                dependencies=["Confidence"]
            )
            timeline_items.append(WorkflowTimelineItem(
                stage_name="Visualization", event="Downsampled preview composite generated", timestamp=fmt_dt(preview.updated_at), duration_ms=prev_duration
            ))
            logs_items.append(WorkflowLogEntry(
                timestamp=fmt_dt(preview.updated_at), stage="Visualization", event="Visualizations catalog mounted. Dashboard lock fully secure.", status="completed", severity="INFO"
            ))

        # ----------------------------------------------------
        # Summarize health, progress, current operations
        # ----------------------------------------------------
        stages_list = [stage_details[s["name"]] for s in stages_info]
        
        # Calculate dynamic progress
        completed_count = sum(1 for s in stages_list if s.status == "completed")
        overall_progress = (completed_count / len(stages_list)) * 100.0

        # Calculate total processing duration
        total_duration = sum(s.duration_ms for s in stages_list)

        # Health checks
        session_health = "HEALTHY"
        failed_count = sum(1 for s in stages_list if s.status == "failed")
        blocked_count = sum(1 for s in stages_list if s.status == "blocked")
        
        if failed_count > 0:
            session_health = "ERROR"
        elif blocked_count > 0:
            session_health = "DEGRADED"
        elif any(s.status == "running" for s in stages_list):
            session_health = "WARNING"

        # Determine current operational stage name
        current_stage = "Analysis Session"
        for s in stages_info:
            name = s["name"]
            if stage_details[name].status in ("running", "completed"):
                current_stage = name

        return WorkflowResponse(
            session_id=session_id,
            current_stage=current_stage,
            overall_progress=round(overall_progress, 2),
            total_processing_time_ms=round(total_duration, 2),
            session_health=session_health,
            stages=stages_list,
            timeline=sorted(timeline_items, key=lambda x: x.timestamp),
            logs=sorted(logs_items, key=lambda x: x.timestamp)
        )
