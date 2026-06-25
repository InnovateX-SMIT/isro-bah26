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
  Minimize2
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getReconstructionPreviewUrl, getReconstructionStatus } from "@/lib/reconstruction-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { ReconstructionRunResponse } from "@/lib/types/reconstruction"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function BaselineReconstructionResultPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [reconstructRun, setReconstructRun] = useState<ReconstructionRunResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Zoom interactive state
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<"contain" | "cover" | "actual">("contain")

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
          const run = await getReconstructionStatus(ds.analysis_session_id)
          setReconstructRun(run)
        } catch (err: any) {
          console.error(err)
          setError(err.message || "No completed reconstruction run found. Run reconstruction first.")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load Reconstruction parameters.")
      } finally {
        setLoading(false)
      }
    }
    if (datasetId) {
      loadData()
    }
  }, [datasetId])

  const handleZoomIn = () => setZoom(prev => Math.min(4, prev + 0.25))
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.25))
  const handleResetZoom = () => {
    setZoom(1)
    setFitMode("contain")
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Acquiring Baseline Output Imagery...
        </span>
      </div>
    )
  }

  if (error || !dataset || !reconstructRun) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-sm space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Imagery Link Failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Reconstruction preview for dataset ${datasetId} is unavailable.`}
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

  const imageUrl = getReconstructionPreviewUrl(dataset.analysis_session_id)

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Toolbar */}
        <div className="p-4 border-b border-border bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                { label: "Baseline Frame" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Layers className="w-4.5 h-4.5 text-primary" />
              Baseline Reconstruction Fullscreen Viewer
            </h1>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border border-border rounded-sm bg-background/50 text-[10px]">
              <button
                onClick={() => setFitMode("contain")}
                className={`px-2.5 py-1.5 border-r border-border hover:bg-muted transition-colors ${fitMode === "contain" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"}`}
              >
                FIT CONTAIN
              </button>
              <button
                onClick={() => setFitMode("cover")}
                className={`px-2.5 py-1.5 border-r border-border hover:bg-muted transition-colors ${fitMode === "cover" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"}`}
              >
                COVER
              </button>
              <button
                onClick={() => setFitMode("actual")}
                className={`px-2.5 py-1.5 hover:bg-muted transition-colors ${fitMode === "actual" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"}`}
              >
                100% SCALE
              </button>
            </div>

            <div className="flex items-center border border-border rounded-sm bg-background/50 text-[10px] h-[31px]">
              <button
                onClick={handleZoomOut}
                className="px-2.5 hover:bg-muted transition-colors h-full border-r border-border"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 select-none text-slate-300 font-bold min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-2.5 hover:bg-muted transition-colors h-full border-r border-border"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 text-muted-foreground hover:text-slate-100 hover:bg-muted transition-all h-full"
                title="Reset Scale"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Big visual viewport frame */}
        <div className="flex-1 bg-black/70 flex items-center justify-center p-6 relative overflow-hidden">
          
          <div className="absolute top-4 left-4 bg-black/75 border border-border/40 px-3 py-1 text-[9px] uppercase tracking-widest text-primary font-bold z-10">
            Preview Band: Composite [R=B3, G=B2, B=B2]
          </div>

          <div
            className="transition-transform duration-100 ease-out select-none flex items-center justify-center max-w-full max-h-full"
            style={{
              transform: `scale(${zoom})`,
              width: fitMode === "actual" ? "auto" : "100%",
              height: fitMode === "actual" ? "auto" : "100%",
            }}
          >
            <img
              src={imageUrl}
              alt="Baseline Reconstruction composite preview"
              className={`max-w-full max-h-full rounded-sm border border-border/20 shadow-lg ${
                fitMode === "cover" ? "object-cover w-full h-full" : "object-contain"
              }`}
              crossOrigin="anonymous"
              draggable={false}
            />
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-black/75 border border-border/30 px-3 py-2 text-[9px] text-slate-400">
            <div>METHOD: <span className="text-cyan-400 font-bold uppercase">{reconstructRun.reconstruction_method || "Classical Inpaint"}</span></div>
            <div>STATUS: <span className="text-emerald-400 font-bold uppercase">{reconstructRun.reconstruction_status}</span></div>
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
