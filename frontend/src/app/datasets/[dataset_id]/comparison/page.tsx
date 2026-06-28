"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Database,
  Cloud,
  Clock,
  Shield,
  ArrowRight,
  RefreshCw
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getMissionControlProfile } from "@/lib/mission-control-api"
import { getReconstructionStatus } from "@/lib/reconstruction-api"
import { getCloudDetection } from "@/lib/cloud-api"
import { getSelectedReferences } from "@/lib/temporal-context-api"
import { getConfidenceEstimation, getReliabilityScore } from "@/lib/confidence-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { MissionControlProfile } from "@/lib/types/mission-control"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"
import WorkflowSummaryPanel from "@/components/comparison/WorkflowSummaryPanel"

export default function ComparisonHubPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)

  // Sub-pipeline responses
  const [reconRun, setReconRun] = useState<any | null>(null)
  const [cloudDetection, setCloudDetection] = useState<any | null>(null)
  const [references, setReferences] = useState<any[] | null>(null)
  const [estimation, setEstimation] = useState<any | null>(null)
  const [reliability, setReliability] = useState<any | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      // Fetch cloud status
      try {
        const cd = await getCloudDetection(datasetId)
        setCloudDetection(cd)
      } catch (e) {
        console.log("No cloud detection found")
      }

      // Fetch references status
      try {
        const refs = await getSelectedReferences(sessionId)
        setReferences(refs)
      } catch (e) {
        console.log("No references stack found")
      }

      // Fetch reconstruction status
      let rRun: any = null
      try {
        rRun = await getReconstructionStatus(sessionId)
        setReconRun(rRun)
      } catch (e) {
        console.log("No reconstruction status found")
      }

      // Fetch confidence status
      if (rRun && rRun.reconstruction_status === "COMPLETED") {
        try {
          const est = await getConfidenceEstimation(rRun.id)
          setEstimation(est)

          const rel = await getReliabilityScore(est.confidence_id)
          setReliability(rel)
        } catch (e) {
          console.log("No confidence parameters found")
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load comparison data.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadData(true)
    }
  }, [datasetId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Loading comparison data...
        </span>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-lg space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Could Not Load Comparison Data
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Comparison details for dataset ${datasetId} are unavailable.`}
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

  const isReconCompleted = reconRun && reconRun.reconstruction_status === "COMPLETED"

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="comparison"
      />

      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[{ label: "Comparison Engine" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Unified Comparison Engine
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {dataset.dataset_name}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadData(true)}
              className="p-1.5 border border-border bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all rounded-lg"
              title="Refresh parameters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

          </div>
        </div>

        {/* Reconstruction requirement warning */}
        {!isReconCompleted && (
          <div className="border border-amber-500/30 bg-amber-500/5 p-6 rounded-lg space-y-4 max-w-xl mx-auto text-center my-6">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
              AI Reconstruction Required
            </h3>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              The Comparison Engine synthesises reconstruction outputs with historical temporal observations and cloud coverage masks.
              Please complete the AI Reconstruction phase first before inspecting comparison workspaces.
            </p>
            <button
              onClick={() => router.push(`/datasets/${datasetId}/reconstruction`)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-background font-bold text-[10px] tracking-widest uppercase transition-all rounded-lg"
            >
              Open Reconstruction
            </button>
          </div>
        )}

        {isReconCompleted && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-border bg-card/25 p-4 rounded-lg relative overflow-hidden flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Original Scene</span>
                  <div className="text-xs font-bold text-foreground truncate max-w-[150px]" title={dataset.dataset_name}>
                    {dataset.dataset_name}
                  </div>
                </div>
                <Database className="w-8 h-8 text-primary/10 shrink-0" />
              </div>

              <div className="border border-border bg-card/25 p-4 rounded-lg relative overflow-hidden flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Cloud Burden Cover</span>
                  <div className="text-xs font-bold text-amber-500">
                    {cloudDetection ? `${(cloudDetection.cloud_coverage_percent || 0).toFixed(1)}%` : "N/A"}
                  </div>
                </div>
                <Cloud className="w-8 h-8 text-amber-500/10 shrink-0" />
              </div>

              <div className="border border-border bg-card/25 p-4 rounded-lg relative overflow-hidden flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Historical References</span>
                  <div className="text-xs font-bold text-pink-400">
                    {references ? `${references.length} observations` : "N/A"}
                  </div>
                </div>
                <Clock className="w-8 h-8 text-pink-500/10 shrink-0" />
              </div>

              <div className="border border-border bg-card/25 p-4 rounded-lg relative overflow-hidden flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Evaluation Grade</span>
                  <div className="text-xs font-bold text-emerald-400 uppercase">
                    {reliability?.dataset_reliability_tier || "N/A"} ({reliability?.dataset_reliability_score || 0}/100)
                  </div>
                </div>
                <Shield className="w-8 h-8 text-emerald-400/10 shrink-0" />
              </div>
            </div>

            {/* Workflow Diagram */}
            <WorkflowSummaryPanel
              currentActive="comparison"
              cloudStatus={cloudDetection ? "available" : "missing"}
              temporalStatus={references && references.length > 0 ? "available" : "missing"}
              reconstructionStatus={isReconCompleted ? "available" : "missing"}
              confidenceStatus={reliability ? "available" : "missing"}
            />

            {/* Workspace quick entry banner */}
            <div className="border border-border bg-gradient-to-r from-card/35 via-primary/5 to-card/35 p-6 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Visual Comparison Workspace
                </h3>
                <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                  Compare original, cloud-affected, reconstructed, reference, and confidence views with synchronized controls.
                </p>
              </div>
              <button
                onClick={() => router.push(`/datasets/${datasetId}/comparison/workspace`)}
                className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-background font-bold text-xs tracking-widest uppercase rounded-lg border border-primary/20 flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_-4px_rgba(6,182,212,0.4)]"
              >
                Open Comparison Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Comparison modes list grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Comparison Modes
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mode 1 */}
                <div
                  onClick={() => router.push(`/datasets/${datasetId}/comparison/original-vs-reconstruction`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-lg flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Original vs Reconstruction</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Inspect structural, geographic, and spectral changes between the original raw imagery and finalized generator composites.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open Comparison <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Mode 2 */}
                <div
                  onClick={() => router.push(`/datasets/${datasetId}/comparison/cloud-vs-reconstruction`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-lg flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Cloud Mask vs Reconstruction</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Verify that all pixels outlined by cloud detection and shadow masks have been realistically restored.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open Comparison <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Mode 3 */}
                <div
                  onClick={() => router.push(`/datasets/${datasetId}/comparison/reference-vs-reconstruction`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-lg flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Historical Reference vs Reconstruction</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Validate how closely the generative output matches the structural context of clean historic reference observations.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open Comparison <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Mode 4 */}
                <div
                  onClick={() => router.push(`/datasets/${datasetId}/comparison/confidence-vs-reconstruction`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-lg flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Confidence Overlay vs Reconstruction</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Analyze the pixel uncertainty levels and spatial reliability boundaries overlaying the optimized composite.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open Comparison <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
