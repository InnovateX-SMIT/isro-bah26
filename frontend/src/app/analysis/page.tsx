import React from "react"
import { Play, ShieldAlert, Cpu, Eye, BarChart3, Database } from "lucide-react"

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      {/* Header telemetry bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary">ANALYTICS & RECONSTRUCTION PIPELINE</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Execute AI cloud removal & geospatial restoration jobs</p>
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase">Pipeline State: STANDBY</span>
        </div>
      </div>

      {/* Placeholder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset Selection */}
        <div className="border border-border bg-card/50 p-5 space-y-4 glow-cyan-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[9px] text-primary tracking-widest font-mono">SYS-01</div>
          <h2 className="text-sm font-semibold tracking-wider uppercase flex items-center gap-2 text-foreground/95">
            <Database className="w-4 h-4 text-primary" />
            1. Ingest Dataset
          </h2>
          <p className="text-xs text-muted-foreground">Select LISS-IV satellite imagery or load a pre-curated demo case study.</p>
          <div className="border border-dashed border-border p-8 text-center text-xs text-muted-foreground bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors">
            Upload GeoTIFF Raster or Select Demo
          </div>
        </div>

        {/* Cloud & Segmentation Analysis */}
        <div className="border border-border bg-card/50 p-5 space-y-4 glow-cyan-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[9px] text-primary tracking-widest font-mono">SYS-02</div>
          <h2 className="text-sm font-semibold tracking-wider uppercase flex items-center gap-2 text-foreground/95">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            2. Cloud Intelligence
          </h2>
          <p className="text-xs text-muted-foreground">Isolate and segment clouds, cirrus haze, and corresponding shadow structures.</p>
          <div className="h-[98px] border border-border bg-muted/20 flex flex-col items-center justify-center text-xs text-muted-foreground font-mono space-y-1">
            <span>Detections: --</span>
            <span>Mask Coverage: --</span>
          </div>
        </div>

        {/* Reconstruction Control */}
        <div className="border border-border bg-card/50 p-5 space-y-4 glow-cyan-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[9px] text-primary tracking-widest font-mono">SYS-03</div>
          <h2 className="text-sm font-semibold tracking-wider uppercase flex items-center gap-2 text-foreground/95">
            <Cpu className="w-4 h-4 text-emerald-500" />
            3. AI Reconstruction
          </h2>
          <p className="text-xs text-muted-foreground">Perform temporal fusion and generative spatial reconstruction under clouds.</p>
          <button disabled className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded text-xs font-semibold tracking-wider flex items-center justify-center gap-2 cursor-not-allowed">
            <Play className="w-3.5 h-3.5" />
            RUN RESTORATION
          </button>
        </div>
      </div>

      {/* Main interactive area placeholder */}
      <div className="border border-border bg-card/30 min-h-[300px] flex flex-col items-center justify-center p-8 text-center space-y-2 relative overflow-hidden">
        <div className="absolute top-4 left-4 font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Visualization Engine Ready</div>
        <Eye className="w-8 h-8 text-muted-foreground animate-pulse-slow" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">No Dataset Selected</h3>
        <p className="text-xs text-muted-foreground max-w-sm">Please select a dataset or trigger a demo run under the datasets page to populate the geospatial reconstruction screen.</p>
      </div>
    </div>
  )
}
