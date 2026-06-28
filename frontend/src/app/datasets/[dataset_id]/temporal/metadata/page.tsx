"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Clock,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Database,
  Globe,
  Layers,
  Shield,
  FileText,
  Info
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getTemporalContextPackage, getTemporalContext } from "@/lib/temporal-context-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { TemporalContextPackageResponse, TemporalContextResponse } from "@/lib/types/temporal-context"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

export default function TemporalMetadataPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [context, setContext] = useState<TemporalContextResponse | null>(null)
  const [packageData, setPackageData] = useState<TemporalContextPackageResponse | null>(null)

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
          const tc = await getTemporalContext(ds.analysis_session_id)
          setContext(tc)
        } catch (err) {
          console.log("No flat context record found")
        }

        try {
          const pkg = await getTemporalContextPackage(ds.analysis_session_id)
          setPackageData(pkg)
        } catch (err) {
          console.log("No temporal context package found")
        }

      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load temporal metadata.")
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

  if (error || !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-lg space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Could Not Load Metadata
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Temporal metadata details for dataset ${datasetId} are unreachable.`}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/temporal`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Temporal Hub
        </button>
      </div>
    )
  }

  const isContextAvailable = context !== null || packageData !== null

  return (
    <div className="flex flex-col h-full overflow-hidden border border-border bg-card/15 rounded-xl font-mono text-slate-100">
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="temporal"
      />
      
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Header Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/temporal`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Temporal Hub</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Temporal Intelligence", href: `/datasets/${datasetId}/temporal` },
                { label: "Temporal Metadata" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <FileText className="w-4.5 h-4.5 text-primary" />
              Segmented Temporal Metadata Registry
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-[10px] border border-border px-3 py-1 bg-muted/20 text-slate-300">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span className="uppercase text-[9px] tracking-wider">REGISTRY CALIBRATED</span>
          </div>
        </div>

        {/* Empty State */}
        {!isContextAvailable ? (
          <div className="border border-dashed border-border/40 p-8 rounded text-center max-w-lg mx-auto space-y-4">
            <Info className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Metadata Missing</h3>
            <p className="text-xs text-muted-foreground font-sans">
              No temporal stack records are initialized. Please compile the temporal context in the Overview Hub to view details.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Component 1: Search & Acquisition Constraints */}
            <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                Acquisition Orbit Constraints
              </h2>
              
              <div className="space-y-2.5 text-[10.5px]">
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Target composite date:</span>
                  <span className="text-slate-200 font-semibold">{metadata?.acquisition_date || "UNKNOWN"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Temporal context ID:</span>
                  <span className="text-slate-200 font-mono select-all truncate max-w-[180px]">{context?.id || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Reference stack ID:</span>
                  <span className="text-slate-200 font-mono select-all truncate max-w-[180px]">{context?.reference_stack_id || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Creation date:</span>
                  <span className="text-pink-400 font-semibold">{context ? new Date(context.created_at).toLocaleString() : "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Component 2: Provider Configuration */}
            <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Provider Statistics
              </h2>

              <div className="space-y-2.5 text-[10.5px]">
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Historical providers count:</span>
                  <span className="text-slate-200 font-bold">{context?.provider_count || 0} providers</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Primary catalogs:</span>
                  <span className="text-cyan-400 font-semibold">
                    {packageData?.provider_summary.providers_represented.join(", ") || "GoogleEarthEngine"}
                  </span>
                </div>
                {packageData?.provider_summary.provider_counts && (
                  <div className="space-y-1.5 pt-1.5 border-t border-dashed border-border/20">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Orbital observation frequency</span>
                    {Object.entries(packageData.provider_summary.provider_counts).map(([prov, cnt]) => (
                      <div key={prov} className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">{prov}:</span>
                        <span className="font-bold text-slate-200">{cnt} bands/obs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Component 3: Overlap & Cloud Coverage stats */}
            <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                Coverage & Overlap Summary
              </h2>

              <div className="space-y-2.5 text-[10.5px]">
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Average spatial overlap:</span>
                  <span className="text-slate-200 font-bold">{context ? `${context.average_spatial_overlap.toFixed(2)}%` : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Min/Max spatial overlap range:</span>
                  <span className="text-cyan-400 font-semibold">
                    {packageData ? `${packageData.spatial_statistics.min.toFixed(1)}% - ${packageData.spatial_statistics.max.toFixed(1)}%` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Average cloud cover:</span>
                  <span className="text-slate-200 font-bold">{context ? `${context.average_cloud_cover.toFixed(2)}%` : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Min/Max cloud cover range:</span>
                  <span className="text-amber-500 font-semibold">
                    {packageData ? `${packageData.cloud_statistics.min.toFixed(1)}% - ${packageData.cloud_statistics.max.toFixed(1)}%` : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Component 4: Orbit Time Spans */}
            <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                Temporal Statistics & Selection
              </h2>

              <div className="space-y-2.5 text-[10.5px]">
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Selected target references count:</span>
                  <span className="text-slate-200 font-bold">{context?.reference_count || 0} references</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Average temporal distance:</span>
                  <span className="text-slate-200 font-bold">{context ? `${context.average_temporal_distance.toFixed(1)} days` : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                  <span className="text-slate-400">Min/Max temporal offsets range:</span>
                  <span className="text-pink-400 font-semibold">
                    {packageData ? `${packageData.temporal_statistics.min.toFixed(0)} days - ${packageData.temporal_statistics.max.toFixed(0)} days` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Selection strategy:</span>
                  <span className="text-slate-200 font-semibold font-mono uppercase">DEFAULT WEIGHTED SCANNER</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
