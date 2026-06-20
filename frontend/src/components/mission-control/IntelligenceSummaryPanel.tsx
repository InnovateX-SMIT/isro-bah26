import React from "react";
import { Terminal, Shield, Compass, FileText } from "lucide-react";
import { MissionControlStatus } from "@/lib/types/mission-control";

interface IntelligenceSummaryPanelProps {
  summary: string | null;
  status: MissionControlStatus;
}

export default function IntelligenceSummaryPanel({ summary, status }: IntelligenceSummaryPanelProps) {
  const getOverallReadiness = () => {
    const layers = [status.metadata, status.geospatial, status.location, status.context];
    const availableCount = layers.filter(s => s === "available").length;
    if (availableCount === 4) return { text: "FULL LOCK", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.2)]" };
    if (availableCount > 0) return { text: "PARTIAL LOCK", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" };
    return { text: "NO LOCK", color: "text-red-400 border-red-500/20 bg-red-500/5 animate-pulse" };
  };

  const readiness = getOverallReadiness();

  return (
    <div className="border border-border bg-card/25 p-4 font-mono space-y-4 relative overflow-hidden flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // SUMMARY
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
          <Terminal className="w-4 h-4 text-primary" />
          Mission Summary & Briefing
        </h2>

        {/* Dynamic Summary terminal screen */}
        <div className="border border-border/40 bg-black/45 p-4 rounded-sm relative overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
          {/* Matrix scanline effect */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none" />
          
          <div className="space-y-3 text-[11px] leading-relaxed text-slate-300 relative z-10 select-text">
            <div className="flex items-center gap-1.5 text-primary text-[9px] uppercase tracking-widest font-bold border-b border-primary/10 pb-1.5 mb-2">
              <Shield className="w-3.5 h-3.5" />
              DYNAMIC OPERATIONAL BRIEFING // SECURE LINK
            </div>
            
            <p className="indent-4">
              {summary || "Telemetry compilation in progress. Waiting for intelligence services cascade to resolve environmental geomorphic context..."}
            </p>
            
            <div className="flex items-center space-x-1 text-primary animate-pulse text-[10px]">
              <span>&gt; SYSTEM MONITOR ACTIVE</span>
              <span className="w-1.5 h-3 bg-primary inline-block ml-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Aggregated Info Badge Indicators */}
      <div className="flex items-center justify-between border-t border-border/30 pt-3 mt-4 text-[9px]">
        <div className="flex items-center space-x-1.5 text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          <span>REPORT INTEGRITY:</span>
        </div>
        <div className={`px-2 py-0.5 border rounded-sm font-bold uppercase tracking-widest text-[8px] ${readiness.color}`}>
          {readiness.text}
        </div>
      </div>
    </div>
  );
}
