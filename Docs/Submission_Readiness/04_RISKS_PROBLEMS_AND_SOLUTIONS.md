# 04 Risks Problems And Solutions

## Purpose

This document lists the main problems that can affect the project during submission, demo, deployment, and production scaling. Each risk includes the practical solution.

## Risk 1: Large Dataset Uploads Are Not Production-Ready

### Problem

The current system registers datasets by backend-local path. That works locally, but it does not let a public Vercel frontend upload 5GB+ datasets into a backend container cleanly.

### Impact

- Public users cannot upload real scenes unless the backend already has the files.
- Demo data must be preloaded manually.
- Horizontal scaling becomes difficult because files are local to one backend machine.

### Solution

Add an upload subsystem with direct-to-object-storage uploads.

Implementation plan:

1. Create upload session API.
2. Generate presigned upload URLs.
3. Upload browser files directly to S3/GCS/R2/Azure Blob.
4. Store upload manifest in DB.
5. Trigger inspection after upload completion.
6. Replace `dataset_path` local assumption with a storage URI/object key.

### Demo Workaround

Preload demo data into the backend dataset directory or object storage. Do not perform 5GB live upload during judging.

## Risk 2: SQLite Is Not Suitable For 500 Concurrent Users

### Problem

SQLite can lock on writes and is not designed for multi-replica production deployment.

### Impact

- Failed writes under concurrent usage.
- Hard to run multiple backend replicas.
- Hard to manage backups and migrations.

### Solution

Move production database to PostgreSQL, preferably with PostGIS.

Implementation plan:

1. Add `psycopg` dependency.
2. Add Alembic migrations.
3. Configure `SQLALCHEMY_DATABASE_URL` for PostgreSQL.
4. Add indexes on IDs/status fields.
5. Move spatial footprint data toward PostGIS geometry over time.

### Demo Workaround

SQLite is acceptable for a single backend instance during judging, especially if outputs are precomputed.

## Risk 3: Heavy Processing Runs Inside Web Requests

### Problem

Some API calls run image processing directly and return only when processing is complete.

### Impact

- Timeout risk.
- Poor responsiveness.
- Multiple users can overload the backend.
- Hard to show accurate progress for long jobs.

### Solution

Introduce a job queue.

Recommended design:

```text
POST /pipeline/run
  -> validates request
  -> creates job
  -> returns quickly
worker
  -> processes job
  -> writes outputs
  -> updates DB
frontend
  -> polls workflow/job status
```

Queue options:

- Celery + Redis
- RQ + Redis
- Dramatiq + Redis
- Cloud SQS/Tasks if using cloud-native deployment

### Demo Workaround

Use small scenes for live execution and precomputed outputs for large scenes.

## Risk 4: Local File Paths Will Break In Distributed Deployment

### Problem

Many tables store local file paths. This is fine for a single machine but breaks when multiple containers or serverless systems are involved.

### Impact

- One backend replica may not find another replica's output.
- Files vanish on redeploy if not persisted.
- Frontend cannot directly access private local paths.

### Solution

Introduce a storage abstraction.

Recommended interface:

```text
StorageService.save(local_path, object_key)
StorageService.open(object_key)
StorageService.exists(object_key)
StorageService.get_signed_url(object_key)
StorageService.delete(object_key)
```

Supported backends:

- local filesystem for development
- S3-compatible storage for production

### Demo Workaround

Run a single backend instance with persistent disk and stable paths.

## Risk 5: Temporal Providers Are Not Fully Production-Integrated

### Problem

Temporal provider framework exists, but production access to Google Earth Engine or real historical caches needs authentication, quotas, and real scene retrieval.

### Impact

- Temporal references may be synthetic or metadata-only.
- Scientific credibility can suffer if judges inspect provider realism deeply.

### Solution

Implement a real provider mode.

Steps:

1. Add provider credentials and configuration.
2. Implement authenticated GEE query or a curated local historical cache.
3. Store real reference thumbnails and metadata.
4. Validate spatial overlap and cloud cover.
5. Cache results per location/date window.

### Demo Workaround

Use curated historical reference scenes and clearly frame them as cached reference imagery for the target location.

## Risk 6: Reconstruction Quality May Not Match Product Story

### Problem

The platform has reconstruction, optimization, and evaluation services, but final scientific acceptance depends on actual visual quality and preservation of geospatial structures.

### Impact

- Judges may focus on whether reconstructed imagery looks plausible.
- Poor reconstruction can weaken the solution despite strong platform architecture.

### Solution

Use a staged model strategy:

1. Baseline: OpenCV inpainting or temporal-guided interpolation.
2. Improved: patch-based reconstruction using historical references.
3. Final: lightweight PyTorch model or diffusion/GAN if time allows.
4. Always show confidence maps and explainability, not only output image.

### Demo Workaround

Choose demo scenes where the baseline model performs acceptably. Use comparison views and confidence heatmaps to show honesty about uncertainty.

## Risk 7: Missing Or Broken Output Assets

### Problem

A user can open a subpage before required pipeline outputs exist.

### Impact

- Broken images.
- 404s.
- Confusing user experience.

### Current Mitigation

The frontend has been refined to guide users back to required workflow steps and avoid hard crashes where possible.

### Additional Solution

Backend should return structured readiness status for every output:

```json
{
  "available": false,
  "required_step": "Run Cloud Pipeline",
  "reason": "Cloud segmentation has not been generated"
}
```

Frontend should use that readiness object instead of relying on failed image loads.

## Risk 8: API/Frontend Contract Drift

### Problem

The backend and frontend evolve quickly. TypeScript interfaces can drift from Pydantic schemas.

### Impact

- Runtime crashes.
- Missing fields.
- Broken pages after backend changes.

### Solution

1. Generate OpenAPI schema from FastAPI.
2. Generate TypeScript clients from OpenAPI.
3. Add integration tests for all API clients.
4. Add CI check that frontend build passes after backend schema changes.

### Demo Workaround

Run `npm run build` and manually click the full workflow before submission.

## Risk 9: Docker Image May Lack GIS System Libraries In Production

### Problem

Rasterio and geospatial dependencies often require GDAL-compatible native libraries. The current backend Dockerfile uses `python:3.12-slim` and installs build tools, but production image reliability may depend on wheels and platform compatibility.

### Impact

- Docker build can fail on different platforms.
- Rasterio import errors can appear in deployment.
- Runtime image may be larger/slower than expected.

### Solution

1. Pin Python and dependency versions.
2. Use a known geospatial base image if needed.
3. Test backend Docker build in the target cloud environment.
4. Add health check that imports rasterio, cv2, numpy, and pyproj.
5. Consider multi-stage builds.

### Demo Workaround

Build the production container once before presentation and do not rely on fresh dependency resolution during judging.

## Risk 10: Backend CORS Misconfiguration

### Problem

Frontend on Vercel will call a backend on a different domain.

### Impact

- API requests blocked by browser.
- UI appears broken even though backend is healthy.

### Solution

Set backend `BACKEND_CORS_ORIGINS` to include all frontend domains:

```env
BACKEND_CORS_ORIGINS=["https://your-app.vercel.app","https://your-custom-domain.com"]
```

Also ensure frontend `NEXT_PUBLIC_API_URL` points to the backend HTTPS URL.

## Risk 11: Demo Data Larger Than Hosting Disk

### Problem

The demo dataset folder can exceed 5GB, which may exceed free-tier persistent disk limits or make deployment slow.

### Impact

- Deployment fails or becomes too slow.
- Backend disk fills during processing.
- Generated artifacts cannot be written.

### Solution

Use object storage for full-resolution data and keep only working chunks/previews on local scratch.

Demo-specific plan:

- Store one small demo scene inside backend persistent disk.
- Store large scenes in object storage.
- Precompute outputs for large scenes.
- Show large-scene results through CDN previews and reports.

## Risk 12: No Automated End-To-End CI

### Problem

The repo has many phase verification scripts, but not a single production CI pipeline that runs backend checks, frontend build, and integration smoke tests together.

### Impact

- Last-minute breakages can slip in.
- Documentation and code can drift.

### Solution

Add CI steps:

```text
backend: install deps -> import app -> run targeted tests
frontend: npm ci -> npm run build
smoke: start backend -> call /health and /api/v1/status
```

## Risk 13: Export Package Generation Can Be Slow

### Problem

ZIP/PDF/export generation may collect many large outputs.

### Impact

- Slow request response.
- High disk usage.
- Timeout risk.

### Solution

Run package generation as a background job. Store package in object storage. Return signed download URL after completion.

## Risk 14: Security And Multi-User Ownership Not Implemented

### Problem

The current app is hackathon-style and does not appear to implement authentication, user ownership, or per-user authorization.

### Impact

- Public deployment can expose all sessions/datasets.
- Users can delete or view other users' work.

### Solution

For real public deployment:

- Add authentication.
- Add user_id to sessions/datasets/outputs.
- Enforce ownership in repositories/services.
- Use signed URLs for private outputs.
- Rate-limit expensive endpoints.

### Demo Workaround

Use non-sensitive demo datasets only and treat public deployment as read/demo mode.

## Risk 15: Rate Limits And Abuse

### Problem

A public demo can be hit by many users repeatedly running heavy jobs.

### Impact

- Cost spike.
- Queue overload.
- Backend becomes slow.

### Solution

- Add per-IP/user rate limits.
- Limit concurrent jobs per session/user.
- Add queue backpressure.
- Add demo mode where expensive pipelines use cached outputs.
- Require auth for full processing.

## Critical Submission Checklist

Before final submission:

- Frontend build passes.
- Backend starts and `/health` passes.
- Full demo workflow has been rehearsed.
- One small live dataset works end-to-end.
- Large dataset outputs are precomputed.
- Vercel frontend points to deployed backend.
- Backend CORS allows Vercel URL.
- Demo data is available in backend/object storage.
- Export/report download paths work.
- Fallback local Docker demo is ready.
- README or submission docs explain architecture and limitations honestly.

## Most Important Practical Advice

Do not make the final judging demo depend on uploading or processing a 5GB dataset live. Use pre-seeded data and precomputed outputs for the large scenes, then run one small scene live to prove the workflow is real.
