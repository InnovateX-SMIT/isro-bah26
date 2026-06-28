import React from "react";
import { MissionControlStatus } from "@/lib/types/mission-control";
import { Database, MapPin, Globe, Compass, Clock, Cloud, Cpu, Activity } from "lucide-react";

interface MissionControlStatusBarProps {
  status: MissionControlStatus;
}

export default function MissionControlStatusBar({ status }: MissionControlStatusBarProps) {
  const getStatusColor = (layerStatus: string) => {
    const s = (layerStatus || "missing").toLowerCase();
    if (s === "available" || s === "completed") {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        dot: "bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse",
        text: "READY"
      };
    } else if (s === "error" || s === "failed") {
      return {
        bg: "bg-red-500/10 border-red-500/30 text-red-400",
        dot: "bg-red-500 shadow-[0_0_8px_#ef4444]",
        text: "ERROR"
      };
    } else {
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
    { key: "temporal", name: "Temporal Intel", icon: Clock },
    { key: "cloud", name: "Cloud Intel", icon: Cloud },
    { key: "reconstruction", name: "Reconstruction", icon: Cpu },
    { key: "confidence", name: "Confidence Intel", icon: Activity },
  ] as const;

  const completedCount = layers.filter((layer) => {
    const s = (status[layer.key as keyof MissionControlStatus] || "missing") as string;
    const lowerS = s.toLowerCase();
    return lowerS === "available" || lowerS === "completed";
  }).length;

  const percent = Math.round((completedCount / layers.length) * 100);

  const getProgressColor = (p: number) => {
    if (p < 40) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    if (p < 80) return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]";
    return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
  };

  return (
    <div className="border border-border bg-card/15 p-4 font-mono text-[10px] space-y-4 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">// INTELLIGENCE READINESS STATUS MATRIX</span>
          <div className="text-[11px] font-bold text-foreground uppercase tracking-wider">
            WORKSPACE READINESS: {percent}% ({completedCount} OF {layers.length} MODULES READY)
          </div>
        </div>
        <span className="text-[9px] text-primary/70 uppercase tracking-widest">STATELESS AGGREGATOR V1.1</span>
      </div>

      {/* Dynamic Readiness Progress Bar */}
      <div className="w-full bg-slate-900 border border-border/40 h-2.5 rounded-full overflow-hidden relative">
        <div 
          className={`h-full transition-all duration-500 ease-in-out ${getProgressColor(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1">
        {layers.map((layer) => {
          const layerStatus = (status[layer.key as keyof MissionControlStatus] || "missing") as string;
          const colors = getStatusColor(layerStatus);
          const Icon = layer.icon;

          return (
            <div
              key={layer.key}
              className={`flex items-center justify-between p-2.5 border rounded-lg transition-all duration-300 ${colors.bg}`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Icon className="w-3.5 h-3.5 shrink-0 text-primary/80" />
                <span className="font-bold uppercase tracking-wider truncate text-[9px]">{layer.name}</span>
              </div>
              <div className="flex items-center space-x-1.5 pl-2 shrink-0">
                <span className="text-[7.5px] opacity-75">{colors.text}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
