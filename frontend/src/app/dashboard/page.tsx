import React from "react"
import { BarChart3, LineChart, PieChart, ShieldCheck } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary">MISSION PERFORMANCE DASHBOARD</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Global metrics, confidence statistics & performance analysis</p>
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30 font-mono">
          <span className="text-muted-foreground">RECONSTRUCTED:</span>
          <span className="text-primary font-bold">0.00 km²</span>
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Jobs Completed", val: "0", sub: "All time", icon: ShieldCheck, color: "text-emerald-500" },
          { label: "Avg Confidence Score", val: "0.0%", sub: "Geospatial rating", icon: BarChart3, color: "text-primary" },
          { label: "Cloud Pixels Cleared", val: "0", sub: "Pixels inpainted", icon: LineChart, color: "text-amber-500" },
          { label: "Stored Session Data", val: "0.00 MB", sub: "Local SQLite database", icon: PieChart, color: "text-purple-500" },
        ].map((stat, i) => (
          <div key={i} className="border border-border bg-card/40 p-4 relative overflow-hidden flex flex-col justify-between h-24 glow-cyan-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div>
              <span className="text-2xl font-mono font-bold tracking-wider text-foreground">{stat.val}</span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphical Placeholder Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border border-border bg-card/20 p-5 lg:col-span-2 min-h-[300px] flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
          <div className="absolute top-4 left-4 font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Temporal Trends Engine</div>
          <LineChart className="w-8 h-8 text-muted-foreground animate-pulse-slow" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">No Analytics Record Available</h3>
          <p className="text-xs text-muted-foreground max-w-sm">Reconstruction analytics will appear here in future phases once processing jobs are ran and logged.</p>
        </div>

        <div className="border border-border bg-card/20 p-5 min-h-[300px] flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
          <div className="absolute top-4 left-4 font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Quality Distribution</div>
          <PieChart className="w-8 h-8 text-muted-foreground animate-pulse-slow" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">No Distribution Stats</h3>
          <p className="text-xs text-muted-foreground max-w-xs">Restoration accuracy scores distributions will compile dynamically.</p>
        </div>
      </div>
    </div>
  )
}
