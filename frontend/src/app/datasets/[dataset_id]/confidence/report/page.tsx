"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  FileText,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Shield,
  Activity,
  Award,
  Globe,
  Printer
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getReconstructionStatus } from "@/lib/reconstruction-api"
import {
  getConfidenceEstimation,
  getReliabilityScore,
  getHeatmap,
  getConfidenceReportFile
} from "@/lib/confidence-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { ReconstructionRunResponse } from "@/lib/types/reconstruction"
import {
  ConfidenceEstimationResponse,
  ReliabilityScoreResponse,
  ConfidenceHeatmapResponse,
  ConfidenceReport
} from "@/lib/types/confidence"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function ConfidenceReportPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [reconRun, setReconRun] = useState<ReconstructionRunResponse | null>(null)
  const [estimation, setEstimation] = useState<ConfidenceEstimationResponse | null>(null)
  const [reliability, setReliability] = useState<ReliabilityScoreResponse | null>(null)
  const [heatmap, setHeatmap] = useState<ConfidenceHeatmapResponse | null>(null)
  const [report, setReport] = useState<ConfidenceReport | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const ds = await getDataset(datasetId)
        setDataset(ds)

        try {
          const meta = await getDatasetMetadata(datasetId)
          setMetadata(meta)
        } catch (err) {
          console.log("No metadata extracted yet")
        }

        let rRun: ReconstructionRunResponse | null = null
        try {
          rRun = await getReconstructionStatus(ds.analysis_session_id)
          setReconRun(rRun)
        } catch (err) {
          console.log("Reconstruction run not found")
        }

        if (rRun && rRun.reconstruction_status === "COMPLETED") {
          let est: ConfidenceEstimationResponse | null = null
          try {
            est = await getConfidenceEstimation(rRun.id)
            setEstimation(est)
          } catch (err) {
            console.log("Confidence estimation not found")
          }

          if (est) {
            let rel: ReliabilityScoreResponse | null = null
            try {
              rel = await getReliabilityScore(est.confidence_id)
              setReliability(rel)
            } catch (err) {
              console.log("Reliability score not found")
            }

            if (rel) {
              let heat: ConfidenceHeatmapResponse | null = null
              try {
                heat = await getHeatmap(rel.reliability_id)
                setHeatmap(heat)
              } catch (err) {
                console.log("Heatmap not found")
              }

              if (heat) {
                try {
                  const rep = await getConfidenceReportFile(heat.heatmap_id)
                  setReport(rep)
                } catch (err) {
                  console.log("Report file missing")
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load confidence report data.")
      } finally {
        setLoading(false)
      }
    }
    if (datasetId) {
      loadData()
    }
  }, [datasetId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Formatting executive report...
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
            Report sync lock failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Report details for the requested dataset are unreachable."}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/confidence`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Confidence
        </button>
      </div>
    )
  }

  const isReportAvailable = report !== null

  // Calculate Region Tier counts
  const regions = report?.reliability?.region_reliability || []
  const tierCounts: Record<string, number> = { HIGH: 0, MODERATE: 0, LOW: 0, "VERY LOW": 0 }
  regions.forEach((r) => {
    const tier = (r.reliability_tier || "LOW").toUpperCase()
    if (tierCounts[tier] !== undefined) {
      tierCounts[tier]++
    } else {
      tierCounts[tier] = 1
    }
  })

  const reliabilityScore = report?.reliability?.dataset_reliability_score || 0
  const meanConfidence = report?.confidence?.mean_confidence_score !== null 
    ? (report!.confidence!.mean_confidence_score! * 100).toFixed(1) 
    : "0.0"

  const lowTrustPercent = report?.confidence?.low_confidence_area_percent !== null 
    ? report!.confidence!.low_confidence_area_percent!.toFixed(1) 
    : "0.0"

  const getSystemRecommendation = (score: number) => {
    if (score >= 80) {
      return "RESTORED RASTER GRID DEEMED HIGHLY RELIABLE. Recommended for downstream analytical pipelines, change detection, and classification operations without further modifications."
    } else if (score >= 60) {
      return "MODERATE RESTORED CONFIDENCE. Caution is recommended during structural/edge-sensitive analytics. Operational algorithms should verify boundaries against historical candidates."
    } else {
      return "LOW RESTORED CONFIDENCE. Reconstruction margins contain high pixel uncertainty. Recommended for general visual briefing only; downstream automated analytics or model training may suffer significant error rates."
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="confidence"
      />
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/confidence`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Confidence</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Confidence Intelligence", href: `/datasets/${datasetId}/confidence` },
                { label: "Executive Report" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <FileText className="w-4.5 h-4.5 text-primary animate-pulse" />
              Executive Confidence Assessment Report
            </h1>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-border hover:border-primary/50 text-[9px] font-bold uppercase transition-colors rounded-lg flex items-center gap-1.5 bg-muted/20 hover:bg-muted/30"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            Print Report
          </button>
        </div>

        {isReportAvailable ? (
          <div className="max-w-4xl mx-auto w-full bg-slate-950/80 border border-border p-8 rounded-lg space-y-8 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none">
            
            {/* EO Official watermark outline */}
            <div className="absolute top-0 right-0 bg-primary/5 border-l border-b border-border px-3 py-1 text-[9px] text-primary font-bold tracking-widest uppercase select-none print:hidden">
              EO WORKSTATION SECURITY RATING // UNCLASSIFIED
            </div>

            {/* Document Title / Stamps */}
            <div className="border-b-2 border-primary/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="text-[10px] text-primary font-extrabold uppercase tracking-widest">
                  National Earth Observation Reconstruction Registry
                </div>
                <h2 className="text-lg font-bold text-foreground uppercase tracking-wide print:text-black">
                  Confidence Uncertainty & Reliability Profile
                </h2>
                <div className="text-[9px] text-muted-foreground uppercase">
                  Target Dataset: <span className="text-foreground font-semibold select-all print:text-black">{dataset.dataset_name}</span>
                </div>
              </div>

              <div className="bg-muted/20 border border-border/80 p-3 rounded-lg text-[9.5px] space-y-1 print:border-black print:text-black">
                <div>
                  <span className="text-muted-foreground block text-[8px] uppercase">REPORT VERSION:</span>
                  <span className="font-bold text-slate-200 print:text-black">{report.report_metadata.report_version || "1.0.0"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[8px] uppercase">STAMP TIMESTAMP:</span>
                  <span className="font-bold text-slate-200 print:text-black">{report.report_metadata.timestamp_utc || "UTC"}</span>
                </div>
              </div>
            </div>

            {/* Section 1: Executive Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/40 pb-1 flex items-center gap-1.5 print:text-black print:border-black">
                <Globe className="w-4.5 h-4.5 text-primary print:text-black" />
                1.0 Executive Summary
              </h3>
              <p className="text-[11px] leading-relaxed text-slate-300 font-sans print:text-black">
                This diagnostic document details the mathematical uncertainty assessment and spatial reliability grades compiled for the generative cloud-reconstruction framework executed on dataset <b>{dataset.dataset_name}</b>. Evaluation procedures compute spatial pixel confidence scores by auditing reference band structures, temporal reference weights, and cloud boundary gradients.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-300 font-sans print:text-black">
                The reconstructed area exhibits a mean confidence rate of <b>{meanConfidence}%</b>, with approximately <b>{lowTrustPercent}%</b> of pixels categorized under low-confidence margins (uncertainty thresholds &lt; 50%). Based on these metrics, the overall dataset reliability rating is compiled at <b>{reliabilityScore}/100</b>, establishing an operational grade of <b>{report.reliability.dataset_reliability_tier || "N/A"}</b>.
              </p>
            </div>

            {/* Scorecard grids */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-border/60 bg-background/50 p-4 rounded-lg space-y-1.5 print:border-black print:text-black">
                <span className="text-[8.5px] text-muted-foreground uppercase">Mean Confidence</span>
                <div className="text-xl font-bold text-emerald-400 print:text-black">{meanConfidence}%</div>
                <div className="text-[8px] text-muted-foreground uppercase leading-normal">
                  Weighted pixel reconstruction certainty rate.
                </div>
              </div>

              <div className="border border-border/60 bg-background/50 p-4 rounded-lg space-y-1.5 print:border-black print:text-black">
                <span className="text-[8.5px] text-muted-foreground uppercase">Low-Trust Margin</span>
                <div className="text-xl font-bold text-rose-400 print:text-black">{lowTrustPercent}%</div>
                <div className="text-[8px] text-muted-foreground uppercase leading-normal">
                  Raster ratio under uncertainty margin thresholds.
                </div>
              </div>

              <div className="border border-border/60 bg-background/50 p-4 rounded-lg space-y-1.5 print:border-black print:text-black">
                <span className="text-[8.5px] text-muted-foreground uppercase">Reliability Grade</span>
                <div className="text-xl font-bold text-cyan-400 uppercase print:text-black">
                  {report.reliability.dataset_reliability_tier || "N/A"}
                </div>
                <div className="text-[8px] text-muted-foreground uppercase leading-normal">
                  Overall operational reliability tier rating.
                </div>
              </div>
            </div>

            {/* Section 2: Uncertainty Evaluation Parameters */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/40 pb-1 flex items-center gap-1.5 print:text-black print:border-black">
                <Shield className="w-4.5 h-4.5 text-primary print:text-black" />
                2.0 Uncertainty Estimation Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] bg-background/30 p-4 border border-border/40 rounded-lg print:border-black print:text-black">
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px]">Confidence Estimation ID:</span>
                    <span className="text-slate-200 font-bold block select-all print:text-black">{report.confidence.confidence_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px]">Inference Evaluation Method:</span>
                    <span className="text-slate-200 font-bold block print:text-black">{report.confidence.confidence_status || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px]">Spatial Heatmap Method:</span>
                    <span className="text-slate-200 font-bold block print:text-black">{report.heatmap.heatmap_method || "N/A"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px]">Inference Evaluation Basis:</span>
                    <span className="text-slate-200 font-bold block print:text-black truncate" title={report.confidence.inference_basis}>
                      {report.confidence.inference_basis || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px]">Scoring System Basis:</span>
                    <span className="text-slate-200 font-bold block print:text-black truncate" title={report.reliability.scoring_basis}>
                      {report.reliability.scoring_basis || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px]">Creation Stamp:</span>
                    <span className="text-slate-200 font-bold block print:text-black">{report.confidence.created_at || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Region Segment Reliability Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/40 pb-1 flex items-center gap-1.5 print:text-black print:border-black">
                <Activity className="w-4.5 h-4.5 text-primary print:text-black" />
                3.0 Region Segment Reliability Analysis
              </h3>
              <p className="text-[11px] leading-relaxed text-slate-300 font-sans print:text-black">
                Analysis of cloud coverage boundaries identifies <b>{regions.length}</b> distinct reconstructed subgrid patches. Segmented subgrids are classified into reliability tiers using confidence scores:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                <div className="border border-border/40 p-3 text-center bg-background/25 rounded-lg print:border-black print:text-black">
                  <span className="text-[#10b981] font-bold block">HIGH TIER</span>
                  <span className="text-lg font-bold block text-slate-200 print:text-black">{tierCounts["HIGH"]}</span>
                  <span className="text-[8px] text-muted-foreground block">regions</span>
                </div>
                <div className="border border-border/40 p-3 text-center bg-background/25 rounded-lg print:border-black print:text-black">
                  <span className="text-[#06b6d4] font-bold block">MODERATE TIER</span>
                  <span className="text-lg font-bold block text-slate-200 print:text-black">{tierCounts["MODERATE"]}</span>
                  <span className="text-[8px] text-muted-foreground block">regions</span>
                </div>
                <div className="border border-border/40 p-3 text-center bg-background/25 rounded-lg print:border-black print:text-black">
                  <span className="text-[#f59e0b] font-bold block">LOW TIER</span>
                  <span className="text-lg font-bold block text-slate-200 print:text-black">{tierCounts["LOW"]}</span>
                  <span className="text-[8px] text-muted-foreground block">regions</span>
                </div>
                <div className="border border-border/40 p-3 text-center bg-background/25 rounded-lg print:border-black print:text-black">
                  <span className="text-[#ef4444] font-bold block">VERY LOW TIER</span>
                  <span className="text-lg font-bold block text-slate-200 print:text-black">{tierCounts["VERY LOW"]}</span>
                  <span className="text-[8px] text-muted-foreground block">regions</span>
                </div>
              </div>
            </div>

            {/* Section 4: Recommendations */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/40 pb-1 flex items-center gap-1.5 print:text-black print:border-black">
                <Award className="w-4.5 h-4.5 text-primary print:text-black" />
                4.0 Actionable Recommendations
              </h3>
              <div className="border border-primary/30 bg-primary/5 p-4 rounded-lg text-[11px] leading-relaxed font-sans text-slate-300 print:border-black print:bg-white print:text-black">
                <b>RECOMMENDED PATHWAY:</b>
                <p className="mt-1.5">
                  {getSystemRecommendation(reliabilityScore)}
                </p>
                <div className="mt-4 border-t border-border/20 pt-3 text-[9px] font-mono text-muted-foreground flex justify-between items-center print:border-black print:text-black">
                  <span>REGISTRY APPROVAL: SYSTEM GENERATED</span>
                  <span>SECURITY LEVEL: CLASS-A INTEL</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="border border-dashed border-border bg-card/10 p-12 rounded-lg text-center flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto my-12">
            <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Report File Standby
            </h4>
            <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
              Confidence report has not been compiled. Go back to Confidence Overview to execute pipeline.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
