"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  CloudSun,
  Activity,
  Layers,
  Shield,
  FileText,
  Loader2,
  AlertTriangle,
  Play,
  CheckCircle,
  HelpCircle,
  Database,
  ArrowRight
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getMissionControlProfile } from "@/lib/mission-control-api"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { MissionControlProfile } from "@/lib/types/mission-control"

import {
  runCloudDetection,
  runCloudClassification,
  runCloudShadow,
  runCloudSegmentation,
  runCloudAnalytics
} from "@/lib/cloud-api"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

interface LogMessage {
  timestamp: string
  text: string
  type: "info" | "success" | "error"
}

export default function CloudIntelligenceWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)

  // Loading / pipeline runner states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [consoleLogs, setConsoleLogs] = useState<LogMessage[]>([])

  const addLog = (text: string, type: "info" | "success" | "error" = "info") => {
    setConsoleLogs(prev => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        text,
        type
      }
    ])
  }

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const ds = await getDataset(datasetId)
      setDataset(ds)

      try {
        const meta = await getDatasetMetadata(datasetId)
        setMetadata(meta)
      } catch (err) {
        console.log("No metadata extracted yet")
      }

      const prof = await getMissionControlProfile(datasetId)
      setProfile(prof)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to sync cloud workspace.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadData(true)
    }
  }, [datasetId])

  // Sequentially run all cloud pipeline steps
  const handleRunFullPipeline = async () => {
    if (!dataset) return
    setConsoleLogs([])
    setError(null)

    try {
      // Step 1: Run Detection
      setRunningStep("detection")
      addLog("Starting Phase 6A: Cloud Detection Scanner...", "info")
      addLog("Analyzing Brightness index, NDVI suppression and spectral whiteness...", "info")
      await runCloudDetection(datasetId)
      addLog("✓ Phase 6A completed. Grayscale probability map created.", "success")

      // Step 2: Run Classification
      setRunningStep("classification")
      addLog("Starting Phase 6B: Cloud Classification Categorization...", "info")
      addLog("Measuring shape compactness and pixel properties...", "info")
      await runCloudClassification(datasetId)
      addLog("✓ Phase 6B completed. Cloud objects cataloged (Thick, Thin, Cirrus).", "success")

      // Step 3: Run Shadow
      setRunningStep("shadow")
      addLog("Starting Phase 6C: Cloud Shadow Projections...", "info")
      addLog("Reading sun elevation angle and projecting solar rays...", "info")
      await runCloudShadow(datasetId)
      addLog("✓ Phase 6C completed. Shadow regions identified.", "success")

      // Step 4: Run Segmentation
      setRunningStep("segmentation")
      addLog("Starting Phase 6D: Mask Segmentation Consolidation...", "info")
      addLog("Merging clouds, shadows, and performing morphological fills...", "info")
      await runCloudSegmentation(datasetId)
      addLog("✓ Phase 6D completed. Unified reconstruction masks finalized.", "success")

      // Step 5: Run Analytics
      setRunningStep("analytics")
      addLog("Starting Phase 6E: Cloud Analytics Synthesis Report...", "info")
      await runCloudAnalytics(datasetId)
      addLog("✓ Phase 6E completed. Operational Burden index generated.", "success")

      setRunningStep(null)
      addLog("Full Cloud Intelligence Pipeline Completed Successfully.", "success")
      await loadData(false)
    } catch (err: any) {
      console.error(err)
      addLog(`ERROR: Pipeline crashed - ${err.message || "Unknown error"}`, "error")
      setRunningStep(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Mounting Cloud Intelligence Console...
        </span>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-sm space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Cloud Workspace Link Failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Telemetry for the requested dataset is unavailable."}
        </p>
        <button
          onClick={() => router.push("/datasets")}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Return to Datacenter
        </button>
      </div>
    )
  }

  const cloudData = profile?.cloud
  const isPipelineCompleted = profile?.status?.cloud === "available"

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      
      {/* Central workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[{ label: "Cloud Intelligence Viewer" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-primary animate-pulse" />
              Cloud Intelligence Workspace
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Active Orbit Node: <span className="text-foreground select-all">{dataset.dataset_name}</span> &middot; Phase 6 Subsystems
            </p>
          </div>
          <button
            disabled={runningStep !== null}
            onClick={handleRunFullPipeline}
            className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            {isPipelineCompleted ? "Re-Run Cloud Pipeline" : "Execute Cloud Pipeline"}
          </button>
        </div>

        {/* Process log / telemetry print console */}
        {(runningStep !== null || consoleLogs.length > 0) && (
          <div className="border border-border bg-black/75 p-4 rounded-sm space-y-2">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5 text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
              <span>Telemetry Execution Console</span>
              {runningStep && <span className="text-primary animate-pulse">Running step: {runningStep}</span>}
            </div>
            <div className="max-h-[160px] overflow-y-auto space-y-1 text-[10px] scrollbar-thin scrollbar-thumb-border">
              {consoleLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex space-x-2 leading-relaxed ${
                    log.type === "success" ? "text-emerald-400" : log.type === "error" ? "text-red-400 font-bold" : "text-slate-300"
                  }`}
                >
                  <span className="text-muted-foreground/60">[{log.timestamp}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overview cards - show stats if available */}
        {isPipelineCompleted && cloudData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
            <div className="border border-border bg-card/30 p-3 rounded-sm">
              <div className="text-muted-foreground uppercase font-bold">Cloud Coverage</div>
              <div className="text-sm font-black text-foreground mt-1">
                {cloudData.cloud_coverage_percent?.toFixed(1) ?? "0"}%
              </div>
            </div>
            <div className="border border-border bg-card/30 p-3 rounded-sm">
              <div className="text-muted-foreground uppercase font-bold">Shadow Coverage</div>
              <div className="text-sm font-black text-foreground mt-1">
                {cloudData.shadow?.total_shadow_area_percent?.toFixed(1) ?? "0"}%
              </div>
            </div>
            <div className="border border-border bg-card/30 p-3 rounded-sm">
              <div className="text-muted-foreground uppercase font-bold">Reconstruction Burden</div>
              <div className="text-sm font-black text-amber-500 mt-1">
                {cloudData.analytics?.burden_index?.toFixed(1) ?? "N/A"}/100
              </div>
            </div>
            <div className="border border-border bg-card/30 p-3 rounded-sm">
              <div className="text-muted-foreground uppercase font-bold">Reconstruction Ready</div>
              <div className="text-sm font-black text-emerald-400 mt-1 uppercase">
                {cloudData.segmentation?.reconstruction_ready ? "TRUE" : "FALSE"}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border bg-card/10 p-12 text-center rounded-sm max-w-xl mx-auto space-y-4">
            <HelpCircle className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Cloud Intelligence Pipeline Pending
              </h3>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                No Cloud Intelligence data has been compiled for this LISS-IV scene workspace. Click the button above to run the classical and rule-based threshold extraction engines.
              </p>
            </div>
          </div>
        )}

        {/* Action Center - Detailed subpage links */}
        {isPipelineCompleted && (
          <div className="space-y-3">
            <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest border-b border-border pb-1">
              Map and Analytics Viewers
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/detection`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
              >
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    View Detection Map
                  </span>
                  <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                    Inspect the grayscale pixel probability score matrix.
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/classification`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
              >
                <Layers className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    View Classification Map
                  </span>
                  <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                    Analyze Thick, Thin, and Cirrus cloud object clusters.
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/shadows`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
              >
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    View Shadow Mask
                  </span>
                  <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                    View solar projected geometry shadow vectors.
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/masks`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
              >
                <Layers className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    View Cloud Mask
                  </span>
                  <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                    Inspect the unified multi-class reconstruction mask.
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/analytics`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    View Analytics Report
                  </span>
                  <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                    Check restoration statistics and scene difficulty gradings.
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Sidebar Panel */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="cloud"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
    </div>
  )
}
