"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Layers,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Info,
  Maximize2
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getDatasetPreview, getDatasetPreviewImageUrl } from "@/lib/dataset-preview-api"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { DatasetPreview } from "@/lib/types/dataset-preview"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

interface BandDefinition {
  number: number
  name: string
  wavelength: string
  description: string
  application: string
  channelIndex: number // 0 = Red channel, 1 = Green, 2 = Blue of composited preview image
}

const BAND_DEFINITIONS: BandDefinition[] = [
  {
    number: 2,
    name: "Green Band (B2)",
    wavelength: "0.52 - 0.59 µm",
    description: "Measures green reflectance of vegetation. Highly responsive to plant health and vigor.",
    application: "Used for assessing vegetation vigor, water body depth, turbidity, and forest canopy classification.",
    channelIndex: 0 // Alpha-sorted: BAND2.tif is loaded as first (Red) channel in preview composite
  },
  {
    number: 3,
    name: "Red Band (B3)",
    wavelength: "0.62 - 0.68 µm",
    description: "Measures chlorophyll absorption. Strong contrast between vegetation and soils.",
    application: "Key for vegetation species differentiation, biomass mapping, and identifying soil-vegetation boundaries.",
    channelIndex: 1 // Alpha-sorted: BAND3.tif is loaded as second (Green) channel in preview composite
  },
  {
    number: 4,
    name: "Near Infrared Band (B4)",
    wavelength: "0.77 - 0.86 µm",
    description: "Highly reflective for leaf cell structures. Peak reflectance for healthy vegetation.",
    application: "Critical for crop identification, leaf area index (LAI) calculations, moisture stress, and water body boundaries.",
    channelIndex: 2 // Alpha-sorted: BAND4.tif is loaded as third (Blue) channel in preview composite
  }
]

export default function SpectralBandsViewerPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [preview, setPreview] = useState<DatasetPreview | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Interactive band selection states
  const [activeBandIdx, setActiveBandIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<"contain" | "actual">("contain")
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageCacheRef = useRef<HTMLImageElement | null>(null)
  const [rendering, setRendering] = useState(false)

  const activeBand = BAND_DEFINITIONS[activeBandIdx]

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
        setError(err.message || "Failed to load individual band telemetry.")
      } finally {
        setLoading(false)
      }
    }
    if (datasetId) {
      loadData()
    }
  }, [datasetId])

  // Canvas channel extraction logic
  const renderGrayscaleBand = (img: HTMLImageElement, channelIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setRendering(true)
    
    // Set matching dimensions
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height

    // Draw initial composite
    ctx.drawImage(img, 0, 0)

    try {
      // Isolate target channel pixels
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data

      for (let i = 0; i < data.length; i += 4) {
        const pixelValue = data[i + channelIndex] // isolate channel
        data[i] = pixelValue     // Red
        data[i + 1] = pixelValue // Green
        data[i + 2] = pixelValue // Blue
        // data[i+3] is Alpha, keep unchanged
      }

      ctx.putImageData(imgData, 0, 0)
    } catch (err) {
      console.error("Canvas read error (possibly CORS related):", err)
    } finally {
      setRendering(false)
    }
  }

  // Load preview composite image and isolate active band channel
  useEffect(() => {
    if (!preview || preview.preview_status !== "COMPLETED") return

    const imgUrl = getDatasetPreviewImageUrl(datasetId)
    
    const triggerRender = (img: HTMLImageElement) => {
      renderGrayscaleBand(img, activeBand.channelIndex)
    }

    if (imageCacheRef.current && imageCacheRef.current.src === imgUrl) {
      triggerRender(imageCacheRef.current)
    } else {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = imgUrl
      img.onload = () => {
        imageCacheRef.current = img
        triggerRender(img)
      }
    }
  }, [preview, activeBandIdx])

  const handleNextBand = () => {
    setActiveBandIdx(prev => (prev + 1) % BAND_DEFINITIONS.length)
  }

  const handlePrevBand = () => {
    setActiveBandIdx(prev => (prev - 1 + BAND_DEFINITIONS.length) % BAND_DEFINITIONS.length)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Loading Spectral Band Context...
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
            Spectral Band lock failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Dataset data is unavailable. Run the required workflow step first."}
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

  const hasPreview = preview && preview.preview_status === "COMPLETED"

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="dataset"
      />
      
      {/* Central view frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Toolbar Header */}
        <div className="p-4 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                { label: "Spectral Bands" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Layers className="w-4.5 h-4.5 text-primary" />
              Multi-Spectral Individual Band Viewer
            </h1>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Band selector tab toggles */}
            <div className="flex bg-background border border-border p-1 rounded-lg text-[9px] font-bold uppercase">
              {BAND_DEFINITIONS.map((band, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveBandIdx(idx)}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${activeBandIdx === idx ? "bg-primary text-background" : "text-muted-foreground hover:bg-muted"}`}
                >
                  Band {band.number}
                </button>
              ))}
            </div>

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

        {/* Dynamic Canvas Viewport */}
        <div className="flex-1 bg-black/65 overflow-hidden relative flex items-center justify-center p-6">
          
          {/* Grayscale extraction active indicator */}
          <div className="absolute top-3 left-3 bg-background/85 border border-border px-2.5 py-1 rounded-lg text-[9px] text-slate-300 font-bold uppercase z-10 select-none space-y-0.5">
            <div>CURRENT VIEWPORT: {activeBand.name}</div>
            <div className="text-[7.5px] text-muted-foreground tracking-wide">
              Wavelength: {activeBand.wavelength} &middot; Mode: Grayscale Isolation
            </div>
          </div>

          {/* Prev/Next arrows overlay */}
          <button
            onClick={handlePrevBand}
            className="absolute left-4 p-2 bg-background/70 hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary text-muted-foreground transition-all rounded-full z-10 cursor-pointer"
            title="Previous Band"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNextBand}
            className="absolute right-4 p-2 bg-background/70 hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary text-muted-foreground transition-all rounded-full z-10 cursor-pointer"
            title="Next Band"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {hasPreview ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="relative">
                {rendering && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-15">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="transition-transform duration-100 ease-out select-none shadow-[0_0_30px_rgba(0,0,0,0.85)] border border-border/40"
                  style={{
                    transform: `scale(${zoom})`,
                    maxHeight: fitMode === "contain" ? "450px" : "none",
                    maxWidth: fitMode === "contain" ? "100%" : "none",
                    display: "block"
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border bg-card/10 p-8 rounded-lg text-center flex flex-col items-center justify-center space-y-3 max-w-sm">
              <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Bands preview missing
              </h4>
              <p className="text-[10px] text-muted-foreground font-sans leading-normal">
                No preview channels are generated. Perform visual preview generation in the Dataset Inspection page first.
              </p>
            </div>
          )}
        </div>

        {/* Active Band Application Panel */}
        <div className="p-4 bg-muted/15 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1 font-sans text-xs">
            <span className="text-[9px] font-bold text-primary font-mono uppercase tracking-widest block">
              1. SPECTRAL RANGE
            </span>
            <div className="font-mono font-bold text-foreground text-sm flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary shrink-0" />
              {activeBand.name} ({activeBand.wavelength})
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {activeBand.description}
            </p>
          </div>
          <div className="space-y-1 font-sans text-xs md:col-span-2">
            <span className="text-[9px] font-bold text-primary font-mono uppercase tracking-widest block">
              2. SCIENTIFIC APPLICATIONS
            </span>
            <div className="font-bold text-slate-300 text-xs">
              Primary Remote Sensing Objectives
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {activeBand.application}
            </p>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-2.5 border-t border-border bg-muted/10 flex justify-between items-center text-[8px] text-muted-foreground font-mono">
          <span>PIXEL ISOLATION PATTERN: GRayscale({activeBandIdx === 0 ? "R" : activeBandIdx === 1 ? "G" : "B"})</span>
          {preview && (
            <span>DECIMATION HEIGHT: {preview.preview_height} PX</span>
          )}
        </div>

      </div>
    </div>
  )
}
