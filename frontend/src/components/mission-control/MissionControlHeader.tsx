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
          Unified stateless aggregation & telemetry console for registered Earth Observation imagery
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px]">
        {/* Node Lock Status Info */}
        <div className="border border-border/80 bg-background/50 px-3 py-1.5 rounded-sm flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <div>
            <span className="text-muted-foreground">ACTIVE LOCK:</span>{" "}
            <span className="font-bold text-foreground uppercase">{datasetName}</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        </div>

        {/* Short ID Badge */}
        <div className="border border-border/80 bg-background/50 px-3 py-1.5 rounded-sm">
          <span className="text-muted-foreground">LOCK REF:</span>{" "}
          <span className="font-bold text-slate-300 select-all">{datasetId.substring(0, 8)}...</span>
        </div>

        {/* Refresh Feed */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 border border-primary/30 hover:border-primary/80 bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 uppercase disabled:opacity-50 font-bold tracking-wider rounded-sm shadow-[0_0_8px_-2px_rgba(6,182,212,0.2)]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Sync telemetry</span>
        </button>
      </div>
    </div>
  );
}
