import React from "react"
import { Database, Activity, CheckCircle } from "lucide-react"

interface AnalysisStatsCardProps {
  total: number
  active: number
  completed: number
}

export default function AnalysisStatsCard({ total, active, completed }: AnalysisStatsCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Sessions */}
      <div className="border border-border bg-card/25 p-5 relative overflow-hidden hover:border-primary/50 transition-all font-mono">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
          SYS-METRIC // TOTAL
        </div>
        <div className="flex items-center space-x-3">
          <Database className="w-5.5 h-5.5 text-primary" />
          <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Total Sessions</span>
        </div>
        <div className="mt-4 text-3xl font-black text-foreground tracking-wider">{total}</div>
      </div>

      {/* Active Sessions */}
      <div className="border border-border bg-card/25 p-5 relative overflow-hidden hover:border-yellow-500/50 transition-all font-mono">
        <div className="absolute top-0 right-0 bg-yellow-500/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-yellow-500 tracking-widest uppercase">
          SYS-METRIC // RUNNING
        </div>
        <div className="flex items-center space-x-3">
          <Activity className="w-5.5 h-5.5 text-yellow-500 animate-pulse" />
          <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Active Sessions</span>
        </div>
        <div className="mt-4 text-3xl font-black text-foreground tracking-wider">{active}</div>
      </div>

      {/* Completed Sessions */}
      <div className="border border-border bg-card/25 p-5 relative overflow-hidden hover:border-emerald-500/50 transition-all font-mono">
        <div className="absolute top-0 right-0 bg-emerald-500/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-emerald-400 tracking-widest uppercase">
          SYS-METRIC // SYNCED
        </div>
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-5.5 h-5.5 text-emerald-400" />
          <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Completed Sessions</span>
        </div>
        <div className="mt-4 text-3xl font-black text-foreground tracking-wider">{completed}</div>
      </div>
    </div>
  )
}
