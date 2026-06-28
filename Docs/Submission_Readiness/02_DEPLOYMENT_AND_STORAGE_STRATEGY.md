# 02 Deployment And Storage Strategy

## Deployment Objective

The final deployment should allow judges and users to open a public frontend, trigger real backend workflows, process large LISS-IV scenes, view generated outputs, and download reports without depending on a developer machine.

The clean production target is:

```text
Vercel frontend
  -> HTTPS API gateway / backend URL
  -> Containerized FastAPI backend
  -> PostgreSQL/PostGIS metadata database
  -> Object storage for raw and generated raster assets
  -> Background job workers for heavy processing
```

## Current Local Deployment

Current `docker-compose.yml` starts:

- `backend`: FastAPI on port `8000`
- `frontend`: Next.js on port `3000`
- `backend_db`: Docker volume mounted to `/app/data`

Important issue: backend settings default to `sqlite:///./platform.db`, so production database location must be explicitly controlled through `.env`. The compose file mounts `/app/data`, but the default SQLite file path points to the app working directory unless `SQLALCHEMY_DATABASE_URL` is changed.

Recommended local `.env` for container persistence:

```env
SQLALCHEMY_DATABASE_URL=sqlite:////app/data/platform.db
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

For real production, use PostgreSQL instead of SQLite.

## Why Vercel Should Host Only The Frontend

Vercel is excellent for the Next.js frontend:

- Fast global CDN
- Automatic preview deployments
- Git-based deployments
- Easy environment variables
- Good fit for UI, static assets, and SSR pages

Vercel is not the right place for the Python GIS backend because this backend needs:

- Python FastAPI runtime
- Rasterio/GDAL-style geospatial dependencies
- OpenCV and NumPy processing
- Long-running CPU-heavy jobs
- File generation and temporary workspaces
- Large raster reads/writes
- Persistent storage

Official Vercel docs to keep in mind:

- Vercel Limits: https://vercel.com/docs/limits
- Vercel Blob: https://vercel.com/docs/vercel-blob

Even if Vercel Blob is used for object storage, the heavy raster processing should run outside Vercel serverless functions. The backend should run as a container or VM service.

## Recommended Production Topology

### Option A: Fast Hackathon Production Deployment

Use this if speed matters most.

```text
Frontend: Vercel
Backend API: Render / Railway / Fly.io container service
Database: Managed PostgreSQL
Storage: S3-compatible object storage
Workers: Same backend container initially, then split if needed
```

Good for:

- Hackathon submission
- Public demo links
- Small team operations
- Fast setup

Weaknesses:

- CPU limits can become tight for heavy raster processing.
- Persistent disk behavior differs by platform.
- Long-running jobs may still need worker separation.

### Option B: More Reliable Production Deployment

Use this if the project must handle many users and large datasets.

```text
Frontend: Vercel
API: AWS ECS / Google Cloud Run / Azure Container Apps
Workers: ECS tasks / Cloud Run jobs / Celery workers
Queue: Redis / SQS / Cloud Tasks
Database: PostgreSQL + PostGIS
Storage: S3 / GCS / Azure Blob
CDN: CloudFront / Cloud CDN
Observability: Sentry + OpenTelemetry + cloud logs
```

Good for:

- 500 concurrent users
- Heavy processing
- Large storage
- Better reliability
- Clean production operations

Weaknesses:

- More setup time.
- More DevOps complexity.

## Storage Strategy For 5GB+ Dataset Assets

Do not upload 5GB+ demo data to Git, Vercel static assets, or a frontend deployment.

Use object storage.

Recommended layout:

```text
bucket/
  raw-datasets/
    {dataset_id}/
      BAND2.tif
      BAND3.tif
      BAND4.tif
      metadata files
  previews/
    {dataset_id}/preview.png
    {dataset_id}/thumbnail.png
  cloud/
    {dataset_id}/probability_map.tif
    {dataset_id}/classification_preview.png
    {dataset_id}/shadow_preview.png
    {dataset_id}/segmentation_preview.png
    {dataset_id}/reconstruction_mask.tif
  reconstruction/
    {session_id}/output.tif
    {session_id}/preview.png
    {session_id}/optimized_output.tif
    {session_id}/optimized_preview.png
  confidence/
    {dataset_id}/confidence_map.tif
    {dataset_id}/overlay.png
    {dataset_id}/reliability_map.png
  exports/
    {session_id}/{export_id}.tif
  reports/
    {session_id}/summary.pdf
  packages/
    {session_id}/analysis_package.zip
```

Database should store:

- Object key or URL
- File size
- MIME/content type
- checksum
- created timestamp
- owner/session/dataset relation
- processing status

Database should not store:

- GeoTIFF binary blobs
- preview binary blobs
- ZIP package blobs

## Dataset Upload Strategy

The current project registers backend-local paths. For production, add one of these flows.

### Flow 1: Presigned Direct Upload

Best production approach.

1. Frontend requests an upload session from backend.
2. Backend creates dataset record with status `UPLOADING`.
3. Backend returns presigned object storage URLs.
4. Browser uploads files directly to S3/GCS/Blob storage.
5. Browser notifies backend upload is complete.
6. Backend validates file list and starts inspection job.

Benefits:

- Backend does not proxy 5GB files.
- Better speed and reliability.
- Supports resumable upload patterns.
- Easier to scale.

### Flow 2: Backend Multipart Upload

Acceptable for smaller files, not ideal for 5GB+.

1. Browser uploads to FastAPI.
2. FastAPI streams file to disk/object storage.
3. Backend validates and registers files.

Problems:

- Backend request timeout risk.
- High memory/disk pressure.
- Harder to scale horizontally.

### Flow 3: Admin-Seeding Demo Data

Best for hackathon demo if time is short.

1. Upload demo data manually to object storage.
2. Seed database records pointing to those object keys.
3. Provide one-click demo dataset registration in frontend.

This avoids huge live uploads during judging.

## Backend Deployment Requirements

The backend container needs:

- Python 3.12+
- FastAPI/Uvicorn
- Rasterio-compatible GDAL environment
- OpenCV headless
- NumPy
- scikit-image
- fpdf2
- Persistent scratch directory or mounted volume
- Access credentials for object storage
- Database URL
- CORS configured for Vercel frontend domain

Environment variables:

```env
SQLALCHEMY_DATABASE_URL=postgresql+psycopg://user:password@host:5432/georecon
BACKEND_CORS_ORIGINS=["https://your-vercel-app.vercel.app"]
OBJECT_STORAGE_PROVIDER=s3
OBJECT_STORAGE_BUCKET=georecon-prod
OBJECT_STORAGE_REGION=ap-south-1
OBJECT_STORAGE_ENDPOINT=https://s3.ap-south-1.amazonaws.com
OBJECT_STORAGE_ACCESS_KEY=...
OBJECT_STORAGE_SECRET_KEY=...
WORKSPACE_ROOT=/tmp/georecon-workspace
PUBLIC_ASSET_BASE_URL=https://cdn.example.com
```

The current backend does not yet implement object storage abstraction. That should be a next phase.

## Frontend Deployment On Vercel

Recommended frontend environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_ENV=production
```

Build command:

```bash
npm run build
```

Start command is Vercel-managed.

Important frontend production rules:

- Do not bundle demo datasets into `public/`.
- Do not store API secrets in `NEXT_PUBLIC_*` variables.
- Use only public API base URLs in frontend env.
- Keep all storage credentials backend-only.
- Ensure backend CORS includes the Vercel domain.

## Recommended Public URL Layout

```text
https://georecon.your-domain.com          Vercel frontend
https://api.georecon.your-domain.com      FastAPI backend
https://assets.georecon.your-domain.com   CDN/object storage public assets
```

Use custom domains if possible. It makes the project look more professional and avoids CORS confusion.

## Database Strategy

### Current

SQLite is fine for local development and hackathon single-machine demos.

Strengths:

- Simple
- No external DB service
- Easy to inspect
- Fast for one developer/demo

Weaknesses:

- Write locking under concurrent users
- Poor fit for multi-container horizontal scale
- No PostGIS spatial indexes
- Harder migration path for production

### Production

Use PostgreSQL + PostGIS.

Why:

- Better concurrency
- Spatial indexes
- ACID reliability
- Managed backups
- Better analytics queries
- Multi-worker safe

Migration needs:

- Add Alembic migrations.
- Replace SQLite-only migration logic in `init_db` with controlled migrations.
- Use PostGIS geometry columns for footprints later.
- Add connection pooling.

## Background Job Strategy

Heavy tasks should not run directly in request-response handlers under production load.

Move these to background jobs:

- Dataset inspection of large folders
- Metadata extraction from large rasters
- Preview generation
- Cloud detection/classification/segmentation
- Reconstruction
- Optimization
- Evaluation
- Confidence heatmap generation
- Export package creation

Recommended queue architecture:

```text
FastAPI request
  -> create job row
  -> enqueue job
  -> worker processes job
  -> write outputs to object storage
  -> update DB status
  -> frontend polls workflow endpoint or receives WebSocket/SSE updates
```

Queue options:

- Celery + Redis
- RQ + Redis
- Dramatiq + Redis/RabbitMQ
- Cloud Tasks / SQS if using cloud-native infrastructure

## Deployment Steps For Hackathon

1. Freeze the current working branch.
2. Verify `npm run build` passes.
3. Verify backend starts locally with `uvicorn app.main:app`.
4. Create production `.env` for backend.
5. Deploy backend container to Render/Railway/Fly/Cloud Run.
6. Configure backend CORS for Vercel frontend domain.
7. Upload demo datasets to backend persistent disk or object storage.
8. If using local-path registration, ensure backend container can see demo paths.
9. Deploy frontend to Vercel with `NEXT_PUBLIC_API_URL` pointing to backend.
10. Test full workflow from public Vercel URL.
11. Run demo once with fresh session and once with precomputed outputs.
12. Keep a fallback local Docker demo ready.

## Best Deployment Decision For This Project

For submission speed:

- Frontend on Vercel.
- Backend on Render/Railway/Fly/Cloud Run container.
- Demo data pre-seeded on backend persistent disk or object storage.
- SQLite acceptable only for short demo if there is one backend instance.

For real 500-user operation:

- Frontend on Vercel.
- Backend and workers on cloud containers.
- PostgreSQL/PostGIS.
- S3/GCS object storage.
- Redis/SQS queue.
- CDN for preview images and reports.
- No local path dependency.
