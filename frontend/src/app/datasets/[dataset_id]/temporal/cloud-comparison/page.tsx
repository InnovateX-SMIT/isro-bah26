"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Clock,
  Layers,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CloudSun,
  GitCompare,
  FileImage
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getSelectedReferences } from "@/lib/temporal-context-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { SelectedReference } from "@/lib/types/temporal-context"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function CloudComparisonPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [references, setReferences] = useState<SelectedReference[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRank, setSelectedRank] = useState<number>(1)

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
          const refs = await getSelectedReferences(ds.analysis_session_id)
          setReferences(refs)
        } catch (err: any) {
          console.error(err)
          setError(err.message || "Failed to load historical references list.")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to sync cloud comparison workspace.")
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
          Loading Cloud Comparison Workspace...
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
          {error || `Historical reference for dataset ${datasetId} is unavailable.`}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/temporal`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Overview
        </button>
      </div>
    )
  }

  // Get selected rank reference candidate
  const selectedRef = references.find((r) => r.rank_position === selectedRank)
  const selectedCand = selectedRef?.candidate

  const cloudyImageUrl = `${API_URL}/api/v1/dataset-preview/${datasetId}/image`
  const referenceImageUrl = selectedCand
    ? `${API_URL}/api/v1/temporal/references/${dataset.analysis_session_id}/candidate/${selectedCand.id}/preview`
    : null

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="temporal"
      />

      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Navigation / Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/temporal`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Temporal Overview</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Temporal Intelligence", href: `/datasets/${datasetId}/temporal` },
                { label: "Cloud Comparison" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <GitCompare className="w-4.5 h-4.5 text-primary" />
              Direct Cloud Comparison
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-[10px] border border-border px-3 py-1 bg-muted/20 text-slate-300">
            <span>MODE:</span>
            <span className="text-cyan-400 font-bold">SIDE-BY-SIDE PREVIEW</span>
          </div>
        </div>

        {/* Dynamic Comparison Panel */}
        {!selectedCand ? (
          <div className="border border-dashed border-border/40 p-8 rounded text-center max-w-lg mx-auto space-y-4 my-12">
            <CloudSun className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">No Reference Scene Cached</h3>
            <p className="text-xs text-muted-foreground font-sans">
              Google Earth Engine historical references have not been compiled yet. Please run historical discovery and select candidates to cache the cloud-free imagery.
            </p>
            <button
              onClick={() => router.push(`/datasets/${datasetId}/temporal`)}
              className="px-4 py-2 border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] uppercase font-bold tracking-widest"
            >
              Configure Temporal Stack
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[480px]">
            
            {/* LEFT Panel: Cloudy LISS-IV Scene */}
            <div className="border border-border bg-black/40 rounded-lg flex flex-col overflow-hidden relative">
              <div className="bg-muted/30 border-b border-border/50 px-4 py-3 flex items-center justify-between text-[10.5px]">
                <div className="flex flex-col">
                  <span className="font-bold uppercase tracking-wider text-cyan-400">
                    LEFT: Cloudy LISS-IV Preview
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[280px]">
                    Dataset: {dataset.dataset_name}
                  </span>
                </div>
                <div className="text-slate-300 font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {metadata?.acquisition_date || "N/A"}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 bg-black/60 relative overflow-hidden">
                <img
                  src={cloudyImageUrl}
                  alt="Cloudy LISS-IV Preview Image"
                  className="max-h-[500px] max-w-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            {/* RIGHT Panel: GEE Historical Reference Scene */}
            <div className="border border-border bg-black/40 rounded-lg flex flex-col overflow-hidden relative">
              <div className="bg-muted/30 border-b border-border/50 px-4 py-3 flex items-center justify-between text-[10.5px]">
                <div className="flex flex-col">
                  <span className="font-bold uppercase tracking-wider text-cyan-400">
                    RIGHT: GEE Historical Reference
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[140px]">
                    ID: {selectedCand.candidate_id}
                  </span>
                </div>
                
                {/* Rank Selector & Metadata */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center border border-border/60 rounded bg-muted/20 overflow-hidden text-[9px] font-mono shrink-0">
                    {[1, 2, 3].map((rank) => {
                      const hasRank = references.some((r) => r.rank_position === rank)
                      if (!hasRank) return null
                      return (
                        <button
                          key={rank}
                          type="button"
                          onClick={() => setSelectedRank(rank)}
                          className={`px-2 py-0.5 border-r last:border-r-0 border-border/40 transition-all font-bold ${
                            selectedRank === rank
                              ? "bg-primary text-primary-foreground font-black"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          }`}
                        >
                          R{rank}
                        </button>
                      )
                    })}
                  </div>
                  <div className="text-slate-300 font-bold flex items-center gap-2 text-[10px] shrink-0">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary" />
                      {selectedCand.acquisition_date}
                    </div>
                    <div className="text-emerald-400 border border-emerald-500/20 px-1 py-0.5 bg-emerald-500/5 text-[9px] rounded font-bold">
                      {selectedCand.cloud_cover.toFixed(1)}% CLOUD
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 bg-black/60 relative overflow-hidden">
                {referenceImageUrl ? (
                  <img
                    src={referenceImageUrl}
                    alt="GEE Historical Reference Image"
                    className="max-h-[500px] max-w-full object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground/60 text-[10px] uppercase">
                    <FileImage className="w-8 h-8 stroke-[1.5]" />
                    <span>Reference Image Missing</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
