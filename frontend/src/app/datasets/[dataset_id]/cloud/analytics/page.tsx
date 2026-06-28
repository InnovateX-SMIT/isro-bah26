"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  FileText,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  HelpCircle
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getCloudAnalytics } from "@/lib/cloud-api"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { CloudAnalyticsResponse } from "@/lib/types/cloud"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function CloudAnalyticsViewerPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [analytics, setAnalytics] = useState<CloudAnalyticsResponse | null>(null)

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

        try {
          const an = await getCloudAnalytics(datasetId)
          setAnalytics(an)
        } catch (err) {
          console.log("No cloud analytics run yet")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load cloud analytics telemetry.")
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
          Compiling Statistical Indicators...
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
            Analytics telemetry link failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Dataset data is unavailable. Run the required workflow step first."}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/cloud`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Cloud
        </button>
      </div>
    )
  }

  const hasAnalytics = analytics && analytics.analytics_status === "completed"

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="cloud"
      />
      
      {/* Central View Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Navigation Toolbar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/cloud`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Cloud</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Cloud Intelligence", href: `/datasets/${datasetId}/cloud` },
                { label: "Operational Analytics" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <FileText className="w-4.5 h-4.5 text-primary" />
              Cloud Analytics Synthesis Report
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-muted-foreground uppercase text-[9px] tracking-wider">
              REPORT: COMPILED
            </span>
          </div>
        </div>

        {hasAnalytics && analytics ? (
          <div className="space-y-6">
            
            {/* Core indicators row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="border border-border bg-card/30 p-4 rounded-lg space-y-1">
                <span className="text-muted-foreground uppercase text-[9px] block">Scene Complexity</span>
                <span className={`text-lg font-black block uppercase ${
                  analytics.scene_reconstruction_difficulty === "EXTREME" || analytics.scene_reconstruction_difficulty === "HIGH" 
                    ? "text-red-400 animate-pulse" 
                    : "text-primary"
                }`}>
                  {analytics.scene_reconstruction_difficulty || "LOW"}
                </span>
                <span className="text-muted-foreground text-[8.5px] font-sans">
                  Difficulty class based on size & distribution.
                </span>
              </div>
              <div className="border border-border bg-card/30 p-4 rounded-lg space-y-1">
                <span className="text-muted-foreground uppercase text-[9px] block">Cloud Burden Index</span>
                <span className="text-lg font-black text-amber-500 block">
                  {(analytics.cloud_burden_index || 0).toFixed(1)}/100
                </span>
                <span className="text-muted-foreground text-[8.5px] font-sans">
                  Operational burden score on multi-temporal models.
                </span>
              </div>
              <div className="border border-border bg-card/30 p-4 rounded-lg space-y-1">
                <span className="text-muted-foreground uppercase text-[9px] block">Intelligence Score</span>
                <span className="text-lg font-black text-emerald-400 block">
                  {(analytics.cloud_intelligence_score || 0).toFixed(1)}%
                </span>
                <span className="text-muted-foreground text-[8.5px] font-sans">
                  Model confidence in shape/class identification.
                </span>
              </div>
            </div>

            {/* Detailed metrics grouped */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Coverage & Object Count */}
              <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">
                  Object Area Statistics
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                    <span className="text-muted-foreground">Total Cloud Objects:</span>
                    <span className="font-bold text-foreground">{analytics.total_cloud_objects} regions</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                    <span className="text-muted-foreground">Reconstruction Target:</span>
                    <span className="font-bold text-foreground">{(analytics.reconstruction_target_percent || 0).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                    <span className="text-muted-foreground">Largest Object Size:</span>
                    <span className="font-bold text-foreground">{analytics.largest_cloud_object_pixels?.toLocaleString()} px</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                    <span className="text-muted-foreground">Mean Object Size:</span>
                    <span className="font-bold text-foreground">{(analytics.mean_cloud_object_pixels || 0).toFixed(0)} px</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Reconstruction Readiness:</span>
                    <span className="text-emerald-400 font-bold uppercase">{analytics.reconstruction_readiness ? "VERIFIED" : "PENDING"}</span>
                  </div>
                </div>
              </div>

              {/* Priority weights */}
              <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">
                  Restoration Object Priorities
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                    <span className="text-red-400 font-bold">High Priority (Thick/Large):</span>
                    <span className="font-bold text-foreground">{analytics.high_priority_objects || 0} regions</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                    <span className="text-amber-500 font-bold">Medium Priority (Thin/Medium):</span>
                    <span className="font-bold text-foreground">{analytics.medium_priority_objects || 0} regions</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400 font-bold">Low Priority (Cirrus/Small):</span>
                    <span className="font-bold text-foreground">{analytics.low_priority_objects || 0} regions</span>
                  </div>
                </div>
              </div>

            </div>

            {/* In-depth Synthesis summary report (parsed dict) */}
            {analytics.analytics_summary && Object.keys(analytics.analytics_summary).length > 0 && (
              <div className="border border-border bg-card/20 p-5 rounded-lg space-y-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">
                  Synthesis Intelligence Report Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-sans leading-relaxed text-slate-300">
                  {Object.entries(analytics.analytics_summary).map(([key, value]) => {
                    const cleanKey = key.replace(/_/g, " ").toUpperCase()
                    return (
                      <div key={key} className="bg-background/25 p-3 border border-border/40 rounded-lg font-mono text-[10px]">
                        <span className="text-primary font-bold block mb-1 text-[9px] tracking-wide">{cleanKey}</span>
                        <span className="text-slate-200">{String(value)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="border border-dashed border-border bg-card/10 p-8 rounded-lg text-center flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
            <HelpCircle className="w-6 h-6 text-amber-500 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              No Analytics Record
            </h4>
            <p className="text-[10px] text-muted-foreground font-sans leading-normal">
              Cloud analytics has not been compiled. Go Back to Cloud to run pipeline analytics.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
