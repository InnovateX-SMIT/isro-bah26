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
  ChevronRight,
  PieChart,
  Grid
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getReconstructionStatus } from "@/lib/reconstruction-api"
import {
  getConfidenceEstimation,
  getReliabilityScore,
  getHeatmap,
  getAnalytics,
  getConfidenceReportFile
} from "@/lib/confidence-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
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

export default function ConfidenceAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [reconRun, setReconRun] = useState<ReconstructionRunResponse | null>(null)
  const [estimation, setEstimation] = useState<ConfidenceEstimationResponse | null>(null)
  const [reliability, setReliability] = useState<ReliabilityScoreResponse | null>(null)
  const [heatmap, setHeatmap] = useState<ConfidenceHeatmapResponse | null>(null)
  const [analytics, setAnalytics] = useState<ConfidenceAnalyticsResponse | null>(null)
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
                  const an = await getAnalytics(heat.heatmap_id)
                  setAnalytics(an)

                  const rep = await getConfidenceReportFile(heat.heatmap_id)
                  setReport(rep)
                } catch (err) {
                  console.log("Analytics or report file missing")
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load confidence analytics data.")
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
          Syncing analytical metrics...
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
            Analytics link failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Analytics Dataset data is unavailable. Run the required workflow step first."}
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

  const isAnalyticsAvailable = analytics && analytics.analytics_status === "completed"

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
                { label: "Confidence Analytics" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <PieChart className="w-4.5 h-4.5 text-primary animate-pulse" />
              Confidence Analytics Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
            <span className={`w-1.5 h-1.5 rounded-full ${isAnalyticsAvailable ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`}></span>
            <span className="text-muted-foreground uppercase text-[9px] tracking-wider">
              {isAnalyticsAvailable ? "ANALYTICS: LOADED" : "ANALYTICS: PENDING"}
            </span>
          </div>
        </div>

        {/* Narrative Headline */}
        {analytics?.headline_summary && (
          <div className="border border-border bg-card/25 p-4 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
              Operational Guideline
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              AI Evaluated Confidence Summary
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300 font-sans mt-2 border-t border-border/20 pt-2">
              "{analytics.headline_summary}"
            </p>
          </div>
        )}

        {isAnalyticsAvailable ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Graphical progress metrics and table breakdown */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Statistical Progress Metrics */}
              <div className="border border-border bg-card/20 p-5 rounded-lg space-y-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-primary" />
                  Key Parameter Metrics
                </h3>
                
                <div className="space-y-4 border-t border-border/20 pt-3">
                  {/* Metric 1 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Mean Confidence Level</span>
                      <span className="font-bold text-emerald-400">
                        {estimation?.mean_confidence_score !== null 
                          ? `${(estimation!.mean_confidence_score! * 100).toFixed(1)}%` 
                          : "0%"}
                      </span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 border border-border/50 rounded-lg overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        style={{ width: `${(estimation?.mean_confidence_score || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Dataset Reliability Score</span>
                      <span className="font-bold text-cyan-400">
                        {reliability?.dataset_reliability_score !== null 
                          ? `${reliability!.dataset_reliability_score}%` 
                          : "0%"}
                      </span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 border border-border/50 rounded-lg overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-full transition-all duration-500" 
                        style={{ width: `${reliability?.dataset_reliability_score || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Reconstruction Reliability Score</span>
                      <span className="font-bold text-primary">
                        {reliability?.reconstruction_reliability_score !== null 
                          ? `${reliability!.reconstruction_reliability_score}%` 
                          : "0%"}
                      </span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 border border-border/50 rounded-lg overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-500" 
                        style={{ width: `${reliability?.reconstruction_reliability_score || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 4 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">Low Confidence Spatial Area</span>
                      <span className="font-bold text-rose-400">
                        {estimation?.low_confidence_area_percent !== null 
                          ? `${estimation!.low_confidence_area_percent!.toFixed(1)}%` 
                          : "0%"}
                      </span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 border border-border/50 rounded-lg overflow-hidden">
                      <div 
                        className="bg-rose-500 h-full transition-all duration-500" 
                        style={{ width: `${estimation?.low_confidence_area_percent || 0}%` }}
                      ></div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Segmented Region Detailed Table */}
              <div className="border border-border bg-card/20 p-5 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                  Segment Subgrid Classification Report
                </h3>
                <div className="overflow-x-auto border-t border-border/20 pt-3">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground uppercase text-[8px]">
                        <th className="py-2">Region ID</th>
                        <th className="py-2">Pixel Area Size</th>
                        <th className="py-2">Mean Confidence</th>
                        <th className="py-2">Reliability Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {reliability?.region_reliability && reliability.region_reliability.length > 0 ? (
                        reliability.region_reliability.map((reg) => (
                          <tr key={reg.region_id} className="hover:bg-muted/10">
                            <td className="py-2.5 font-bold text-slate-200">#{reg.region_id}</td>
                            <td className="py-2.5 text-slate-300">{reg.area_px} px</td>
                            <td className="py-2.5 text-emerald-400 font-bold">{(reg.mean_confidence * 100).toFixed(1)}%</td>
                            <td className="py-2.5">
                              <span className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold border ${
                                reg.reliability_tier === "High" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" :
                                reg.reliability_tier === "Moderate" ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5" :
                                reg.reliability_tier === "Low" ? "text-amber-400 border-amber-500/30 bg-amber-500/5" :
                                "text-rose-400 border-rose-500/30 bg-rose-500/5"
                              }`}>
                                {reg.reliability_tier}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-muted-foreground font-sans">
                            No region grids evaluated in reliability scoring.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column: Execution Information & Files */}
            <div className="space-y-6">
              
              {/* Telemetry settings */}
              <div className="border border-border bg-card/20 p-5 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" />
                  Telemetry Registry
                </h3>
                <div className="space-y-2 border-t border-border/20 pt-3 text-[10px]">
                  <div className="space-y-1 border-b border-border/10 pb-2">
                    <span className="text-slate-400 block uppercase text-[9px]">Estimation Run method:</span>
                    <span className="font-bold text-slate-200">{estimation?.confidence_method || "N/A"}</span>
                  </div>
                  <div className="space-y-1 border-b border-border/10 pb-2">
                    <span className="text-slate-400 block uppercase text-[9px]">Reliability scoring strategy:</span>
                    <span className="font-bold text-slate-200">{reliability?.scoring_method || "N/A"}</span>
                  </div>
                  <div className="space-y-1 border-b border-border/10 pb-2">
                    <span className="text-slate-400 block uppercase text-[9px]">Heatmap compilation:</span>
                    <span className="font-bold text-slate-200">{heatmap?.heatmap_method || "N/A"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block uppercase text-[9px]">Analytics registry:</span>
                    <span className="font-bold text-slate-200">{analytics?.analytics_method || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Parsed files download list */}
              <div className="border border-border bg-card/20 p-5 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Generated Artifacts
                </h3>
                <p className="text-[10px] text-muted-foreground font-sans">
                  Files compiled to disk by backend evaluation processes:
                </p>

                <div className="space-y-2.5 border-t border-border/20 pt-3 text-[10px]">
                  {analytics?.confidence_report_path && (
                    <div className="flex items-center justify-between border-b border-border/10 pb-2">
                      <div className="truncate pr-4">
                        <span className="font-bold text-slate-200 block truncate" title={analytics.confidence_report_path}>
                          confidence_report.json
                        </span>
                        <span className="text-[8.5px] text-muted-foreground select-all truncate block">
                          {analytics.confidence_report_path}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  )}

                  {analytics?.confidence_summary_path && (
                    <div className="flex items-center justify-between border-b border-border/10 pb-2">
                      <div className="truncate pr-4">
                        <span className="font-bold text-slate-200 block truncate" title={analytics.confidence_summary_path}>
                          confidence_summary.json
                        </span>
                        <span className="text-[8.5px] text-muted-foreground select-all truncate block">
                          {analytics.confidence_summary_path}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  )}

                  {analytics?.reliability_scorecard_path && (
                    <div className="flex items-center justify-between">
                      <div className="truncate pr-4">
                        <span className="font-bold text-slate-200 block truncate" title={analytics.reliability_scorecard_path}>
                          reliability_scorecard.json
                        </span>
                        <span className="text-[8.5px] text-muted-foreground select-all truncate block">
                          {analytics.reliability_scorecard_path}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="border border-dashed border-border bg-card/10 p-12 rounded-lg text-center flex flex-col items-center justify-center space-y-3 max-w-md mx-auto my-12">
            <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Analytics Telemetry Pending
            </h4>
            <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
              Confidence Analytics maps and reports have not been completed. Go back to Confidence Overview to execute pipeline.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
