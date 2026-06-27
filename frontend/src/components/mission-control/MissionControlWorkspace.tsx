"use client";

import React, { useState } from "react";
import { MissionControlProfile } from "@/lib/types/mission-control";
import { WorkflowResponse, WorkflowStageDetail } from "@/lib/types/workflow";
import MissionControlStatusBar from "./MissionControlStatusBar";
import IntelligenceSummaryPanel from "./IntelligenceSummaryPanel";
import DatasetPanel from "./panels/DatasetPanel";
import GeospatialPanel from "./panels/GeospatialPanel";
import TemporalPanel from "./panels/TemporalPanel";
import CloudPanel from "./panels/CloudPanel";
import ReconstructionPanel from "./panels/ReconstructionPanel";
import ConfidencePanel from "./panels/ConfidencePanel";
import StatusFooter from "./panels/StatusFooter";
import WorkflowPipeline from "./WorkflowPipeline";
import WorkflowLogsPanel from "./WorkflowLogsPanel";
import StageDetailDrawer from "./StageDetailDrawer";
import { Shield, CheckCircle, XCircle } from "lucide-react";

interface MissionControlWorkspaceProps {
  profile: MissionControlProfile;
  workflow: WorkflowResponse | null;
  loadingWorkflow: boolean;
  onRefresh?: () => void;
}

export default function MissionControlWorkspace({ profile, workflow, loadingWorkflow }: MissionControlWorkspaceProps) {
  const { dataset, metadata, geospatial, location, status } = profile;
  const [selectedStage, setSelectedStage] = useState<WorkflowStageDetail | null>(null);

  // Audit checklist triggers
  const hasCoordinates = geospatial && geospatial.center.lat !== undefined && geospatial.center.lon !== undefined;
  const hasCrs = (geospatial && (geospatial.crs || geospatial.epsg)) || (metadata && (metadata.coordinate_system || metadata.epsg_code));
  const hasFootprint = geospatial && geospatial.footprint && geospatial.footprint.length > 0;
  const hasLocation = location && location.country !== undefined && location.country !== "Unknown";

  return (
    <div className="space-y-6 font-mono text-slate-100 select-none">
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
      <div className="border border-border bg-card/25 p-4 space-y-3 text-[10px] relative overflow-hidden rounded-sm">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
          AUDIT // GEOSPATIAL
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" />
          GEOSPATIAL INTELLIGENCE CORE SYSTEM AUDIT
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className={`flex items-center justify-between p-2.5 border rounded-sm transition-all duration-300 ${
            hasCoordinates 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Coordinates Identified</span>
            {hasCoordinates ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-sm transition-all duration-300 ${
            hasCrs 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">CRS Identified</span>
            {hasCrs ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-sm transition-all duration-300 ${
            hasFootprint 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Footprint Generated</span>
            {hasFootprint ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-sm transition-all duration-300 ${
            hasLocation 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Geographic Context Generated</span>
            {hasLocation ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>
        </div>
      </div>

      {/* 4. Outer Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Dataset + Geospatial) */}
        <div className="space-y-6 lg:col-span-1">
          <DatasetPanel 
            dataset={dataset} 
            metadata={metadata} 
            status={status.metadata} 
          />
          <GeospatialPanel 
            datasetId={dataset.dataset_id} 
            metadata={metadata} 
            geospatial={geospatial} 
            location={location} 
            status={{ geospatial: status.geospatial, location: status.location }} 
          />
        </div>

        {/* Right Column (Briefing + 2x2 grid of specific details) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Briefing summary screen */}
          <IntelligenceSummaryPanel 
            summary={profile.summary} 
            status={status} 
          />

          {/* 2x2 Sub-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TemporalPanel 
              datasetId={dataset.dataset_id} 
              temporal={profile.temporal || null} 
              temporalFusion={profile.temporal_fusion || null} 
              status={{ 
                temporal: status.temporal || "missing", 
                temporal_fusion: status.temporal_fusion || "missing" 
              }} 
            />
            <CloudPanel 
              datasetId={dataset.dataset_id} 
              cloud={profile.cloud || null} 
              status={status.cloud || "missing"} 
            />
            <ReconstructionPanel 
              datasetId={dataset.dataset_id} 
              reconstruction={profile.reconstruction || null} 
              status={status.reconstruction || "missing"} 
            />
            <ConfidencePanel 
              datasetId={dataset.dataset_id} 
              confidence={profile.confidence || null} 
              reliability={profile.reliability || null} 
              heatmap={profile.confidence_heatmap || null} 
              analytics={profile.confidence_analytics || null} 
              status={status.confidence || "missing"} 
            />
          </div>
        </div>
      </div>

      {/* 5. Operational Terminal Log Panel */}
      {workflow && workflow.logs && (
        <WorkflowLogsPanel logs={workflow.logs} />
      )}

      {/* 6. Status Footer */}
      <StatusFooter 
        sessionId={dataset.analysis_session_id} 
        timestamp={profile.timestamp} 
        isLocked={status.metadata === "available"} 
      />

      {/* 7. Slide-over details drawer for stages */}
      <StageDetailDrawer 
        stage={selectedStage} 
        onClose={() => setSelectedStage(null)} 
      />
    </div>
  );
}
