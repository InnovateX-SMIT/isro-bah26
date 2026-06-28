# 01 Project Architecture And Workflow

## Product Definition

The project is an AI-powered geospatial reconstruction platform for cloud removal and reconstruction of LISS-IV satellite imagery. It is designed as an operational Earth Observation workflow rather than a single image processing script.

The platform combines:

- Dataset intelligence
- Geospatial metadata extraction
- Location and footprint context
- Temporal reference discovery
- Cloud detection and cloud mask generation
- Reconstruction and optimization
- Confidence scoring and heatmap generation
- Visual comparison
- Exportable analysis products

The product philosophy is platform first, model second. The AI or reconstruction model is one component inside a larger operational system.

## Repository Shape

```text
isro-bah26/
  backend/                 FastAPI backend, SQLAlchemy models, services, APIs
  frontend/                Next.js App Router frontend, workflow pages, API clients
  datasets/                Local dataset workspace and generated artifacts
  Docs/                    Architecture, roadmap, state, and submission docs
  scripts/                 Phase verification scripts
  docker-compose.yml       Local multi-container orchestration
```

## Backend Architecture

The backend follows a layered pattern:

```text
FastAPI router
  -> Pydantic schema
  -> Service layer
  -> Repository layer
  -> SQLAlchemy model
  -> SQLite database and file workspace
```

### API Layer

All primary APIs are mounted under `/api/v1` from `backend/app/api/v1/router.py`.

Major API groups:

- `/analysis`: analysis session lifecycle
- `/datasets`: dataset discovery, registration, lookup, deletion
- `/dataset-inspection`: filesystem scan and file inventory
- `/dataset-metadata`: raster metadata extraction
- `/dataset-preview`: RGB previews and thumbnails
- `/geospatial`: CRS, bounds, footprint context
- `/location`: administrative/geographic context
- `/geospatial-context`: environmental and terrain context
- `/mission-control`: consolidated operational profile
- `/temporal`: providers, discovery, reference selection, context packages
- `/cloud-detection`: cloud probability map
- `/cloud-classification`: thick/thin/cirrus classification
- `/cloud-shadow`: cloud shadow inference
- `/cloud-segmentation`: reconstruction masks
- `/cloud-analytics`: cloud burden and readiness metrics
- `/reconstruction`: reconstruction, optimization, evaluation, previews
- `/temporal-fusion`: temporal fusion guidance
- `/confidence`: confidence estimation
- `/reliability`: reliability scoring
- `/confidence-heatmap`: overlays and reliability maps
- `/confidence-analytics`: confidence reports and scorecards
- `/workflow`: session workflow monitoring
- `/analytics`: dashboard analytics
- `/exports`: raster export validation, generation, download
- `/reports`: PDF/report generation
- `/packages`: complete analysis package generation

The backend also has `/health` for container and frontend health checks.

### Service Layer

The service layer contains the project logic. Important services include:

- `AnalysisSessionService`: creates and manages workflow sessions.
- `DatasetService`: registers local dataset paths and maps them to sessions.
- `DatasetInspectionService`: scans files, categorizes TIFF/XML/TXT/META/JPG assets.
- `DatasetMetadataService`: reads GeoTIFF metadata, projection, EPSG, raster dimensions, band count, and acquisition fields.
- `DatasetPreviewService`: generates RGB preview PNGs and thumbnails from bands.
- `GeospatialService`: computes geospatial context and bounding boxes.
- `LocationService`: resolves geographic/admin context with online and offline fallback providers.
- `GeospatialContextService`: derives terrain, hydrology, agriculture, urbanization, and regional characteristics.
- `TemporalService`, `HistoricalDiscoveryService`, `ReferenceSelectionService`, `TemporalContextService`: discover, rank, and package historical references.
- `CloudDetectionService`: calculates cloud probability using raster bands and indices.
- `CloudClassificationService`: splits cloud areas into types.
- `CloudShadowService`: uses solar geometry and mask shifts to infer shadow areas.
- `CloudSegmentationService`: builds segmentation and reconstruction masks using OpenCV morphology.
- `CloudAnalyticsService`: computes burden, difficulty, object counts, and readiness.
- `ReconstructionService`: runs reconstruction, optimization, preview generation, and evaluation.
- `TemporalFusionService`: packages temporal reference guidance for reconstruction.
- `ConfidenceService`: estimates confidence surfaces.
- `ReliabilityService`: converts confidence into tiers and region scores.
- `ConfidenceHeatmapService`: generates overlays and reliability maps.
- `ConfidenceAnalyticsService`: compiles confidence summaries and reports.
- `ExportService`, `ReportService`, `PackageService`: generate downloadable outputs.
- `WorkflowService`: consolidates stage progress, dependencies, logs, health, and outputs.

### Data Model Layer

The database is initialized in `backend/app/core/database.py`. Current models cover:

- `analysis_sessions`
- `datasets`
- `dataset_inspections`
- `dataset_files`
- `dataset_metadata`
- `dataset_previews`
- `geospatial_contexts`
- `location_contexts`
- `geospatial_context_profiles`
- `temporal_discoveries`
- `temporal_candidates`
- `temporal_reference_stacks`
- `selected_references`
- `temporal_contexts`
- `cloud_detections`
- `cloud_classifications`
- `cloud_shadows`
- `cloud_segmentations`
- `cloud_analytics`
- `reconstruction_runs`
- `temporal_fusion_runs`
- `confidence_estimations`
- `reliability_scores`
- `confidence_heatmaps`
- `confidence_analytics`
- `exports`

The database stores metadata, status, paths, reports, and summaries. Large rasters are stored as files, not as database blobs.

## Frontend Architecture

The frontend is a Next.js App Router application.

Important areas:

- `/`: landing and system status
- `/analysis`: session creation and analysis management
- `/datasets`: data inventory and registration
- `/datasets/[dataset_id]/inspection`: complete inspection pipeline
- `/datasets/[dataset_id]/viewer`: scene overview
- `/datasets/[dataset_id]/viewer/rgb`: RGB composite viewer
- `/datasets/[dataset_id]/viewer/bands`: spectral band viewer
- `/datasets/[dataset_id]/viewer/metadata`: metadata view
- `/datasets/[dataset_id]/cloud`: cloud intelligence hub
- `/datasets/[dataset_id]/cloud/*`: detection, classification, masks, shadows, analytics
- `/datasets/[dataset_id]/temporal`: temporal intelligence hub
- `/datasets/[dataset_id]/temporal/*`: references, timeline, metadata, individual references
- `/datasets/[dataset_id]/reconstruction`: AI reconstruction hub
- `/datasets/[dataset_id]/reconstruction/*`: result, optimized output, evaluation, metadata
- `/datasets/[dataset_id]/confidence`: confidence hub
- `/datasets/[dataset_id]/confidence/*`: heatmap, overlay, reliability, analytics, report
- `/datasets/[dataset_id]/comparison`: comparison hub
- `/datasets/[dataset_id]/comparison/*`: synchronized comparison pages
- `/mission-control`: consolidated operational profile
- `/dashboard`: analytics overview
- `/export`: export command center
- `/settings`: settings shell

Frontend API clients live in `frontend/src/lib`. Each subsystem has its own client module, for example `cloud-api.ts`, `reconstruction-api.ts`, `confidence-api.ts`, `export-api.ts`, and `package-api.ts`.

## Runtime Workflow

### 1. Session Creation

A user creates an analysis session. This creates an `analysis_sessions` row. All later work attaches to the session.

### 2. Dataset Registration

The current system registers datasets by path. Demo datasets are discovered from `datasets/demo`. Custom datasets can be registered only if they already exist on the backend filesystem.

Current limitation: there is no production browser upload endpoint yet.

### 3. Dataset Inspection

The inspection page runs:

1. Filesystem scan
2. Metadata extraction
3. Preview generation

Outputs:

- File inventory
- GeoTIFF metadata
- RGB preview image
- Thumbnail

### 4. Scene Viewing

The viewer pages consume generated preview and metadata. If preview is missing, the UI guides the user back to inspection instead of crashing.

### 5. Cloud Intelligence

Cloud pipeline runs:

1. Detection
2. Classification
3. Shadow detection
4. Segmentation/mask generation
5. Analytics

Outputs:

- Cloud probability map
- Classification preview
- Shadow mask preview
- Segmentation preview
- Reconstruction mask
- Analytics summary

### 6. Temporal Intelligence

Temporal pipeline runs:

1. Provider discovery
2. Historical candidate search
3. Reference ranking
4. Context package generation

Current limitation: provider implementations are still mostly mock/local-cache style. Real GEE integration needs authentication and production provider hardening.

### 7. Reconstruction

Reconstruction pipeline runs:

1. Reconstruction
2. Optimization
3. Quality evaluation

Outputs:

- Reconstructed image path
- Preview image path
- Optimized output path
- Optimized preview path
- Evaluation metrics
- Scorecard/report data

### 8. Confidence Intelligence

Confidence pipeline runs:

1. Confidence estimation
2. Reliability scoring
3. Heatmap generation
4. Analytics/report generation

Outputs:

- Confidence map
- Confidence preview
- Reliability score
- Confidence overlay
- Reliability map
- Analytics report

### 9. Comparison

Comparison pages synchronize views across:

- Original scene
- Cloud mask
- Reconstruction output
- Historical reference
- Confidence overlay

This is the main visual proof layer for judges.

### 10. Export

Export and package services produce deliverables:

- Raster/image exports
- Reports
- Complete session packages

## Local Development Runtime

The current local runtime is:

```bash
docker compose up --build
```

or manually:

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

cd frontend
npm run dev
```

Frontend expects `NEXT_PUBLIC_API_URL` to point at the backend API base host, normally `http://localhost:8000` locally.

## Important Architectural Rule

Do not store large imagery in SQLite. Store only IDs, state, metrics, summaries, and file/object paths. Large objects must live in filesystem storage locally and object storage in production.
