"use client";

import React, { useState, useEffect } from "react";
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
import ExportPanel from "./panels/ExportPanel";
import StatusFooter from "./panels/StatusFooter";
import WorkflowPipeline from "./WorkflowPipeline";
import WorkflowLogsPanel from "./WorkflowLogsPanel";
import StageDetailDrawer from "./StageDetailDrawer";
import {
  Shield,
  CheckCircle,
  XCircle,
  Maximize2,
  Minimize2,
  Star,
  Search,
  X,
  History,
  Info,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface MissionControlWorkspaceProps {
  profile: MissionControlProfile;
  workflow: WorkflowResponse | null;
  loadingWorkflow: boolean;
  onRefresh?: () => void;
}

interface NotificationToast {
  id: string;
  type: "info" | "warning" | "success" | "error";
  message: string;
  time: string;
}

export default function MissionControlWorkspace({ profile, workflow, loadingWorkflow }: MissionControlWorkspaceProps) {
  const { dataset, metadata, geospatial, location, status } = profile;
  const [selectedStage, setSelectedStage] = useState<WorkflowStageDetail | null>(null);
  
  // Search & Highlights
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.toLowerCase();

  // Collapsible panels state stored in localStorage
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("isro_workspace_collapsed");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Favorite datasets stored in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("isro_favorite_datasets");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Recent Sessions list
  const [recentSessions, setRecentSessions] = useState<string[]>([]);

  // Notifications feed
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionList = localStorage.getItem("isro_recent_sessions");
      let list: string[] = sessionList ? JSON.parse(sessionList) : [];
      if (dataset.analysis_session_id && !list.includes(dataset.analysis_session_id)) {
        list = [dataset.analysis_session_id, ...list].slice(0, 5);
        localStorage.setItem("isro_recent_sessions", JSON.stringify(list));
      }
      setRecentSessions(list);
    }
  }, [dataset.analysis_session_id]);

  useEffect(() => {
    const initialToasts: NotificationToast[] = [
      { id: "toast-1", type: "info", message: "Satellite Telemetry Console Link: ACTIVE.", time: "JUST NOW" },
    ];
    if (status.metadata === "available") {
      initialToasts.push({ id: "toast-2", type: "success", message: "Registry verified. LISS-IV band metadata intact.", time: "1m ago" });
    }
    if (status.reconstruction === "available") {
      initialToasts.push({ id: "toast-3", type: "success", message: "Inpainting framework resolved: reconstructed composite ready.", time: "2m ago" });
    }
    if (workflow?.session_health === "WARNING") {
      initialToasts.push({ id: "toast-4", type: "warning", message: "Workflow warning: Dynamic telemetry queue warning.", time: "5s ago" });
    }
    setNotifications(initialToasts);
  }, [status, workflow]);

  const togglePanel = (key: string) => {
    const next = { ...collapsed, [key]: !collapsed[key] };
    setCollapsed(next);
    localStorage.setItem("isro_workspace_collapsed", JSON.stringify(next));
  };

  const collapseAll = () => {
    const next = {
      dataset: true,
      geospatial: true,
      summary: true,
      temporal: true,
      cloud: true,
      reconstruction: true,
      confidence: true,
    };
    setCollapsed(next);
    localStorage.setItem("isro_workspace_collapsed", JSON.stringify(next));
  };

  const restoreAll = () => {
    setCollapsed({});
    localStorage.setItem("isro_workspace_collapsed", JSON.stringify({}));
  };

  const isFavorite = favorites.includes(dataset.dataset_id);

  const toggleFavorite = () => {
    const next = isFavorite
      ? favorites.filter(id => id !== dataset.dataset_id)
      : [...favorites, dataset.dataset_id];
    setFavorites(next);
    localStorage.setItem("isro_favorite_datasets", JSON.stringify(next));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Panel highlight checker based on keywords search
  const checkHighlight = (panelKey: string, keywords: string[]) => {
    if (!query) return false;
    return keywords.some(k => k.toLowerCase().includes(query) || query.includes(k.toLowerCase()));
  };

  const hasCoordinates = geospatial && geospatial.center.lat !== undefined && geospatial.center.lon !== undefined;
  const hasCrs = (geospatial && (geospatial.crs || geospatial.epsg)) || (metadata && (metadata.coordinate_system || metadata.epsg_code));
  const hasFootprint = geospatial && geospatial.footprint && geospatial.footprint.length > 0;
  const hasLocation = location && location.country !== undefined && location.country !== "Unknown";

  const getToastIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case "info":
      default:
        return <Info className="w-3.5 h-3.5 text-primary shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 font-mono text-slate-100 select-none relative">
      
      {/* A. Dynamic Notification Toasts Panel Overlay */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-[320px] w-full">
          {notifications.map((toast) => (
            <div
              key={toast.id}
              className={`p-3 bg-black/90 border rounded-sm flex items-start justify-between gap-3 shadow-[0_4px_15px_-2px_rgba(0,0,0,0.5)] transition-all duration-300 ${
                toast.type === "success" ? "border-emerald-500/35" : toast.type === "warning" ? "border-amber-500/35" : "border-primary/35"
              }`}
            >
              <div className="flex gap-2 items-start">
                {getToastIcon(toast.type)}
                <div className="space-y-0.5">
                  <p className="text-[9px] font-semibold text-slate-100 uppercase tracking-wide leading-tight">
                    {toast.message}
                  </p>
                  <span className="text-[7.5px] text-muted-foreground uppercase">{toast.time}</span>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(toast.id)}
                className="text-muted-foreground hover:text-slate-200 transition-colors p-0.5"
                aria-label="Dismiss alert"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* B. Controls Header Bar: Search, Customizations & Favorites */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card/15 border border-border p-4 rounded-sm">
        
        {/* Left: operator session hub */}
        <div className="flex flex-wrap items-center gap-3.5 text-[9.5px]">
          <div className="flex items-center gap-2 border border-border/50 px-2.5 py-1.5 bg-background/25">
            <button
              onClick={toggleFavorite}
              className={`transition-all hover:scale-110 flex items-center gap-1 ${isFavorite ? "text-amber-400 font-bold" : "text-muted-foreground"}`}
              title={isFavorite ? "Remove dataset from favorites" : "Favorite this dataset"}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="uppercase">{isFavorite ? "FAVORITE LOCK" : "FAVORITE"}</span>
            </button>
          </div>

          {recentSessions.length > 0 && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <History className="w-3.5 h-3.5" />
              <span className="uppercase">RECENTS:</span>
              <div className="flex gap-1">
                {recentSessions.slice(0, 3).map((sId) => (
                  <span key={sId} className="px-1.5 py-0.5 border border-border/30 bg-background/30 text-[8px] text-slate-300 rounded-sm">
                    {sId.slice(0, 6)}...
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: filter inputs & layout modifiers */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center justify-end">
          {/* Global filter */}
          <div className="relative flex items-center w-full sm:w-[220px]">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="SEARCH TELEMETRY..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-[9.5px] bg-black/45 border border-border text-foreground font-mono uppercase tracking-wide focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
            />
          </div>

          {/* Collapsible layout controls */}
          <div className="flex border border-border rounded-sm overflow-hidden text-[8px] font-bold">
            <button
              onClick={collapseAll}
              className="px-2 py-1 bg-card/35 text-slate-400 hover:bg-muted/10 uppercase border-r border-border cursor-pointer"
            >
              Collapse All
            </button>
            <button
              onClick={restoreAll}
              className="px-2 py-1 bg-card/35 text-slate-400 hover:bg-muted/10 uppercase cursor-pointer"
            >
              Restore All
            </button>
          </div>
        </div>
      </div>

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
      <div className={`border bg-card/25 p-4 space-y-3 text-[10px] relative overflow-hidden rounded-sm transition-all duration-300 ${
        checkHighlight("audit", ["audit", "coordinates", "crs", "footprint", "context"])
          ? "border-cyan-400 shadow-[0_0_15px_-3px_rgba(6,182,212,0.35)] scale-[1.005]"
          : "border-border"
      }`}>
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
          
          {/* Dataset Panel collapsible */}
          <div className={`border rounded-sm overflow-hidden bg-card/25 transition-all duration-300 ${
            checkHighlight("dataset", ["dataset", dataset.dataset_name, dataset.dataset_id, "LISS-IV", "sensor", "resolution"])
              ? "border-cyan-400 shadow-[0_0_15px_-3px_rgba(6,182,212,0.35)] scale-[1.005]"
              : "border-border"
          }`}>
            <div className="bg-background/80 px-3 py-2 flex justify-between items-center border-b border-border/50 text-[9px] font-bold">
              <span className="uppercase text-slate-400">Panel // DATASET REGISTRY</span>
              <button
                onClick={() => togglePanel("dataset")}
                className="text-primary hover:text-slate-100 transition-colors p-1 cursor-pointer"
                aria-label={collapsed.dataset ? "Expand panel" : "Collapse panel"}
              >
                {collapsed.dataset ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${collapsed.dataset ? "h-0" : "h-auto"}`}>
              <DatasetPanel 
                dataset={dataset} 
                metadata={metadata} 
                status={status.metadata} 
              />
            </div>
          </div>

          {/* Geospatial Panel collapsible */}
          <div className={`border rounded-sm overflow-hidden bg-card/25 transition-all duration-300 ${
            checkHighlight("geospatial", ["geospatial", "coordinates", "footprint", "map", geospatial?.crs || ""])
              ? "border-cyan-400 shadow-[0_0_15px_-3px_rgba(6,182,212,0.35)] scale-[1.005]"
              : "border-border"
          }`}>
            <div className="bg-background/80 px-3 py-2 flex justify-between items-center border-b border-border/50 text-[9px] font-bold">
              <span className="uppercase text-slate-400">Panel // GEOSPATIAL REFERENCE</span>
              <button
                onClick={() => togglePanel("geospatial")}
                className="text-primary hover:text-slate-100 transition-colors p-1 cursor-pointer"
                aria-label={collapsed.geospatial ? "Expand panel" : "Collapse panel"}
              >
                {collapsed.geospatial ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${collapsed.geospatial ? "h-0" : "h-auto"}`}>
              <GeospatialPanel 
                datasetId={dataset.dataset_id} 
                metadata={metadata} 
                geospatial={geospatial} 
                location={location} 
                status={{ geospatial: status.geospatial, location: status.location }} 
              />
            </div>
          </div>

        </div>

        {/* Right Column (Briefing + 2x2 grid of specific details) */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Briefing summary screen collapsible */}
          <div className={`border rounded-sm overflow-hidden bg-card/25 transition-all duration-300 ${
            checkHighlight("summary", ["summary", "explanation", "analysis", profile.summary || ""])
              ? "border-cyan-400 shadow-[0_0_15px_-3px_rgba(6,182,212,0.35)] scale-[1.005]"
              : "border-border"
          }`}>
            <div className="bg-background/80 px-3 py-2 flex justify-between items-center border-b border-border/50 text-[9px] font-bold">
              <span className="uppercase text-slate-400">Panel // MISSION BRIEFING</span>
              <button
                onClick={() => togglePanel("summary")}
                className="text-primary hover:text-slate-100 transition-colors p-1 cursor-pointer"
                aria-label={collapsed.summary ? "Expand panel" : "Collapse panel"}
              >
                {collapsed.summary ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${collapsed.summary ? "h-0" : "h-auto"}`}>
              <IntelligenceSummaryPanel 
                summary={profile.summary} 
                status={status} 
              />
            </div>
          </div>

          {/* 2x2 Sub-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Temporal Panel collapsible */}
            <div className={`border rounded-sm overflow-hidden bg-card/25 transition-all duration-300 ${
              checkHighlight("temporal", ["temporal", "provider", "references", "gee"])
                ? "border-cyan-400 shadow-[0_0_15px_-3px_rgba(6,182,212,0.35)] scale-[1.005]"
                : "border-border"
            }`}>
              <div className="bg-background/80 px-3 py-2 flex justify-between items-center border-b border-border/50 text-[9px] font-bold">
                <span className="uppercase text-slate-400">Panel // TEMPORAL REF</span>
                <button
                  onClick={() => togglePanel("temporal")}
                  className="text-primary hover:text-slate-100 transition-colors p-1 cursor-pointer"
                  aria-label={collapsed.temporal ? "Expand panel" : "Collapse panel"}
                >
                  {collapsed.temporal ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${collapsed.temporal ? "h-0" : "h-auto"}`}>
                <TemporalPanel 
                  datasetId={dataset.dataset_id} 
                  temporal={profile.temporal || null} 
                  temporalFusion={profile.temporal_fusion || null} 
                  status={{ 
                    temporal: status.temporal || "missing", 
                    temporal_fusion: status.temporal_fusion || "missing" 
                  }} 
                />
              </div>
            </div>

            {/* Cloud Panel collapsible */}
            <div className={`border rounded-sm overflow-hidden bg-card/25 transition-all duration-300 ${
              checkHighlight("cloud", ["cloud", "mask", "shadow", "segmentation"])
                ? "border-cyan-400 shadow-[0_0_15px_-3px_rgba(6,182,212,0.35)] scale-[1.005]"
                : "border-border"
            }`}>
              <div className="bg-background/80 px-3 py-2 flex justify-between items-center border-b border-border/50 text-[9px] font-bold">
                <span className="uppercase text-slate-400">Panel // CLOUD OVERLAY</span>
                <button
                  onClick={() => togglePanel("cloud")}
                  className="text-primary hover:text-slate-100 transition-colors p-1 cursor-pointer"
                  aria-label={collapsed.cloud ? "Expand panel" : "Collapse panel"}
                >
                  {collapsed.cloud ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${collapsed.cloud ? "h-0" : "h-auto"}`}>
                <CloudPanel 
                  datasetId={dataset.dataset_id} 
                  cloud={profile.cloud || null} 
                  status={status.cloud || "missing"} 
                />
              </div>
            </div>

            {/* Reconstruction Panel collapsible */}
            <div className={`border rounded-sm overflow-hidden bg-card/25 transition-all duration-300 ${
              checkHighlight("reconstruction", ["reconstruction", "inpainting", "strategy", "telea"])
                ? "border-cyan-400 shadow-[0_0_15px_-3px_rgba(6,182,212,0.35)] scale-[1.005]"
                : "border-border"
            }`}>
              <div className="bg-background/80 px-3 py-2 flex justify-between items-center border-b border-border/50 text-[9px] font-bold">
                <span className="uppercase text-slate-400">Panel // RECONSTRUCTION</span>
                <button
                  onClick={() => togglePanel("reconstruction")}
                  className="text-primary hover:text-slate-100 transition-colors p-1 cursor-pointer"
                  aria-label={collapsed.reconstruction ? "Expand panel" : "Collapse panel"}
                >
                  {collapsed.reconstruction ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${collapsed.reconstruction ? "h-0" : "h-auto"}`}>
                <ReconstructionPanel 
                  datasetId={dataset.dataset_id} 
                  reconstruction={profile.reconstruction || null} 
                  status={status.reconstruction || "missing"} 
                />
              </div>
            </div>

            {/* Confidence Panel collapsible */}
            <div className={`border rounded-sm overflow-hidden bg-card/25 transition-all duration-300 ${
              checkHighlight("confidence", ["confidence", "score", "reliability", "heatmap"])
                ? "border-cyan-400 shadow-[0_0_15px_-3px_rgba(6,182,212,0.35)] scale-[1.005]"
                : "border-border"
            }`}>
              <div className="bg-background/80 px-3 py-2 flex justify-between items-center border-b border-border/50 text-[9px] font-bold">
                <span className="uppercase text-slate-400">Panel // CONFIDENCE LEVEL</span>
                <button
                  onClick={() => togglePanel("confidence")}
                  className="text-primary hover:text-slate-100 transition-colors p-1 cursor-pointer"
                  aria-label={collapsed.confidence ? "Expand panel" : "Collapse panel"}
                >
                  {collapsed.confidence ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
              </div>
              <div className={`transition-all duration-300 overflow-hidden ${collapsed.confidence ? "h-0" : "h-auto"}`}>
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
        </div>
      </div>

      {/* 4.5. Export Command Center Panel */}
      {dataset.analysis_session_id && (
        <ExportPanel
          sessionId={dataset.analysis_session_id}
          datasetId={dataset.dataset_id}
          datasetName={dataset.dataset_name}
          isSessionCompleted={status.reconstruction === "available"}
        />
      )}

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
