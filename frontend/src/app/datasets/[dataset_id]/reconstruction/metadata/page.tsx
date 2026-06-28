"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Cpu,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Database,
  FileText,
  Layers,
  Shield,
  Clock,
  Compass
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getReconstructionStatus, getReconstructionOutput, getReconstructionOptimizedOutput } from "@/lib/reconstruction-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { ReconstructionRunResponse, ReconstructionOutputResponse, ReconstructionOptimizedOutputResponse } from "@/lib/types/reconstruction"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function ReconstructionMetadataPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [reconstructRun, setReconstructRun] = useState<ReconstructionRunResponse | null>(null)
  const [outputInfo, setOutputInfo] = useState<ReconstructionOutputResponse | null>(null)
  const [optOutputInfo, setOptOutputInfo] = useState<ReconstructionOptimizedOutputResponse | null>(null)

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
          console.log("No metadata extracted yet")
        }

        try {
          const run = await getReconstructionStatus(ds.analysis_session_id)
          setReconstructRun(run)
          
          try {
            const out = await getReconstructionOutput(ds.analysis_session_id)
            setOutputInfo(out)
          } catch (err) {
            console.log("Failed to load output paths info")
          }

          try {
            const optOut = await getReconstructionOptimizedOutput(ds.analysis_session_id)
            setOptOutputInfo(optOut)
          } catch (err) {
            console.log("Failed to load optimized output paths info")
          }

        } catch (err: any) {
          console.error(err)
          setError(err.message || "Failed to load Reconstruction runs. Execute reconstruction first.")
        }

      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to sync metadata workspace.")
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
          Reading Metadata Registry...
        </span>
      </div>
    )
  }

  if (error || !dataset || !reconstructRun) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-lg space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Could Not Load Metadata
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Reconstruction metadata for dataset ${datasetId} is unavailable.`}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/reconstruction`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Reconstruction
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="reconstruction"
      />
      
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
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
                { label: "Reconstruction Metadata" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <FileText className="w-4.5 h-4.5 text-primary" />
              Reconstruction Registry Metadata
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-[10px] border border-border px-3 py-1 bg-muted/20 text-slate-300">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span className="uppercase text-[9px]">REGISTRY SYNCED</span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Section 1: Processing Details */}
          <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Processing Parameters
            </h2>
            
            <div className="space-y-2.5 text-[10.5px]">
              <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                <span className="text-slate-400">Reconstruction Strategy:</span>
                <span className="text-slate-200 font-bold uppercase">{reconstructRun.reconstruction_strategy || "DEFAULT"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                <span className="text-slate-400">Restoration Algorithm:</span>
                <span className="text-slate-200 font-semibold font-mono">{reconstructRun.reconstruction_method || "Classical Inpaint"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                <span className="text-slate-400">Execution Duration:</span>
                <span className="text-slate-200 font-semibold">{reconstructRun.execution_time_ms ? `${reconstructRun.execution_time_ms} ms` : "N/A"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                <span className="text-slate-400">Launch Date:</span>
                <span className="text-slate-200 font-semibold">{new Date(reconstructRun.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Optimization Methods:</span>
                <span className="text-cyan-400 font-semibold font-mono text-[9px] max-w-[160px] truncate" title={reconstructRun.optimization_method || "N/A"}>
                  {reconstructRun.optimization_method || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Reconstruction Inputs */}
          <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Reconstruction Inputs
            </h2>

            <div className="space-y-2.5 text-[10.5px]">
              <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                <span className="text-slate-400">Input Dataset ID:</span>
                <span className="text-slate-200 font-mono select-all truncate max-w-[180px]">{reconstructRun.dataset_id}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                <span className="text-slate-400">Coordinate EPSG:</span>
                <span className="text-slate-200 font-semibold">EPSG:{metadata?.epsg_code || "32644"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                <span className="text-slate-400">Raster Dimensions:</span>
                <span className="text-slate-200 font-semibold">{metadata ? `${metadata.raster_width} x ${metadata.raster_height} px` : "UNKNOWN"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Bands Restored:</span>
                <span className="text-cyan-400 font-bold">BAND 2, BAND 3, BAND 4</span>
              </div>
            </div>
          </div>

          {/* Section 3: Generated Outputs Registry */}
          <div className="border border-border bg-card/25 p-5 rounded-lg md:col-span-2 space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              Generated Physical Output Registry (relative to workspace root)
            </h2>

            <div className="space-y-3 text-[10px] bg-background/25 border border-border/40 p-3.5 rounded-lg">
              <div>
                <span className="text-muted-foreground block uppercase text-[8.5px] tracking-wider mb-0.5">Baseline Reconstructed Image GeoTIFF</span>
                <span className="text-slate-300 font-mono select-all block break-all">{outputInfo?.output_image_path || "N/A"}</span>
              </div>
              
              <div className="border-t border-border/10 pt-2">
                <span className="text-muted-foreground block uppercase text-[8.5px] tracking-wider mb-0.5">Baseline Reconstructed visual preview PNG</span>
                <span className="text-slate-300 font-mono select-all block break-all">{outputInfo?.preview_image_path || "N/A"}</span>
              </div>

              {reconstructRun.optimization_status === "COMPLETED" && (
                <>
                  <div className="border-t border-border/10 pt-2">
                    <span className="text-muted-foreground block uppercase text-[8.5px] tracking-wider mb-0.5">Optimized Reconstructed Image GeoTIFF</span>
                    <span className="text-cyan-400 font-mono select-all block break-all">{optOutputInfo?.optimized_output_path || "N/A"}</span>
                  </div>

                  <div className="border-t border-border/10 pt-2">
                    <span className="text-muted-foreground block uppercase text-[8.5px] tracking-wider mb-0.5">Optimized Reconstructed visual preview PNG</span>
                    <span className="text-cyan-400 font-mono select-all block break-all">{optOutputInfo?.optimized_preview_path || "N/A"}</span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
