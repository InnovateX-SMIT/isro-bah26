# 05 Next Phase Execution Plan

## Purpose

This document explains how to continue development after the current UI/UX refinement branch and how to complete the remaining production and submission phases without destabilizing the working platform.

## Current Best Continuation Principle

Do not rewrite the architecture. The project already has a strong modular structure:

```text
frontend route -> frontend API client -> FastAPI router -> service -> repository -> model/database -> file artifacts
```

Continue by strengthening missing production capabilities around that structure.

## Immediate Priorities

### Priority 1: Freeze Current Working UI

The latest frontend pass made the workflow more professional and consistent. Before adding new features:

1. Run `npm run build`.
2. Click through:
   - Data Inventory
   - Inspection
   - Viewer
   - Cloud
   - Temporal
   - Reconstruction
   - Confidence
   - Comparison
   - Export
3. Record screenshots for submission.
4. Do not do broad UI refactors until after submission.

### Priority 2: Create A Demo Dataset Strategy

The final demo should have two dataset categories.

#### Small Live Dataset

Use for live execution during judging.

Purpose:

- Prove the pipeline works.
- Keep processing time short.
- Avoid timeout risk.

Requirements:

- Small enough for fast preview/cloud/reconstruction.
- Has expected LISS-IV bands.
- Has readable metadata.
- Produces visually understandable outputs.

#### Large Precomputed Dataset

Use for impressive final visuals.

Purpose:

- Show realistic scale.
- Avoid live 5GB processing.
- Demonstrate final outputs, confidence, reports, and comparison views.

Requirements:

- Pre-run all pipelines.
- Store generated previews, masks, reconstruction, confidence overlays, reports.
- Keep dataset registration stable.
- Make it one-click visible in the UI.

### Priority 3: Add Upload And Object Storage

This is the biggest product gap for real deployment.

Implementation stages:

1. Add `StorageService` abstraction.
2. Keep local filesystem implementation for dev.
3. Add S3-compatible implementation for production.
4. Add upload session model/table.
5. Add presigned URL endpoint.
6. Add frontend upload workflow.
7. Add upload completion validation.
8. Trigger inspection after upload.

Minimum table shape:

```text
upload_sessions
  upload_id
  session_id
  dataset_id
  status
  storage_provider
  bucket
  prefix
  file_manifest_json
  total_size_bytes
  created_at
  updated_at
```

### Priority 4: Move Heavy Work To Background Jobs

Current sequential frontend calls are okay for local demos, but production needs jobs.

Recommended first step:

- Add a simple jobs table.
- Add worker process.
- Make cloud/reconstruction/confidence/export endpoints enqueue jobs.
- Keep old direct mode behind a development flag if needed.

Minimum table shape:

```text
processing_jobs
  job_id
  session_id
  dataset_id
  job_type
  status
  progress_percent
  current_stage
  error_message
  input_json
  output_json
  created_at
  started_at
  completed_at
```

### Priority 5: PostgreSQL/PostGIS Migration

For real deployment:

1. Add Alembic.
2. Generate initial migration from current models.
3. Test migration into PostgreSQL.
4. Add indexes.
5. Replace SQLite-specific migration logic in `init_db`.
6. Keep SQLite only for local dev.

Do not rush this before submission unless needed. It is important, but risky if done too late.

## Remaining Phase Plan

## Phase A: Stabilization Before Submission

Goal: no regressions.

Tasks:

- Build frontend.
- Start backend.
- Run smoke tests.
- Verify demo dataset registration.
- Verify complete inspection pipeline.
- Verify cloud pipeline on small dataset.
- Verify temporal context generation or cached context.
- Verify reconstruction preview/output.
- Verify confidence heatmap/report.
- Verify comparison pages.
- Verify export/report/package downloads.
- Capture screenshots.

Deliverables:

- Working public demo or local Docker fallback.
- Submission docs.
- Screenshots/video.

## Phase B: Deployment Readiness

Goal: make public deployment reliable.

Tasks:

- Deploy frontend to Vercel.
- Deploy backend container to a persistent hosting platform.
- Configure HTTPS API domain.
- Configure CORS.
- Preload demo data.
- Set environment variables.
- Add health checks.
- Test complete flow from Vercel URL.

Deliverables:

- Public frontend URL.
- Public backend health endpoint.
- Public demo walkthrough.

## Phase C: Storage Modernization

Goal: stop depending on local-only dataset paths.

Tasks:

- Add object storage service.
- Store generated artifacts by object key.
- Add signed URL generation.
- Migrate existing file path outputs gradually.
- Keep local storage backend for development.

Deliverables:

- Object-storage-backed previews and exports.
- Storage provider switch by environment variable.

## Phase D: Upload Workflow

Goal: allow real users to upload data.

Tasks:

- Add upload session endpoints.
- Add direct upload flow.
- Add dataset manifest validation.
- Add UI uploader with progress.
- Add failed upload recovery.
- Add file size/type validation.

Deliverables:

- Browser upload for custom datasets.
- Large file support through object storage.

## Phase E: Processing Queue

Goal: make backend responsive under load.

Tasks:

- Add Redis or cloud queue.
- Add worker service.
- Add job table.
- Move heavy endpoints to queue.
- Add retry strategy.
- Add job progress updates.
- Add frontend polling from workflow/job endpoint.

Deliverables:

- Non-blocking cloud/reconstruction/confidence/export pipelines.
- Better multi-user stability.

## Phase F: Reconstruction Quality Hardening

Goal: improve scientific credibility.

Tasks:

- Benchmark current reconstruction outputs.
- Add baseline metrics per scene.
- Improve temporal-guided reconstruction.
- Improve edge preservation and spectral consistency.
- Add optional lightweight PyTorch model if feasible.
- Validate with withheld cloud-free references where possible.

Deliverables:

- Better visual output.
- Clear confidence explanation.
- Quantitative quality metrics.

## Phase G: Production Observability

Goal: know what breaks before users report it.

Tasks:

- Add structured logs.
- Add request timing middleware.
- Add job duration metrics.
- Add Sentry or similar error tracking.
- Add dashboard for queue depth and job failures.
- Add storage usage monitoring.

Deliverables:

- Operational monitoring.
- Faster debugging.

## Recommended Deployment Path

### Fastest Hackathon Path

1. Keep current code stable.
2. Use Vercel for frontend.
3. Use one container host for backend.
4. Use one persistent disk for demo data if object storage is not ready.
5. Precompute large outputs.
6. Demo using a mix of live small processing and cached large results.

### Best Production Path

1. Vercel frontend.
2. Containerized API service.
3. Separate worker service.
4. PostgreSQL/PostGIS.
5. S3/GCS/R2 object storage.
6. Redis/SQS queue.
7. CDN for previews/reports.
8. Auth and rate limiting.
9. Observability and load testing.

## Suggested Work Order After This Documentation

### Day 1: Demo Hardening

- Verify all current pages.
- Fix any broken image URLs.
- Prepare one small and one large demo dataset.
- Pre-run all pipelines.
- Generate screenshots.

### Day 2: Deployment

- Deploy backend.
- Deploy frontend to Vercel.
- Configure env vars and CORS.
- Test workflow from public URL.
- Prepare fallback local Docker run.

### Day 3: Presentation And Polish

- Record short demo video.
- Prepare architecture slide.
- Prepare problem-solution slide.
- Prepare workflow slide.
- Prepare limitations/future-work slide.
- Rehearse judge walkthrough.

## Judge Walkthrough Script

1. Open the platform landing page.
2. Show Data Inventory.
3. Open a registered LISS-IV dataset.
4. Run or show Complete Inspection.
5. Open Scene Overview and RGB Composite.
6. Run or show Cloud Intelligence pipeline.
7. Open cloud detection/classification/masks.
8. Show Temporal Intelligence and reference stack.
9. Run or show AI Reconstruction.
10. Open optimized output and quality scorecard.
11. Run or show Confidence Intelligence.
12. Open heatmap and reliability map.
13. Open Comparison workspace.
14. Show Export/Report package.
15. Explain deployment and production scaling plan.

## What To Avoid Before Submission

- Do not rewrite the backend architecture.
- Do not migrate database at the last minute unless absolutely necessary.
- Do not make live demo depend on large uploads.
- Do not add unaudited dependencies hours before submission.
- Do not break existing frontend routes with another broad redesign.
- Do not store large datasets in Git or frontend public assets.
- Do not expose backend secrets in frontend environment variables.

## What To Say About Limitations

Be honest and strong:

- The current architecture is built to support production-scale storage and jobs, but local mode still uses filesystem paths.
- For public deployment, raw and generated rasters should move to object storage.
- For 500-user operation, processing should move to background workers and PostgreSQL/PostGIS.
- The platform already separates workflow stages clearly, which makes those upgrades straightforward.

This makes the project look thoughtful rather than incomplete.

## Final Success Criteria

The project is submission-ready when:

- A judge can understand the workflow without guidance.
- The UI does not show backend exceptions for missing data.
- A small dataset can run through the core pipeline live.
- A large dataset can show impressive precomputed results.
- Export/report functionality is visible.
- Deployment strategy is clearly documented.
- Scaling strategy for 500 users is credible.
- Remaining work is framed as production hardening, not missing architecture.
