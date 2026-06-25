"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Compass,
  Layers,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Database,
  Calendar,
  Sparkles,
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

export default function DatasetViewerPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  // Main telemetry state
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [preview, setPreview] = useState<DatasetPreview | null>(null)

  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const ds = await getDataset(datasetId)
        setDataset(ds)

        // Try load metadata
        try {
          const meta = await getDatasetMetadata(datasetId)
          setMetadata(meta)
        } catch (err) {
          console.log("No metadata extracted yet for dataset", datasetId)
        }

        // Try load preview
        try {
          const prev = await getDatasetPreview(datasetId)
          setPreview(prev)
        } catch (err) {
          console.log("No preview generated yet for dataset", datasetId)
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load original dataset telemetry.")
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
          Acquiring Satellite Node Telemetry...
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
            Geospatial Node Link Failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Dataset registration ID ${datasetId} was not found on this platform hub.`}
        </p>
        <button
          onClick={() => router.push("/datasets")}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Return to Datacenter
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm">
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[{ label: "Original Dataset Viewer" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              Original Dataset Workspace
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Lock State: <span className="text-foreground select-all">{dataset.dataset_name}</span> &middot; {dataset.dataset_type} Node
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-muted-foreground uppercase text-[9px] tracking-wider font-mono">
              COMPASS: CALIBRATED
            </span>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px]">
          <div className="border border-border bg-card/30 p-3 rounded-sm">
            <div className="text-muted-foreground uppercase">Raster Dimensions</div>
            <div className="text-sm font-black text-foreground mt-1 truncate">
              {metadata ? `${metadata.raster_width} x ${metadata.raster_height}` : "PENDING INGESTION"}
            </div>
          </div>
          <div className="border border-border bg-card/30 p-3 rounded-sm">
            <div className="text-muted-foreground uppercase">Spatial Resolution</div>
            <div className="text-sm font-black text-amber-500 mt-1 truncate">
              {metadata && metadata.pixel_size_x !== null && metadata.pixel_size_y !== null
                ? `${Math.abs(metadata.pixel_size_x).toFixed(2)}m x ${Math.abs(metadata.pixel_size_y).toFixed(2)}m`
                : "PENDING INGESTION"}
            </div>
          </div>
          <div className="border border-border bg-card/30 p-3 rounded-sm">
            <div className="text-muted-foreground uppercase">Projection Coordinate System</div>
            <div className="text-sm font-black text-cyan-400 mt-1 truncate" title={metadata?.coordinate_system || "N/A"}>
              {metadata?.coordinate_system || "PENDING INGESTION"}
            </div>
          </div>
          <div className="border border-border bg-card/30 p-3 rounded-sm">
            <div className="text-muted-foreground uppercase">Observation Date</div>
            <div className="text-sm font-black text-pink-400 mt-1 truncate">
              {metadata?.acquisition_date || "PENDING INGESTION"}
            </div>
          </div>
        </div>

        {/* Central Visualization Canvas */}
        <div className="border border-border bg-black/40 overflow-hidden relative flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] rounded-sm p-4">
          <div className="absolute top-3 left-3 bg-background/80 border border-border px-2 py-0.5 text-[8px] tracking-widest text-muted-foreground uppercase z-10">
            Viewport // Decimated RGB Preview Composite
          </div>
          
          {preview && preview.preview_status === "COMPLETED" ? (
            <div className="w-full max-w-2xl border border-border bg-background/50 p-2 rounded-sm relative group flex items-center justify-center">
              <img
                src={getDatasetPreviewImageUrl(datasetId)}
                alt="Dataset Preview"
                className="max-h-[350px] object-contain border border-border/40"
              />
              <button
                onClick={() => router.push(`/datasets/${datasetId}/viewer/rgb`)}
                className="absolute top-4 right-4 p-2 bg-background/80 hover:bg-primary hover:text-primary-foreground border border-border rounded-sm transition-all opacity-0 group-hover:opacity-100 shadow-md"
                title="Open Full Resolution RGB composite"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-border p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-md">
              <ImageIcon className="w-8 h-8 text-muted-foreground/45 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  RGB Raster Preview Missing
                </h4>
                <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                  The visual RGB composited channels have not been generated yet. Navigate to the Dataset Inspection panel to run visual preview compilation.
                </p>
              </div>
              <button
                onClick={() => router.push(`/datasets/${datasetId}/inspection`)}
                className="px-4 py-2 bg-primary/10 hover:bg-primary hover:text-primary-foreground border border-primary/20 text-[9px] font-mono font-bold tracking-widest uppercase transition-all"
              >
                Open Inspection Scanner
              </button>
            </div>
          )}
        </div>

        {/* Action Center - Large explicitly labeled buttons */}
        <div className="space-y-3">
          <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest font-mono border-b border-border pb-1">
            Viewer Command Center
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/viewer/rgb`)}
              className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
            >
              <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                RGB
              </div>
              <ImageIcon className="w-5 h-5 text-primary" />
              <div>
                <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                  View RGB Composite
                </span>
                <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                  Launch the large, center-scaled three-band true color render stack.
                </span>
              </div>
            </button>

            <button
              onClick={() => router.push(`/datasets/${datasetId}/viewer/bands`)}
              className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
            >
              <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                BANDS
              </div>
              <Layers className="w-5 h-5 text-primary" />
              <div>
                <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                  View Individual Bands
                </span>
                <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                  Isolate spectral channels (Green, Red, NIR) using browser-side canvas extracts.
                </span>
              </div>
            </button>

            <button
              onClick={() => router.push(`/datasets/${datasetId}/viewer/metadata`)}
              className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
            >
              <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                META
              </div>
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                  View Dataset Metadata
                </span>
                <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                  Explore exhaustive satellite headers, spatial bounding matrices and coordinates.
                </span>
              </div>
            </button>

            <button
              onClick={() => router.push(`/datasets/${datasetId}/cloud`)}
              className="p-4 border border-border hover:border-emerald-500/50 bg-card/35 hover:bg-emerald-500/5 transition-all text-left flex flex-col justify-between h-32 rounded-sm relative overflow-hidden group shadow-sm font-mono cursor-pointer"
            >
              <div className="absolute top-0 right-0 bg-emerald-500/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-emerald-400 tracking-widest uppercase">
                CLOUD
              </div>
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                  View Cloud Intelligence
                </span>
                <span className="text-[8px] text-muted-foreground font-sans block mt-0.5">
                  Analyze clouds, ray shadows, pixel classifications, and restoration difficulty.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Supporting Information section */}
        <div className="border border-border bg-card/25 p-4 rounded-sm space-y-3 font-mono text-[10px]">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            Dataset Ingest Profile Briefing
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            This workspace provides interactive imagery inspection tools for the registered LISS-IV geospatial file bundle. 
            All visualizations are served local-first using decimated preview layers compiled directly from spatial raster bands. 
            Use the buttons above to view RGB combinations, inspect raw bands, or explore metadata tags.
          </p>
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
