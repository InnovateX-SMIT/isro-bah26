import logging
import time
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.services.execution_context import ExecutionContext

# Repositories
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_inspection_repository import DatasetInspectionRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.geospatial_context_profile_repository import GeospatialContextProfileRepository
from app.repositories.temporal_context_repository import TemporalContextRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_analytics_repository import CloudAnalyticsRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.temporal_fusion_repository import TemporalFusionRepository
from app.repositories.confidence_repository import ConfidenceRepository
from app.repositories.reliability_repository import ReliabilityRepository
from app.repositories.confidence_heatmap_repository import ConfidenceHeatmapRepository
from app.repositories.confidence_analytics_repository import ConfidenceAnalyticsRepository
from app.repositories.dataset_preview_repository import DatasetPreviewRepository
from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.selected_reference_repository import SelectedReferenceRepository

# Services
from app.services.dataset_service import DatasetService
from app.services.dataset_inspection_service import DatasetInspectionService
from app.services.dataset_metadata_service import DatasetMetadataService
from app.services.dataset_preview_service import DatasetPreviewService
from app.services.geospatial_service import GeospatialService
from app.services.location_service import LocationService
from app.services.geospatial_context_service import GeospatialContextService
from app.services.temporal_service import TemporalService
from app.services.cloud_detection_service import CloudDetectionService
from app.services.cloud_classification_service import CloudClassificationService
from app.services.cloud_shadow_service import CloudShadowService
from app.services.cloud_segmentation_service import CloudSegmentationService
from app.services.cloud_analytics_service import CloudAnalyticsService
from app.services.reconstruction_service import ReconstructionService
from app.services.confidence_service import ConfidenceService
from app.services.reliability_service import ReliabilityService
from app.services.confidence_heatmap_service import ConfidenceHeatmapService
from app.services.confidence_analytics_service import ConfidenceAnalyticsService
from app.services.mission_control_service import MissionControlService
from app.services.package_service import PackageService
from app.services.reports.report_service import ReportService

logger = logging.getLogger("stage_executor")

class StageExecutor:
    """
    Dispatcher class responsible for executing each stage of the reconstruction workflow pipeline
    by orchestrating the backend service calls.
    """
    def __init__(self):
        pass

    def execute_start_session(self, context: ExecutionContext) -> dict:
        session_repo = AnalysisSessionRepository(context.db)
        session = session_repo.get_by_id(context.session_id)
        if not session:
            session = session_repo.create(status="active")
        else:
            session_repo.update_status(context.session_id, "active")
        return {"session_id": context.session_id, "status": "active"}

    def execute_register_dataset(self, context: ExecutionContext) -> dict:
        dataset_repo = DatasetRepository(context.db)
        session_repo = AnalysisSessionRepository(context.db)
        datasets = dataset_repo.list_session_datasets(context.session_id)
        if datasets:
            dataset = datasets[0]
        else:
            if not context.dataset_path:
                raise ValueError("dataset_path is required for registration in context")
            dataset_service = DatasetService(dataset_repo, session_repo)
            dataset = dataset_service.register_dataset(
                analysis_session_id=context.session_id,
                dataset_name=context.dataset_name or "Orchestrated Dataset",
                dataset_path=context.dataset_path,
                dataset_type=context.dataset_type
            )
        context.dataset_id = dataset.dataset_id
        return {
            "dataset_id": dataset.dataset_id,
            "dataset_name": dataset.dataset_name,
            "dataset_path": dataset.dataset_path,
            "dataset_type": dataset.dataset_type,
            "dataset_status": dataset.dataset_status
        }

    def execute_inspect_dataset(self, context: ExecutionContext) -> dict:
        inspection_repo = DatasetInspectionRepository(context.db)
        dataset_repo = DatasetRepository(context.db)
        inspection_service = DatasetInspectionService(inspection_repo, dataset_repo)
        res = inspection_service.run_inspection(context.dataset_id)
        return res.model_dump()

    def execute_validate_dataset(self, context: ExecutionContext) -> dict:
        dataset_repo = DatasetRepository(context.db)
        dataset = dataset_repo.get_dataset(context.dataset_id)
        if not dataset:
            raise ValueError(f"Dataset registration {context.dataset_id} not found")
        dataset_repo.update_status(context.dataset_id, "VALIDATED")
        return {"dataset_id": context.dataset_id, "status": "VALIDATED"}

    def execute_extract_metadata(self, context: ExecutionContext) -> dict:
        metadata_repo = DatasetMetadataRepository(context.db)
        dataset_repo = DatasetRepository(context.db)
        metadata_service = DatasetMetadataService(metadata_repo, dataset_repo)
        res = metadata_service.run_extraction(context.dataset_id)
        return res.model_dump()

    def execute_generate_preview(self, context: ExecutionContext) -> dict:
        preview_repo = DatasetPreviewRepository(context.db)
        dataset_repo = DatasetRepository(context.db)
        preview_service = DatasetPreviewService(preview_repo, dataset_repo)
        res = preview_service.generate_preview(context.dataset_id)
        return res.model_dump()

    def execute_generate_geospatial_context(self, context: ExecutionContext) -> dict:
        geospatial_repo = GeospatialRepository(context.db)
        metadata_repo = DatasetMetadataRepository(context.db)
        dataset_repo = DatasetRepository(context.db)
        geospatial_service = GeospatialService(geospatial_repo, metadata_repo, dataset_repo)
        res = geospatial_service.get_or_calculate_context(context.dataset_id)
        return {
            "center_lat": res.center.lat,
            "center_lon": res.center.lon,
            "min_lat": res.bounds.south,
            "min_lon": res.bounds.west,
            "max_lat": res.bounds.north,
            "max_lon": res.bounds.east,
            "epsg": res.epsg,
            "crs": res.crs,
            "projection": res.projection
        }

    def execute_generate_location_context(self, context: ExecutionContext) -> dict:
        location_repo = LocationRepository(context.db)
        geospatial_repo = GeospatialRepository(context.db)
        dataset_repo = DatasetRepository(context.db)
        metadata_repo = DatasetMetadataRepository(context.db)
        geospatial_service = GeospatialService(geospatial_repo, metadata_repo, dataset_repo)
        location_service = LocationService(location_repo, geospatial_repo, dataset_repo, geospatial_service)
        
        # Resolve Location Context
        location_res = location_service.get_or_create_location_context(context.dataset_id)
        
        # Cascade Geospatial Context Profile generation since it depends on location and is required for Mission Control status
        profile_repo = GeospatialContextProfileRepository(context.db)
        profile_service = GeospatialContextProfileRepository(context.db) # Repository
        context_service = GeospatialContextService(profile_repo, location_repo, dataset_repo, location_service)
        context_service.get_or_create_context_profile(context.dataset_id)
        
        return {
            "country": location_res.country,
            "state": location_res.state,
            "district": location_res.district,
            "geographic_region": location_res.geographic_region,
            "location_summary": location_res.location_summary
        }

    def execute_generate_temporal_context(self, context: ExecutionContext) -> dict:
        temporal_service = TemporalService()
        
        # Discover imagery candidates
        temporal_service.run_discovery(
            session_id=context.session_id,
            db=context.db,
            provider_name=None,
            temporal_window_days=context.temporal_window_days
        )
        
        # Select references
        temporal_service.run_reference_selection(
            session_id=context.session_id,
            db=context.db,
            num_references=context.num_references
        )
        
        # Generate final context package
        res = temporal_service.generate_temporal_context(
            session_id=context.session_id,
            db=context.db
        )
        return res.model_dump()

    def execute_cloud_detection(self, context: ExecutionContext) -> dict:
        detection_repo = CloudDetectionRepository(context.db)
        dataset_repo = DatasetRepository(context.db)
        detection_service = CloudDetectionService(detection_repo, dataset_repo)
        res = detection_service.run_cloud_detection(context.dataset_id)
        return res.model_dump()

    def execute_cloud_classification(self, context: ExecutionContext) -> dict:
        classification_repo = CloudClassificationRepository(context.db)
        detection_repo = CloudDetectionRepository(context.db)
        classification_service = CloudClassificationService(classification_repo, detection_repo)
        res = classification_service.run_cloud_classification(context.dataset_id)
        return res.model_dump()

    def execute_cloud_shadow_detection(self, context: ExecutionContext) -> dict:
        shadow_repo = CloudShadowRepository(context.db)
        classification_repo = CloudClassificationRepository(context.db)
        dataset_repo = DatasetRepository(context.db)
        shadow_service = CloudShadowService(shadow_repo, classification_repo, dataset_repo)
        res = shadow_service.run_cloud_shadow(context.dataset_id)
        return res.model_dump()

    def execute_cloud_segmentation(self, context: ExecutionContext) -> dict:
        segmentation_repo = CloudSegmentationRepository(context.db)
        shadow_repo = CloudShadowRepository(context.db)
        classification_repo = CloudClassificationRepository(context.db)
        detection_repo = CloudDetectionRepository(context.db)
        
        segmentation_service = CloudSegmentationService(
            segmentation_repo,
            shadow_repo,
            classification_repo,
            detection_repo
        )
        res = segmentation_service.run_cloud_segmentation(context.dataset_id)
        return res.model_dump()

    def execute_cloud_analytics(self, context: ExecutionContext) -> dict:
        analytics_repo = CloudAnalyticsRepository(context.db)
        segmentation_repo = CloudSegmentationRepository(context.db)
        shadow_repo = CloudShadowRepository(context.db)
        classification_repo = CloudClassificationRepository(context.db)
        detection_repo = CloudDetectionRepository(context.db)
        
        analytics_service = CloudAnalyticsService(
            analytics_repo,
            segmentation_repo,
            shadow_repo,
            classification_repo,
            detection_repo
        )
        res = analytics_service.run_cloud_analytics(context.dataset_id)
        return res.model_dump()

    def execute_reconstruction(self, context: ExecutionContext) -> dict:
        reconstruction_service = ReconstructionService(
            db=context.db,
            reconstruction_repo=ReconstructionRepository(context.db),
            session_repo=AnalysisSessionRepository(context.db),
            dataset_repo=DatasetRepository(context.db),
            metadata_repo=DatasetMetadataRepository(context.db),
            geospatial_repo=GeospatialRepository(context.db),
            geospatial_profile_repo=GeospatialContextProfileRepository(context.db),
            temporal_context_repo=TemporalContextRepository(context.db),
            cloud_analytics_repo=CloudAnalyticsRepository(context.db),
            cloud_detection_repo=CloudDetectionRepository(context.db),
            cloud_classification_repo=CloudClassificationRepository(context.db),
            cloud_shadow_repo=CloudShadowRepository(context.db),
            cloud_segmentation_repo=CloudSegmentationRepository(context.db),
            temporal_fusion_repo=TemporalFusionRepository(context.db)
        )
        
        # Run reconstruction foundation
        reconstruction_service.run_reconstruction_pipeline(
            session_id=context.session_id,
            strategy=context.reconstruction_strategy
        )
        
        # Run reconstruction optimization
        reconstruction_service.run_reconstruction_optimization(context.session_id)
        
        # Run evaluation
        res = reconstruction_service.run_evaluation(context.session_id)
        
        # Cache reconstruction run ID
        run_rec = reconstruction_service.reconstruction_repo.get_by_dataset(context.dataset_id)
        if run_rec:
            context.reconstruction_run_id = run_rec.id
            
        return res

    def execute_confidence_estimation(self, context: ExecutionContext) -> dict:
        confidence_service = ConfidenceService(
            db=context.db,
            confidence_repo=ConfidenceRepository(context.db),
            reconstruction_repo=ReconstructionRepository(context.db),
            cloud_segmentation_repo=CloudSegmentationRepository(context.db),
            cloud_classification_repo=CloudClassificationRepository(context.db),
            reference_stack_repo=TemporalReferenceStackRepository(context.db),
            selected_reference_repo=SelectedReferenceRepository(context.db)
        )
        reliability_service = ReliabilityService(
            db=context.db,
            reliability_repo=ReliabilityRepository(context.db),
            confidence_repo=ConfidenceRepository(context.db),
            cloud_segmentation_repo=CloudSegmentationRepository(context.db)
        )
        heatmap_service = ConfidenceHeatmapService(
            db=context.db,
            heatmap_repo=ConfidenceHeatmapRepository(context.db),
            reliability_repo=ReliabilityRepository(context.db),
            confidence_repo=ConfidenceRepository(context.db),
            cloud_segmentation_repo=CloudSegmentationRepository(context.db),
            dataset_repo=DatasetRepository(context.db)
        )
        analytics_service = ConfidenceAnalyticsService(
            db=context.db,
            analytics_repo=ConfidenceAnalyticsRepository(context.db),
            heatmap_repo=ConfidenceHeatmapRepository(context.db),
            reliability_repo=ReliabilityRepository(context.db),
            confidence_repo=ConfidenceRepository(context.db)
        )
        
        # 1. Estimation
        conf_record = confidence_service.run_confidence_estimation(context.reconstruction_run_id)
        context.confidence_id = conf_record.confidence_id
        
        # 2. Reliability scoring
        reliability_record = reliability_service.run_reliability_scoring(context.confidence_id)
        context.reliability_id = reliability_record.reliability_id
        
        # 3. Heatmap generation
        heatmap_record = heatmap_service.run_heatmap_generation(context.reliability_id)
        context.heatmap_id = heatmap_record.heatmap_id
        
        # 4. Analytics reports
        analytics_record = analytics_service.run_analytics(context.heatmap_id)
        context.analytics_id = analytics_record.analytics_id
        
        return {
            "confidence_id": context.confidence_id,
            "reliability_id": context.reliability_id,
            "heatmap_id": context.heatmap_id,
            "analytics_id": context.analytics_id
        }

    def execute_mission_control_update(self, context: ExecutionContext) -> dict:
        dataset_repo = DatasetRepository(context.db)
        metadata_repo = DatasetMetadataRepository(context.db)
        metadata_service = DatasetMetadataService(metadata_repo, dataset_repo)
        
        geospatial_repo = GeospatialRepository(context.db)
        geospatial_service = GeospatialService(geospatial_repo, metadata_repo, dataset_repo)
        
        location_repo = LocationRepository(context.db)
        location_service = LocationService(location_repo, geospatial_repo, dataset_repo, geospatial_service)
        
        profile_repo = GeospatialContextProfileRepository(context.db)
        geospatial_context_service = GeospatialContextService(profile_repo, location_repo, dataset_repo, location_service)
        
        temporal_context_repo = TemporalContextRepository(context.db)
        
        mission_control_service = MissionControlService(
            dataset_repository=dataset_repo,
            metadata_service=metadata_service,
            geospatial_service=geospatial_service,
            location_service=location_service,
            geospatial_context_service=geospatial_context_service,
            temporal_context_repository=temporal_context_repo,
            cloud_detection_repository=CloudDetectionRepository(context.db),
            cloud_classification_repository=CloudClassificationRepository(context.db),
            cloud_shadow_repository=CloudShadowRepository(context.db),
            cloud_segmentation_repository=CloudSegmentationRepository(context.db),
            cloud_analytics_repository=CloudAnalyticsRepository(context.db),
            reconstruction_repository=ReconstructionRepository(context.db),
            temporal_fusion_repository=TemporalFusionRepository(context.db),
            confidence_repository=ConfidenceRepository(context.db),
            reliability_repository=ReliabilityRepository(context.db),
            heatmap_repository=ConfidenceHeatmapRepository(context.db),
            analytics_repository=ConfidenceAnalyticsRepository(context.db)
        )
        
        mc_profile = mission_control_service.get_mission_control_profile(context.dataset_id)
        return {
            "overall_status": mc_profile.status.model_dump(),
            "cloud_coverage": mc_profile.cloud.get("cloud_coverage_percent") if mc_profile.cloud else None
        }

    def execute_export_preparation(self, context: ExecutionContext) -> dict:
        report_service = ReportService(
            db=context.db,
            session_repo=AnalysisSessionRepository(context.db),
            dataset_repo=DatasetRepository(context.db),
            metadata_repo=DatasetMetadataRepository(context.db),
            reconstruction_repo=ReconstructionRepository(context.db)
        )
        package_service = PackageService(
            db=context.db,
            session_repo=AnalysisSessionRepository(context.db),
            dataset_repo=DatasetRepository(context.db),
            metadata_repo=DatasetMetadataRepository(context.db),
            reconstruction_repo=ReconstructionRepository(context.db),
            report_service=report_service
        )
        
        # Check validation status for packaging
        validation_res = package_service.validate_package_request(context.session_id)
        return {
            "valid": validation_res.valid,
            "message": validation_res.message,
            "available_assets": validation_res.available_assets,
            "missing_assets": validation_res.missing_assets
        }
