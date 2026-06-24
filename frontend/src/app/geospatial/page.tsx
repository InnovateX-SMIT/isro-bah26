"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dataset } from "@/lib/types/dataset"
import { getRegisteredDatasets } from "@/lib/dataset-api"
import { Database, MapPin, Loader2, Compass, ArrowRight } from "lucide-react"

export default function GeospatialPage() {
  const router = useRouter()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Load registered datasets
  const fetchDatasets = async () => {
    setLoadingDatasets(true)
    setError(null)
    try {
      const list = await getRegisteredDatasets()
      setDatasets(list)
      // Auto select the first dataset if available
      if (list.length > 0) {
        setSelectedDataset(list[0])
      }
    } catch (err: any) {
      console.error(err)
      setError("Failed to fetch registered datasets from platform database.")
    } finally {
      setLoadingDatasets(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [])

  const handleOpenWorkspace = () => {
    if (selectedDataset) {
      router.push(`/geospatial/${selectedDataset.dataset_id}/workspace`)
    }
  }

  return (
    <div className="space-y-6 font-mono text-slate-100 pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase">
            GEOSPATIAL INTELLIGENCE RADAR
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase text-[10px]">RADAR: ACTIVE</span>
        </div>
      </div>

      {error && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-xs">
          <span className="font-bold uppercase tracking-wider">{error}</span>
        </div>
      )}

      {/* Main Grid Selection Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left/Middle Column: Dataset Selection Registry */}
        <div className="md:col-span-2 border border-border bg-card/25 p-5 space-y-4 relative overflow-hidden rounded-sm">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2.5 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            REGISTRY // SATELLITE NODES
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Database className="w-4 h-4 text-primary" />
            Select Satellite Node Target
          </h2>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Select an active registered imagery dataset from the SQLite engine registry database below.
          </p>

          {loadingDatasets ? (
            <div className="flex items-center justify-center space-x-2 py-12 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>SCANNING REGISTRY INDEX...</span>
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-[10px] text-amber-500 border border-amber-500/20 bg-amber-500/5 p-4 rounded-sm text-center uppercase">
              No datasets registered. Register a demo scene in the Data Inventory panel first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
              {datasets.map((ds) => {
                const isSelected = selectedDataset?.dataset_id === ds.dataset_id
                return (
                  <button
                    key={ds.dataset_id}
                    onClick={() => setSelectedDataset(ds)}
                    className={`w-full text-left p-3.5 border transition-all flex flex-col space-y-1.5 rounded-sm ${
                      isSelected
                        ? "bg-primary/15 border-primary text-primary font-bold shadow-[0_0_12px_-3px_rgba(6,182,212,0.3)]"
                        : "border-border/60 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <MapPin className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="truncate uppercase font-bold text-foreground">{ds.dataset_name}</span>
                    </div>
                    <div className="text-[8px] pl-6 text-muted-foreground font-mono truncate select-all">{ds.dataset_path}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: HUD Summary & Workspace Action */}
        <div className="md:col-span-1 border border-border bg-card/25 p-5 space-y-6 relative overflow-hidden rounded-sm h-full flex flex-col justify-between">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2.5 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            HUD // WORKSPACE
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-primary" />
              Target Lock Brief
            </h2>
            
            {selectedDataset ? (
              <div className="space-y-3 text-[11px] leading-relaxed">
                <div className="bg-background/40 border border-border p-3 space-y-2">
                  <div>
                    <span className="text-[8px] text-muted-foreground uppercase block">LOCKED NODE NAME</span>
                    <span className="font-bold text-foreground uppercase">{selectedDataset.dataset_name}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground uppercase block">INGEST STATUS</span>
                    <span className="text-emerald-400 font-bold uppercase">{selectedDataset.dataset_status}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground uppercase block">SESSION ID</span>
                    <span className="text-muted-foreground truncate block font-mono text-[9px]">{selectedDataset.analysis_session_id}</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-[10px]">
                  Locking this node maps UTM grids, projection bounds, administrative limits, and environmental profile contexts.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-[10px] italic">
                Awaiting node target lock selection.
              </p>
            )}
          </div>

          {selectedDataset && (
            <button
              onClick={handleOpenWorkspace}
              className="w-full mt-4 py-3 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] rounded-sm"
            >
              <span>Open Geospatial Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
