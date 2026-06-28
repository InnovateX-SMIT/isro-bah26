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
  Sparkles,
  Shield,
  Info,
  Maximize2
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getSelectedReferences } from "@/lib/temporal-context-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { SelectedReference } from "@/lib/types/temporal-context"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function HistoricalReferencesPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [references, setReferences] = useState<SelectedReference[]>([])

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
          const refs = await getSelectedReferences(ds.analysis_session_id)
          setReferences(refs)
        } catch (err: any) {
          console.error(err)
          setError(err.message || "Failed to load historical references list.")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to sync references workspace.")
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
          Resolving Historical References...
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
            Could Not Load References
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Historical references for dataset ${datasetId} are unreachable.`}
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

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="temporal"
      />
      
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Navigation Toolbar */}
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
                { label: "Historical references" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Layers className="w-4.5 h-4.5 text-primary" />
              Historical Reference Stack
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-[10px] border border-border px-3 py-1 bg-muted/20 text-slate-300">
            <span>STRIKE CAPACITY:</span>
            <span className="text-cyan-400 font-bold">{references.length} OBS FOUND</span>
          </div>
        </div>

        {/* Empty State */}
        {references.length === 0 ? (
          <div className="border border-dashed border-border/40 p-8 rounded text-center max-w-lg mx-auto space-y-4">
            <Info className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">No Reference Stack Loaded</h3>
            <p className="text-xs text-muted-foreground font-sans">
              No historical candidate observations are linked to this dataset session yet. Run temporal context generation from the Overview Hub.
            </p>
            <button
              onClick={() => router.push(`/datasets/${datasetId}/temporal`)}
              className="px-4 py-2 border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] uppercase font-bold tracking-widest"
            >
              Configure Temporal Stack
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {references.map((ref) => {
              const cand = ref.candidate
              const previewUrl = cand?.preview_url

              return (
                <div 
                  key={ref.id}
                  className="border border-border bg-card/25 rounded-lg flex flex-col justify-between overflow-hidden hover:border-primary/50 transition-colors font-mono relative"
                >
                  {/* Rank Header */}
                  <div className="bg-muted/30 border-b border-border/50 px-4 py-2.5 flex items-center justify-between text-[10px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span className="font-bold uppercase tracking-wider text-slate-300">
                        Rank #{ref.rank_position}
                      </span>
                    </div>
                    <div className="text-cyan-400 font-black">
                      Score: {(ref.ranking_score * 100).toFixed(1)}
                    </div>
                  </div>

                  {/* Thumbnail / Image Frame */}
                  <div className="bg-black/45 border-b border-border/30 h-[140px] flex items-center justify-center relative group overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={`Candidate observation ${ref.candidate_id}`}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground/60 text-[9px] uppercase">
                        <Clock className="w-7 h-7 stroke-[1.5]" />
                        <span>Orbit Preview Absent</span>
                      </div>
                    )}
                  </div>

                  {/* Body Stats */}
                  <div className="p-4 flex-1 space-y-3.5 text-[10px]">
                    
                    {/* Main parameters grid */}
                    <div className="grid grid-cols-2 gap-3 border-b border-border/20 pb-3">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Provider</span>
                        <span className="text-foreground font-bold truncate block">{cand?.provider_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Cloud Cover</span>
                        <span className={`font-bold ${cand && cand.cloud_cover > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {cand ? `${cand.cloud_cover.toFixed(1)}%` : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Spatial Overlap</span>
                        <span className="text-foreground font-bold">{cand ? `${cand.spatial_overlap.toFixed(1)}%` : "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Acquisition</span>
                        <span className="text-foreground font-bold truncate block">{cand?.acquisition_date || "N/A"}</span>
                      </div>
                    </div>

                    {/* Decision Justification */}
                    <div className="space-y-1">
                      <span className="text-[8.5px] text-muted-foreground uppercase tracking-widest font-bold block">Selection justification</span>
                      <p className="text-[10px] text-slate-300 leading-normal font-sans italic">
                        "{ref.selection_reason || "Selected for optimal spatial overlap index and atmospheric cloud clearance profile."}"
                      </p>
                    </div>

                  </div>

                  {/* Actions footer */}
                  <div className="p-4 pt-0 border-t border-border/10 mt-auto bg-muted/5 flex">
                    <button
                      onClick={() => router.push(`/datasets/${datasetId}/temporal/reference/${ref.id}`)}
                      className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg font-bold text-[9px] tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Maximize2 className="w-3 h-3" />
                      Open Reference Viewer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
