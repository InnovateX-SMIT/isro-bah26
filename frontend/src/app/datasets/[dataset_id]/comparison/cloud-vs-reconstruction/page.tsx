"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Cloud,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getReconstructionStatus } from "@/lib/reconstruction-api"
import { getCloudDetection, getSegmentationPreviewUrl } from "@/lib/cloud-api"
import { getConfidenceEstimation, getReliabilityScore } from "@/lib/confidence-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"
import MetadataSidebar from "@/components/comparison/MetadataSidebar"

export default function CloudVsReconstructionPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)

  // Sub-pipeline responses
  const [reconRun, setReconRun] = useState<any | null>(null)
  const [cloudDetection, setCloudDetection] = useState<any | null>(null)
  const [estimation, setEstimation] = useState<any | null>(null)
  const [reliability, setReliability] = useState<any | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<"contain" | "actual">("contain")
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

        const sessionId = ds.analysis_session_id

        // Fetch cloud status
        try {
          const cd = await getCloudDetection(datasetId)
          setCloudDetection(cd)
        } catch (e) {
          console.log("No cloud detection found")
        }

        // Fetch reconstruction status
        let rRun: any = null
        try {
          rRun = await getReconstructionStatus(sessionId)
          setReconRun(rRun)
        } catch (e) {
          console.log("No reconstruction status found")
        }

        // Fetch confidence status
        if (rRun && rRun.reconstruction_status === "COMPLETED") {
          try {
            const est = await getConfidenceEstimation(rRun.id)
            setEstimation(est)

            const rel = await getReliabilityScore(est.confidence_id)
            setReliability(rel)
          } catch (e) {
            console.log("No confidence parameters found")
          }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Loading cloud mask comparison...
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
            Comparison Failure
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

  const maskUrl = getSegmentationPreviewUrl(datasetId)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  const reconstructedUrl = reconRun 
    ? (reconRun.optimization_status === "COMPLETED" 
        ? `${API_URL}/api/v1/reconstruction/${reconRun.session_id}/optimized-preview`
        : `${API_URL}/api/v1/reconstruction/${reconRun.session_id}/preview`)
    : ""

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      
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
                { label: "Cloud Mask vs Reconstruction" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Cloud className="w-4.5 h-4.5 text-primary animate-pulse" />
              Cloud Mask vs AI Reconstruction Output Comparison
            </h1>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-2">
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

        {/* Side-by-side splits area */}
        <div className="flex-1 flex flex-col md:flex-row bg-black/65 overflow-hidden">
          
          {/* Left panel: Cloud mask */}
          <div className="flex-1 border-r border-border p-4 flex flex-col relative overflow-hidden">
            <div className="absolute top-6 left-6 bg-background/85 border border-border px-2.5 py-1 text-[9px] text-amber-400 font-bold uppercase z-10 select-none flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5" />
              <span>Reconstruction Cloud Mask</span>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <img
                src={maskUrl}
                alt="Cloud Mask Preview"
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
            <div className="p-2 border border-border/40 bg-background/30 text-[9.5px] text-muted-foreground leading-normal font-sans">
              Color key: Red outlines represent opaque cloud formations; Yellow indicates thin cloud structures; Gray shows projecting vector shadows.
            </div>
          </div>

          {/* Right panel: AI Reconstructed output */}
          <div className="flex-1 p-4 flex flex-col relative overflow-hidden">
            <div className="absolute top-6 left-6 bg-background/85 border border-border px-2.5 py-1 text-[9px] text-emerald-400 font-bold uppercase z-10 select-none flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Reconstructed Output</span>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {reconstructedUrl ? (
                <img
                  src={reconstructedUrl}
                  alt="AI Reconstructed Preview"
                  className="transition-transform duration-100 ease-out select-none shadow-[0_0_30px_rgba(0,0,0,0.85)] border border-border/40"
                  style={{
                    transform: `scale(${zoom})`,
                    maxHeight: fitMode === "contain" ? "380px" : "none",
                    maxWidth: fitMode === "contain" ? "100%" : "none",
                    objectFit: fitMode === "contain" ? "contain" : "none",
                  }}
                  draggable={false}
                />
              ) : (
                <div className="text-center text-muted-foreground text-[10px]">Reconstruction data absent.</div>
              )}
            </div>
            <div className="p-2 border border-border/40 bg-background/30 text-[9.5px] text-muted-foreground leading-normal font-sans">
              Displays the generative composite where cloud regions have been inpainted with synthetic pixels matching historical references.
            </div>
          </div>

        </div>

      </div>

      {/* Workspace Sidebar / Metadata Sidebar */}
      <MetadataSidebar
        dataset={dataset}
        metadata={metadata}
        reconRun={reconRun}
        cloud={cloudDetection}
        estimation={estimation}
        reliability={reliability}
      />
    </div>
  )
}
