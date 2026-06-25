"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Image as ImageIcon,
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
import { getDatasetPreview, getDatasetPreviewImageUrl } from "@/lib/dataset-preview-api"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { DatasetPreview } from "@/lib/types/dataset-preview"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function RGBCompositeViewerPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [preview, setPreview] = useState<DatasetPreview | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Image interactive states
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<"contain" | "cover" | "actual">("contain")
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
          const prev = await getDatasetPreview(datasetId)
          setPreview(prev)
        } catch (err) {
          console.log("No preview compiled yet")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load RGB composite telemetry.")
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
          Resolving RGB composite previews...
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
            RGB composite link failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Telemetry for the requested dataset is unavailable."}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/viewer`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Overview Hub
        </button>
      </div>
    )
  }

  const imageUrl = preview && preview.preview_status === "COMPLETED" 
    ? getDatasetPreviewImageUrl(datasetId)
    : null

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      
      {/* Viewport Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Toolbar Header */}
        <div className="p-4 border-b border-border bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/viewer`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview Hub</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Original Dataset Viewer", href: `/datasets/${datasetId}/viewer` },
                { label: "RGB Composite" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <ImageIcon className="w-4.5 h-4.5 text-primary" />
              RGB Composite Fullscreen Viewer
            </h1>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 bg-background border border-border p-1 rounded-sm text-[9px] uppercase font-bold">
              <button
                onClick={() => setFitMode("contain")}
                className={`px-2 py-1 rounded-sm transition-colors ${fitMode === "contain" ? "bg-primary text-background" : "hover:bg-muted"}`}
              >
                Fit
              </button>
              <button
                onClick={() => setFitMode("cover")}
                className={`px-2 py-1 rounded-sm transition-colors ${fitMode === "cover" ? "bg-primary text-background" : "hover:bg-muted"}`}
              >
                Fill
              </button>
              <button
                onClick={() => setFitMode("actual")}
                className={`px-2 py-1 rounded-sm transition-colors ${fitMode === "actual" ? "bg-primary text-background" : "hover:bg-muted"}`}
              >
                Actual
              </button>
            </div>

            <div className="flex items-center space-x-1 bg-background border border-border p-1 rounded-sm">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold px-2 text-foreground min-w-[45px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleResetZoom}
              className="px-3 py-1.5 border border-border hover:border-primary/50 text-[9px] font-bold uppercase transition-colors rounded-sm"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Large Canvas Viewport */}
        <div className="flex-1 bg-black/60 overflow-hidden relative flex items-center justify-center p-4">
          <div className="absolute top-3 left-3 bg-background/80 border border-border px-2 py-0.5 text-[8px] tracking-widest text-muted-foreground uppercase z-10 select-none">
            R: Band 2 (Green) &middot; G: Band 3 (Red) &middot; B: Band 4 (NIR)
          </div>

          {imageUrl ? (
            <div
              className="w-full h-full overflow-auto flex items-center justify-center p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
              style={{ cursor: "grab" }}
            >
              <img
                src={imageUrl}
                alt="Full RGB Composite Preview"
                className="transition-transform duration-100 ease-out select-none shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-border/40"
                style={{
                  transform: `scale(${zoom})`,
                  maxHeight: fitMode === "contain" ? "90%" : fitMode === "cover" ? "100%" : "none",
                  maxWidth: fitMode === "contain" ? "95%" : fitMode === "cover" ? "100%" : "none",
                  objectFit: fitMode === "contain" ? "contain" : fitMode === "cover" ? "cover" : "none",
                }}
                draggable={false}
              />
            </div>
          ) : (
            <div className="border border-dashed border-border bg-card/10 p-8 rounded-sm text-center flex flex-col items-center justify-center space-y-3 max-w-sm">
              <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                RGB Render Missing
              </h4>
              <p className="text-[10px] text-muted-foreground font-sans leading-normal">
                No preview image exists for this dataset. Perform visual preview generation in the Dataset Inspection page first.
              </p>
              <button
                onClick={() => router.push(`/datasets/${datasetId}/inspection`)}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-widest"
              >
                Go to Inspection Page
              </button>
            </div>
          )}
        </div>

        {/* Footer Statistics Bar */}
        <div className="p-3 border-t border-border bg-muted/10 flex justify-between items-center text-[9px] text-muted-foreground font-mono">
          <span>COMPOSITE SPEC: DECIMATED MULTI-BAND PNG RENDER</span>
          {preview && (
            <span>DIMENSIONS: {preview.preview_width} x {preview.preview_height} PX</span>
          )}
        </div>

      </div>

      {/* Sidebar Panel */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="dataset"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
    </div>
  )
}
