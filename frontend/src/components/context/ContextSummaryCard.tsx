"use client"

import React from "react";
import { GeospatialContextProfile } from "@/lib/types/geospatial-context";
import { Terminal, ShieldAlert } from "lucide-react";

interface ContextSummaryCardProps {
  profile: GeospatialContextProfile;
}

export default function ContextSummaryCard({ profile }: ContextSummaryCardProps) {
  return (
    <div className="border border-border bg-card/25 p-4 font-mono text-xs relative overflow-hidden group space-y-3">
      {/* Visual Scanning effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/0 via-primary/5 to-primary/0 -translate-y-full group-hover:translate-y-full transition-transform duration-[1200ms] ease-in-out" />
      
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center space-x-2 text-primary font-bold text-[10px] uppercase tracking-widest">
          <Terminal className="w-3.5 h-3.5" />
          <span>Geospatial Context Report</span>
        </div>
      </div>
      
      <p className="text-slate-300 leading-relaxed text-[11px] select-all">
        {profile.context_summary}
      </p>

      {/* Inference Basis explainability label */}
      <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-[8px] text-muted-foreground">
        <div className="flex items-center space-x-1">
          <ShieldAlert className="w-3 h-3 text-amber-500 animate-pulse" />
          <span className="uppercase font-bold text-amber-500">EXPLAINABILITY LOG:</span>
        </div>
        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold uppercase rounded-lg select-all">
          {profile.inference_basis}
        </span>
      </div>
    </div>
  );
}
