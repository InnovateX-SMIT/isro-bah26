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
  Check,
  Circle,
  ChevronDown,
  ChevronUp
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

const PIPELINE_STAGES = [
  { key: "detection", label: "Cloud Detection" },
  { key: "classification", label: "Classification" },
  { key: "shadow", label: "Shadow Detection" },
  { key: "segmentation", label: "Mask Generation" },
  { key: "analytics", label: "Analytics" },
]

export default function CloudIntelligenceWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [pipelineComplete, setPipelineComplete] = useState(false)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [consoleLogs, setConsoleLogs] = useState<LogMessage[]>([])
  const [showLogs, setShowLogs] = useState(false)

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
      setError(err.message || "Failed to load cloud workspace.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadData(true)
    }
  }, [datasetId])

  const getProgressPercent = () => {
    if (pipelineComplete) return 100
    const completed = completedSteps.size
    if (runningStep) {
      const stageIdx = PIPELINE_STAGES.findIndex(s => s.key === runningStep)
      return Math.round(((stageIdx) / 5) * 100 + 10)
    }
    return Math.round((completed / 5) * 100)
  }

  // Sequentially run all cloud pipeline steps
  const handleRunFullPipeline = async () => {
    if (!dataset) return
    setConsoleLogs([])
    setError(null)
    setPipelineError(null)
    setCompletedSteps(new Set())
    setPipelineComplete(false)

    try {
      setRunningStep("detection")
      addLog("Starting cloud detection...", "info")
      await runCloudDetection(datasetId)
      addLog("✓ Cloud detection completed", "success")
      setCompletedSteps(prev => new Set(prev).add("detection"))

      setRunningStep("classification")
      addLog("Starting cloud classification...", "info")
      await runCloudClassification(datasetId)
      addLog("✓ Classification completed", "success")
      setCompletedSteps(prev => new Set(prev).add("classification"))

      setRunningStep("shadow")
      addLog("Starting shadow detection...", "info")
      await runCloudShadow(datasetId)
      addLog("✓ Shadow detection completed", "success")
      setCompletedSteps(prev => new Set(prev).add("shadow"))

      setRunningStep("segmentation")
      addLog("Starting mask segmentation...", "info")
      await runCloudSegmentation(datasetId)
      addLog("✓ Mask generation completed", "success")
      setCompletedSteps(prev => new Set(prev).add("segmentation"))

      setRunningStep("analytics")
      addLog("Generating analytics report...", "info")
      await runCloudAnalytics(datasetId)
      addLog("✓ Analytics completed", "success")
      setCompletedSteps(prev => new Set(prev).add("analytics"))

      setRunningStep(null)
      setPipelineComplete(true)
      addLog("Cloud Intelligence pipeline completed successfully.", "success")
      await loadData(false)
    } catch (err: any) {
      console.error(err)
      addLog(`ERROR: ${err.message || "Unknown error"}`, "error")
      setPipelineError(err.message || "Pipeline failed")
      setRunningStep(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">
          Loading cloud workspace...
        </span>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-xl space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold">
            Could Not Load Cloud Data
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Cloud workspace data is unavailable for this dataset."}
        </p>
        <button
          onClick={() => router.push("/datasets")}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-wider text-xs font-bold rounded-lg"
        >
          Return to Inventory
        </button>
      </div>
    )
  }

  const cloudData = profile?.cloud
  const isPipelineCompleted = profile?.status?.cloud === "available"
  const isRunning = runningStep !== null

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      
      {/* Tab Navigation */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="cloud"
      />

      {/* Central workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[{ label: "Cloud Intelligence" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-primary" />
              Cloud Intelligence
            </h1>
          </div>
          <button
            disabled={isRunning}
            onClick={handleRunFullPipeline}
            className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 rounded-xl"
          >
            <Play className="w-4 h-4 fill-current" />
            {isPipelineCompleted ? "Re-run Pipeline" : "Run Cloud Pipeline"}
          </button>
        </div>

        {/* Pipeline Progress */}
        {(isRunning || pipelineComplete || completedSteps.size > 0) && (
          <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
            {/* Progress Bar */}
            <div className="progress-track">
              <div
                className={`progress-fill ${pipelineComplete ? "progress-fill-success" : ""}`}
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>

            {/* Stage Indicators */}
            <div className="grid grid-cols-5 gap-2">
              {PIPELINE_STAGES.map((stage) => {
                const isCompleted = completedSteps.has(stage.key)
                const isActive = runningStep === stage.key
                const isPending = !isCompleted && !isActive

                return (
                  <div
                    key={stage.key}
                    className={`flex items-center gap-1.5 p-2.5 border rounded-lg text-[10px] transition-all ${
                      isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                        : isActive
                        ? "border-primary/30 bg-primary/5 text-primary stage-running"
                        : "border-border bg-card/10 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className="font-semibold truncate">{stage.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Collapsible Logs */}
            {consoleLogs.length > 0 && (
              <div>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-all font-semibold"
                >
                  {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showLogs ? "Hide Detailed Logs" : "View Detailed Logs"}
                </button>
                {showLogs && (
                  <div className="mt-2 border border-border bg-black/50 p-3 rounded-lg max-h-[160px] overflow-y-auto space-y-1 text-[10px]">
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
                )}
              </div>
            )}
          </div>
        )}

        {pipelineError && (
          <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 text-xs flex items-center justify-between rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold">Pipeline Error: {pipelineError}</span>
            </div>
            <button onClick={() => setPipelineError(null)} className="text-xs hover:underline opacity-80 font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {/* Overview cards - show stats if available */}
        {isPipelineCompleted && cloudData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
            <div className="border border-border bg-card/30 p-3 rounded-lg">
              <div className="text-muted-foreground uppercase font-bold">Cloud Coverage</div>
              <div className="text-sm font-black text-foreground mt-1">
                {cloudData.cloud_coverage_percent?.toFixed(1) ?? "0"}%
              </div>
            </div>
            <div className="border border-border bg-card/30 p-3 rounded-lg">
              <div className="text-muted-foreground uppercase font-bold">Shadow Coverage</div>
              <div className="text-sm font-black text-foreground mt-1">
                {cloudData.shadow?.total_shadow_area_percent?.toFixed(1) ?? "0"}%
              </div>
            </div>
            <div className="border border-border bg-card/30 p-3 rounded-lg">
              <div className="text-muted-foreground uppercase font-bold">Reconstruction Burden</div>
              <div className="text-sm font-black text-amber-500 mt-1">
                {cloudData.analytics?.burden_index?.toFixed(1) ?? "N/A"}/100
              </div>
            </div>
            <div className="border border-border bg-card/30 p-3 rounded-lg">
              <div className="text-muted-foreground uppercase font-bold">Reconstruction Ready</div>
              <div className="text-sm font-black text-emerald-400 mt-1 uppercase">
                {cloudData.segmentation?.reconstruction_ready ? "Yes" : "No"}
              </div>
            </div>
          </div>
        ) : !isRunning && !pipelineComplete && (
          <div className="border border-dashed border-border bg-card/10 p-12 text-center rounded-xl max-w-xl mx-auto space-y-4">
            <HelpCircle className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                Cloud Analysis Pending
              </h3>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                Run the cloud pipeline to detect clouds, classify types, generate masks, and compute analytics for this scene.
              </p>
            </div>
          </div>
        )}

        {/* Action Center - Subpage links */}
        {isPipelineCompleted && (
          <div className="space-y-3">
            <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest border-b border-border pb-1">
              Analysis Results
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/detection`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
              >
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    Detection Map
                  </span>
                  <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                    Cloud probability score visualization
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/classification`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
              >
                <Layers className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    Classification Map
                  </span>
                  <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                    Thick, thin, and cirrus cloud categories
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/shadows`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
              >
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    Shadow Mask
                  </span>
                  <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                    Solar projected shadow regions
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/masks`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
              >
                <Layers className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    Cloud Mask
                  </span>
                  <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                    Unified reconstruction mask
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push(`/datasets/${datasetId}/cloud/analytics`)}
                className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                    Analytics Report
                  </span>
                  <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                    Scene difficulty and restoration statistics
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
