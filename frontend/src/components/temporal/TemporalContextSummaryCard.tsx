import React from "react";
import { Terminal, Shield } from "lucide-react";

interface TemporalContextSummaryCardProps {
  summary: string;
}

export default function TemporalContextSummaryCard({ summary }: TemporalContextSummaryCardProps) {
  return (
    <div className="border border-border/60 bg-background/30 p-4 space-y-3 font-mono relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        BRIEFING // TELEMETRY
      </div>
      
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/30 pb-2">
        <Terminal className="w-3.5 h-3.5 text-primary" />
        Temporal Briefing & Summary
      </h3>

      <div className="border border-primary/20 bg-black/40 p-3.5 rounded-sm relative overflow-hidden shadow-[inset_0_0_12px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />
        
        <div className="space-y-2 text-[10px] leading-relaxed text-slate-300 relative z-10 select-text">
          <div className="flex items-center gap-1 text-primary text-[8px] uppercase tracking-widest font-bold border-b border-primary/10 pb-1 mb-2">
            <Shield className="w-3 h-3" />
            TEMPORAL INTEL DECRYPT // ACTIVE CONTEXT
          </div>
          
          <p className="indent-3">{summary}</p>
        </div>
      </div>
    </div>
  );
}
