"use client"

import React from "react";
import { LocationContext } from "@/lib/types/location";
import { Terminal } from "lucide-react";

interface LocationSummaryCardProps {
  location: LocationContext;
}

export default function LocationSummaryCard({ location }: LocationSummaryCardProps) {
  return (
    <div className="border border-border bg-card/25 p-4 font-mono text-xs relative overflow-hidden group">
      {/* Laser Scanning HUD Visual effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/0 via-primary/5 to-primary/0 -translate-y-full group-hover:translate-y-full transition-transform duration-[1500ms] ease-in-out" />
      
      <div className="flex items-center space-x-2 text-primary font-bold text-[10px] uppercase tracking-widest border-b border-border/50 pb-2 mb-2">
        <Terminal className="w-3.5 h-3.5 text-primary" />
        <span>Location Summary Report</span>
      </div>
      
      <p className="text-slate-200 leading-relaxed text-[11px] select-all">
        {location.location_summary}
      </p>
    </div>
  );
}
