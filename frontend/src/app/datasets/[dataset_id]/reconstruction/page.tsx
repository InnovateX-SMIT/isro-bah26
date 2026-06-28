"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Cpu,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  FileText,
  TrendingUp,
  Activity,
  Play,
  Check,
  Circle,
  ChevronDown,
  ChevronUp
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getMissionControlProfile } from "@/lib/mission-control-api"
import {
  runReconstruction,
  runOptimization,
  runEvaluation,
  getReconstructionStatus,
  getReconstructionSummary,
  getEvaluationStatus,
  getReconstructionPreviewUrl,
  getReconstructionOptimizedPreviewUrl
} from "@/lib/reconstruction-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { MissionControlProfile } from "@/lib/types/mission-control"
import { ReconstructionRunResponse } from "@/lib/types/reconstruction"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

interface LogMessage {
  timestamp: string
  text: string
  type: "info" | "success" | "error"
}

const PIPELINE_STAGES = [
  { key: "reconstruction", label: "Reconstruction" },
  { key: "optimization", label: "Optimization" },
  { key: "evaluation", label: "Quality Evaluation" },
]

export default function ReconstructionHubPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)
  const [reconstructRun, setReconstructRun] = useState<ReconstructionRunResponse | null>(null)
  const [evaluationStatus, setEvaluationStatus] = useState<"COMPLETED" | "NOT_STARTED">("NOT_STARTED")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
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

      const sessionId = ds.analysis_session_id

      try {
        const run = await getReconstructionStatus(sessionId)
        setReconstructRun(run)
        
        const evalStat = await getEvaluationStatus(sessionId)
        setEvaluationStatus(evalStat.evaluation_status)
      } catch (err) {
        console.log("No completed reconstruction runs found")
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load reconstruction workspace.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadData(true)
    }
  }, [datasetId])

  const handleRunFullPipeline = async () => {
    if (!dataset) return
    setConsoleLogs([])
    setError(null)
    setCompletedSteps(new Set())

    // Stage 1: Reconstruction
    setRunningStep("reconstruction")
    addLog("Starting reconstruction pipeline...", "info")
    try {
      await runReconstruction(dataset.analysis_session_id, "DEFAULT")
      addLog("✓ Reconstruction completed", "success")
      setCompletedSteps(prev => new Set(prev).add("reconstruction"))
    } catch (err: any) {
      addLog(`ERROR: ${err.message || "Reconstruction failed"}`, "error")
      setRunningStep(null)
      return
    }

    // Stage 2: Optimization
    setRunningStep("optimization")
    addLog("Starting post-processing optimization...", "info")
    try {
      await runOptimization(dataset.analysis_session_id)
      addLog("✓ Optimization completed", "success")
      setCompletedSteps(prev => new Set(prev).add("optimization"))
    } catch (err: any) {
      addLog(`ERROR: ${err.message || "Optimization failed"}`, "error")
      setRunningStep(null)
      await loadData(false)
      return
    }

    // Stage 3: Evaluation
    setRunningStep("evaluation")
    addLog("Running quality evaluation...", "info")
    try {
      await runEvaluation(dataset.analysis_session_id)
      addLog("✓ Quality evaluation completed", "success")
      setCompletedSteps(prev => new Set(prev).add("evaluation"))
    } catch (err: any) {
      addLog(`ERROR: ${err.message || "Evaluation failed"}`, "error")
      setRunningStep(null)
      await loadData(false)
      return
    }

    setRunningStep(null)
    addLog("Full reconstruction pipeline completed successfully.", "success")
    await loadData(false)
  }

  const getProgressPercent = () => {
    const completed = completedSteps.size
    if (completed === 3 && !runningStep) return 100
    if (runningStep) {
      const stageIdx = PIPELINE_STAGES.findIndex(s => s.key === runningStep)
      return Math.round(((stageIdx) / 3) * 100 + 16)
    }
    return Math.round((completed / 3) * 100)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">
          Loading reconstruction workspace...
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
            Could Not Load Reconstruction Data
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Reconstruction data for dataset ${datasetId} is unavailable.`}
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

  const isReconstructed = reconstructRun !== null && reconstructRun.reconstruction_status === "COMPLETED"
  const isOptimized = reconstructRun !== null && reconstructRun.optimization_status === "COMPLETED"
  const isEvaluated = evaluationStatus === "COMPLETED"
  const isRunning = runningStep !== null

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      {/* Tab Navigation */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="reconstruction"
      />

      {/* Central Viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[{ label: "Reconstruction" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              AI Reconstruction
            </h1>
          </div>
          <button
            disabled={isRunning}
            onClick={handleRunFullPipeline}
            className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 rounded-xl"
          >
            <Play className="w-4 h-4 fill-current" />
            {isReconstructed ? "Re-run Pipeline" : "Run Full Pipeline"}
          </button>
        </div>

        {/* Pipeline Progress */}
        {(isRunning || completedSteps.size > 0) && (
          <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
            <div className="progress-track">
              <div
                className={`progress-fill ${completedSteps.size === 3 && !isRunning ? "progress-fill-success" : ""}`}
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PIPELINE_STAGES.map((stage) => {
                const isCompleted = completedSteps.has(stage.key)
                const isActive = runningStep === stage.key

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
                  <div className="mt-2 border border-border bg-black/50 p-3 rounded-lg max-h-[140px] overflow-y-auto space-y-1 text-[10px]">
                    {consoleLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`${
                          log.type === "success" ? "text-emerald-400" : log.type === "error" ? "text-red-400 font-bold" : "text-slate-300"
                        }`}
                      >
                        [{log.timestamp}] {log.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Summary */}
            {isReconstructed ? (
              <div className="border border-border bg-card/25 p-5 rounded-xl space-y-3">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Reconstruction Summary
                </h2>
                <p className="text-[11px] leading-relaxed text-slate-300 font-sans border-t border-border/20 pt-3">
                  {reconstructRun?.summary || "Baseline image synthesis compiled using historical references."}
                </p>
              </div>
            ) : !isRunning && (
              <div className="border border-dashed border-border bg-card/10 p-12 text-center rounded-xl space-y-4 max-w-xl mx-auto">
                <Cpu className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Reconstruction Pending
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Run the full pipeline to reconstruct cloud-covered regions using AI-guided temporal inpainting.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Cards */}
            {isReconstructed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => router.push(`/datasets/${datasetId}/reconstruction/result`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-xl flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <Layers className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Baseline Result</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      View the raw inpaint reconstruction output.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {isOptimized ? (
                  <div 
                    onClick={() => router.push(`/datasets/${datasetId}/reconstruction/optimized`)}
                    className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-xl flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                  >
                    <div className="space-y-1.5">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Optimized Output</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        Post-processed with edge-guided filtering and spectral matching.
                      </p>
                    </div>
                    <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                      Open <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ) : (
                  <div className="border border-border/40 bg-muted/5 p-4 rounded-xl flex flex-col justify-between space-y-3 opacity-60">
                    <div className="space-y-1.5">
                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Optimized Output</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        Available after optimization completes.
                      </p>
                    </div>
                  </div>
                )}

                {isEvaluated ? (
                  <div 
                    onClick={() => router.push(`/datasets/${datasetId}/reconstruction/evaluation`)}
                    className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-xl flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                  >
                    <div className="space-y-1.5">
                      <Activity className="w-5 h-5 text-primary" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Quality Scorecard</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        Quantitative score evaluations and metrics.
                      </p>
                    </div>
                    <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                      Open <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ) : (
                  <div className="border border-border/40 bg-muted/5 p-4 rounded-xl flex flex-col justify-between space-y-3 opacity-60">
                    <div className="space-y-1.5">
                      <Activity className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quality Scorecard</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        Available after evaluation completes.
                      </p>
                    </div>
                  </div>
                )}

                <div 
                  onClick={() => router.push(`/datasets/${datasetId}/reconstruction/metadata`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-xl flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Metadata</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      GeoTIFF paths, UTM projections, algorithm settings.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Preview */}
            {isReconstructed && reconstructRun && (
              <div className="border border-border bg-card/20 p-5 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Preview</h3>
                <div className="border border-border bg-black/45 rounded-lg overflow-hidden h-[180px] flex items-center justify-center relative">
                  <img
                    src={isOptimized 
                      ? getReconstructionOptimizedPreviewUrl(dataset.analysis_session_id)
                      : getReconstructionPreviewUrl(dataset.analysis_session_id)
                    }
                    alt="Reconstructed preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/85 border border-border/50 px-2 py-0.5 text-[8px] text-cyan-400 uppercase font-bold tracking-wider rounded-md">
                    {isOptimized ? "Optimized" : "Baseline"}
                  </div>
                </div>
              </div>
            )}

            {/* Run Stats */}
            {isReconstructed && reconstructRun && (
              <div className="border border-border bg-card/20 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-primary" />
                  Run Details
                </h3>
                <div className="space-y-2 pt-2 text-[10px]">
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-emerald-400 uppercase">{reconstructRun.reconstruction_status}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Method:</span>
                    <span className="font-bold text-slate-300">{reconstructRun.reconstruction_method || "Inpaint"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-bold text-slate-300">{reconstructRun.execution_time_ms ? `${reconstructRun.execution_time_ms} ms` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Optimization:</span>
                    <span className={`font-bold uppercase ${isOptimized ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {reconstructRun.optimization_status || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
