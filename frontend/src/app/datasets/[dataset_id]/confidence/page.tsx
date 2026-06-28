"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Shield,
  Activity,
  Layers,
  Image as ImageIcon,
  FileText,
  Loader2,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  XCircle,
  Play,
  RefreshCw,
  Award,
  Check,
  Circle,
  ChevronDown,
  ChevronUp
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getMissionControlProfile } from "@/lib/mission-control-api"
import { getReconstructionStatus } from "@/lib/reconstruction-api"
import {
  getConfidenceEstimation,
  runConfidenceEstimation,
  getReliabilityScore,
  runReliabilityScoring,
  getHeatmap,
  runHeatmapGeneration,
  getAnalytics,
  runAnalytics,
  getConfidenceReportFile
} from "@/lib/confidence-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { MissionControlProfile } from "@/lib/types/mission-control"
import { ReconstructionRunResponse } from "@/lib/types/reconstruction"
import {
  ConfidenceEstimationResponse,
  ReliabilityScoreResponse,
  ConfidenceHeatmapResponse,
  ConfidenceAnalyticsResponse,
  ConfidenceReport
} from "@/lib/types/confidence"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

const PIPELINE_STAGES = [
  { key: "estimation", label: "Estimation" },
  { key: "reliability", label: "Reliability" },
  { key: "heatmap", label: "Heatmap" },
  { key: "analytics", label: "Analytics" },
]

export default function ConfidenceOverviewHubPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)
  const [reconRun, setReconRun] = useState<ReconstructionRunResponse | null>(null)

  const [estimation, setEstimation] = useState<ConfidenceEstimationResponse | null>(null)
  const [reliability, setReliability] = useState<ReliabilityScoreResponse | null>(null)
  const [heatmap, setHeatmap] = useState<ConfidenceHeatmapResponse | null>(null)
  const [analytics, setAnalytics] = useState<ConfidenceAnalyticsResponse | null>(null)
  const [report, setReport] = useState<ConfidenceReport | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)

  const appendLog = (msg: string) => {
    const timestamp = new Date().toISOString().split("T")[1].substring(0, 8)
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`])
  }

  const loadPipelineStatus = async (reconstructionRunId: string) => {
    let step1: ConfidenceEstimationResponse | null = null
    let step2: ReliabilityScoreResponse | null = null
    let step3: ConfidenceHeatmapResponse | null = null
    let step4: ConfidenceAnalyticsResponse | null = null

    try {
      step1 = await getConfidenceEstimation(reconstructionRunId)
      setEstimation(step1)
      setCompletedSteps(prev => new Set(prev).add("estimation"))
    } catch (e) {
      setEstimation(null)
      return
    }

    if (step1 && step1.confidence_id) {
      try {
        step2 = await getReliabilityScore(step1.confidence_id)
        setReliability(step2)
        setCompletedSteps(prev => new Set(prev).add("reliability"))
      } catch (e) {
        setReliability(null)
        return
      }
    }

    if (step2 && step2.reliability_id) {
      try {
        step3 = await getHeatmap(step2.reliability_id)
        setHeatmap(step3)
        setCompletedSteps(prev => new Set(prev).add("heatmap"))
      } catch (e) {
        setHeatmap(null)
        return
      }
    }

    if (step3 && step3.heatmap_id) {
      try {
        step4 = await getAnalytics(step3.heatmap_id)
        setAnalytics(step4)
        setCompletedSteps(prev => new Set(prev).add("analytics"))

        try {
          const step5 = await getConfidenceReportFile(step3.heatmap_id)
          setReport(step5)
        } catch (e) {}
      } catch (e) {
        setAnalytics(null)
      }
    }
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

      let rRun: ReconstructionRunResponse | null = null
      try {
        rRun = await getReconstructionStatus(ds.analysis_session_id)
        setReconRun(rRun)
      } catch (err) {
        console.log("Reconstruction run not found")
      }

      if (rRun && rRun.reconstruction_status === "COMPLETED") {
        await loadPipelineStatus(rRun.id)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load confidence data.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadData(true)
    }
  }, [datasetId])

  const executePipeline = async () => {
    if (!reconRun || reconRun.reconstruction_status !== "COMPLETED") return
    setPipelineRunning(true)
    setError(null)
    setLogs([])
    setCompletedSteps(new Set())

    try {
      let currentEstimation = estimation
      let currentReliability = reliability
      let currentHeatmap = heatmap

      // Step 1
      if (!currentEstimation) {
        setRunningStep("estimation")
        appendLog("Running confidence estimation...")
        currentEstimation = await runConfidenceEstimation(reconRun.id)
        setEstimation(currentEstimation)
        appendLog(`✓ Estimation completed. Mean score: ${(currentEstimation.mean_confidence_score ? (currentEstimation.mean_confidence_score * 100).toFixed(1) : "0")}%`)
      }
      setCompletedSteps(prev => new Set(prev).add("estimation"))

      // Step 2
      if (!currentReliability && currentEstimation) {
        setRunningStep("reliability")
        appendLog("Running reliability scoring...")
        currentReliability = await runReliabilityScoring(currentEstimation.confidence_id)
        setReliability(currentReliability)
        appendLog(`✓ Reliability completed. Tier: ${currentReliability.dataset_reliability_tier || "N/A"}`)
      }
      setCompletedSteps(prev => new Set(prev).add("reliability"))

      // Step 3
      if (!currentHeatmap && currentReliability) {
        setRunningStep("heatmap")
        appendLog("Generating heatmap overlay...")
        currentHeatmap = await runHeatmapGeneration(currentReliability.reliability_id)
        setHeatmap(currentHeatmap)
        appendLog("✓ Heatmap generated")
      }
      setCompletedSteps(prev => new Set(prev).add("heatmap"))

      // Step 4
      if (!analytics && currentHeatmap) {
        setRunningStep("analytics")
        appendLog("Compiling analytics and report...")
        const currentAnalytics = await runAnalytics(currentHeatmap.heatmap_id)
        setAnalytics(currentAnalytics)
        appendLog(`✓ Analytics completed. ${currentAnalytics.headline_summary || ""}`)

        try {
          const currentReport = await getConfidenceReportFile(currentHeatmap.heatmap_id)
          setReport(currentReport)
        } catch (e) {}
      }
      setCompletedSteps(prev => new Set(prev).add("analytics"))

      setRunningStep(null)
      appendLog("Confidence pipeline completed successfully.")
      await loadData(false)
    } catch (err: any) {
      console.error(err)
      appendLog(`ERROR: ${err.message || err}`)
      setError(err.message || "Pipeline failed.")
    } finally {
      setPipelineRunning(false)
      setRunningStep(null)
    }
  }

  const getProgressPercent = () => {
    const completed = completedSteps.size
    if (completed === 4 && !runningStep) return 100
    if (runningStep) {
      const stageIdx = PIPELINE_STAGES.findIndex(s => s.key === runningStep)
      return Math.round(((stageIdx) / 4) * 100 + 12)
    }
    return Math.round((completed / 4) * 100)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">Loading confidence data...</span>
      </div>
    )
  }

  if (error && !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-xl space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold">Could Not Load Confidence Data</h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Confidence data for dataset ${datasetId} is unavailable.`}
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

  const isPipelineComplete = estimation && reliability && heatmap && analytics

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      {/* Tab Navigation */}
      <ViewerSidebar
        dataset={dataset!}
        metadata={metadata}
        mode="confidence"
      />

      {/* Central Viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset?.dataset_name || "Unknown"}
              datasetId={datasetId}
              items={[{ label: "Confidence Intelligence" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Confidence Intelligence
            </h1>
          </div>
          {reconRun && reconRun.reconstruction_status === "COMPLETED" && !isPipelineComplete && (
            <button
              onClick={executePipeline}
              disabled={pipelineRunning}
              className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 rounded-xl"
            >
              {pipelineRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Run Confidence Pipeline
                </>
              )}
            </button>
          )}
        </div>

        {/* Prerequisite check */}
        {(!reconRun || reconRun.reconstruction_status !== "COMPLETED") ? (
          <div className="border border-amber-500/30 bg-amber-500/5 p-6 rounded-xl space-y-4 max-w-xl mx-auto text-center my-6">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-amber-400">
              Reconstruction Required
            </h3>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              Confidence evaluation requires a completed reconstruction. Complete the AI Reconstruction pipeline first.
            </p>
            <button
              onClick={() => router.push(`/datasets/${datasetId}/reconstruction`)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider uppercase transition-all rounded-xl"
            >
              Open Reconstruction
            </button>
          </div>
        ) : (
          <>
            {/* Pipeline Progress */}
            {(pipelineRunning || completedSteps.size > 0) && (
              <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
                <div className="progress-track">
                  <div
                    className={`progress-fill ${isPipelineComplete ? "progress-fill-success" : ""}`}
                    style={{ width: `${getProgressPercent()}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
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

                {logs.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowLogs(!showLogs)}
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-all font-semibold"
                    >
                      {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showLogs ? "Hide Logs" : "View Logs"}
                    </button>
                    {showLogs && (
                      <div className="mt-2 border border-border bg-black/50 p-3 rounded-lg max-h-[160px] overflow-y-auto space-y-1 text-[10px] text-slate-300">
                        {logs.map((log, idx) => (
                          <div key={idx} className={log.includes("ERROR") ? "text-red-400 font-bold" : log.includes("✓") ? "text-emerald-400" : ""}>
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Metrics Cards */}
            {isPipelineComplete && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-border bg-card/25 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Mean Confidence</span>
                    <div className="text-xl font-bold text-foreground">
                      {estimation?.mean_confidence_score !== null 
                        ? `${(estimation!.mean_confidence_score! * 100).toFixed(1)}%` 
                        : "N/A"}
                    </div>
                  </div>
                  <Shield className="w-8 h-8 text-primary/20 shrink-0" />
                </div>

                <div className="border border-border bg-card/25 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Low-Trust Area</span>
                    <div className="text-xl font-bold text-rose-400">
                      {estimation?.low_confidence_area_percent !== null 
                        ? `${estimation!.low_confidence_area_percent!.toFixed(1)}%` 
                        : "N/A"}
                    </div>
                  </div>
                  <Activity className="w-8 h-8 text-rose-500/20 shrink-0" />
                </div>

                <div className="border border-border bg-card/25 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Reliability Tier</span>
                    <div className="text-xl font-bold text-emerald-400 uppercase">
                      {reliability?.dataset_reliability_tier || "N/A"}
                    </div>
                  </div>
                  <Award className="w-8 h-8 text-emerald-400/20 shrink-0" />
                </div>
              </div>
            )}

            {/* Subpage Cards */}
            {isPipelineComplete && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => router.push(`/datasets/${datasetId}/confidence/heatmap`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-xl flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Confidence Heatmap</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">Spatial confidence visualization across the scene.</p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest">
                    Open <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => router.push(`/datasets/${datasetId}/confidence/overlay`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-xl flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <Layers className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Confidence Overlay</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">Toggle transparency trust margins on original composite.</p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest">
                    Open <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => router.push(`/datasets/${datasetId}/confidence/reliability`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-xl flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Reliability Map</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">Quality tiers for reconstructed cloud patches.</p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest">
                    Open <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => router.push(`/datasets/${datasetId}/confidence/analytics`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-xl flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Analytics</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">Histograms, coverage statistics, and detailed analysis.</p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest">
                    Open <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            )}

            {/* Report Card */}
            {isPipelineComplete && report && (
              <div className="border border-border bg-gradient-to-br from-card/30 to-primary/5 p-5 rounded-xl space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    Executive Report
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                    Scientific assessment with reliability ratings and validation recommendations.
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/datasets/${datasetId}/confidence/report`)}
                  className="w-full inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-2 text-[10px] font-bold tracking-wider uppercase transition-all rounded-lg"
                >
                  View Report
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
