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
  Maximize2
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getCloudShadow, getShadowPreviewUrl } from "@/lib/cloud-api"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { CloudShadowResponse } from "@/lib/types/cloud"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function CloudShadowsViewerPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [shadow, setShadow] = useState<CloudShadowResponse | null>(null)

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

        try {
          const sh = await getCloudShadow(datasetId)
          setShadow(sh)
        } catch (err) {
          console.log("No cloud shadow run yet")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load cloud shadow telemetry.")
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
          Simulating Ray Geometry Projections...
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
            Shadow telemetry link failure
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

  const hasShadow = shadow && shadow.shadow_detection_status === "completed"
  const previewUrl = hasShadow ? getShadowPreviewUrl(datasetId) : null

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="cloud"
      />
      
      {/* Central View Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Toolbar Header */}
        <div className="p-4 border-b border-border bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                { label: "Projected Shadows" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Shield className="w-4.5 h-4.5 text-primary" />
              Geometrical Ray Projected Shadows
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

        {/* Dynamic Canvas Viewport */}
        <div className="flex-1 bg-black/65 overflow-hidden relative flex items-center justify-center p-6">
          <div className="absolute top-3 left-3 bg-background/85 border border-border px-2.5 py-1 rounded-lg text-[9px] text-slate-300 font-bold uppercase z-10 select-none space-y-1">
            <div>Projected Shadow Layer</div>
            <div className="flex gap-2 text-[8px] text-muted-foreground tracking-wide font-bold">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-[#8b5cf6] rounded-lg"></span>Ray Projected Shadow</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-[#10b981] rounded-lg"></span>Linked Cloud Area</span>
            </div>
          </div>

          {previewUrl ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <img
                src={previewUrl}
                alt="Cloud Shadow Map"
                className="transition-transform duration-100 ease-out select-none shadow-[0_0_30px_rgba(0,0,0,0.85)] border border-border/40"
                style={{
                  transform: `scale(${zoom})`,
                  maxHeight: fitMode === "contain" ? "420px" : "none",
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
                No Shadow Record
              </h4>
              <p className="text-[10px] text-muted-foreground font-sans leading-normal">
                Cloud shadow detection has not been completed. Go Back to Cloud to run pipeline shadow detection.
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Shadow Metrics panel */}
        {hasShadow && shadow && (
          <div className="p-4 bg-muted/15 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px]">
            <div>
              <span className="text-muted-foreground uppercase block">Azimuth/Elevation Ray</span>
              <span className="text-foreground font-black text-xs uppercase">
                {shadow.solar_geometry_available ? "Active Solar Project" : "Fallback Default Vector"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Total Shadow Regions</span>
              <span className="text-foreground font-black text-xs">{shadow.shadow_region_count} vectors</span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Linked Shadow Regions</span>
              <span className="text-emerald-400 font-bold text-xs">{shadow.linked_shadow_region_count} of {shadow.shadow_region_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase block">Total Area %</span>
              <span className="text-amber-500 font-black text-xs">{(shadow.total_shadow_area_percent || 0).toFixed(2)}%</span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
