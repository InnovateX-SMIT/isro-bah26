import React from "react";
import { Cloud, Check } from "lucide-react";
import { CloudStatistics } from "@/lib/types/temporal-context";

interface CloudStatisticsCardProps {
  stats: CloudStatistics;
}

export default function CloudStatisticsCard({ stats }: CloudStatisticsCardProps) {
  const getQualityColor = (avg: number) => {
    if (avg < 10) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    if (avg < 30) return "text-amber-400 border-amber-500/20 bg-amber-500/5";
    return "text-red-400 border-red-500/20 bg-red-500/5";
  };

  const colorClass = getQualityColor(stats.average);

  return (
    <div className="border border-border bg-card/25 p-4 font-mono space-y-4 relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        ATMOSPHERE // OPAQUE
      </div>
      
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
        <Cloud className="w-4 h-4 text-primary" />
        Cloud Contamination Analytics
      </h3>

      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="border border-border/40 bg-background/30 p-2.5">
          <div className="text-[7px] text-muted-foreground uppercase tracking-widest">MIN CLOUD</div>
          <div className="text-xs font-bold text-slate-200 mt-1 uppercase">
            {stats.min.toFixed(1)}%
          </div>
        </div>
        <div className={`border p-2.5 ${colorClass}`}>
          <div className="text-[7px] uppercase tracking-widest font-bold">AVG CLOUD</div>
          <div className="text-sm font-bold mt-0.5 uppercase">
            {stats.average.toFixed(1)}%
          </div>
        </div>
        <div className="border border-border/40 bg-background/30 p-2.5">
          <div className="text-[7px] text-muted-foreground uppercase tracking-widest">MAX CLOUD</div>
          <div className="text-xs font-bold text-slate-200 mt-1 uppercase">
            {stats.max.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="border border-border/30 bg-background/20 p-2 text-[8px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3 text-primary shrink-0" />
          <span>Optimal average cloud cover: &lt; 15.0%.</span>
        </div>
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3 text-primary shrink-0" />
          <span>Lower average cloud cover ensures pixel clarity.</span>
        </div>
      </div>
    </div>
  );
}
