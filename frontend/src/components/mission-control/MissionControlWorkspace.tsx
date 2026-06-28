"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MissionControlProfile } from "@/lib/types/mission-control";
import { WorkflowResponse, WorkflowStageDetail } from "@/lib/types/workflow";
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
  Activity
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

      {/* 3. Geospatial Intelligence System Audit Checklist */}
      <div className="border bg-card/25 p-4 space-y-3 text-[10px] relative overflow-hidden rounded-lg border-border">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
          AUDIT // GEOSPATIAL
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" />
          GEOSPATIAL INTELLIGENCE CORE SYSTEM AUDIT
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${
            hasCoordinates 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Coordinates Identified</span>
            {hasCoordinates ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${
            hasCrs 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">CRS Identified</span>
            {hasCrs ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${
            hasFootprint 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Footprint Generated</span>
            {hasFootprint ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${
            hasLocation 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Geographic Context Generated</span>
            {hasLocation ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>
        </div>
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
