# DATABASE SCHEMA CURRENT

Status: ✅ Verified Working. Source of truth: `backend/app/core/database.py:init_db()` imports model files and runs `Base.metadata.create_all(bind=engine)`. The schema below was inspected from SQLAlchemy metadata after importing exactly those models.

## Status: ✅ Verified Working — `analysis_sessions`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `session_id` | `VARCHAR` | no | primary key |
| `status` | `VARCHAR` | no |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| none | none |

| Writes | Reads |
|---|---|
| `AnalysisSessionRepository.create()`, `AnalysisSessionRepository.update_status()` | `AnalysisSessionRepository.get_by_id()`, `AnalysisSessionRepository.list_all()`, `DatasetService.register_dataset()`, temporal services |

## Status: ✅ Verified Working — `datasets`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `dataset_id` | `VARCHAR` | no | primary key |
| `analysis_session_id` | `VARCHAR` | no | foreign key |
| `dataset_name` | `VARCHAR` | no |  |
| `dataset_path` | `VARCHAR` | no |  |
| `dataset_type` | `VARCHAR` | no |  |
| `dataset_status` | `VARCHAR` | no |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `analysis_session_id -> analysis_sessions.session_id` | `ondelete=CASCADE`; ORM `AnalysisSession.datasets` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `DatasetRepository.create_dataset()`, `DatasetRepository.update_status()` | `DatasetRepository.get_dataset()`, `DatasetRepository.list_datasets()`, `DatasetRepository.list_session_datasets()`, all dataset/geospatial/temporal/Mission Control services |

## Status: ✅ Verified Working — `dataset_inspections`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `inspection_id` | `VARCHAR` | no | primary key |
| `dataset_id` | `VARCHAR` | no | foreign key, unique |
| `inspection_status` | `VARCHAR` | no |  |
| `total_files` | `INTEGER` | no |  |
| `total_tif_files` | `INTEGER` | no |  |
| `total_xml_files` | `INTEGER` | no |  |
| `total_txt_files` | `INTEGER` | no |  |
| `total_meta_files` | `INTEGER` | no |  |
| `total_jpg_files` | `INTEGER` | no |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE`; ORM `Dataset.inspection` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `DatasetInspectionService.run_inspection()`, `DatasetInspectionRepository.create_inspection()` | `DatasetInspectionRepository.get_by_dataset()`, `DatasetInspectionService.get_inspection()`, `DatasetInspectionService.list_files()` |

## Status: ✅ Verified Working — `dataset_files`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `file_id` | `VARCHAR` | no | primary key |
| `inspection_id` | `VARCHAR` | no | foreign key |
| `file_name` | `VARCHAR` | no |  |
| `file_extension` | `VARCHAR` | no |  |
| `relative_path` | `VARCHAR` | no |  |
| `file_size_bytes` | `INTEGER` | no |  |
| `file_category` | `VARCHAR` | no |  |
| `created_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `inspection_id -> dataset_inspections.inspection_id` | `ondelete=CASCADE`; ORM `DatasetInspection.files` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `DatasetInspectionRepository.create_file_entry()` | `DatasetInspectionRepository.list_files()` |

## Status: ✅ Verified Working — `dataset_metadata`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `metadata_id` | `VARCHAR` | no | primary key |
| `dataset_id` | `VARCHAR` | no | foreign key, unique |
| `coordinate_system` | `VARCHAR` | yes |  |
| `projection_name` | `VARCHAR` | yes |  |
| `epsg_code` | `INTEGER` | yes |  |
| `utm_zone` | `INTEGER` | yes |  |
| `origin_x` | `FLOAT` | yes |  |
| `origin_y` | `FLOAT` | yes |  |
| `pixel_size_x` | `FLOAT` | yes |  |
| `pixel_size_y` | `FLOAT` | yes |  |
| `raster_width` | `INTEGER` | yes |  |
| `raster_height` | `INTEGER` | yes |  |
| `band_count` | `INTEGER` | yes |  |
| `acquisition_date` | `VARCHAR` | yes |  |
| `metadata_status` | `VARCHAR` | no |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE`; ORM `Dataset.dataset_metadata` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `DatasetMetadataService.run_extraction()`, `DatasetMetadataRepository.create_metadata()`, `DatasetMetadataRepository.update_metadata()` | `DatasetMetadataService.get_metadata()`, `GeospatialService.get_or_calculate_context()`, `HistoricalDiscoveryService.run_discovery()`, `ReferenceSelectionService.select_references()`, `TemporalContextService.generate_temporal_context()`, `MissionControlService.get_mission_control_profile()` |

## Status: ✅ Verified Working — `dataset_previews`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `preview_id` | `VARCHAR` | no | primary key |
| `dataset_id` | `VARCHAR` | no | foreign key, unique |
| `preview_status` | `VARCHAR` | no |  |
| `preview_image_path` | `VARCHAR` | yes |  |
| `thumbnail_path` | `VARCHAR` | yes |  |
| `preview_width` | `INTEGER` | yes |  |
| `preview_height` | `INTEGER` | yes |  |
| `band_count` | `INTEGER` | yes |  |
| `generation_time_ms` | `INTEGER` | yes |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE`; ORM `Dataset.preview` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `DatasetPreviewService.generate_preview()` | `DatasetPreviewService.get_preview()`, `DatasetPreviewService.get_image_path()` |

## Status: ✅ Verified Working — `geospatial_contexts`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `context_id` | `VARCHAR` | no | primary key |
| `dataset_id` | `VARCHAR` | no | foreign key, unique |
| `center_lat` | `FLOAT` | no |  |
| `center_lon` | `FLOAT` | no |  |
| `min_lat` | `FLOAT` | no |  |
| `min_lon` | `FLOAT` | no |  |
| `max_lat` | `FLOAT` | no |  |
| `max_lon` | `FLOAT` | no |  |
| `epsg` | `INTEGER` | yes |  |
| `crs` | `VARCHAR` | yes |  |
| `projection` | `VARCHAR` | yes |  |
| `generated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE`; ORM `Dataset.geospatial_context` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `GeospatialService.get_or_calculate_context()`, `GeospatialRepository.save_context()` | `GeospatialRepository.get_by_dataset()`, `LocationService.get_or_create_location_context()`, `HistoricalDiscoveryService.run_discovery()`, `MissionControlService.get_mission_control_profile()` |

## Status: ✅ Verified Working — `location_contexts`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `id` | `VARCHAR` | no | primary key |
| `dataset_id` | `VARCHAR` | no | foreign key, unique |
| `country` | `VARCHAR` | no |  |
| `state` | `VARCHAR` | no |  |
| `district` | `VARCHAR` | no |  |
| `administrative_region` | `VARCHAR` | no |  |
| `geographic_region` | `VARCHAR` | no |  |
| `location_summary` | `VARCHAR` | no |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE`; ORM `Dataset.location_context` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `LocationService.get_or_create_location_context()`, `LocationRepository.save_context()` | `LocationRepository.get_by_dataset()`, `GeospatialContextService.get_or_create_context_profile()`, `MissionControlService.get_mission_control_profile()` |

## Status: ✅ Verified Working — `geospatial_context_profiles`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `id` | `VARCHAR` | no | primary key |
| `dataset_id` | `VARCHAR` | no | foreign key, unique |
| `terrain_type` | `VARCHAR` | no |  |
| `environment_type` | `VARCHAR` | no |  |
| `dominant_landscape` | `VARCHAR` | no |  |
| `hydrology_context` | `VARCHAR` | no |  |
| `agricultural_context` | `VARCHAR` | no |  |
| `urbanization_context` | `VARCHAR` | no |  |
| `regional_characteristics` | `VARCHAR` | no | semicolon-separated list |
| `inference_basis` | `VARCHAR` | no |  |
| `context_summary` | `VARCHAR` | no |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE`; ORM `Dataset.geospatial_context_profile` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `GeospatialContextService.get_or_create_context_profile()`, `GeospatialContextProfileRepository.save_profile()` | `GeospatialContextProfileRepository.get_by_dataset()`, `MissionControlService.get_mission_control_profile()` |

## Status: ✅ Verified Working — `temporal_discoveries`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `id` | `VARCHAR` | no | primary key |
| `session_id` | `VARCHAR` | no | foreign key |
| `dataset_id` | `VARCHAR` | no | foreign key |
| `provider_used` | `VARCHAR` | no |  |
| `search_window_start` | `VARCHAR` | no |  |
| `search_window_end` | `VARCHAR` | no |  |
| `candidate_count` | `INTEGER` | no |  |
| `status` | `VARCHAR` | no |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `session_id -> analysis_sessions.session_id` | `ondelete=CASCADE` |
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE` |

| Writes | Reads |
|---|---|
| `HistoricalDiscoveryService.run_discovery()`, `TemporalDiscoveryRepository.create()`, `TemporalDiscoveryRepository.update_status()` | `TemporalDiscoveryRepository.get_latest()`, `ReferenceSelectionService.select_references()` |

## Status: ✅ Verified Working — `temporal_candidates`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `id` | `VARCHAR` | no | primary key |
| `discovery_id` | `VARCHAR` | no | foreign key |
| `candidate_id` | `VARCHAR` | no | provider-specific scene id |
| `provider_name` | `VARCHAR` | no |  |
| `acquisition_date` | `VARCHAR` | no |  |
| `cloud_cover` | `FLOAT` | no |  |
| `spatial_overlap` | `FLOAT` | no |  |
| `preview_url` | `VARCHAR` | yes |  |
| `metadata_json` | `TEXT` | no | JSON string |
| `created_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `discovery_id -> temporal_discoveries.id` | `ondelete=CASCADE`; ORM `TemporalDiscovery.candidates` has `cascade="all, delete-orphan"` |

| Writes | Reads |
|---|---|
| `TemporalCandidateRepository.bulk_create()` | `TemporalCandidateRepository.get_by_discovery()`, `ReferenceSelectionService.select_references()`, `TemporalContextService.generate_temporal_context()` |

## Status: ✅ Verified Working — `temporal_reference_stacks`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `id` | `VARCHAR` | no | primary key |
| `session_id` | `VARCHAR` | no | foreign key |
| `dataset_id` | `VARCHAR` | no | foreign key |
| `discovery_id` | `VARCHAR` | no | foreign key |
| `selected_count` | `INTEGER` | no |  |
| `selection_strategy` | `VARCHAR` | no |  |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `session_id -> analysis_sessions.session_id` | `ondelete=CASCADE` |
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE` |
| `discovery_id -> temporal_discoveries.id` | `ondelete=CASCADE` |

| Writes | Reads |
|---|---|
| `ReferenceSelectionService.select_references()`, `TemporalReferenceStackRepository.create()` | `TemporalReferenceStackRepository.get_latest_by_session()`, `TemporalReferenceStackRepository.get_by_id()`, `TemporalContextService.generate_temporal_context()` |

## Status: ✅ Verified Working — `selected_references`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `id` | `VARCHAR` | no | primary key |
| `reference_stack_id` | `VARCHAR` | no | foreign key |
| `candidate_id` | `VARCHAR` | no | foreign key to internal `temporal_candidates.id` |
| `rank_position` | `INTEGER` | no |  |
| `ranking_score` | `FLOAT` | no |  |
| `selection_reason` | `TEXT` | no |  |
| `created_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `reference_stack_id -> temporal_reference_stacks.id` | `ondelete=CASCADE`; ORM `TemporalReferenceStack.selected_references` has `cascade="all, delete-orphan"` |
| `candidate_id -> temporal_candidates.id` | `ondelete=CASCADE` |

| Writes | Reads |
|---|---|
| `SelectedReferenceRepository.bulk_create()` | `SelectedReferenceRepository.get_by_stack()`, `TemporalContextService.generate_temporal_context()` |

## Status: ✅ Verified Working — `temporal_contexts`

| Column | Type | Null | Key / Unique |
|---|---|---|---|
| `id` | `VARCHAR` | no | primary key |
| `session_id` | `VARCHAR` | no | foreign key, unique |
| `dataset_id` | `VARCHAR` | no | foreign key, unique |
| `reference_stack_id` | `VARCHAR` | no | foreign key |
| `provider_count` | `INTEGER` | no |  |
| `reference_count` | `INTEGER` | no |  |
| `average_cloud_cover` | `FLOAT` | no |  |
| `average_temporal_distance` | `FLOAT` | no |  |
| `average_spatial_overlap` | `FLOAT` | no |  |
| `summary` | `TEXT` | no |  |
| `metadata_json` | `TEXT` | no | JSON string |
| `created_at` | `DATETIME` | no |  |
| `updated_at` | `DATETIME` | no |  |

| Foreign Key | Cascade |
|---|---|
| `session_id -> analysis_sessions.session_id` | `ondelete=CASCADE` |
| `dataset_id -> datasets.dataset_id` | `ondelete=CASCADE` |
| `reference_stack_id -> temporal_reference_stacks.id` | `ondelete=CASCADE` |

| Writes | Reads |
|---|---|
| `TemporalContextService.generate_temporal_context()`, `TemporalContextRepository.create()` | `TemporalContextRepository.get_by_session()`, `TemporalContextRepository.get_by_dataset()`, `MissionControlService.get_mission_control_profile()` |

## Status: ✅ Verified Working — No Mission Control Table

`MissionControlService` in `backend/app/services/mission_control_service.py` is stateless and creates `MissionControlResponse` by reading existing records. No `mission_control` model is imported by `backend/app/core/database.py`.
