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
  Terminal,
  RefreshCw,
  Award
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

export default function ConfidenceOverviewHubPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)
  const [reconRun, setReconRun] = useState<ReconstructionRunResponse | null>(null)

  // Pipeline Step States
  const [estimation, setEstimation] = useState<ConfidenceEstimationResponse | null>(null)
  const [reliability, setReliability] = useState<ReliabilityScoreResponse | null>(null)
  const [heatmap, setHeatmap] = useState<ConfidenceHeatmapResponse | null>(null)
  const [analytics, setAnalytics] = useState<ConfidenceAnalyticsResponse | null>(null)
  const [report, setReport] = useState<ConfidenceReport | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Console terminal states
  const [logs, setLogs] = useState<string[]>([])
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement | null>(null)

  const appendLog = (msg: string) => {
    const timestamp = new Date().toISOString().split("T")[1].substring(0, 8)
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`])
  }

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

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

      // Fetch reconstruction run
      let rRun: ReconstructionRunResponse | null = null
      try {
        rRun = await getReconstructionStatus(ds.analysis_session_id)
        setReconRun(rRun)
      } catch (err) {
        console.log("Reconstruction run not found")
      }

      if (rRun && rRun.reconstruction_status === "COMPLETED") {
        appendLog(`[SYSTEM] Reconstruction run found. ID: ${rRun.id}`)
        await loadPipelineStatus(rRun.id)
      } else {
        appendLog(`[WARNING] AI Reconstruction has not been completed. Confidence rating on standby.`)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load Confidence Hub.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const loadPipelineStatus = async (reconstructionRunId: string) => {
    // Sequential try-fetch for each step of the pipeline
    let step1: ConfidenceEstimationResponse | null = null
    let step2: ReliabilityScoreResponse | null = null
    let step3: ConfidenceHeatmapResponse | null = null
    let step4: ConfidenceAnalyticsResponse | null = null
    let step5: ConfidenceReport | null = null

    try {
      step1 = await getConfidenceEstimation(reconstructionRunId)
      setEstimation(step1)
      appendLog(`[STATUS] Step 1: Confidence Estimation is COMPLETED. (ID: ${step1.confidence_id})`)
    } catch (e) {
      setEstimation(null)
      appendLog(`[STATUS] Step 1: Confidence Estimation is PENDING.`)
      return // Remaining steps must be missing
    }

    if (step1 && step1.confidence_id) {
      try {
        step2 = await getReliabilityScore(step1.confidence_id)
        setReliability(step2)
        appendLog(`[STATUS] Step 2: Reliability Scoring is COMPLETED. (ID: ${step2.reliability_id})`)
      } catch (e) {
        setReliability(null)
        appendLog(`[STATUS] Step 2: Reliability Scoring is PENDING.`)
        return
      }
    }

    if (step2 && step2.reliability_id) {
      try {
        step3 = await getHeatmap(step2.reliability_id)
        setHeatmap(step3)
        appendLog(`[STATUS] Step 3: Heatmap Generation is COMPLETED. (ID: ${step3.heatmap_id})`)
      } catch (e) {
        setHeatmap(null)
        appendLog(`[STATUS] Step 3: Heatmap Generation is PENDING.`)
        return
      }
    }

    if (step3 && step3.heatmap_id) {
      try {
        step4 = await getAnalytics(step3.heatmap_id)
        setAnalytics(step4)
        appendLog(`[STATUS] Step 4: Confidence Analytics is COMPLETED. (ID: ${step4.analytics_id})`)

        try {
          step5 = await getConfidenceReportFile(step3.heatmap_id)
          setReport(step5)
          appendLog(`[STATUS] Step 5: Report JSON loaded successfully.`)
        } catch (e) {
          appendLog(`[STATUS] Step 5: Report JSON is unavailable.`)
        }
      } catch (e) {
        setAnalytics(null)
        appendLog(`[STATUS] Step 4: Confidence Analytics is PENDING.`)
      }
    }
  }

  useEffect(() => {
    if (datasetId) {
      setLogs([])
      appendLog(`[SYSTEM] Initializing Confidence Intelligence Module...`)
      appendLog(`[SYSTEM] Dataset Target: ${datasetId}`)
      loadData(true)
    }
  }, [datasetId])

  const executePipeline = async () => {
    if (!reconRun || reconRun.reconstruction_status !== "COMPLETED") return
    setPipelineRunning(true)
    setError(null)
    appendLog(`[PIPELINE] Starting sequential execution chain...`)

    try {
      let currentEstimation = estimation
      let currentReliability = reliability
      let currentHeatmap = heatmap
      let currentAnalytics = analytics

      // Step 1: Estimation
      if (!currentEstimation) {
        appendLog(`[STEP 1] Running Confidence Estimation...`)
        currentEstimation = await runConfidenceEstimation(reconRun.id)
        setEstimation(currentEstimation)
        appendLog(`[STEP 1] Completed. Mean confidence score: ${(currentEstimation.mean_confidence_score ? (currentEstimation.mean_confidence_score * 100).toFixed(2) : "0.0")}%`)
      }

      // Step 2: Reliability
      if (!currentReliability && currentEstimation) {
        appendLog(`[STEP 2] Running Reliability Scoring (Uncertainty Margin Evaluation)...`)
        currentReliability = await runReliabilityScoring(currentEstimation.confidence_id)
        setReliability(currentReliability)
        appendLog(`[STEP 2] Completed. Dataset reliability grade: ${currentReliability.dataset_reliability_tier || "N/A"} (${currentReliability.dataset_reliability_score || 0}/100)`)
      }

      // Step 3: Heatmap
      if (!currentHeatmap && currentReliability) {
        appendLog(`[STEP 3] Generating Heatmap overlay bands & masks...`)
        currentHeatmap = await runHeatmapGeneration(currentReliability.reliability_id)
        setHeatmap(currentHeatmap)
        appendLog(`[STEP 3] Completed. Heatmap ID: ${currentHeatmap.heatmap_id}`)
      }

      // Step 4: Analytics & Report
      if (!currentAnalytics && currentHeatmap) {
        appendLog(`[STEP 4] Compiling analytics registry & exporting executive report...`)
        currentAnalytics = await runAnalytics(currentHeatmap.heatmap_id)
        setAnalytics(currentAnalytics)
        appendLog(`[STEP 4] Completed. Headline: ${currentAnalytics.headline_summary || "Success"}`)

        try {
          const currentReport = await getConfidenceReportFile(currentHeatmap.heatmap_id)
          setReport(currentReport)
          appendLog(`[STEP 5] Report JSON sync finalized.`)
        } catch (e) {
          appendLog(`[STEP 5] Failed to load JSON report after creation.`)
        }
      }

      appendLog(`[PIPELINE] Sequential execution completed successfully. Workspace ready.`)
      await loadData(false)
    } catch (err: any) {
      console.error(err)
      appendLog(`[FATAL] Pipeline exception: ${err.message || err}`)
      setError(err.message || "Failed during pipeline step execution.")
    } finally {
      setPipelineRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Syncing confidence matrices...
        </span>
      </div>
    )
  }

  if (error && !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-sm space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Workspace Error
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Confidence details for dataset ${datasetId} are unreachable.`}
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

  const isPipelineComplete = estimation && reliability && heatmap && analytics

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset?.dataset_name || "Unknown"}
              datasetId={datasetId}
              items={[{ label: "Confidence Intelligence" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary animate-pulse" />
              Confidence Intelligence Hub
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Reconstruction ID: <span className="text-foreground select-all">{reconRun?.id || "NO RUN REGISTERED"}</span>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadData(true)}
              className="p-1.5 border border-border bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all rounded-sm"
              title="Refresh status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
              <span className={`w-1.5 h-1.5 rounded-full ${isPipelineComplete ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`}></span>
              <span className="text-muted-foreground uppercase text-[9px] tracking-wider">
                {isPipelineComplete ? "PIPELINE: EVALUATED" : "PIPELINE: INCOMPLETE"}
              </span>
            </div>
          </div>
        </div>

        {/* Reconstruction Block Check */}
        {(!reconRun || reconRun.reconstruction_status !== "COMPLETED") ? (
          <div className="border border-amber-500/30 bg-amber-500/5 p-6 rounded-sm space-y-4 max-w-xl mx-auto text-center my-6">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
              AI Reconstruction Required
            </h3>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              Confidence evaluation can only run on completed reconstruction runs. 
              The system currently indicates no optimized reconstruction output is generated for session <b>{dataset?.analysis_session_id}</b>.
            </p>
            <button
              onClick={() => router.push(`/datasets/${datasetId}/reconstruction`)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-background font-bold text-[10px] tracking-widest uppercase transition-all rounded-sm"
            >
              Open Reconstruction Workspace
            </button>
          </div>
        ) : (
          <>
            {/* Quick Metrics Cards */}
            {isPipelineComplete && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-border bg-card/25 p-4 rounded-sm relative overflow-hidden flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Mean Reconstruction Confidence</span>
                    <div className="text-xl font-bold text-foreground">
                      {estimation?.mean_confidence_score !== null 
                        ? `${(estimation!.mean_confidence_score! * 100).toFixed(1)}%` 
                        : "N/A"}
                    </div>
                  </div>
                  <Shield className="w-8 h-8 text-primary/20 shrink-0" />
                </div>

                <div className="border border-border bg-card/25 p-4 rounded-sm relative overflow-hidden flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Low-Trust Area Ratio</span>
                    <div className="text-xl font-bold text-rose-400">
                      {estimation?.low_confidence_area_percent !== null 
                        ? `${estimation!.low_confidence_area_percent!.toFixed(1)}%` 
                        : "N/A"}
                    </div>
                  </div>
                  <Activity className="w-8 h-8 text-rose-500/20 shrink-0" />
                </div>

                <div className="border border-border bg-card/25 p-4 rounded-sm relative overflow-hidden flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Overall Reliability Tier</span>
                    <div className="text-xl font-bold text-emerald-400 uppercase">
                      {reliability?.dataset_reliability_tier || "N/A"}
                    </div>
                  </div>
                  <Award className="w-8 h-8 text-emerald-400/20 shrink-0" />
                </div>
              </div>
            )}

            {/* Pipeline Control & Terminal Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                
                {/* Console Widget */}
                <div className="border border-border bg-black/60 rounded-sm overflow-hidden flex flex-col">
                  {/* Console Header */}
                  <div className="bg-muted/30 px-4 py-2 border-b border-border/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-slate-300">
                      <Terminal className="w-3.5 h-3.5 text-primary" />
                      <span>Pipeline Console Monitor</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    </div>
                  </div>

                  {/* Console logs */}
                  <div className="p-4 h-[240px] overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1.5 bg-black/90 scrollbar-thin scrollbar-thumb-primary/20">
                    {logs.map((log, idx) => {
                      let color = "text-slate-300"
                      if (log.includes("[SYSTEM]")) color = "text-blue-400"
                      else if (log.includes("[STATUS] Step")) color = "text-cyan-400"
                      else if (log.includes("[STEP 1]") || log.includes("[STEP 2]") || log.includes("[STEP 3]") || log.includes("[STEP 4]")) color = "text-indigo-400"
                      else if (log.includes("[PIPELINE]")) color = "text-primary font-bold"
                      else if (log.includes("COMPLETED")) color = "text-emerald-400"
                      else if (log.includes("[WARNING]")) color = "text-amber-500"
                      else if (log.includes("[FATAL]")) color = "text-rose-500 font-bold"
                      
                      return (
                        <div key={idx} className={color}>
                          {log}
                        </div>
                      )
                    })}
                    <div ref={terminalEndRef} />
                  </div>

                  {/* Console Actions */}
                  <div className="bg-muted/10 p-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground uppercase">
                      {pipelineRunning ? "Executing process sequence..." : "Ready to execute pipeline stages"}
                    </span>
                    {!isPipelineComplete && (
                      <button
                        onClick={executePipeline}
                        disabled={pipelineRunning}
                        className="px-4 py-2 bg-primary hover:bg-primary/95 text-background font-bold text-[10px] tracking-widest uppercase rounded-sm border border-primary/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {pipelineRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            Trigger Pipeline Execution
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Subpage hubs grid */}
                {isPipelineComplete && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => router.push(`/datasets/${datasetId}/confidence/heatmap`)}
                      className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-1.5">
                        <ImageIcon className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Confidence Heatmap</h3>
                        <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                          Inspect continuous spatial confidence bounds across the composite grid.
                        </p>
                      </div>
                      <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                        Open Heatmap <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    <div
                      onClick={() => router.push(`/datasets/${datasetId}/confidence/overlay`)}
                      className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-1.5">
                        <Layers className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Opacity Overlay</h3>
                        <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                          Toggle dynamic transparency trust margins directly on the original composited band bands.
                        </p>
                      </div>
                      <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                        Open Overlay <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    <div
                      onClick={() => router.push(`/datasets/${datasetId}/confidence/reliability`)}
                      className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-1.5">
                        <Activity className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Reliability Map</h3>
                        <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                          Inspect segmented geographic cloud patches categorised into reliability quality tiers.
                        </p>
                      </div>
                      <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                        Open Reliability <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    <div
                      onClick={() => router.push(`/datasets/${datasetId}/confidence/analytics`)}
                      className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-1.5">
                        <FileText className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Confidence Analytics</h3>
                        <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                          Examine detailed histograms, Low-Confidence areas, and spatial coverage statistics.
                        </p>
                      </div>
                      <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                        Open Analytics <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar stats or guidance */}
              <div className="space-y-6">
                
                {/* Pipeline Checklist */}
                <div className="border border-border bg-card/20 p-5 rounded-sm space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    Validation Matrix
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-sans">
                    Required pipeline compilation checklist.
                  </p>

                  <div className="space-y-2 border-t border-border/20 pt-3">
                    <div className="flex items-center justify-between text-[10px] border-b border-border/10 pb-1.5">
                      <span className="text-slate-400">1. Confidence Estimation</span>
                      {estimation ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> COMPLETED
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> PENDING
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] border-b border-border/10 pb-1.5">
                      <span className="text-slate-400">2. Reliability Scoring</span>
                      {reliability ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> COMPLETED
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> PENDING
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] border-b border-border/10 pb-1.5">
                      <span className="text-slate-400">3. Heatmap Overlay</span>
                      {heatmap ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> COMPLETED
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> PENDING
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">4. Analytics & Report</span>
                      {analytics ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> COMPLETED
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> PENDING
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Report link Card */}
                {isPipelineComplete && report && (
                  <div className="border border-border bg-gradient-to-br from-card/30 to-primary/5 p-5 rounded-sm space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-primary animate-pulse" />
                        Executive Report
                      </h3>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        An executive-level scientific assessment report compiles reliability ratings, pixel degradation estimations, and validation recommendations.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/datasets/${datasetId}/confidence/report`)}
                      className="w-full inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase transition-all"
                    >
                      Inspect Report Document
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

              </div>
            </div>
          </>
        )}

      </div>

      {/* Workspace Sidebar Navigation */}
      <ViewerSidebar
        dataset={dataset!}
        metadata={metadata}
        mode="confidence"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
    </div>
  )
}
