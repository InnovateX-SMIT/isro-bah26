import React from "react";
import { Compass, RefreshCw, Cpu } from "lucide-react";

interface MissionControlHeaderProps {
  datasetName: string;
  datasetId: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function MissionControlHeader({
  onRefresh,
  isLoading
}: Omit<MissionControlHeaderProps, "datasetName" | "datasetId">) {
  return (
    <div className="border border-border bg-card/25 p-6 font-mono flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 relative overflow-hidden rounded-lg">
      {/* Decorative scanning line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/20 animate-pulse" />
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[9px] text-primary tracking-widest uppercase">
        CONSOLE // ACTIVE
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
          <Compass className="w-5.5 h-5.5 text-primary" />
          GEOSPATIAL MISSION CONTROL
        </h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Command hub for satellite image reconstruction, telemetry alignment, and context consolidation
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center space-x-1 px-3 py-2 border border-primary/30 hover:border-primary/80 bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 uppercase disabled:opacity-50 font-bold tracking-wider text-[9px] rounded-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Sync Telemetry</span>
        </button>
      </div>
    </div>
  );
}
