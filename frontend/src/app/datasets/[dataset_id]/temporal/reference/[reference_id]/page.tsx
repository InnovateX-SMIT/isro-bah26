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
  Globe,
  Database
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getSelectedReferences } from "@/lib/temporal-context-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { SelectedReference } from "@/lib/types/temporal-context"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function IndividualReferencePage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string
  const referenceId = params.reference_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [reference, setReference] = useState<SelectedReference | null>(null)

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
          const target = refs.find(r => r.id === referenceId || r.candidate_id === referenceId)
          if (target) {
            setReference(target)
          } else {
            setError(`Historical reference observation ${referenceId} could not be resolved.`)
          }
        } catch (err: any) {
          console.error(err)
          setError(err.message || "Failed to load reference details.")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to sync reference workspace.")
      } finally {
        setLoading(false)
      }
    }
    if (datasetId && referenceId) {
      loadData()
    }
  }, [datasetId, referenceId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Acquiring Satellite Orbit Telemetry...
        </span>
      </div>
    )
  }

  if (error || !dataset || !reference) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-lg space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Could Not Load Reference Scene
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Historical observation ${referenceId} is not linked to this dataset.`}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/temporal/references`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to References
        </button>
      </div>
    )
  }

  const cand = reference.candidate
  const previewUrl = cand?.preview_url

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
              onClick={() => router.push(`/datasets/${datasetId}/temporal/references`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Reference Stack</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Temporal Intelligence", href: `/datasets/${datasetId}/temporal` },
                { label: "Historical references", href: `/datasets/${datasetId}/temporal/references` },
                { label: `Observation #${reference.rank_position}` }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Layers className="w-4.5 h-4.5 text-primary" />
              Reference Scene: #{reference.rank_position}
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Candidate ID: <span className="text-foreground select-all">{reference.candidate_id}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] border border-border px-3 py-1.5 bg-muted/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-muted-foreground uppercase text-[9px] tracking-wider">
              Score: {(reference.ranking_score * 100).toFixed(1)}/100
            </span>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Column: Big Image Preview */}
          <div className="lg:col-span-3 border border-border bg-black/45 rounded-lg p-4 flex flex-col justify-center items-center relative min-h-[350px]">
            <div className="absolute top-3 left-3 bg-black/75 border border-border/40 px-2.5 py-1 text-[8.5px] text-primary uppercase font-bold tracking-widest z-10">
              Imagery Viewport
            </div>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Candidate image ${reference.candidate_id}`}
                className="max-h-[380px] max-w-full object-contain rounded-lg shadow-md border border-border/20"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground/50 text-[10px] uppercase">
                <Globe className="w-12 h-12 stroke-[1.2] text-muted-foreground/30 animate-pulse" />
                <span>Geospatial Orbit Image Absent in Local Cache</span>
              </div>
            )}
          </div>

          {/* Right Column: Divided Attributes */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Justification Box */}
            <div className="border border-border bg-card/25 p-5 rounded-lg space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8.5px] text-primary tracking-widest uppercase">
                JUSTIFICATION
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                RECONSTRUCTION UTILITY
              </h3>
              <p className="text-[11px] leading-relaxed text-slate-300 font-sans italic border-t border-border/20 pt-3">
                "{reference.selection_reason || "Selected for optimal spatial overlap index and atmospheric cloud clearance profile."}"
              </p>
            </div>

            {/* Structured Parameters Panel */}
            <div className="border border-border bg-card/20 p-5 rounded-lg space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Database className="w-4 h-4 text-primary" />
                ORBITAL PARAMETERS
              </h3>

              <div className="space-y-3 border-t border-border/20 pt-4 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Historical Provider</span>
                  <span className="text-cyan-400 font-bold uppercase">{cand?.provider_name || "N/A"}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Cloud cover</span>
                    <span className={`font-bold ${cand && cand.cloud_cover > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {cand ? `${cand.cloud_cover.toFixed(2)}%` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Spatial overlap</span>
                    <span className="text-foreground font-bold">{cand ? `${cand.spatial_overlap.toFixed(2)}%` : "N/A"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Acquisition Date</span>
                    <span className="text-foreground font-semibold">{cand ? cand.acquisition_date.split("T")[0] : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Orbit Timestamp</span>
                    <span className="text-pink-400 font-mono font-semibold">
                      {cand ? cand.acquisition_date.split("T")[1]?.replace("Z", "") || "00:00:00" : "N/A"}
                    </span>
                  </div>
                </div>

                {cand?.metadata && Object.keys(cand.metadata).length > 0 && (
                  <div className="pt-2 border-t border-border/10">
                    <span className="text-muted-foreground block text-[9px] uppercase tracking-wider mb-1.5">Extended Telemetry tags</span>
                    <div className="bg-black/25 p-2.5 rounded-lg text-[9px] border border-border/30 max-h-[120px] overflow-y-auto space-y-1">
                      {Object.entries(cand.metadata).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-start">
                          <span className="text-slate-400 uppercase tracking-tight block shrink-0 max-w-[120px] truncate">{key}:</span>
                          <span className="text-slate-200 truncate select-all">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
