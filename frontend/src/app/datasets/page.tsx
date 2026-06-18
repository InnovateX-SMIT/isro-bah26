import React from "react"
import { Database, Plus, ChevronRight, FileCode2 } from "lucide-react"

export default function DatasetsPage() {
  const demoDatasets = [
    { id: "demo-01", name: "Bengaluru Urban Center (LISS-IV)", date: "2026-04-12", size: "128 MB", cloudCover: "42.5%", status: "Available" },
    { id: "demo-02", name: "Himalayan Foothills (LISS-IV)", date: "2025-10-05", size: "256 MB", cloudCover: "68.1%", status: "Available" },
    { id: "demo-03", name: "Godavari River Basin (LISS-IV)", date: "2026-01-20", size: "184 MB", cloudCover: "18.3%", status: "Available" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary">GEOSPATIAL DATA INVENTORY</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Manage satellite image catalogs, coordinates, and bands</p>
        </div>
        <button disabled className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold tracking-wider flex items-center gap-1.5 cursor-not-allowed">
          <Plus className="w-3.5 h-3.5" />
          IMPORT DATASET
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Datasets list */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Available Datasets</h2>
          
          <div className="space-y-3">
            {demoDatasets.map((dataset) => (
              <div key={dataset.id} className="border border-border bg-card/40 hover:bg-card/75 p-4 flex items-center justify-between transition-colors group relative overflow-hidden">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-muted/40 border border-border text-primary">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide text-foreground/95">{dataset.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-muted-foreground font-mono">
                      <span>DATE: {dataset.date}</span>
                      <span>SIZE: {dataset.size}</span>
                      <span>CLOUDS: <span className="text-amber-500">{dataset.cloudCover}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{dataset.status}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metadata detail summary placeholder */}
        <div className="border border-border bg-card/30 p-5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[9px] text-primary tracking-widest font-mono">METADATA-INFO</div>
          <h2 className="text-sm font-semibold tracking-wider uppercase flex items-center gap-2 text-foreground/95">
            <FileCode2 className="w-4 h-4 text-primary" />
            Raster Geometry
          </h2>
          
          <div className="border-t border-border pt-3 space-y-3 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PROJECTION</span>
              <span className="text-foreground">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">COORDINATES</span>
              <span className="text-foreground">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SPATIAL RES</span>
              <span className="text-foreground">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">BANDS</span>
              <span className="text-foreground">--</span>
            </div>
          </div>
          <div className="border-t border-border pt-4 text-center">
            <p className="text-[11px] text-muted-foreground uppercase italic">Select a dataset from the list to preview metadata specifications.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
