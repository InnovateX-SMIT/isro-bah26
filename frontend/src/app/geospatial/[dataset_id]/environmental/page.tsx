"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getDataset } from "@/lib/dataset-api"
import { getGeospatialContextProfile } from "@/lib/geospatial-context-api"
import { Dataset } from "@/lib/types/dataset"
import { GeospatialContextProfile } from "@/lib/types/geospatial-context"
import GeospatialContextPanel from "@/components/context/GeospatialContextPanel"
import { ArrowLeft, Loader2, Trees, AlertTriangle } from "lucide-react"

export default function EnvironmentalWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  // State
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [profile, setProfile] = useState<GeospatialContextProfile | null>(null)

  // Loading states
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspaceData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch dataset info
      const ds = await getDataset(datasetId)
      setDataset(ds)

      // Fetch geospatial context profile (physiography, environment, regional)
      try {
        const prof = await getGeospatialContextProfile(datasetId)
        setProfile(prof)
      } catch (err) {
        console.warn("Geospatial context profile not computed yet", err)
      }

    } catch (err: any) {
      console.error(err)
      setError("Failed to consolidate environmental context records.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadWorkspaceData()
    }
  }, [datasetId])

  return (
    <div className="space-y-6 font-mono text-slate-100 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push(`/geospatial/${datasetId}/workspace`)}
            className="inline-flex items-center space-x-1 text-xs text-primary hover:underline uppercase text-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Geospatial Workspace</span>
          </button>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
            <Trees className="w-5 h-5 text-primary" />
            ENVIRONMENTAL INTELLIGENCE CONTEXT
          </h1>
          {dataset && (
            <p className="text-xs text-slate-300 uppercase tracking-widest text-[10px]">
              LOCKED TARGET: <span className="text-white font-bold select-all">{dataset.dataset_name}</span> &middot; {dataset.dataset_path}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase text-[10px]">ENVIRONMENT: ACTIVE</span>
        </div>
      </div>

      {loading ? (
        <div className="border border-border bg-card/15 min-h-[300px] flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="space-y-1 text-center">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest animate-pulse">Consolidating Ecological Context...</h4>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Parsing geomorphology, landscape classifications, and environmental reports</p>
          </div>
        </div>
      ) : error ? (
        <div className="border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive flex flex-col items-center justify-center space-y-3">
          <AlertTriangle className="w-10 h-10" />
          <div>
            <h4 className="font-bold uppercase tracking-wider">Environmental Context Integration Failure</h4>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="border border-border bg-card/10 p-6 rounded-sm space-y-6">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">
            // PHYSICOGRAPHICAL & ENVIRONMENTAL DATA LOCKS
          </div>
          
          <GeospatialContextPanel
            profile={profile}
            loading={false}
          />
        </div>
      )}
    </div>
  )
}
