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

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [preview, setPreview] = useState<DatasetPreview | null>(null)

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
          console.log("No metadata extracted yet for dataset", datasetId)
        }

        try {
          const prev = await getDatasetPreview(datasetId)
          setPreview(prev)
        } catch (err) {
          console.log("No preview generated yet for dataset", datasetId)
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load dataset.")
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
        <span className="text-xs text-muted-foreground">
          Loading dataset...
        </span>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-xl space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold">
            Dataset Not Found
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Dataset ${datasetId} was not found.`}
        </p>
        <button
          onClick={() => router.push("/datasets")}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-wider text-xs font-bold rounded-lg"
        >
          Return to Inventory
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl">
      {/* Tab Navigation */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="dataset"
      />

      {/* Central Viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Page Header */}
        <div className="space-y-1">
          <ViewerBreadcrumb
            datasetName={dataset.dataset_name}
            datasetId={datasetId}
            items={[{ label: "Scene Overview" }]}
          />
          <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Scene Overview
          </h1>
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">{dataset.dataset_name}</span>
          </p>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px]">
          <div className="border border-border bg-card/30 p-3 rounded-lg">
            <div className="text-muted-foreground uppercase">Raster Dimensions</div>
            <div className="text-sm font-black text-foreground mt-1 truncate">
              {metadata ? `${metadata.raster_width} × ${metadata.raster_height}` : "Pending"}
            </div>
          </div>
          <div className="border border-border bg-card/30 p-3 rounded-lg">
            <div className="text-muted-foreground uppercase">Spatial Resolution</div>
            <div className="text-sm font-black text-amber-500 mt-1 truncate">
              {metadata && metadata.pixel_size_x !== null && metadata.pixel_size_y !== null
                ? `${Math.abs(metadata.pixel_size_x).toFixed(2)}m × ${Math.abs(metadata.pixel_size_y).toFixed(2)}m`
                : "Pending"}
            </div>
          </div>
          <div className="border border-border bg-card/30 p-3 rounded-lg">
            <div className="text-muted-foreground uppercase">Coordinate System</div>
            <div className="text-sm font-black text-cyan-400 mt-1 truncate" title={metadata?.coordinate_system || "N/A"}>
              {metadata?.coordinate_system || "Pending"}
            </div>
          </div>
          <div className="border border-border bg-card/30 p-3 rounded-lg">
            <div className="text-muted-foreground uppercase">Acquisition Date</div>
            <div className="text-sm font-black text-pink-400 mt-1 truncate">
              {metadata?.acquisition_date || "Pending"}
            </div>
          </div>
        </div>

        {/* Central Visualization Canvas */}
        <div className="border border-border bg-black/40 overflow-hidden relative flex flex-col items-center justify-center min-h-[300px] md:min-h-[450px] rounded-xl p-4">
          {preview && preview.preview_status === "COMPLETED" ? (
            <div className="w-full max-w-3xl border border-border bg-background/50 p-2 rounded-lg relative group flex items-center justify-center">
              <img
                src={getDatasetPreviewImageUrl(datasetId)}
                alt="Dataset Preview"
                className="max-h-[400px] object-contain rounded"
              />
              <button
                onClick={() => router.push(`/datasets/${datasetId}/viewer/rgb`)}
                className="absolute top-4 right-4 p-2 bg-background/80 hover:bg-primary hover:text-primary-foreground border border-border rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-md"
                title="Open Full Resolution RGB Composite"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-border p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-md rounded-xl">
              <ImageIcon className="w-8 h-8 text-muted-foreground/45 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">
                  No Preview Available
                </h4>
                <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                  Run the Dataset Inspection to generate the RGB preview composite.
                </p>
              </div>
              <button
                onClick={() => router.push(`/datasets/${datasetId}/inspection`)}
                className="px-4 py-2 bg-primary/10 hover:bg-primary hover:text-primary-foreground border border-primary/20 text-xs font-bold tracking-wider uppercase transition-all rounded-lg"
              >
                Open Inspection
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push(`/datasets/${datasetId}/viewer/rgb`)}
            className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
          >
            <ImageIcon className="w-5 h-5 text-primary" />
            <div>
              <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                RGB Composite
              </span>
              <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                True color three-band composite render
              </span>
            </div>
          </button>

          <button
            onClick={() => router.push(`/datasets/${datasetId}/viewer/bands`)}
            className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
          >
            <Layers className="w-5 h-5 text-primary" />
            <div>
              <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                Spectral Bands
              </span>
              <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                Isolate Green, Red, and NIR channels
              </span>
            </div>
          </button>

          <button
            onClick={() => router.push(`/datasets/${datasetId}/viewer/metadata`)}
            className="p-4 border border-border hover:border-primary/50 bg-card/35 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
          >
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                Dataset Metadata
              </span>
              <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                Spatial headers, bounding box, and coordinates
              </span>
            </div>
          </button>

          <button
            onClick={() => router.push(`/datasets/${datasetId}/cloud`)}
            className="p-4 border border-border hover:border-emerald-500/50 bg-card/35 hover:bg-emerald-500/5 transition-all text-left flex flex-col justify-between h-28 rounded-xl relative overflow-hidden group font-mono cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-[10px] font-black uppercase text-foreground tracking-wider block">
                Cloud Intelligence
              </span>
              <span className="text-[9px] text-muted-foreground font-sans block mt-0.5">
                Cloud detection, classification, and masking
              </span>
            </div>
          </button>
        </div>

      </div>
    </div>
  )
}
