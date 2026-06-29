"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MissionControlProfile } from "@/lib/types/mission-control";
import { WorkflowResponse, WorkflowStageDetail, WorkflowValidationResponse } from "@/lib/types/workflow";
import { getWorkflowValidation } from "@/lib/workflow-validation-api";
import MissionControlStatusBar from "./MissionControlStatusBar";
import WorkflowPipeline from "./WorkflowPipeline";
import WorkflowLogsPanel from "./WorkflowLogsPanel";
import StageDetailDrawer from "./StageDetailDrawer";
import {
  Shield,
  CheckCircle,
  XCircle,
  Database,
  Globe,
  Clock,
  Cloud,
  Cpu,
  Activity,
  Loader2
} from "lucide-react";

interface MissionControlWorkspaceProps {
  profile: MissionControlProfile;
  workflow: WorkflowResponse | null;
  loadingWorkflow: boolean;
  onRefresh?: () => void;
}

export default function MissionControlWorkspace({ profile, workflow }: MissionControlWorkspaceProps) {
  const { dataset, geospatial, location, status } = profile;
  const [selectedStage, setSelectedStage] = useState<WorkflowStageDetail | null>(null);

  const [auditResult, setAuditResult] = useState<WorkflowValidationResponse | null>(null);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isAuditExpanded, setIsAuditExpanded] = useState<boolean>(false);

  const handleRunSystemAudit = async () => {
    if (!workflow?.session_id) return;
    setLoadingAudit(true);
    setAuditError(null);
    try {
      const data = await getWorkflowValidation(workflow.session_id);
      if (data) {
        setAuditResult(data);
      } else {
        setAuditError("Failed to consolidate system audit details from the platform validation core.");
      }
    } catch (err: any) {
      console.error(err);
      setAuditError("Network disconnect or platform error during workflow audit.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const hasCoordinates = geospatial && geospatial.center.lat !== undefined && geospatial.center.lon !== undefined;
  const hasCrs = (geospatial && (geospatial.crs || geospatial.epsg)) || (profile.metadata && (profile.metadata.coordinate_system || profile.metadata.epsg_code));
  const hasFootprint = geospatial && geospatial.footprint && geospatial.footprint.length > 0;
  const hasLocation = location && location.country !== undefined && location.country !== "Unknown";

  return (
    <div className="space-y-6 font-mono text-slate-100 select-none relative">
      
      {/* 1. Readiness status indicators matrix */}
      <MissionControlStatusBar status={status} />

      {/* 2. Workflow Monitoring Pipeline */}
      {workflow && (
        <WorkflowPipeline
          stages={workflow.stages}
          overallProgress={workflow.overall_progress}
          totalTime={workflow.total_processing_time_ms}
          health={workflow.session_health}
          onStageClick={(stage) => setSelectedStage(stage)}
        />
      )}

      {/* 3. Geospatial & Workflow End-to-End System Audit Console */}
      <div className="border bg-card/25 p-4 space-y-4 text-[10px] relative overflow-hidden rounded-lg border-border font-mono">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
          SYSTEM AUDIT // CONTROL
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2.5">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-primary" />
            GEOSPATIAL & WORKFLOW END-TO-END SYSTEM AUDIT
          </div>
          <button
            onClick={() => {
              const newExpanded = !isAuditExpanded;
              setIsAuditExpanded(newExpanded);
              if (newExpanded && !auditResult) {
                handleRunSystemAudit();
              }
            }}
            className="text-xs text-primary hover:underline flex items-center gap-1 uppercase font-bold tracking-widest"
          >
            {isAuditExpanded ? "Collapse Audit" : "Expand Audit Console"}
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${
            hasCoordinates 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide font-bold">Coordinates</span>
            {hasCoordinates ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${
            hasCrs 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide font-bold">CRS Georeference</span>
            {hasCrs ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${
            hasFootprint 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide font-bold">Polygon Footprint</span>
            {hasFootprint ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${
            hasLocation 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide font-bold">Geographic Location</span>
            {hasLocation ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>
        </div>

        {/* Audit Details Panel (Expanded) */}
        {isAuditExpanded && (
          <div className="border-t border-border/40 pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest">// RUNNING DETAILED END-TO-END DIAGNOSTIC TRACE</span>
              <button
                disabled={loadingAudit}
                onClick={handleRunSystemAudit}
                className="py-1 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary transition-all text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              >
                {loadingAudit ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running Trace...
                  </>
                ) : (
                  "Refresh System Audit"
                )}
              </button>
            </div>

            {auditError && (
              <div className="border border-red-500/30 bg-red-500/5 p-3 text-red-400 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{auditError}</span>
              </div>
            )}

            {auditResult && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                {/* 1. Upload */}
                <div className={`p-3 border rounded-lg space-y-2.5 transition-all duration-300 ${
                  auditResult.upload.valid ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100" : "bg-red-950/20 border-red-500/20 text-red-100"
                }`}>
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="font-bold text-[9px] uppercase tracking-wider">01. Upload Workflows</span>
                    {auditResult.upload.valid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <p className="text-[9.5px] leading-relaxed text-muted-foreground uppercase">{auditResult.upload.message}</p>
                  {auditResult.upload.details && Object.keys(auditResult.upload.details).length > 0 && (
                    <div className="text-[8px] space-y-1 font-normal font-mono border-t border-border/20 pt-1 text-slate-400">
                      <div>DS ID: {String(auditResult.upload.details.dataset_id || "N/A").substring(0, 8)}...</div>
                      <div>VALIDATION: {auditResult.upload.details.validation_status || "N/A"}</div>
                      <div>READABILITY: {auditResult.upload.details.readability_check || "N/A"}</div>
                      <div>FILES COUNT: {auditResult.upload.details.total_files || 0}</div>
                    </div>
                  )}
                </div>

                {/* 2. Metadata */}
                <div className={`p-3 border rounded-lg space-y-2.5 transition-all duration-300 ${
                  auditResult.metadata.valid ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100" : "bg-red-950/20 border-red-500/20 text-red-100"
                }`}>
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="font-bold text-[9px] uppercase tracking-wider">02. Metadata Intel</span>
                    {auditResult.metadata.valid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <p className="text-[9.5px] leading-relaxed text-muted-foreground uppercase">{auditResult.metadata.message}</p>
                  {auditResult.metadata.details && Object.keys(auditResult.metadata.details).length > 0 && (
                    <div className="text-[8px] space-y-1 font-normal font-mono border-t border-border/20 pt-1 text-slate-400">
                      <div>DIMENSIONS: {auditResult.metadata.details.dimensions || "N/A"}</div>
                      <div>EPSG: {auditResult.metadata.details.epsg || "N/A"}</div>
                      <div>REGION: {auditResult.metadata.details.district || "N/A"}, {auditResult.metadata.details.state || "N/A"}</div>
                      <div>LOCATION CHECK: {auditResult.metadata.details.location_context || "N/A"}</div>
                    </div>
                  )}
                </div>

                {/* 3. Temporal */}
                <div className={`p-3 border rounded-lg space-y-2.5 transition-all duration-300 ${
                  auditResult.temporal.valid ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100" : "bg-red-950/20 border-red-500/20 text-red-100"
                }`}>
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="font-bold text-[9px] uppercase tracking-wider">03. Temporal Stack</span>
                    {auditResult.temporal.valid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <p className="text-[9.5px] leading-relaxed text-muted-foreground uppercase">{auditResult.temporal.message}</p>
                  {auditResult.temporal.details && Object.keys(auditResult.temporal.details).length > 0 && (
                    <div className="text-[8px] space-y-1 font-normal font-mono border-t border-border/20 pt-1 text-slate-400">
                      <div>PROVIDER: {auditResult.temporal.details.provider_used || "N/A"}</div>
                      <div>CANDIDATES: {auditResult.temporal.details.candidate_count || 0}</div>
                      <div>SELECTED: {auditResult.temporal.details.selected_count || 0}</div>
                      <div>AVG CLOUD COVER: {auditResult.temporal.details.average_cloud_cover !== undefined ? `${auditResult.temporal.details.average_cloud_cover}%` : "N/A"}</div>
                    </div>
                  )}
                </div>

                {/* 4. Reconstruction */}
                <div className={`p-3 border rounded-lg space-y-2.5 transition-all duration-300 ${
                  auditResult.reconstruction.valid ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100" : "bg-red-950/20 border-red-500/20 text-red-100"
                }`}>
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="font-bold text-[9px] uppercase tracking-wider">04. AI Reconstruction</span>
                    {auditResult.reconstruction.valid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <p className="text-[9.5px] leading-relaxed text-muted-foreground uppercase">{auditResult.reconstruction.message}</p>
                  {auditResult.reconstruction.details && Object.keys(auditResult.reconstruction.details).length > 0 && (
                    <div className="text-[8px] space-y-1 font-normal font-mono border-t border-border/20 pt-1 text-slate-400">
                      <div>STRATEGY: {auditResult.reconstruction.details.strategy || "N/A"}</div>
                      <div>TIFF ASSET: {auditResult.reconstruction.details.reconstruction_tif || "N/A"}</div>
                      <div>CONF SCORE: {auditResult.reconstruction.details.mean_confidence !== undefined ? `${auditResult.reconstruction.details.mean_confidence}%` : "N/A"}</div>
                      <div>TIER: {auditResult.reconstruction.details.reliability_tier || "N/A"}</div>
                    </div>
                  )}
                </div>

                {/* 5. Export */}
                <div className={`p-3 border rounded-lg space-y-2.5 transition-all duration-300 ${
                  auditResult.export.valid ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100" : "bg-red-950/20 border-red-500/20 text-red-100"
                }`}>
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="font-bold text-[9px] uppercase tracking-wider">05. Export Subsystem</span>
                    {auditResult.export.valid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <p className="text-[9.5px] leading-relaxed text-muted-foreground uppercase">{auditResult.export.message}</p>
                  {auditResult.export.details && Object.keys(auditResult.export.details).length > 0 && (
                    <div className="text-[8px] space-y-1 font-normal font-mono border-t border-border/20 pt-1 text-slate-400">
                      <div>RASTER: {auditResult.export.details.raster_export_valid ? "READY" : "NOT_READY"}</div>
                      <div>PACKAGE: {auditResult.export.details.package_export_valid ? "READY" : "NOT_READY"}</div>
                      <div>REPORTS COUNT: {auditResult.export.details.available_reports ? auditResult.export.details.available_reports.length : 0}</div>
                      <div>ASSETS COUNT: {auditResult.export.details.package_assets ? auditResult.export.details.package_assets.length : 0}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Subsystems Central Navigation Hub Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Dataset Registry Telemetry */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 font-mono">
              <Database className="w-4 h-4 text-primary" />
              Dataset Registry Telemetry
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Inspect registered LISS-IV scenes, file paths, spectral bands, and ingestion statistics.
            </p>
          </div>
          <Link
            href="/datasets"
            className="inline-flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Open Dataset Inventory
          </Link>
        </div>

        {/* Card 2: Geospatial Reference */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 font-mono">
              <Globe className="w-4 h-4 text-primary" />
              Geospatial Reference
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Project centroid coordinates, calculate bounding box footprints, and verify Coordinate Reference Systems.
            </p>
          </div>
          <Link
            href={dataset?.dataset_id ? `/mission-control/geospatial?dataset=${dataset.dataset_id}` : "/mission-control/geospatial"}
            className="inline-flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Open Geospatial Map
          </Link>
        </div>

        {/* Card 3: Temporal Intelligence */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 font-mono">
              <Clock className="w-4 h-4 text-primary" />
              Temporal Intelligence
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Discover and select clean multi-temporal reference scenes from Google Earth Engine archives.
            </p>
          </div>
          <Link
            href={dataset?.dataset_id ? `/mission-control/temporal?dataset=${dataset.dataset_id}` : "/mission-control/temporal"}
            className="inline-flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Open Temporal Stack
          </Link>
        </div>

        {/* Card 4: Cloud Intelligence */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 font-mono">
              <Cloud className="w-4 h-4 text-primary" />
              Cloud Intelligence
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Run pixel-level cloud detection, classification, cloud shadow analysis, and mask generation.
            </p>
          </div>
          <Link
            href={dataset?.dataset_id ? `/datasets/${dataset.dataset_id}/cloud` : "/datasets"}
            className="inline-flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Open Cloud Console
          </Link>
        </div>

        {/* Card 5: AI Reconstruction */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 font-mono">
              <Cpu className="w-4 h-4 text-primary" />
              AI Reconstruction
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Run multi-temporal guided inpainting algorithms to remove clouds and reconstruct occluded pixels.
            </p>
          </div>
          <Link
            href={dataset?.dataset_id ? `/datasets/${dataset.dataset_id}/reconstruction` : "/datasets"}
            className="inline-flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Open Reconstruction Console
          </Link>
        </div>

        {/* Card 6: Confidence Intelligence */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-primary" />
              Confidence Intelligence
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate pixel-level reconstruction confidence maps, compute reliability scorecards, and estimate errors.
            </p>
          </div>
          <Link
            href={dataset?.dataset_id ? `/datasets/${dataset.dataset_id}/confidence` : "/datasets"}
            className="inline-flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Open Confidence Console
          </Link>
        </div>

      </div>

      {/* 5. Operational Terminal Log Panel */}
      {workflow && workflow.logs && (
        <WorkflowLogsPanel logs={workflow.logs} />
      )}

      {/* 6. Slide-over details drawer for stages */}
      <StageDetailDrawer 
        stage={selectedStage} 
        onClose={() => setSelectedStage(null)} 
      />
    </div>
  );
}
