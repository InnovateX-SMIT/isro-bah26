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
  CheckCircle,
  HelpCircle
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

export default function ReconstructionHubPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)
  const [reconstructRun, setReconstructRun] = useState<ReconstructionRunResponse | null>(null)
  const [evaluationStatus, setEvaluationStatus] = useState<"COMPLETED" | "NOT_STARTED">("NOT_STARTED")

  // Interactive console states
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

      const sessionId = ds.analysis_session_id

      // Fetch latest run details
      try {
        const run = await getReconstructionStatus(sessionId)
        setReconstructRun(run)
        
        // Fetch evaluation status
        const evalStat = await getEvaluationStatus(sessionId)
        setEvaluationStatus(evalStat.evaluation_status)
      } catch (err) {
        console.log("No completed reconstruction runs found in session")
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load Reconstruction Workspace parameters.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadData(true)
    }
  }, [datasetId])

  // Executes classical inpaint reconstruction pipeline
  const handleExecuteReconstruction = async () => {
    if (!dataset) return
    setConsoleLogs([])
    setError(null)
    setRunningStep("reconstruction")
    addLog("Initializing Generation Reconstruction Engine...", "info")
    addLog("Verifying spatial/temporal/cloud segmentation boundary requirements...", "info")
    
    try {
      await runReconstruction(dataset.analysis_session_id, "DEFAULT")
      addLog("✓ Reconstruction compilation completed. Baseline GeoTIFF ready.", "success")
      await loadData(false)
    } catch (err: any) {
      console.error(err)
      addLog(`ERROR: Reconstruction crash - ${err.message || "Unknown error"}`, "error")
    } finally {
      setRunningStep(null)
    }
  }

  // Executes spatial/spectral optimization (feathering, guided filter matching)
  const handleExecuteOptimization = async () => {
    if (!dataset) return
    setConsoleLogs([])
    setError(null)
    setRunningStep("optimization")
    addLog("Launching Post-Processing Optimizer...", "info")
    addLog("Calculating seamfeather kernel transitions and edge guided filter radius...", "info")

    try {
      await runOptimization(dataset.analysis_session_id)
      addLog("✓ Post-Processing optimization complete. Multi-layer optimized output ready.", "success")
      await loadData(false)
    } catch (err: any) {
      console.error(err)
      addLog(`ERROR: Optimizer crash - ${err.message || "Unknown error"}`, "error")
    } finally {
      setRunningStep(null)
    }
  }

  // Executes quantitative metrics evaluation
  const handleExecuteEvaluation = async () => {
    if (!dataset) return
    setConsoleLogs([])
    setError(null)
    setRunningStep("evaluation")
    addLog("Launching Reconstruction Evaluator...", "info")
    addLog("Computing boundary discontinuity, structural preservations, and texture similarities...", "info")

    try {
      await runEvaluation(dataset.analysis_session_id)
      addLog("✓ Quantitative evaluation scoring completed. Scorecard generated.", "success")
      await loadData(false)
    } catch (err: any) {
      console.error(err)
      addLog(`ERROR: Evaluator crash - ${err.message || "Unknown error"}`, "error")
    } finally {
      setRunningStep(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Loading Reconstruction Workspace...
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
            Reconstruct Node Link Failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Reconstruction details for dataset ${datasetId} are unreachable.`}
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

  const isReconstructed = reconstructRun !== null && reconstructRun.reconstruction_status === "COMPLETED"
  const isOptimized = reconstructRun !== null && reconstructRun.optimization_status === "COMPLETED"
  const isEvaluated = evaluationStatus === "COMPLETED"

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[{ label: "Reconstruction Intelligence" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary animate-pulse" />
              Reconstruction Overview Hub
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Session Stack: <span className="text-foreground select-all">{dataset.analysis_session_id}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
            <span className={`w-1.5 h-1.5 rounded-full ${isReconstructed ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`}></span>
            <span className="text-muted-foreground uppercase text-[9px] tracking-wider">
              {isReconstructed ? "RECONSTRUCTION: COMPILED" : "RECONSTRUCTION: STANDBY"}
            </span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Summary Text Panel */}
            <div className="border border-border bg-card/25 p-5 rounded-sm space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8.5px] text-primary tracking-widest uppercase">
                Briefing
              </div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                Operational Reconstruction Narrative
              </h2>
              {isReconstructed ? (
                <p className="text-[11px] leading-relaxed text-slate-300 font-sans border-t border-border/20 pt-3">
                  {reconstructRun?.summary || "Baseline image synthesis compiled successfully using historical references."}
                </p>
              ) : (
                <div className="space-y-4 py-4">
                  <p className="text-xs text-muted-foreground font-sans">
                    No generative reconstruction output exists for this session. Execute the baseline AI reconstruction pipeline to restore topography hidden under clouds.
                  </p>
                  <button
                    onClick={handleExecuteReconstruction}
                    disabled={runningStep !== null}
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-background font-bold text-[10px] tracking-widest uppercase rounded-sm border border-primary/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {runningStep === "reconstruction" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating Output...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Run Reconstruction Pipeline
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Hub Actions Grid */}
            {isReconstructed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Baseline Card */}
                <div 
                  onClick={() => router.push(`/datasets/${datasetId}/reconstruction/result`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <Layers className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Baseline Frame</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Inspect the raw composite inpaint reconstruction output in fullscreen coordinates.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open baseline <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Optimized Card */}
                {isOptimized ? (
                  <div 
                    onClick={() => router.push(`/datasets/${datasetId}/reconstruction/optimized`)}
                    className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                  >
                    <div className="space-y-1.5">
                      <Sparkles className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Optimized output</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        View post-processed spatial, spectral boundaries and guided filters refinement.
                      </p>
                    </div>
                    <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                      Open optimized <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ) : (
                  <div className="border border-border/40 bg-muted/5 p-4 rounded-sm flex flex-col justify-between space-y-3 relative">
                    <div className="space-y-1.5">
                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Optimized output</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        Boundary feathering, edge Guided Filtering, and spectral matching post-process parameters.
                      </p>
                    </div>
                    <button
                      onClick={handleExecuteOptimization}
                      disabled={runningStep !== null}
                      className="px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2 cursor-pointer"
                    >
                      {runningStep === "optimization" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Run Optimization
                    </button>
                  </div>
                )}

                {/* Scorecard Card */}
                {isEvaluated ? (
                  <div 
                    onClick={() => router.push(`/datasets/${datasetId}/reconstruction/evaluation`)}
                    className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                  >
                    <div className="space-y-1.5">
                      <Activity className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Quality Scorecard</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        Quantitative score evaluations for seam transitions, edge preservations, and spectral consistency.
                      </p>
                    </div>
                    <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                      Open scorecard <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ) : (
                  <div className="border border-border/40 bg-muted/5 p-4 rounded-sm flex flex-col justify-between space-y-3 relative">
                    <div className="space-y-1.5">
                      <Activity className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quality Scorecard</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans font-sans">
                        Quantitative metrics, boundary seam transitions, texture preservation, strengths, and weaknesses reports.
                      </p>
                    </div>
                    <button
                      onClick={handleExecuteEvaluation}
                      disabled={runningStep !== null || !isOptimized}
                      className="px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2 cursor-pointer"
                    >
                      {runningStep === "evaluation" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Run Evaluation
                    </button>
                  </div>
                )}

                {/* Metadata Registry Card */}
                <div 
                  onClick={() => router.push(`/datasets/${datasetId}/reconstruction/metadata`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <FileText className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Reconstruct Metadata</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Verify generated GeoTIFF locations, UTM projections, algorithm settings, and input reference observation stacks.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open Registry <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            )}

            {/* Pipeline Console Console Logger */}
            {runningStep && (
              <div className="border border-border bg-black/60 p-4 rounded-sm space-y-2.5 font-mono text-[10.5px]">
                <div className="flex items-center justify-between border-b border-border/20 pb-1 text-slate-400">
                  <span>TERMINAL OUTPUT // ACTIVE EXECUTION</span>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-1 select-all scrollbar-thin">
                  {consoleLogs.map((log, index) => (
                    <div 
                      key={index}
                      className={
                        log.type === "success" ? "text-emerald-400 font-bold" :
                        log.type === "error" ? "text-red-400 font-bold" :
                        "text-slate-300"
                      }
                    >
                      [{log.timestamp}] {log.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Mini image preview & general settings */}
          <div className="space-y-6">
            
            {/* Visual Preview Frame */}
            {isReconstructed && reconstructRun && (
              <div className="border border-border bg-card/20 p-5 rounded-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Composite Preview</h3>
                <div className="border border-border bg-black/45 rounded-sm overflow-hidden h-[160px] flex items-center justify-center relative">
                  <img
                    src={isOptimized 
                      ? getReconstructionOptimizedPreviewUrl(dataset.analysis_session_id)
                      : getReconstructionPreviewUrl(dataset.analysis_session_id)
                    }
                    alt="Reconstructed preview composite"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/85 border border-border/50 px-2 py-0.5 text-[8px] text-cyan-400 uppercase font-bold tracking-wider">
                    {isOptimized ? "OPTIMIZED preview" : "BASELINE preview"}
                  </div>
                </div>
              </div>
            )}

            {/* Run parameters details list */}
            {isReconstructed && reconstructRun && (
              <div className="border border-border bg-card/20 p-5 rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-primary" />
                  Telemetry Stats
                </h3>
                <div className="space-y-2 border-t border-border/20 pt-3 text-[10px]">
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Reconstruction Status:</span>
                    <span className="font-bold text-emerald-400 uppercase">{reconstructRun.reconstruction_status}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Restoration Method:</span>
                    <span className="font-bold text-slate-300 font-mono">{reconstructRun.reconstruction_method || "Classical Inpaint"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Compute Duration:</span>
                    <span className="font-bold text-slate-300">{reconstructRun.execution_time_ms ? `${reconstructRun.execution_time_ms} ms` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Optimization Status:</span>
                    <span className={`font-bold uppercase ${isOptimized ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {reconstructRun.optimization_status || "PENDING"}
                    </span>
                  </div>
                  {isOptimized && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Optimization method:</span>
                      <span className="font-bold text-slate-300 font-mono text-[9px] truncate max-w-[120px]" title={reconstructRun.optimization_method || ""}>
                        {reconstructRun.optimization_method || "N/A"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Sidebar */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="reconstruction"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
    </div>
  )
}
