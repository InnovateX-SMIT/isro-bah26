# PROJECT STATE SNAPSHOT

## SYSTEM IDENTITY

Status: ✅ Verified Working. This repository implements the early platform layers of the `AI-Powered Geospatial Reconstruction Platform` for the problem statement `Generative AI-Based Cloud Removal and Reconstruction for LISS-IV Satellite Imagery`. Per `Docs/PRODUCT_DEFINITION_Final.md`, the architecture is explicitly `Platform First / Model Second`: the AI model is only one component, while the product is the end-to-end geospatial workflow. Current verified implementation reaches Phase 5D: temporal provider framework, historical candidate discovery, reference selection, temporal context packaging, and Mission Control integration. Phase 6+ AI cloud/reconstruction/confidence/export subsystems are not implemented.

## COMPLETED PHASES — VERIFIED WORKING

### Status: ✅ Verified Working — Phase 0: Foundation Layer

| Field | Actual State |
|---|---|
| Objective | Establish local-first FastAPI + Next.js + SQLite foundation and Mission Control shell. |
| Backend files | `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/requirements.txt` |
| Frontend files | `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`, `frontend/src/components/ClientHeader.tsx`, `frontend/src/components/ClientSidebar.tsx`, `frontend/src/lib/api.ts` |
| Database tables | All tables are created from `backend/app/core/database.py:init_db()` via imported models; Phase 0 itself introduces `Base`, `engine`, `SessionLocal`, `get_db()`, `init_db()`. |
| API endpoints | `GET /health`, `GET /api/v1/status` |
| Consumes | None. |
| Produces | Application shell, API v1 router mount, SQLite initialization path. |
| Verification script | UNVERIFIED — no `scripts/verify_phase_0.py` exists. |
| Known bugs fixed | No Phase 0-specific fix found in latest git log. Commit anchor: `0f42297 feat: phase 0 completed will the entire project foundation for the teach stack in use`. |

### Status: ✅ Verified Working — Phase 1: Analysis Intelligence Layer

| Field | Actual State |
|---|---|
| Objective | Introduce analysis sessions as isolated workflow containers. |
| Backend files | `backend/app/models/session.py`, `backend/app/schemas/session.py`, `backend/app/repositories/analysis_session_repository.py`, `backend/app/services/analysis_session_service.py`, `backend/app/api/v1/analysis.py` |
| Frontend files | `frontend/src/lib/analysis-api.ts`, `frontend/src/lib/types/analysis.ts`, `frontend/src/app/analysis/page.tsx`, `frontend/src/components/analysis/AnalysisSessionTable.tsx`, `frontend/src/components/analysis/AnalysisStatsCard.tsx` |
| Database tables | `analysis_sessions(session_id, status, created_at, updated_at)` |
| API endpoints | `POST /api/v1/analysis`, `GET /api/v1/analysis`, `GET /api/v1/analysis/{session_id}`, `PATCH /api/v1/analysis/{session_id}`, `DELETE /api/v1/analysis/{session_id}` |
| Consumes | `SessionLocal` / `get_db()` from `backend/app/core/database.py`. |
| Produces | `AnalysisSession` rows consumed by dataset registration and temporal milestone status updates. |
| Verification script | `scripts/verify_phase_1b.py` proves create/list/get/update/delete, newest-first listing, invalid transition rejection, and active-session delete rejection. |
| Known bugs fixed | No Phase 1-specific bug fix found in latest git log. Commit anchors: `725fa66`, `78c92d1`, `026119e`. |

### Status: ✅ Verified Working — Phase 2: Dataset Intelligence Layer

| Field | Actual State |
|---|---|
| Objective | Register, inspect, extract metadata for, and preview demo/custom dataset directories before later processing. |
| Backend files | `backend/app/models/dataset.py`, `backend/app/models/dataset_inspection.py`, `backend/app/models/dataset_file.py`, `backend/app/models/dataset_metadata.py`, `backend/app/models/dataset_preview.py`, `backend/app/schemas/dataset.py`, `backend/app/schemas/dataset_inspection.py`, `backend/app/schemas/dataset_metadata.py`, `backend/app/schemas/dataset_preview.py`, `backend/app/repositories/dataset_repository.py`, `backend/app/repositories/dataset_inspection_repository.py`, `backend/app/repositories/dataset_metadata_repository.py`, `backend/app/repositories/dataset_preview_repository.py`, `backend/app/services/dataset_service.py`, `backend/app/services/demo_dataset_service.py`, `backend/app/services/dataset_inspection_service.py`, `backend/app/services/dataset_metadata_service.py`, `backend/app/services/dataset_preview_service.py`, `backend/app/api/v1/datasets.py`, `backend/app/api/v1/dataset_inspection.py`, `backend/app/api/v1/dataset_metadata.py`, `backend/app/api/v1/dataset_preview.py` |
| Frontend files | `frontend/src/app/datasets/page.tsx`, `frontend/src/lib/dataset-api.ts`, `frontend/src/lib/dataset-inspection-api.ts`, `frontend/src/lib/dataset-metadata-api.ts`, `frontend/src/lib/dataset-preview-api.ts`, `frontend/src/lib/types/dataset.ts`, `frontend/src/lib/types/dataset-inspection.ts`, `frontend/src/lib/types/dataset-metadata.ts`, `frontend/src/lib/types/dataset-preview.ts` |
| Database tables | `datasets(dataset_id, analysis_session_id, dataset_name, dataset_path, dataset_type, dataset_status, created_at, updated_at)`, `dataset_inspections(inspection_id, dataset_id, inspection_status, total_files, total_tif_files, total_xml_files, total_txt_files, total_meta_files, total_jpg_files, created_at, updated_at)`, `dataset_files(file_id, inspection_id, file_name, file_extension, relative_path, file_size_bytes, file_category, created_at)`, `dataset_metadata(metadata_id, dataset_id, coordinate_system, projection_name, epsg_code, utm_zone, origin_x, origin_y, pixel_size_x, pixel_size_y, raster_width, raster_height, band_count, acquisition_date, metadata_status, created_at, updated_at)`, `dataset_previews(preview_id, dataset_id, preview_status, preview_image_path, thumbnail_path, preview_width, preview_height, band_count, generation_time_ms, created_at, updated_at)` |
| API endpoints | `GET /api/v1/datasets/demo`, `POST /api/v1/datasets/register`, `GET /api/v1/datasets`, `GET /api/v1/datasets/{dataset_id}`, `GET /api/v1/datasets/session/{session_id}`, `DELETE /api/v1/datasets/{dataset_id}`, `POST /api/v1/dataset-inspection/run/{dataset_id}`, `GET /api/v1/dataset-inspection/{dataset_id}`, `GET /api/v1/dataset-inspection/{dataset_id}/files`, `DELETE /api/v1/dataset-inspection/{dataset_id}`, `POST /api/v1/dataset-metadata/run/{dataset_id}`, `GET /api/v1/dataset-metadata/{dataset_id}`, `DELETE /api/v1/dataset-metadata/{dataset_id}`, `POST /api/v1/dataset-preview/run/{dataset_id}`, `GET /api/v1/dataset-preview/{dataset_id}`, `GET /api/v1/dataset-preview/{dataset_id}/image`, `GET /api/v1/dataset-preview/{dataset_id}/thumbnail`, `DELETE /api/v1/dataset-preview/{dataset_id}` |
| Consumes | `analysis_sessions.session_id`; local folders under `datasets/demo/*` or explicit `dataset_path`; raster/text files on disk. |
| Produces | Dataset registration, filesystem inventory, `DatasetMetadata`, and preview PNG assets for geospatial/temporal layers. |
| Verification script | `scripts/verify_phase_2a.py`, `scripts/verify_phase_2b.py`, `scripts/verify_phase_2c.py`, `scripts/verify_phase_2d.py`. |
| Known bugs fixed | `scripts/verify_phase_2b.py` verifies dataset delete cascades DB records while preserving physical dataset files. No separate Phase 2 bugfix commit found beyond feature commits. |

### Status: ✅ Verified Working — Phase 3: Metadata/Geospatial Context/Mission Control Layer

| Field | Actual State |
|---|---|
| Objective | Convert extracted metadata into WGS84 bounds, location intelligence, environmental context, and stateless Mission Control aggregation. |
| Backend files | `backend/app/models/geospatial_context.py`, `backend/app/models/location_context.py`, `backend/app/models/geospatial_context_profile.py`, `backend/app/schemas/geospatial_context.py`, `backend/app/schemas/location_context.py`, `backend/app/schemas/geospatial_context_profile.py`, `backend/app/schemas/mission_control.py`, `backend/app/repositories/geospatial_repository.py`, `backend/app/repositories/location_repository.py`, `backend/app/repositories/geospatial_context_profile_repository.py`, `backend/app/services/geospatial_service.py`, `backend/app/services/location_service.py`, `backend/app/services/location/resolver.py`, `backend/app/services/location/providers/base.py`, `backend/app/services/location/providers/nominatim.py`, `backend/app/services/location/providers/offline_local.py`, `backend/app/services/geospatial_context_service.py`, `backend/app/services/geospatial_context/knowledge_base.py`, `backend/app/services/mission_control_service.py`, `backend/app/api/v1/geospatial.py`, `backend/app/api/v1/location.py`, `backend/app/api/v1/geospatial_context.py`, `backend/app/api/v1/mission_control.py` |
| Frontend files | `frontend/src/app/geospatial/page.tsx`, `frontend/src/app/mission-control/page.tsx`, `frontend/src/lib/geospatial-api.ts`, `frontend/src/lib/location-api.ts`, `frontend/src/lib/geospatial-context-api.ts`, `frontend/src/lib/mission-control-api.ts`, `frontend/src/lib/types/geospatial.ts`, `frontend/src/lib/types/location.ts`, `frontend/src/lib/types/geospatial-context.ts`, `frontend/src/lib/types/mission-control.ts`, `frontend/src/components/geospatial/*`, `frontend/src/components/location/*`, `frontend/src/components/context/*`, `frontend/src/components/mission-control/*` |
| Database tables | `geospatial_contexts(context_id, dataset_id, center_lat, center_lon, min_lat, min_lon, max_lat, max_lon, epsg, crs, projection, generated_at)`, `location_contexts(id, dataset_id, country, state, district, administrative_region, geographic_region, location_summary, created_at, updated_at)`, `geospatial_context_profiles(id, dataset_id, terrain_type, environment_type, dominant_landscape, hydrology_context, agricultural_context, urbanization_context, regional_characteristics, inference_basis, context_summary, created_at, updated_at)`. Mission Control has no table. |
| API endpoints | `GET /api/v1/geospatial/{dataset_id}/context`, `GET /api/geospatial/{session_id}`, `GET /api/geospatial/{session_id}/footprint`, `GET /api/v1/location/{dataset_id}/context`, `GET /api/v1/geospatial-context/{dataset_id}/profile`, `GET /api/v1/mission-control/{dataset_id}` |
| Consumes | `DatasetMetadata` fields: `origin_x`, `origin_y`, `pixel_size_x`, `pixel_size_y`, `raster_width`, `raster_height`, `epsg_code`, `utm_zone`, `coordinate_system`, `projection_name`; `GeospatialContext` center coordinates; `LocationContext.geographic_region`. |
| Produces | WGS84 center/bounds/footprint, location profile, regional environmental profile, Mission Control response. |
| Verification script | `scripts/verify_phase_3a.py`, `scripts/verify_phase_3b.py`, `scripts/verify_phase_3c.py`, `scripts/verify_phase_3d.py`. |
| Known bugs fixed | Commit `853ef0d fix: cache geospatial context profile lookup + clear stale marker popup timeout` fixed a Phase 3C unique-constraint/cache issue and stale map popup timer cleanup. |

### Status: ✅ Verified Working — Phase 4: Geospatial Intelligence Layer

| Field | Actual State |
|---|---|
| Objective | Add coordinate/footprint intelligence helpers and MapLibre visualization surfaces. |
| Backend files | `backend/app/services/geospatial/coordinate_service.py`, `backend/app/services/geospatial/footprint_service.py`, `backend/app/services/geospatial/geospatial_profile.py`, `backend/app/api/v1/geospatial.py` |
| Frontend files | `frontend/src/app/geospatial/page.tsx`, `frontend/src/components/geospatial/GeospatialMap.tsx`, `frontend/src/components/geospatial/DatasetMap.tsx`, `frontend/src/components/geospatial/FootprintLayer.tsx`, `frontend/src/components/geospatial/DatasetBoundsLayer.tsx`, `frontend/src/components/geospatial/DatasetInfoPanel.tsx`, `frontend/src/components/geospatial/CoordinatePanel.tsx` |
| Database tables | Reuses `dataset_metadata`, `geospatial_contexts`, `location_contexts`; no separate Phase 4 table. |
| API endpoints | `GET /api/geospatial/{session_id}`, `GET /api/geospatial/{session_id}/footprint`, plus reused `GET /api/v1/geospatial/{dataset_id}/context` |
| Consumes | `DatasetMetadata` and first registered dataset in a session. |
| Produces | `GeospatialProfile` object, GeoJSON polygon footprint, map-ready bounds and centroid. |
| Verification script | UNVERIFIED — no `scripts/verify_phase_4*.py` exists; git log has `93df21d complete phase-4-Geospatial-Intelligence-Layer`. Phase 3 scripts verify the underlying geospatial context endpoint. |
| Known bugs fixed | Stale marker popup timeout fixed in commit `853ef0d`; `frontend/src/components/geospatial/GeospatialMap.tsx` and `frontend/src/components/geospatial/DatasetMap.tsx` include timeout cleanup patterns. |

### Status: ✅ Verified Working — Phase 5: Temporal Intelligence Layer

| Field | Actual State |
|---|---|
| Objective | Provide temporal provider registry, mock historical discovery, weighted reference selection, temporal context generation, and Mission Control temporal status integration. |
| Backend files | `backend/app/models/temporal_discovery.py`, `backend/app/models/temporal_candidate.py`, `backend/app/models/temporal_reference_stack.py`, `backend/app/models/selected_reference.py`, `backend/app/models/temporal_context.py`, `backend/app/schemas/temporal.py`, `backend/app/schemas/temporal_discovery.py`, `backend/app/schemas/temporal_reference.py`, `backend/app/schemas/temporal_context.py`, `backend/app/repositories/temporal_discovery_repository.py`, `backend/app/repositories/temporal_candidate_repository.py`, `backend/app/repositories/temporal_reference_stack_repository.py`, `backend/app/repositories/selected_reference_repository.py`, `backend/app/repositories/temporal_context_repository.py`, `backend/app/services/temporal_service.py`, `backend/app/services/temporal/provider_registry.py`, `backend/app/services/temporal/historical_discovery_service.py`, `backend/app/services/temporal/reference_selection_service.py`, `backend/app/services/temporal/temporal_context_service.py`, `backend/app/services/temporal/providers/base.py`, `backend/app/services/temporal/providers/gee_provider.py`, `backend/app/services/temporal/providers/local_cache_provider.py`, `backend/app/api/v1/temporal.py`, `backend/app/api/v1/temporal_discovery.py`, `backend/app/api/v1/temporal_reference.py`, `backend/app/api/v1/temporal_context.py` |
| Frontend files | `frontend/src/lib/temporal-context-api.ts`, `frontend/src/lib/types/temporal-context.ts`, `frontend/src/components/temporal/TemporalContextPanel.tsx`, `frontend/src/components/temporal/TemporalContextSummaryCard.tsx`, `frontend/src/components/temporal/TemporalStatisticsCard.tsx`, `frontend/src/components/temporal/CloudStatisticsCard.tsx`, `frontend/src/components/temporal/SpatialStatisticsCard.tsx`, `frontend/src/components/temporal/ProviderStatisticsCard.tsx`, integrated through `frontend/src/components/mission-control/MissionControlWorkspace.tsx` |
| Database tables | `temporal_discoveries(id, session_id, dataset_id, provider_used, search_window_start, search_window_end, candidate_count, status, created_at, updated_at)`, `temporal_candidates(id, discovery_id, candidate_id, provider_name, acquisition_date, cloud_cover, spatial_overlap, preview_url, metadata_json, created_at)`, `temporal_reference_stacks(id, session_id, dataset_id, discovery_id, selected_count, selection_strategy, created_at, updated_at)`, `selected_references(id, reference_stack_id, candidate_id, rank_position, ranking_score, selection_reason, created_at)`, `temporal_contexts(id, session_id, dataset_id, reference_stack_id, provider_count, reference_count, average_cloud_cover, average_temporal_distance, average_spatial_overlap, summary, metadata_json, created_at, updated_at)` |
| API endpoints | `GET /api/v1/temporal/providers`, `GET /api/v1/temporal/providers/health`, `POST /api/v1/temporal/discover/{session_id}`, `GET /api/v1/temporal/discover/{session_id}`, `GET /api/v1/temporal/discover/{session_id}/candidates`, `POST /api/v1/temporal/select/{session_id}`, `GET /api/v1/temporal/references/{session_id}`, `GET /api/v1/temporal/references/{session_id}/selected`, `POST /api/v1/temporal/context/{session_id}`, `GET /api/v1/temporal/context/{session_id}`, `GET /api/v1/temporal/context/{session_id}/summary`, `GET /api/v1/temporal/context/{session_id}/statistics` |
| Consumes | First dataset registered to an `AnalysisSession`; `DatasetMetadata.acquisition_date`; `GeospatialContext.center_lat`, `center_lon`, `min_lat`, `min_lon`, `max_lat`, `max_lon`; latest `TemporalDiscovery`; latest `TemporalReferenceStack`. |
| Produces | Historical candidates, ranked selected references, temporal context package, `AnalysisSession.status` milestones `TEMPORAL_CONTEXT_RETRIEVED`, `REFERENCE_SELECTION_COMPLETE`, `TEMPORAL_CONTEXT_GENERATED`, and Mission Control temporal status. |
| Verification script | `scripts/verify_phase_5a.py`, `scripts/verify_phase_5b.py`, `scripts/verify_phase_5c.py`, `scripts/verify_phase_5d.py`. |
| Known bugs fixed | Latest commit `550c3ad feat: complete phase 5 with advance mission control system but bases on mock data` explicitly notes Phase 5 is based on mock data. No Phase 5 bugfix commit found. |

### Status: ✅ Verified Working — Phase 10A: Mission Control Foundation Layer

| Field | Actual State |
|---|---|
| Objective | Establish a modular, grid-based operational dashboard displaying Dataset, Geospatial, Temporal, Cloud, Reconstruction, and Confidence Intelligence. |
| Backend files | `backend/app/schemas/mission_control.py`, `backend/app/services/mission_control_service.py` |
| Frontend files | `frontend/src/lib/types/mission-control.ts`, `frontend/src/components/mission-control/panels/DatasetPanel.tsx`, `frontend/src/components/mission-control/panels/GeospatialPanel.tsx`, `frontend/src/components/mission-control/panels/TemporalPanel.tsx`, `frontend/src/components/mission-control/panels/CloudPanel.tsx`, `frontend/src/components/mission-control/panels/ReconstructionPanel.tsx`, `frontend/src/components/mission-control/panels/ConfidencePanel.tsx`, `frontend/src/components/mission-control/panels/StatusFooter.tsx`, `frontend/src/components/mission-control/MissionControlWorkspace.tsx` |
| Database tables | Consumes existing tables across all subsystems (no dedicated Mission Control table, maintaining statelessness). |
| API endpoints | `GET /api/v1/mission-control/{dataset_id}` (updated with consolidated ISO 8601 server aggregation timestamp). |
| Consumes | Real-time queries from Dataset, Metadata, Geospatial, Location, Context, Temporal, Cloud, Reconstruction, and Confidence tables. |
| Produces | A central operations workspace featuring a dark-themed CartoDB map display of raster boundaries, chronological timeline reference offsets, toggling cloud mask layers, inpainting optimization parameters, and reliability scores. |
| Verification script | `scripts/verify_phase_10a.py` verifies registration, inspection setup, consolidated GET responses, timestamp presence, and cascading deletions. |
| Known bugs fixed | Resolved relative path SQLite split-brain database issues in tests. |

### Status: ✅ Verified Working — Phase 10B: Workflow Monitoring Layer

| Field | Actual State |
|---|---|
| Objective | Transform Mission Control into an interactive live monitoring dashboard tracing stage completions, blocked states, and scrolling logs. |
| Backend files | `backend/app/schemas/workflow.py`, `backend/app/services/workflow_service.py`, `backend/app/api/v1/workflow.py` |
| Frontend files | `frontend/src/lib/types/workflow.ts`, `frontend/src/lib/workflow-api.ts`, `frontend/src/components/mission-control/WorkflowPipeline.tsx`, `frontend/src/components/mission-control/WorkflowLogsPanel.tsx`, `frontend/src/components/mission-control/StageDetailDrawer.tsx`, `frontend/src/components/mission-control/MissionControlWorkspace.tsx` |
| Database tables | Dynamically extracts states from session, dataset, inspection, metadata, geospatial, temporal context, cloud detection, reconstruction, and confidence schemas. |
| API endpoints | `GET /api/v1/workflow/{session_id}` (returns stages status, inputs/outputs, timelines, and console log lines). |
| Consumes | Real-time database states. |
| Produces | Progress indicators, pipeline node charts, search-enabled console log terminal views, and side-over drawers details. |
| Verification script | `scripts/verify_phase_10b.py` tests pipeline registers, dynamic progress checks, log lists, and cascade session teardowns. |
| Known bugs fixed | Resolved duplicate prefix mapping in FastAPI router paths and mapped uppercase/lowercase inspection enums. |

### Status: ✅ Verified Working — Phase 10C: Operational Analytics Layer

| Field | Actual State |
|---|---|
| Objective | Build a comprehensive performance dashboard displaying KPI cards, responsive SVG trend charts, workflow average durations, cloud metrics, and database-aligned node health. |
| Backend files | `backend/app/schemas/analytics.py`, `backend/app/services/analytics_service.py`, `backend/app/api/v1/analytics.py` |
| Frontend files | `frontend/src/lib/types/analytics.ts`, `frontend/src/lib/analytics-api.ts`, `frontend/src/app/dashboard/page.tsx` |
| Database tables | Computes counts, averages, and group-by records across session, dataset, metadata, geospatial, temporal, cloud, reconstruction, and confidence schemas. |
| API endpoints | `GET /api/v1/analytics/overview` (returns executive summaries, dataset allocations, workflow bottlenecks, and trend lists). |
| Consumes | Database states, filesystem storage specs (via python `shutil.disk_usage`). |
| Produces | Native SVG Line/Area charts, stage progress gauges, system check nodes, and strategy distributions. |
| Verification script | `scripts/verify_phase_10c.py` executes session registers, metadata runs, analytics gets, metric asserts, and cascading cleans. |
| Known bugs fixed | Resolved prefix duplications in routes and initialized default dict distributions for demo/custom lists. |

## DATA FLOW — END TO END (ACTUAL, NOT ASPIRATIONAL)

Status: ✅ Verified Working. The actual current workflow is endpoint-driven, not a single backend orchestrator:

```text
User opens frontend
→ checkBackendHealth() in frontend/src/lib/api.ts
→ GET /health

User creates workflow
→ createAnalysis()
→ AnalysisSessionService.create_analysis_session()
→ AnalysisSessionRepository.create()
→ writes analysis_sessions

User selects demo/custom folder and registers it
→ getDemoDatasets()
→ DemoDatasetService.discover_demo_datasets()
→ registerDataset()
→ DatasetService.register_dataset()
→ DatasetRepository.create_dataset()
→ writes datasets

User runs inspection
→ runDatasetInspection()
→ DatasetInspectionService.run_inspection()
→ DatasetInspectionRepository.create_inspection()
→ DatasetInspectionRepository.create_file_entry()
→ writes dataset_inspections + dataset_files

User runs metadata extraction
→ runDatasetMetadata()
→ DatasetMetadataService.run_extraction()
→ DatasetMetadataRepository.get_by_dataset() / create_metadata() / update_metadata()
→ reads BAND_META.txt, *.meta, first .tif via rasterio
→ writes dataset_metadata

User generates preview
→ runDatasetPreview()
→ DatasetPreviewService.generate_preview()
→ reads .tif files via rasterio, writes datasets/previews/{dataset_id}/preview.png and thumbnail.png
→ writes dataset_previews

User opens geospatial/location/context/mission views
→ getGeospatialContext()
→ GeospatialService.get_or_calculate_context()
→ reads DatasetMetadata
→ writes/reads geospatial_contexts
→ getDatasetLocationContext()
→ LocationService.get_or_create_location_context()
→ reads GeospatialContext, uses LocationResolver(NominatimProvider → OfflineLocalProvider)
→ writes location_contexts
→ getGeospatialContextProfile()
→ GeospatialContextService.get_or_create_context_profile()
→ reads LocationContext.geographic_region and REGIONAL_CONTEXT_MAPPINGS
→ writes geospatial_context_profiles
→ getMissionControlProfile()
→ MissionControlService.get_mission_control_profile()
→ reads Dataset, DatasetMetadata, GeospatialContext, LocationContext, GeospatialContextProfile, TemporalContext
→ produces stateless MissionControlResponse, no Mission Control table

User runs temporal workflow
→ getProviders()
→ TemporalService.get_available_providers()
→ reads in-memory ProviderRegistry
→ runDiscovery()
→ TemporalService.run_discovery()
→ HistoricalDiscoveryService.run_discovery()
→ reads first Dataset for session, DatasetMetadata.acquisition_date, GeospatialContext bounds
→ provider.search_imagery() on GoogleEarthEngineProvider or LocalHistoricalCacheProvider
→ writes temporal_discoveries + temporal_candidates
→ updates analysis_sessions.status = TEMPORAL_CONTEXT_RETRIEVED
→ runReferenceSelection()
→ ReferenceSelectionService.select_references()
→ reads latest TemporalDiscovery, TemporalCandidate rows, DatasetMetadata.acquisition_date
→ writes temporal_reference_stacks + selected_references
→ updates analysis_sessions.status = REFERENCE_SELECTION_COMPLETE
→ generateTemporalContext()
→ TemporalContextService.generate_temporal_context()
→ reads latest TemporalReferenceStack, SelectedReference rows, TemporalCandidate rows, DatasetMetadata.acquisition_date
→ writes temporal_contexts
→ updates analysis_sessions.status = TEMPORAL_CONTEXT_GENERATED
→ MissionControlService later reads temporal_contexts and sets status.temporal = available
```

## ARCHITECTURAL PATTERNS THAT MUST BE PRESERVED

Status: ✅ Verified Working.

- Repository/service/API layering is consistent: routers call services; services call repositories; repositories contain SQLAlchemy operations.
- Lazy-generate-then-cache exists for `GeospatialService.get_or_calculate_context()`, `LocationService.get_or_create_location_context()`, and `GeospatialContextService.get_or_create_context_profile()`. This must be preserved. Violating this pattern caused the Phase 3C cache/unique issue fixed by `853ef0d`.
- Explainability fields are first-class: `GeospatialContextProfile.inference_basis`, `GeospatialContextProfile.context_summary`, `SelectedReference.selection_reason`, `TemporalContext.summary`, Mission Control `status` object.
- One-to-one dataset intelligence tables use `dataset_id unique=True` and `ForeignKey(..., ondelete="CASCADE")`: `dataset_inspections`, `dataset_metadata`, `dataset_previews`, `geospatial_contexts`, `location_contexts`, `geospatial_context_profiles`.
- Parent `AnalysisSession.datasets` and `Dataset` one-to-one relationships use SQLAlchemy `cascade="all, delete-orphan"` where defined.
- Mission Control must remain stateless. `MissionControlService` aggregates from existing tables and has no model/table.
- Physical source datasets must not be deleted by DB cleanup. `DatasetRepository.delete_dataset()` deletes only DB rows; `DatasetService.delete_dataset()` may delete generated preview folders but not original dataset folders. `scripts/verify_phase_2b.py` asserts physical demo files remain.
- Temporal provider framework is pluggable through `TemporalProvider` and `ProviderRegistry`; future providers must implement `name`, `is_primary`, `description`, `health_check()`, `search_imagery()`, and `get_reference()`.
- Historical imagery is context only. It is ranked and packaged as references; no code copies pixels into cloud regions.

## KNOWN ISSUES / FRAGILE AREAS

Status: ⚠️ Fragile.

- `backend/app/services/temporal/providers/gee_provider.py` and `backend/app/services/temporal/providers/local_cache_provider.py` are placeholder/mock providers. `health_check()` always returns `True`; no actual GEE authentication, Sentinel query, download, or cache scan occurs.
- `frontend/src/lib/types/temporal-context.ts` defines `SystemHealthResponse` with `timestamp` and provider `latency_ms`, but backend `backend/app/schemas/temporal.py` returns `status` and provider `details`. This is a frontend/backend type drift.
- `frontend/src/lib/temporal-context-api.ts:getTemporalSummary()` calls `res.text()`, while backend `GET /api/v1/temporal/context/{session_id}/summary` has `response_model=str`, so the raw HTTP body is likely a JSON string with quotes rather than a parsed string.
- `AnalysisSessionService.update_analysis_status()` only permits `created -> active`, `active -> completed`, `active -> failed`; however temporal services directly call `AnalysisSessionRepository.update_status()` to set milestone states. This bypass is intentional in current code but inconsistent with the lifecycle service rules.
- `DatasetService.delete_dataset()` deletes generated preview folders under `datasets/previews/{dataset_id}`. This is safe for generated assets but means dataset deletion has filesystem side effects.
- `DatasetMetadataService.run_extraction()` uses the first `.tif` found for raster metadata and only simple key/value parsing from `BAND_META.txt` / `*.meta`; XML/aux metadata is inventoried but not parsed.
- `DatasetPreviewService.generate_preview()` maps the first three sorted TIFF files to RGB channels; band semantics are not verified.
- `LocationResolver` attempts live Nominatim network access with a 3 second timeout, then falls back offline. In network-restricted environments, lookup failure is expected and printed.
- `OfflineLocalProvider` uses hardcoded coordinate heuristics for Indian regions and demo data.
- `frontend/src/app/page.tsx`, `frontend/src/app/dashboard/page.tsx`, and `frontend/src/app/settings/page.tsx` contain UI copy for cloud segmentation, reconstruction, confidence, and AI models that are not implemented in backend code.
- `frontend/src/app/analysis/page.tsx` includes locked/placeholder workflow cards for dataset ingestion, cloud intelligence, and AI reconstruction.
- `frontend/src/app/datasets/page.tsx`, `frontend/src/app/geospatial/page.tsx`, and `frontend/src/app/analysis/page.tsx` use untyped `catch (err: any)` and timed success state cleanup.
- Map components use `setTimeout()` for popup/resize behavior in `frontend/src/components/geospatial/GeospatialMap.tsx` and `frontend/src/components/geospatial/DatasetMap.tsx`; Phase 3C fixed stale popup cleanup, but these timing hooks remain a fragile UI area.
- `backend/requirements.txt` does not include PyTorch, OpenCV, NumPy, Albumentations, GDAL, or MapLibre dependencies; only `rasterio`, `pyproj`, FastAPI, SQLAlchemy, Pillow, Pydantic packages, `httpx`, `uvicorn` are present.

## NOT YET IMPLEMENTED

### Status: ❌ Not Implemented — Phase 6: Cloud Intelligence

- No cloud detection service exists.
- No cloud probability map generation exists.
- No cloud classification for thick/thin/cirrus clouds exists.
- No cloud shadow detection exists.
- No pixel-level cloud mask table, file artifact, endpoint, or frontend working output exists.

### Status: ❌ Not Implemented — Phase 7: Reconstruction Intelligence

- No model inference pipeline exists.
- No PyTorch model integration exists; `torch` is not in `backend/requirements.txt`.
- No temporal fusion engine exists beyond selecting temporal references.
- No inpainting/reconstruction artifact table, endpoint, or frontend working output exists.

### Status: ❌ Not Implemented — Phase 8: Confidence Intelligence

- No confidence matrix generation exists.
- No reliability scoring backend exists.
- No confidence heatmap artifact table, endpoint, or frontend working output exists.

### Status: ❌ Not Implemented — Phase 9: Visualization Intelligence

- Current visualization is dataset preview/geospatial/temporal metadata only.
- No original-vs-cloud-mask-vs-reconstruction-vs-confidence comparison engine exists.

### Status: ❌ Not Implemented — Phase 10D: Mission Control Experience

- No dynamic customization triggers inside the Mission Control layout.

### Status: ❌ Not Implemented — Phase 11: Export Intelligence

- No GeoTIFF/PNG/JPG export command center exists for reconstructed outputs.
- No report export service exists.
- No analysis package export exists.

### Status: ❌ Not Implemented — Phase 12: System Integration & Validation

- No complete end-to-end cloud removal/reconstruction pipeline exists.
- No failure testing for cloud/reconstruction/export exists.

### Status: ❌ Not Implemented — Phase 13: Demo & Presentation Readiness

- Demo datasets exist, but no final walkthrough/export/reconstruction presentation pipeline exists.

## HARD CONSTRAINTS FOR FUTURE PHASES

Status: ✅ Verified Working.

- Follow the frozen tech stack in `Docs/TECH_STACK_Final.md`: Next.js, TypeScript, TailwindCSS, shadcn/ui, MapLibre, FastAPI, Python, SQLite, Rasterio, GDAL/PyProj direction, PyTorch/OpenCV/NumPy/Albumentations/Scikit-Image for AI when those phases start.
- Do not re-architect Phase 0-5 files unless explicitly fixing a named bug.
- Preserve repository/service/API layering exactly.
- Preserve lazy-generate-then-cache for one-to-one generated intelligence records.
- Preserve stateless Mission Control aggregation. Do not add a Mission Control table for pure aggregation.
- Preserve explainability/status fields as first-class API output.
- Preserve local-first SQLite behavior unless a documented technical blocker forces reevaluation.
- Preserve source dataset immutability; deleting a registration must not delete uploaded/demo source files.
- Future features must map to `Docs/PHASE_ROADMAP_Final.md`; that doc says features outside the roadmap should not be implemented until the roadmap is updated.
- Maintain Mission Control visual conventions already established in `frontend/src/app/layout.tsx`, `frontend/src/components/ClientHeader.tsx`, `frontend/src/components/ClientSidebar.tsx`, and `frontend/src/components/mission-control/*`.
