import React from "react";
import { Compass, RefreshCw, Cpu } from "lucide-react";

interface MissionControlHeaderProps {
  datasetName: string;
  datasetId: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function MissionControlHeader({
  datasetName,
  datasetId,
  onRefresh,
  isLoading
}: MissionControlHeaderProps) {
  return (
    <div className="border border-border bg-card/25 p-4 font-mono flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 relative overflow-hidden">
      {/* Decorative scanning line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/20 animate-pulse" />
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[9px] text-primary tracking-widest uppercase">
        CONSOLE // ORBITAL NODE LOCK
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
          <Compass className="w-5.5 h-5.5 animate-spin-slow text-primary" />
          GEOSPATIAL MISSION CONTROL
        </h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Command hub for satellite image reconstruction, telemetry alignment, and context consolidation
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px]">
        {/* Unified Active Dataset Control Panel */}
        <div className="border border-border/80 bg-background/50 px-3 py-1.5 rounded-sm flex items-center gap-3">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">ACTIVE DATASET CONTROL:</span>
            <span className="font-bold text-foreground uppercase">{datasetName}</span>
            <span className="text-muted-foreground/45">|</span>
            <span className="font-mono text-slate-300 select-all">{datasetId.substring(0, 8)}...</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center space-x-1 px-2.5 py-1 border border-primary/30 hover:border-primary/80 bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 uppercase disabled:opacity-50 font-bold tracking-wider text-[8.5px] rounded-sm ml-2"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>
    </div>
  );
}
