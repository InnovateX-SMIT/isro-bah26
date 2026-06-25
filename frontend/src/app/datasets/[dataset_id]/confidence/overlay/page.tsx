"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Layers,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Sparkles,
  Database
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getReconstructionStatus } from "@/lib/reconstruction-api"
import { getDatasetPreviewImageUrl } from "@/lib/dataset-preview-api"
import {
  getConfidenceEstimation,
  getReliabilityScore,
  getConfidenceOverlayUrl
} from "@/lib/confidence-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { ReconstructionRunResponse } from "@/lib/types/reconstruction"
import { ConfidenceEstimationResponse, ReliabilityScoreResponse } from "@/lib/types/confidence"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function ConfidenceOverlayPage() {
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
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Overlay states
  const [opacity, setOpacity] = useState(0.6)
  const [baseLayer, setBaseLayer] = useState<"original" | "reconstructed">("reconstructed")

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
        setError(err.message || "Failed to load overlay parameters.")
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
          Loading composition parameters...
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
            Overlay parameters failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Overlay configurations for the requested dataset are unreachable."}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/confidence`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Confidence Workspace
        </button>
      </div>
    )
  }

  const hasReliability = reliability && reliability.reliability_status === "completed"
  const overlayUrl = hasReliability ? getConfidenceOverlayUrl(reliability.reliability_id) : null

  // Build base image source
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  const originalPreviewUrl = getDatasetPreviewImageUrl(datasetId)
  const reconstructedPreviewUrl = reconRun 
    ? (reconRun.optimization_status === "COMPLETED" 
        ? `${API_URL}/api/v1/reconstruction/${reconRun.session_id}/optimized-preview`
        : `${API_URL}/api/v1/reconstruction/${reconRun.session_id}/preview`)
    : ""

  const baseImageUrl = baseLayer === "original" ? originalPreviewUrl : reconstructedPreviewUrl

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      
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
              <span>Back to Confidence Workspace</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Confidence Intelligence", href: `/datasets/${datasetId}/confidence` },
                { label: "Opacity Overlay" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Layers className="w-4.5 h-4.5 text-primary animate-pulse" />
              Confidence Opacity Overlay Viewer
            </h1>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Base Layer Switcher */}
            <div className="flex items-center space-x-1 bg-background border border-border p-0.5 rounded-sm">
              <button
                onClick={() => setBaseLayer("original")}
                className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                  baseLayer === "original"
                    ? "bg-primary text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Database className="w-3 h-3" />
                Original
              </button>
              <button
                onClick={() => setBaseLayer("reconstructed")}
                className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                  baseLayer === "reconstructed"
                    ? "bg-primary text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Reconstructed
              </button>
            </div>

            {/* Opacity Control */}
            <div className="flex items-center space-x-2 bg-background border border-border px-3 py-1.5 rounded-sm">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] text-muted-foreground uppercase">Opacity:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-20 accent-primary cursor-pointer h-1 rounded-lg bg-border appearance-none"
              />
              <span className="text-[10px] font-bold text-foreground w-8 text-right">
                {Math.round(opacity * 100)}%
              </span>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center space-x-1 bg-background border border-border p-1 rounded-sm">
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
              className="px-3 py-1.5 border border-border hover:border-primary/50 text-[9px] font-bold uppercase transition-colors rounded-sm flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              {fitMode === "contain" ? "Actual Size" : "Fit Window"}
            </button>
          </div>
        </div>

        {/* Confidence Overlay Composition Viewport */}
        <div className="flex-1 bg-black/65 overflow-hidden relative flex items-center justify-center p-6">
          <div className="absolute top-3 left-3 bg-background/85 border border-border px-2.5 py-1 rounded-sm text-[9px] text-slate-300 font-bold uppercase z-10 select-none space-y-1">
            <div>Composition Overlay Mode</div>
            <div className="text-[8px] text-muted-foreground uppercase">
              Base: {baseLayer === "original" ? "Original Bands preview" : "Optimized AI Reconstruction"}
            </div>
          </div>

          {overlayUrl && baseImageUrl ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div 
                className="relative select-none shadow-[0_0_30px_rgba(0,0,0,0.85)] border border-border/40"
                style={{
                  transform: `scale(${zoom})`,
                  height: fitMode === "contain" ? "400px" : "none",
                  width: fitMode === "contain" ? "400px" : "none",
                  transition: "transform 100ms ease-out"
                }}
              >
                {/* Base Image */}
                <img
                  src={baseImageUrl}
                  alt="Base Layer Preview"
                  className="w-full h-full object-contain absolute top-0 left-0"
                  draggable={false}
                />
                
                {/* Confidence Overlaid Map */}
                <img
                  src={overlayUrl}
                  alt="Confidence Overlay Map"
                  className="w-full h-full object-contain absolute top-0 left-0 mix-blend-screen"
                  style={{ opacity: opacity }}
                  draggable={false}
                />
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border bg-card/10 p-8 rounded-sm text-center flex flex-col items-center justify-center space-y-3 max-w-sm">
              <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Composition Elements Missing
              </h4>
              <p className="text-[10px] text-muted-foreground font-sans leading-normal">
                Make sure the AI Reconstruction and Reliability Scenarios have both run successfully.
              </p>
            </div>
          )}
        </div>

        {/* Bottom statistics panel */}
        {reliability && (
          <div className="p-4 bg-muted/15 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px]">
            <div>
              <span className="text-muted-foreground uppercase block">Base Layer Source</span>
              <span className="text-foreground font-black uppercase text-xs">
                {baseLayer === "original" ? "Original Composite" : "AI Reconstruction"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Overlay Reliability Grade</span>
              <span className="text-cyan-400 font-black text-xs uppercase">
                {reliability.dataset_reliability_tier || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Dataset Reliability Score</span>
              <span className="text-emerald-400 font-black text-xs">
                {reliability.dataset_reliability_score !== null 
                  ? `${reliability.dataset_reliability_score}/100` 
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Composite Status</span>
              <span className="text-foreground font-black text-xs uppercase">
                Ready for Inspection
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Sidebar Panel */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="confidence"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
    </div>
  )
}
