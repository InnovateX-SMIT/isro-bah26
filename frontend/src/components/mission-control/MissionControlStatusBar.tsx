import React from "react";
import { MissionControlStatus, IntelligenceLayerStatus } from "@/lib/types/mission-control";
import { Database, MapPin, Globe, Compass, Clock, Cloud, Cpu, Activity } from "lucide-react";

interface MissionControlStatusBarProps {
  status: MissionControlStatus;
}

export default function MissionControlStatusBar({ status }: MissionControlStatusBarProps) {
  const getStatusColor = (layerStatus: IntelligenceLayerStatus) => {
    switch (layerStatus) {
      case "available":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          dot: "bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse",
          text: "READY"
        };
      case "error":
        return {
          bg: "bg-red-500/10 border-red-500/30 text-red-400",
          dot: "bg-red-500 shadow-[0_0_8px_#ef4444]",
          text: "ERROR"
        };
      case "missing":
      default:
        return {
          bg: "bg-amber-500/5 border-amber-500/20 text-amber-500/80",
          dot: "bg-amber-500/50",
          text: "PENDING"
        };
    }
  };

  const layers = [
    { key: "metadata", name: "Metadata Intel", icon: Database },
    { key: "geospatial", name: "Geospatial Core", icon: Globe },
    { key: "location", name: "Location Intel", icon: MapPin },
    { key: "context", name: "Context Intel", icon: Compass },
  ] as const;

  const futureLayers = [
    { key: "temporal", name: "Temporal Intel", icon: Clock },
    { key: "cloud", name: "Cloud Intel", icon: Cloud },
    { key: "reconstruction", name: "Reconstruction", icon: Cpu },
    { key: "confidence", name: "Confidence Intel", icon: Activity },
  ] as const;

  return (
    <div className="border border-border bg-card/15 p-3 font-mono text-[10px] space-y-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">// INTELLIGENCE READINESS STATUS MATRIX</span>
        <span className="text-[9px] text-primary/70 uppercase tracking-widest">STATELESS AGGREGATOR V1.0</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {/* Active Layers */}
        {layers.map((layer) => {
          const layerStatus = status[layer.key] || "missing";
          const colors = getStatusColor(layerStatus);
          const Icon = layer.icon;

          return (
            <div
              key={layer.key}
              className={`flex items-center justify-between p-2 border rounded-sm transition-all duration-300 ${colors.bg}`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold uppercase tracking-wider truncate">{layer.name}</span>
              </div>
              <div className="flex items-center space-x-1.5 pl-2 shrink-0">
                <span className="text-[8px] opacity-75">{colors.text}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              </div>
            </div>
          );
        })}

        {/* Future Layers for Extensibility */}
        {futureLayers.map((layer) => {
          const layerStatus: IntelligenceLayerStatus = (status[layer.key] as IntelligenceLayerStatus) || "missing";
          const colors = getStatusColor(layerStatus);
          const Icon = layer.icon;

          return (
            <div
              key={layer.key}
              className={`flex items-center justify-between p-2 border rounded-sm opacity-50 select-none ${colors.bg}`}
              title="Future platform expansion module"
            >
              <div className="flex items-center space-x-2 truncate">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="uppercase tracking-wider truncate">{layer.name}</span>
              </div>
              <div className="flex items-center space-x-1.5 pl-2 shrink-0">
                <span className="text-[7px] text-muted-foreground">OFFLINE</span>
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
