"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Clock,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Globe,
  Tag
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getSelectedReferences } from "@/lib/temporal-context-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { SelectedReference } from "@/lib/types/temporal-context"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function HistoricalCloudFreePage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [references, setReferences] = useState<SelectedReference[] | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<"contain" | "actual">("contain")

  const leftScrollRef = useRef<HTMLDivElement>(null)
  const rightScrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<string | null>(null)

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

        const sessionId = ds.analysis_session_id

        // Fetch references stack
        try {
          const refs = await getSelectedReferences(sessionId)
          setReferences(refs)
        } catch (e) {
          console.log("No references stack found")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load comparison data.")
      } finally {
        setLoading(false)
      }
    }
    if (datasetId) {
      loadData()
    }
  }, [datasetId])

  const handleScroll = (source: "left" | "right") => {
    const left = leftScrollRef.current
    const right = rightScrollRef.current
    if (!left || !right) return

    if (activeRef.current === null) {
      activeRef.current = source
    }

    if (activeRef.current === source) {
      if (source === "left") {
        right.scrollLeft = left.scrollLeft
        right.scrollTop = left.scrollTop
      } else {
        left.scrollLeft = right.scrollLeft
        left.scrollTop = right.scrollTop
      }
    }
  }

  const handleMouseOver = (source: "left" | "right") => {
    activeRef.current = source
  }

  const handleMouseLeave = () => {
    activeRef.current = null
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Loading comparison page...
        </span>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-lg space-y-4 font-mono max-w-xl mx-auto my-12 text-slate-100">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Could Not Load Comparison
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Comparison dataset files are currently unreachable."}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/comparison`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Comparison Hub
        </button>
      </div>
    )
  }

  const primaryRef = references && references.length > 0 ? references[0] : null
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  const uploadedUrl = `${API_URL}/api/v1/preview/${datasetId}/image`
  const referenceUrl = primaryRef?.candidate
    ? `${API_URL}/api/v1/temporal/references/${dataset.analysis_session_id}/candidate/${primaryRef.candidate.id}/preview`
    : null

  // Safely parse candidate metadata
  let candidateSensor = "N/A"
  if (primaryRef?.candidate?.metadata) {
    const meta = primaryRef.candidate.metadata as any
    candidateSensor = meta.sensor || primaryRef.candidate.provider_name || "N/A"
  }

  const getTemporalOffset = () => {
    if (!primaryRef?.candidate?.acquisition_date || !metadata?.acquisition_date) return "N/A"
    try {
      const d1 = new Date(primaryRef.candidate.acquisition_date)
      const d2 = new Date(metadata.acquisition_date)
      const diffTime = Math.abs(d1.getTime() - d2.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return isNaN(diffDays) ? "N/A" : `${diffDays} days`
    } catch (e) {
      return "N/A"
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="comparison"
      />
      
      {/* Central view frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Toolbar Header */}
        <div className="p-4 border-b border-border bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/comparison`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Comparison Hub</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Comparison Engine", href: `/datasets/${datasetId}/comparison` },
                { label: "Historical Cloud-Free Comparison" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Clock className="w-4.5 h-4.5 text-primary animate-pulse" />
              Historical Cloud-Free Comparison
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

        {/* Side-by-side splits area */}
        <div className="flex-1 flex flex-col md:flex-row bg-black/65 overflow-hidden">
          
          {/* Left panel: Uploaded Cloud-Affected image */}
          <div className="flex-1 border-r border-border p-4 flex flex-col relative overflow-hidden">
            <div className="absolute top-6 left-6 bg-background/85 border border-border px-2.5 py-1 text-[9px] text-pink-400 font-bold uppercase z-10 select-none flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-pink-400" />
              <span>Uploaded Dataset (Cloud Covered)</span>
            </div>
            
            <div 
              ref={leftScrollRef}
              onScroll={() => handleScroll("left")}
              onMouseOver={() => handleMouseOver("left")}
              onMouseLeave={handleMouseLeave}
              className="flex-1 overflow-auto flex items-center justify-center p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            >
              <img
                src={uploadedUrl}
                alt="Uploaded cloud-covered preview"
                className="transition-transform duration-100 ease-out select-none shadow-[0_0_30px_rgba(0,0,0,0.85)] border border-border/40"
                style={{
                  transform: `scale(${zoom})`,
                  maxHeight: fitMode === "contain" ? "380px" : "none",
                  maxWidth: fitMode === "contain" ? "100%" : "none",
                  objectFit: fitMode === "contain" ? "contain" : "none",
                }}
                draggable={false}
              />
            </div>

            {/* Left metadata card */}
            <div className="p-3 border border-border/40 bg-background/30 rounded-lg text-[10px] font-sans space-y-1.5">
              <h3 className="font-bold text-foreground text-[11px] uppercase tracking-wider border-b border-border/30 pb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-pink-400" />
                Uploaded Scene Profile
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><span className="text-muted-foreground">Acquisition Date:</span> {metadata?.acquisition_date || "N/A"}</div>
                <div><span className="text-muted-foreground">Satellite/Sensor:</span> LISS-IV</div>
                <div><span className="text-muted-foreground">CRS:</span> {metadata?.coordinate_system || "N/A"} (EPSG:{metadata?.epsg_code || "N/A"})</div>
                <div><span className="text-muted-foreground">Resolution:</span> {metadata?.pixel_size_x ? `${metadata.pixel_size_x}m` : "N/A"}</div>
              </div>
            </div>
          </div>

          {/* Right panel: Historical Cloud-Free image */}
          <div className="flex-1 p-4 flex flex-col relative overflow-hidden">
            <div className="absolute top-6 left-6 bg-background/85 border border-border px-2.5 py-1 text-[9px] text-emerald-400 font-bold uppercase z-10 select-none flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Historical Reference (Cloud Free)</span>
            </div>
            
            <div 
              ref={rightScrollRef}
              onScroll={() => handleScroll("right")}
              onMouseOver={() => handleMouseOver("right")}
              onMouseLeave={handleMouseLeave}
              className="flex-1 overflow-auto flex items-center justify-center p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            >
              {referenceUrl ? (
                <img
                  src={referenceUrl}
                  alt="Historical cloud-free preview"
                  className="transition-transform duration-100 ease-out select-none shadow-[0_0_30px_rgba(0,0,0,0.85)] border border-border/40"
                  style={{
                    transform: `scale(${zoom})`,
                    maxHeight: fitMode === "contain" ? "380px" : "none",
                    maxWidth: fitMode === "contain" ? "100%" : "none",
                    objectFit: fitMode === "contain" ? "contain" : "none",
                  }}
                  draggable={false}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none"
                  }}
                />
              ) : (
                <div className="border border-dashed border-border bg-card/10 p-8 rounded-lg text-center flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto my-auto">
                  <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    No historical cloud-free image found
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-sans leading-normal">
                    Could not load or resolve historical reference imagery for the selected session.
                  </p>
                </div>
              )}
            </div>

            {/* Right metadata card */}
            <div className="p-3 border border-border/40 bg-background/30 rounded-lg text-[10px] font-sans space-y-1.5">
              <h3 className="font-bold text-foreground text-[11px] uppercase tracking-wider border-b border-border/30 pb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Historical Scene Profile
              </h3>
              {primaryRef ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-muted-foreground">Acquisition Date:</span> {primaryRef.candidate?.acquisition_date || "N/A"}</div>
                  <div><span className="text-muted-foreground">Satellite/Sensor:</span> {candidateSensor}</div>
                  <div><span className="text-muted-foreground">Cloud Cover:</span> {primaryRef.candidate?.cloud_cover !== undefined ? `${primaryRef.candidate.cloud_cover.toFixed(2)}%` : "N/A"}</div>
                  <div><span className="text-muted-foreground">Temporal Offset:</span> {getTemporalOffset()}</div>
                  <div><span className="text-muted-foreground">Spatial Overlap:</span> {primaryRef.candidate?.spatial_overlap !== undefined ? `${primaryRef.candidate.spatial_overlap.toFixed(1)}%` : "N/A"}</div>
                  <div><span className="text-muted-foreground">Provider:</span> {primaryRef.candidate?.provider_name || "N/A"}</div>
                </div>
              ) : (
                <div className="text-muted-foreground italic text-center py-2">No historical candidate selected.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
