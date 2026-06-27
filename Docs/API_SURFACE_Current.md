# API SURFACE CURRENT

Status: ✅ Verified Working. Registered by `backend/app/main.py` and `backend/app/api/v1/router.py`. Base v1 prefix is `/api/v1`; `backend/app/main.py` also mounts `geospatial_session_router` at `/api/geospatial`.

## Status: ✅ Verified Working — System

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `GET /health` | none | `{status}` | inline `health_check()` in `backend/app/main.py` | `frontend/src/lib/api.ts`, `frontend/src/app/page.tsx` |
| `GET /api/v1/status` | none | `{version, service, status}` | inline `get_v1_status()` in `backend/app/api/v1/router.py` | none found |

## Status: ✅ Verified Working — Analysis Sessions

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `POST /api/v1/analysis` | empty body | `SessionResponse(session_id, status, created_at, updated_at)` | `AnalysisSessionService.create_analysis_session()` | `frontend/src/lib/analysis-api.ts:createAnalysis()`, `frontend/src/app/analysis/page.tsx` |
| `GET /api/v1/analysis` | none | `list[SessionResponse]` | `AnalysisSessionService.list_analysis_sessions()` | `frontend/src/lib/analysis-api.ts:getAnalysisSessions()`, `frontend/src/app/analysis/page.tsx`, `frontend/src/app/datasets/page.tsx` |
| `GET /api/v1/analysis/{session_id}` | path `session_id` | `SessionResponse` | `AnalysisSessionService.get_analysis_session()` | `frontend/src/lib/analysis-api.ts:getAnalysisSession()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |
| `PATCH /api/v1/analysis/{session_id}` | `{status}` where status is `created`, `active`, `completed`, `failed`, `TEMPORAL_CONTEXT_RETRIEVED`, `REFERENCE_SELECTION_COMPLETE`, or `TEMPORAL_CONTEXT_GENERATED` by schema; service only allows lifecycle transitions | `SessionResponse` | `AnalysisSessionService.update_analysis_status()` | `frontend/src/lib/analysis-api.ts:updateAnalysisStatus()` |
| `DELETE /api/v1/analysis/{session_id}` | path `session_id` | `204 No Content` | `AnalysisSessionService.delete_analysis_session()` | `frontend/src/lib/analysis-api.ts:deleteAnalysisSession()`, `frontend/src/app/analysis/page.tsx` |

## Status: ✅ Verified Working — Datasets

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `GET /api/v1/datasets/demo` | none | `list[{dataset_name, dataset_path, dataset_type}]` | `DemoDatasetService.discover_demo_datasets()` | `frontend/src/lib/dataset-api.ts:getDemoDatasets()`, `frontend/src/app/datasets/page.tsx` |
| `POST /api/v1/datasets/register` | `DatasetCreate(analysis_session_id, dataset_name, dataset_path, dataset_type)` | `DatasetResponse(dataset_id, analysis_session_id, dataset_name, dataset_path, dataset_type, dataset_status, created_at, updated_at)` | `DatasetService.register_dataset()` | `frontend/src/lib/dataset-api.ts:registerDataset()`, `frontend/src/app/datasets/page.tsx` |
| `GET /api/v1/datasets` | none | `list[DatasetResponse]` | `DatasetService.list_datasets()` | `frontend/src/lib/dataset-api.ts:getRegisteredDatasets()`, `frontend/src/app/datasets/page.tsx`, `frontend/src/app/geospatial/page.tsx`, `frontend/src/app/mission-control/page.tsx` |
| `GET /api/v1/datasets/{dataset_id}` | path `dataset_id` | `DatasetResponse` | `DatasetService.get_dataset()` | `frontend/src/lib/dataset-api.ts:getDataset()` |
| `GET /api/v1/datasets/session/{session_id}` | path `session_id` | `list[DatasetResponse]` | `DatasetService.list_session_datasets()` | `frontend/src/lib/dataset-api.ts:getSessionDatasets()` |
| `DELETE /api/v1/datasets/{dataset_id}` | path `dataset_id` | `204 No Content` | `DatasetService.delete_dataset()` | `frontend/src/lib/dataset-api.ts:deleteDataset()` |

## Status: ✅ Verified Working — Dataset Inspection

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `POST /api/v1/dataset-inspection/run/{dataset_id}` | path `dataset_id` | `DatasetInspectionResponse(inspection_id, dataset_id, inspection_status, total_files, total_tif_files, total_xml_files, total_txt_files, total_meta_files, total_jpg_files, created_at, updated_at)` | `DatasetInspectionService.run_inspection()` | `frontend/src/lib/dataset-inspection-api.ts:runDatasetInspection()`, `frontend/src/app/datasets/page.tsx` |
| `GET /api/v1/dataset-inspection/{dataset_id}` | path `dataset_id` | `DatasetInspectionResponse` | `DatasetInspectionService.get_inspection()` | `frontend/src/lib/dataset-inspection-api.ts:getDatasetInspection()`, `frontend/src/app/datasets/page.tsx` |
| `GET /api/v1/dataset-inspection/{dataset_id}/files` | path `dataset_id` | `list[DatasetFileResponse(file_id, inspection_id, file_name, file_extension, relative_path, file_size_bytes, file_category, created_at)]` | `DatasetInspectionService.list_files()` | `frontend/src/lib/dataset-inspection-api.ts:getDatasetInspectionFiles()`, `frontend/src/app/datasets/page.tsx` |
| `DELETE /api/v1/dataset-inspection/{dataset_id}` | path `dataset_id` | `204 No Content` | `DatasetInspectionService.delete_inspection()` | `frontend/src/lib/dataset-inspection-api.ts:deleteDatasetInspection()` |

## Status: ✅ Verified Working — Dataset Metadata

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `POST /api/v1/dataset-metadata/run/{dataset_id}` | path `dataset_id` | `DatasetMetadataResponse(metadata_id, dataset_id, coordinate_system, projection_name, epsg_code, utm_zone, origin_x, origin_y, pixel_size_x, pixel_size_y, raster_width, raster_height, band_count, acquisition_date, metadata_status, created_at, updated_at)` | `DatasetMetadataService.run_extraction()` | `frontend/src/lib/dataset-metadata-api.ts:runDatasetMetadata()`, `frontend/src/app/datasets/page.tsx` |
| `GET /api/v1/dataset-metadata/{dataset_id}` | path `dataset_id` | `DatasetMetadataResponse` | `DatasetMetadataService.get_metadata()` | `frontend/src/lib/dataset-metadata-api.ts:getDatasetMetadata()`, `frontend/src/app/datasets/page.tsx`, `frontend/src/app/geospatial/page.tsx` |
| `DELETE /api/v1/dataset-metadata/{dataset_id}` | path `dataset_id` | `204 No Content` | `DatasetMetadataService.delete_metadata()` | `frontend/src/lib/dataset-metadata-api.ts:deleteDatasetMetadata()` |

## Status: ✅ Verified Working — Dataset Preview

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `POST /api/v1/dataset-preview/run/{dataset_id}` | path `dataset_id` | `PreviewResponse(preview_id, dataset_id, preview_status, preview_image_path, thumbnail_path, preview_width, preview_height, band_count, generation_time_ms, created_at, updated_at)` | `DatasetPreviewService.generate_preview()` | `frontend/src/lib/dataset-preview-api.ts:runDatasetPreview()`, `frontend/src/app/datasets/page.tsx` |
| `GET /api/v1/dataset-preview/{dataset_id}` | path `dataset_id` | `PreviewResponse` | `DatasetPreviewService.get_preview()` | `frontend/src/lib/dataset-preview-api.ts:getDatasetPreview()`, `frontend/src/app/datasets/page.tsx` |
| `GET /api/v1/dataset-preview/{dataset_id}/image` | path `dataset_id` | PNG `FileResponse` | `DatasetPreviewService.get_image_path(is_thumbnail=False)` | `frontend/src/lib/dataset-preview-api.ts:getDatasetPreviewImageUrl()`, `frontend/src/app/datasets/page.tsx` |
| `GET /api/v1/dataset-preview/{dataset_id}/thumbnail` | path `dataset_id` | PNG `FileResponse` | `DatasetPreviewService.get_image_path(is_thumbnail=True)` | `frontend/src/lib/dataset-preview-api.ts:getDatasetPreviewThumbnailUrl()`, `frontend/src/app/datasets/page.tsx` |
| `DELETE /api/v1/dataset-preview/{dataset_id}` | path `dataset_id` | `204 No Content` | `DatasetPreviewService.delete_preview()` | `frontend/src/lib/dataset-preview-api.ts:deleteDatasetPreview()` |

## Status: ✅ Verified Working — Geospatial and Location

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `GET /api/v1/geospatial/{dataset_id}/context` | path `dataset_id` | `GeospatialContextResponse(dataset_id, center{lat,lon}, bounds{north,south,east,west}, crs, epsg, projection, footprint)` | `GeospatialService.get_or_calculate_context()` | `frontend/src/lib/geospatial-api.ts:getGeospatialContext()`, `frontend/src/app/geospatial/page.tsx`, map components |
| `GET /api/geospatial/{session_id}` | path `session_id` | `{geospatial_profile, footprint, location}` where `geospatial_profile` includes `dataset_id, center_lat, center_lon, bbox, crs, projection, utm_zone, hemisphere, spatial_reference`; `footprint` is GeoJSON; `location` has `country, state, district, location_summary` | inline `get_consolidated_geospatial()` using `CoordinateService`, `FootprintService`, `LocationService` | no direct frontend consumer found |
| `GET /api/geospatial/{session_id}/footprint` | path `session_id` | GeoJSON Feature `{type, geometry, properties{area_sq_km, centroid}}` | inline `get_footprint_geojson()` calls `get_consolidated_geospatial()` | no direct frontend consumer found |
| `GET /api/v1/location/{dataset_id}/context` | path `dataset_id` | `LocationContextResponse(dataset_id, country, state, district, administrative_region, geographic_region, location_summary)` | `LocationService.get_or_create_location_context()` | `frontend/src/lib/location-api.ts:getDatasetLocationContext()`, `frontend/src/app/geospatial/page.tsx`, location components |
| `GET /api/v1/geospatial-context/{dataset_id}/profile` | path `dataset_id` | `GeospatialContextProfileResponse(dataset_id, terrain_type, environment_type, dominant_landscape, hydrology_context, agricultural_context, urbanization_context, regional_characteristics, inference_basis, context_summary)` | `GeospatialContextService.get_or_create_context_profile()` | `frontend/src/lib/geospatial-context-api.ts:getGeospatialContextProfile()`, `frontend/src/app/geospatial/page.tsx`, context components |

## Status: ✅ Verified Working — Mission Control

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `GET /api/v1/mission-control/{dataset_id}` | path `dataset_id` | `MissionControlResponse(dataset, metadata, geospatial, location, context, status{metadata, geospatial, location, context, temporal, cloud, reconstruction, confidence}, summary, timestamp, temporal, cloud, reconstruction, confidence)` | `MissionControlService.get_mission_control_profile()` | `frontend/src/lib/mission-control-api.ts:getMissionControlProfile()`, `frontend/src/app/mission-control/page.tsx`, `frontend/src/components/mission-control/*`, `frontend/src/components/temporal/TemporalContextPanel.tsx` through Mission Control workspace |

## Status: ✅ Verified Working — Session Workflow Monitoring

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `GET /api/v1/workflow/{session_id}` | path `session_id` | `WorkflowResponse(session_id, current_stage, overall_progress, total_processing_time_ms, session_health, stages[], timeline[], logs[])` | `WorkflowService.get_session_workflow()` | `frontend/src/lib/workflow-api.ts:getWorkflowStatus()`, `frontend/src/app/mission-control/page.tsx`, `frontend/src/components/mission-control/*` |

## Status: ✅ Verified Working — Temporal Providers

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `GET /api/v1/temporal/providers` | none | `list[ProviderInfoResponse(name, is_primary, description)]` | `TemporalService.get_available_providers()` | `frontend/src/lib/temporal-context-api.ts:getProviders()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |
| `GET /api/v1/temporal/providers/health` | none | `SystemHealthResponse(status, providers[{name, healthy, details}])` | `TemporalService.provider_health_status()` | `frontend/src/lib/temporal-context-api.ts:getProvidersHealth()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |

## Status: ✅ Verified Working — Temporal Discovery

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `POST /api/v1/temporal/discover/{session_id}` | path `session_id`; body `TemporalDiscoveryRequest(provider_name?, temporal_window_days)` | `TemporalCandidateListResponse(discovery, candidate_count, candidates[])` | `TemporalService.run_discovery()` → `HistoricalDiscoveryService.run_discovery()` | `frontend/src/lib/temporal-context-api.ts:runDiscovery()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |
| `GET /api/v1/temporal/discover/{session_id}` | path `session_id` | `TemporalDiscoveryResponse(id, session_id, dataset_id, provider_used, search_window_start, search_window_end, candidate_count, status, created_at, updated_at)` | `TemporalService.get_discovery()` | `frontend/src/lib/temporal-context-api.ts:getLatestDiscovery()` |
| `GET /api/v1/temporal/discover/{session_id}/candidates` | path `session_id` | `TemporalCandidateListResponse` | `TemporalService.get_candidates()` | `frontend/src/lib/temporal-context-api.ts:getDiscoveredCandidates()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |

## Status: ✅ Verified Working — Temporal Reference Selection

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `POST /api/v1/temporal/select/{session_id}` | path `session_id`; body `ReferenceSelectionRequest(num_references, weights?)` | `ReferenceStackResponse(id, session_id, dataset_id, discovery_id, selected_count, selection_strategy, selected_references[], created_at, updated_at)` | `TemporalService.run_reference_selection()` → `ReferenceSelectionService.select_references()` | `frontend/src/lib/temporal-context-api.ts:runReferenceSelection()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |
| `GET /api/v1/temporal/references/{session_id}` | path `session_id` | `ReferenceStackResponse` | `TemporalService.get_reference_stack()` | `frontend/src/lib/temporal-context-api.ts:getReferenceStack()` |
| `GET /api/v1/temporal/references/{session_id}/selected` | path `session_id` | `list[SelectedReferenceResponse(id, reference_stack_id, candidate_id, rank_position, ranking_score, selection_reason, candidate, created_at)]` | `TemporalService.get_selected_references()` | `frontend/src/lib/temporal-context-api.ts:getSelectedReferences()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |

## Status: ✅ Verified Working — Temporal Context

| Method + Path | Request Shape | Response Shape | Service Called | Frontend Consumers |
|---|---|---|---|---|
| `POST /api/v1/temporal/context/{session_id}` | path `session_id` | `TemporalContextPackageResponse(selected_references, provider_summary, cloud_statistics, temporal_statistics, spatial_statistics, reference_metadata, context_summary)` | `TemporalService.generate_temporal_context()` → `TemporalContextService.generate_temporal_context()` | `frontend/src/lib/temporal-context-api.ts:generateTemporalContext()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |
| `GET /api/v1/temporal/context/{session_id}` | path `session_id` | `TemporalContextResponse(id, session_id, dataset_id, reference_stack_id, provider_count, reference_count, average_cloud_cover, average_temporal_distance, average_spatial_overlap, summary, metadata, created_at, updated_at)` | `TemporalService.get_temporal_context()` | `frontend/src/lib/temporal-context-api.ts:getTemporalContext()` |
| `GET /api/v1/temporal/context/{session_id}/summary` | path `session_id` | `str` | `TemporalService.get_temporal_summary()` | `frontend/src/lib/temporal-context-api.ts:getTemporalSummary()` |
| `GET /api/v1/temporal/context/{session_id}/statistics` | path `session_id` | `TemporalContextPackageResponse` | `TemporalService.get_temporal_context_package()` | `frontend/src/lib/temporal-context-api.ts:getTemporalContextPackage()`, `frontend/src/components/temporal/TemporalContextPanel.tsx` |

## Status: ❌ Not Implemented — Missing API Areas

| Subsystem | Current API State |
|---|---|
| Upload files | No `UploadFile`, multipart, or upload endpoint found. Custom datasets are registered by path only. |
| Cloud Intelligence | No cloud detection/classification/shadow/mask endpoints. |
| Reconstruction | No reconstruction or model inference endpoints. |
| Confidence | No confidence scoring/heatmap endpoints. |
| Export | No GeoTIFF/PNG/JPG/report export endpoints. |
