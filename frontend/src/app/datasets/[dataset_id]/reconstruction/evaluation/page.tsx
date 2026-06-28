"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Activity,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Info
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getEvaluationReport, getEvaluationScorecard } from "@/lib/reconstruction-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { EvaluationReport, ReconstructionScorecard } from "@/lib/types/reconstruction"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function ReconstructionEvaluationPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [report, setReport] = useState<EvaluationReport | null>(null)
  const [scorecard, setScorecard] = useState<ReconstructionScorecard | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
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

        try {
          const rep = await getEvaluationReport(ds.analysis_session_id)
          setReport(rep)
          const sc = await getEvaluationScorecard(ds.analysis_session_id)
          setScorecard(sc)
        } catch (err: any) {
          console.error(err)
          setError(err.message || "Quality scorecard report not found. Execute evaluation scoring first.")
        }

      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load Evaluation workspace.")
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
          Resolving Quality Scorecard...
        </span>
      </div>
    )
  }

  if (error || !dataset || !report || !scorecard) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-lg space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Could Not Load Quality Scorecard
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Evaluation report details for dataset ${datasetId} are unreachable.`}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/reconstruction`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Overview
        </button>
      </div>
    )
  }

  const overallScore = report.evaluation_metrics.overall_score
  const overallGrade = scorecard.overall_grade

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="reconstruction"
      />
      
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Header Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/reconstruction`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Reconstruction Hub</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Reconstruction", href: `/datasets/${datasetId}/reconstruction` },
                { label: "Evaluation Report" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Activity className="w-4.5 h-4.5 text-primary" />
              Quantitative Reconstruction Quality Scorecard
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-[10px] border border-border px-3 py-1 bg-muted/20 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300 uppercase text-[9px] tracking-wider">ASSESSMENT COMPLETE</span>
          </div>
        </div>

        {/* Core summary panel (Overall grade + score) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="border border-border bg-card/25 p-5 rounded-lg flex items-center justify-between col-span-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase font-bold">
              Grade
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Overall Quality Assessment</span>
              <div className="text-2xl font-black text-cyan-400">{overallScore}/100</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Class: {report.overall_assessment}
              </div>
            </div>
            <div className="text-4xl font-black text-primary border border-primary/20 bg-primary/5 px-4 py-2 rounded-lg shadow-[0_0_15px_-4px_rgba(6,182,212,0.45)]">
              {overallGrade}
            </div>
          </div>

          <div className="border border-border bg-card/25 p-5 rounded-lg col-span-2 space-y-2 relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase font-bold">
              Summary
            </div>
            <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />
              Machine-Generated Briefing
            </h3>
            <p className="text-[10.5px] leading-relaxed text-slate-300 font-sans italic">
              "Achieved an overall quality score of {overallScore}/100. Structural edge Guided Filtering preservation rating is at {report.evaluation_metrics.structural_preservation_score.toFixed(1)}% with an overall texture similarity artifact index of {report.evaluation_metrics.artifact_score.toFixed(1)}%."
            </p>
          </div>

        </div>

        {/* Detailed Metrics Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left panel: Metric scoring breakdown */}
          <div className="lg:col-span-3 border border-border bg-card/20 p-5 rounded-lg space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest">Metric Scorecard Details</h2>
            
            <div className="border border-border/40 rounded-lg overflow-hidden bg-background/20 text-[11px]">
              <div className="grid grid-cols-4 bg-muted/40 text-[9px] font-bold uppercase tracking-wider p-2.5 border-b border-border/40 text-slate-400">
                <div className="col-span-2">Quality Criterion</div>
                <div className="text-center">Score</div>
                <div className="text-right">Letter Grade</div>
              </div>
              
              <div className="divide-y divide-border/10">
                
                {Object.entries(scorecard.grades).map(([metric, grade]) => {
                  let val = 0
                  const k = metric.toLowerCase()
                  if (k.includes("coverage")) val = report.evaluation_metrics.reconstruction_coverage
                  else if (k.includes("completeness")) val = report.evaluation_metrics.completeness_score
                  else if (k.includes("spatial")) val = report.evaluation_metrics.spatial_consistency_score
                  else if (k.includes("boundary")) val = report.evaluation_metrics.boundary_quality_score
                  else if (k.includes("temporal")) val = report.evaluation_metrics.temporal_agreement_score
                  else if (k.includes("structural")) val = report.evaluation_metrics.structural_preservation_score
                  else if (k.includes("artifact")) val = report.evaluation_metrics.artifact_score

                  return (
                    <div key={metric} className="grid grid-cols-4 items-center p-2.5 hover:bg-muted/10">
                      <div className="col-span-2 font-bold text-slate-300">{metric}</div>
                      <div className="text-center text-slate-100 font-bold">{val.toFixed(1)}%</div>
                      <div className="text-right">
                        <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-lg ${
                          grade.includes("A") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                          grade.includes("B") ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                        }`}>
                          {grade}
                        </span>
                      </div>
                    </div>
                  )
                })}
                
              </div>
            </div>
          </div>

          {/* Right panel: Strengths, Weaknesses, Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Strengths */}
            <div className="border border-border bg-card/25 p-5 rounded-lg space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-emerald-400" />
                SYSTEM STRENGTHS
              </h3>
              <ul className="space-y-2 text-[10.5px] text-slate-300 font-sans list-disc list-inside">
                {report.strengths.map((str, idx) => (
                  <li key={idx} className="leading-relaxed">{str}</li>
                ))}
              </ul>
            </div>

            {/* Weaknesses & Recommendations */}
            <div className="border border-border bg-card/25 p-5 rounded-lg space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <ThumbsDown className="w-4 h-4 text-amber-500" />
                WEAKNESSES & RECOMMENDATIONS
              </h3>
              
              {report.weaknesses.length === 0 ? (
                <p className="text-[10px] text-muted-foreground font-sans">No notable weaknesses identified during quantitative evaluation scans.</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[8.5px] text-muted-foreground uppercase tracking-widest font-bold block">Observations</span>
                    <ul className="space-y-1 text-[10px] text-slate-400 font-sans list-disc list-inside">
                      {report.weaknesses.map((wk, idx) => (
                        <li key={idx}>{wk}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/10">
                    <span className="text-[8.5px] text-muted-foreground uppercase tracking-widest font-bold block">Actionable recommendations</span>
                    <ul className="space-y-1 text-[10px] text-cyan-400 font-sans list-disc list-inside">
                      {report.recommendations.map((rec, idx) => (
                        <li key={idx} className="italic">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
