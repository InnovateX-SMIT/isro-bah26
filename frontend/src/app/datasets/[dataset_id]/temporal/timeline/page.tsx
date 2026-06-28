"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Clock,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Cloud,
  Layers,
  ArrowDownUp,
  Info
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getSelectedReferences } from "@/lib/temporal-context-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { SelectedReference } from "@/lib/types/temporal-context"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

interface TimelineEvent {
  id: string
  date: string
  label: string
  type: "target" | "reference"
  cloudCover: number
  overlap?: number
  rank?: number
  provider?: string
  daysDiff: number
}

export default function TemporalTimelinePage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const ds = await getDataset(datasetId)
        setDataset(ds)

        let targetDateStr = ""
        let targetCloud = 0.0
        try {
          const meta = await getDatasetMetadata(datasetId)
          setMetadata(meta)
          targetDateStr = meta.acquisition_date || ""
        } catch (err) {
          console.log("No metadata extracted yet")
        }

        try {
          const refs = await getSelectedReferences(ds.analysis_session_id)
          
          // Assemble timeline events
          const events: TimelineEvent[] = []
          const targetDateObj = targetDateStr ? new Date(targetDateStr) : null

          // Add Target
          events.push({
            id: "target-composite",
            date: targetDateStr || new Date().toISOString(),
            label: ds.dataset_name + " (Target Composite)",
            type: "target",
            cloudCover: 0.0, // clouds are classified on target composite but we focus on references here
            daysDiff: 0
          })

          // Add References
          refs.forEach(ref => {
            const cand = ref.candidate
            if (cand) {
              const refDateObj = new Date(cand.acquisition_date)
              let daysDiff = 0
              if (targetDateObj) {
                const diffTime = refDateObj.getTime() - targetDateObj.getTime()
                daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24))
              }

              events.push({
                id: ref.id,
                date: cand.acquisition_date,
                label: `Reference Stack #${ref.rank_position}`,
                type: "reference",
                cloudCover: cand.cloud_cover,
                overlap: cand.spatial_overlap,
                rank: ref.rank_position,
                provider: cand.provider_name,
                daysDiff
              })
            }
          })

          // Sort chronologically (oldest first)
          events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          setTimelineEvents(events)
        } catch (err: any) {
          console.error(err)
          setError(err.message || "Failed to load timeline events.")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to sync timeline workspace.")
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
          Compiling Chronological Timeline...
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
            Could Not Load Timeline
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Historical timeline details for dataset ${datasetId} are unreachable.`}
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
                { label: "Acquisition Timeline" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <Clock className="w-4.5 h-4.5 text-primary" />
              Chronological Acquisition Timeline
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-[10px] border border-border px-3 py-1 bg-muted/20 text-slate-300">
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span className="uppercase text-[9px]">CHRONOLOGICAL LIST ORDER</span>
          </div>
        </div>

        {/* Timeline Frame */}
        {timelineEvents.length === 0 ? (
          <div className="border border-dashed border-border/40 p-8 rounded text-center max-w-lg mx-auto space-y-4">
            <Info className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Timeline Empty</h3>
            <p className="text-xs text-muted-foreground font-sans">
              No orbit context has been compiled yet. Return to the overview page to trigger temporal compilation.
            </p>
          </div>
        ) : (
          <div className="relative max-w-4xl mx-auto w-full px-4 py-8">
            {/* Center line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-border/60 z-0"></div>

            <div className="space-y-12">
              {timelineEvents.map((evt, idx) => {
                const isTarget = evt.type === "target"
                const daysLabel = evt.daysDiff === 0 
                  ? "Target Baseline" 
                  : evt.daysDiff > 0 
                    ? `+${evt.daysDiff} days after target` 
                    : `${evt.daysDiff} days before target`

                return (
                  <div key={evt.id} className="relative flex flex-col md:flex-row items-start md:justify-between z-10">
                    
                    {/* Circle Node */}
                    <div className="absolute left-4 md:left-1/2 -translate-x-[9px] md:-translate-x-2.5 top-1.5 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center z-20">
                      <span className={`w-1.5 h-1.5 rounded-full ${isTarget ? "bg-primary animate-ping" : "bg-cyan-400"}`}></span>
                    </div>

                    {/* Left block (For Desktop, displays date context for odd indices, else empty) */}
                    <div className="w-full md:w-[45%] md:text-right pl-12 md:pl-0 pr-4 md:block hidden text-[10px] text-muted-foreground uppercase pt-1">
                      {idx % 2 === 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span className="text-slate-200 font-bold">{evt.date.split("T")[0]}</span>
                          </div>
                          <div className="text-[9px] font-semibold text-pink-400 font-mono">
                            {evt.date.split("T")[1]?.replace("Z", "") || "00:00:00"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content Card (placed right for even idx or mobile, left for odd idx on desktop) */}
                    <div className={`w-full md:w-[45%] pl-12 md:pl-0 ${idx % 2 === 1 ? "md:mr-auto" : "md:ml-auto"}`}>
                      <div className={`border p-4 rounded-lg space-y-3 bg-card/25 shadow-sm relative ${
                        isTarget ? "border-primary/50 bg-primary/5 shadow-[0_0_12px_-5px_rgba(6,182,212,0.35)]" : "border-border/80 hover:border-cyan-400/30"
                      }`}>
                        
                        {/* Mobile and alternate date label */}
                        <div className="md:hidden flex items-center justify-between text-[9px] text-muted-foreground uppercase border-b border-border/10 pb-1.5">
                          <span className="text-slate-200 font-bold">{evt.date.split("T")[0]}</span>
                          <span>{daysLabel}</span>
                        </div>

                        {/* Title header */}
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className={`text-xs font-bold uppercase ${isTarget ? "text-primary" : "text-slate-200"}`}>
                              {evt.label}
                            </h3>
                            <span className="text-[9px] text-muted-foreground uppercase block mt-0.5">
                              {evt.provider || "Original Composite"}
                            </span>
                          </div>
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-lg border uppercase ${
                            isTarget 
                              ? "bg-primary/10 text-primary border-primary/20" 
                              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          }`}>
                            {evt.type}
                          </span>
                        </div>

                        {/* Stats block */}
                        {evt.type === "reference" && (
                          <div className="grid grid-cols-2 gap-2 text-[9.5px] border-t border-border/20 pt-2.5">
                            <div className="flex items-center space-x-1.5">
                              <Cloud className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-slate-400">Cloud:</span>
                              <span className="font-bold text-slate-200">{evt.cloudCover.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <Layers className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-slate-400">Overlap:</span>
                              <span className="font-bold text-slate-200">{evt.overlap?.toFixed(1)}%</span>
                            </div>
                          </div>
                        )}

                        {/* Timeline distance badge for desktop */}
                        <div className="hidden md:flex justify-between items-center text-[9px] border-t border-border/10 pt-2.5">
                          <span className="text-muted-foreground">TEMPORAL RADIUS:</span>
                          <span className={`font-bold ${isTarget ? "text-primary" : "text-cyan-400"}`}>
                            {daysLabel}
                          </span>
                        </div>

                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
