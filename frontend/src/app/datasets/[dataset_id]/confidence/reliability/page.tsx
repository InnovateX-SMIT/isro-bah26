"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Shield,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Activity,
  Award
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getReconstructionStatus } from "@/lib/reconstruction-api"
import {
  getConfidenceEstimation,
  getReliabilityScore,
  getReliabilityMapUrl
} from "@/lib/confidence-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { ReconstructionRunResponse } from "@/lib/types/reconstruction"
import { ConfidenceEstimationResponse, ReliabilityScoreResponse } from "@/lib/types/confidence"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function ReliabilityMapViewerPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [reconRun, setReconRun] = useState<ReconstructionRunResponse | null>(null)
  const [estimation, setEstimation] = useState<ConfidenceEstimationResponse | null>(null)
  const [reliability, setReliability] = useState<ReliabilityScoreResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<"contain" | "actual">("contain")

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
            try {
              const rel = await getReliabilityScore(est.confidence_id)
              setReliability(rel)
            } catch (err) {
              console.log("Reliability score not found")
            }
          }
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load reliability map telemetry.")
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
          Resolving reliability metrics...
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
            Reliability map link failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Dataset data is unavailable. Run the required workflow step first."}
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

  const hasReliability = reliability && reliability.reliability_status === "completed"
  const reliabilityUrl = hasReliability ? getReliabilityMapUrl(reliability.reliability_id) : null
  const regionList = reliability?.region_reliability || []

  const getTierColor = (tier: string) => {
    switch (tier.toUpperCase()) {
      case "HIGH":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      case "MODERATE":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
      case "LOW":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30"
      case "VERY LOW":
      default:
        return "text-rose-400 bg-rose-500/10 border-rose-500/30"
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="confidence"
      />
      
      {/* Central view frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Toolbar Header */}
        <div className="p-4 border-b border-border bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                { label: "Reliability Map" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Activity className="w-4.5 h-4.5 text-primary animate-pulse" />
              Reliability Quality Map Viewer
            </h1>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-background border border-border p-1 rounded-lg">
              <button
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                disabled={zoom <= 0.5}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold px-2 text-foreground min-w-[40px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(4, prev + 0.25))}
                disabled={zoom >= 4}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <button
              onClick={() => {
                setZoom(1)
                setFitMode(fitMode === "contain" ? "actual" : "contain")
              }}
              className="px-3 py-1.5 border border-border hover:border-primary/50 text-[9px] font-bold uppercase transition-colors rounded-lg flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              {fitMode === "contain" ? "Actual Size" : "Fit Window"}
            </button>
          </div>
        </div>

        {/* Viewport split: Left image, right segmented regions */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left image area */}
          <div className="flex-1 bg-black/65 overflow-hidden relative flex items-center justify-center p-6 border-r border-border">
            <div className="absolute top-3 left-3 bg-background/85 border border-border px-2.5 py-1.5 rounded-lg text-[9px] text-slate-300 font-bold uppercase z-10 select-none space-y-2">
              <div>Reliability Map Legend</div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 bg-[#10b981] inline-block rounded-lg"></span>
                  <span className="text-[8px]">HIGH</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 bg-[#06b6d4] inline-block rounded-lg"></span>
                  <span className="text-[8px]">MODERATE</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 bg-[#f59e0b] inline-block rounded-lg"></span>
                  <span className="text-[8px]">LOW</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 bg-[#ef4444] inline-block rounded-lg"></span>
                  <span className="text-[8px]">VERY LOW</span>
                </div>
              </div>
            </div>

            {reliabilityUrl ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <img
                  src={reliabilityUrl}
                  alt="Reliability Map"
                  className="transition-transform duration-100 ease-out select-none shadow-[0_0_30px_rgba(0,0,0,0.85)] border border-border/40"
                  style={{
                    transform: `scale(${zoom})`,
                    maxHeight: fitMode === "contain" ? "400px" : "none",
                    maxWidth: fitMode === "contain" ? "100%" : "none",
                    objectFit: fitMode === "contain" ? "contain" : "none",
                  }}
                  draggable={false}
                />
              </div>
            ) : (
              <div className="border border-dashed border-border bg-card/10 p-8 rounded-lg text-center flex flex-col items-center justify-center space-y-3 max-w-sm">
                <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  No Reliability Map
                </h4>
                <p className="text-[10px] text-muted-foreground font-sans leading-normal">
                  Reliability scoring has not been completed. Go back to Confidence Overview to run pipeline.
                </p>
              </div>
            )}
          </div>

          {/* Right regions details */}
          <div className="w-full md:w-96 flex flex-col overflow-y-auto bg-card/5 font-mono">
            <div className="p-4 border-b border-border bg-muted/10">
              <span className="text-[9px] text-primary uppercase font-bold tracking-widest block">SEGMENT REGION REGISTRY</span>
              <h2 className="text-xs font-bold text-foreground uppercase mt-0.5">Segmented Cloud Regions</h2>
              <p className="text-[9.5px] text-muted-foreground font-sans leading-normal mt-1">
                Lists all evaluated reconstruction subgrids inside spatial cloud bounds.
              </p>
            </div>

            <div className="flex-1 p-3 space-y-2">
              {regionList.length > 0 ? (
                regionList.map((region) => (
                  <div key={region.region_id} className="border border-border/60 bg-background/40 p-2.5 rounded-lg flex items-center justify-between text-[10px]">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-200">REGION ID: #{region.region_id}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">Area: <span className="text-foreground font-semibold">{region.area_px} px</span></div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-emerald-400 font-bold">{(region.mean_confidence * 100).toFixed(1)}% CF</div>
                      <span className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold border ${getTierColor(region.reliability_tier)}`}>
                        {region.reliability_tier}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground text-[10px] font-sans">
                  No regions segmented for scoring.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom statistics panel */}
        {hasReliability && reliability && (
          <div className="p-4 bg-muted/15 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px]">
            <div>
              <span className="text-muted-foreground uppercase block">Scoring Method</span>
              <span className="text-foreground font-black uppercase text-xs">{reliability.scoring_method}</span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Dataset Score</span>
              <span className="text-emerald-400 font-black text-xs">
                {reliability.dataset_reliability_score !== null 
                  ? `${reliability.dataset_reliability_score}/100` 
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Recon Score</span>
              <span className="text-primary font-black text-xs">
                {reliability.reconstruction_reliability_score !== null 
                  ? `${reliability.reconstruction_reliability_score}/100` 
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Reliability Grade</span>
              <span className="text-cyan-400 font-black text-xs uppercase">
                {reliability.dataset_reliability_tier || "N/A"}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
