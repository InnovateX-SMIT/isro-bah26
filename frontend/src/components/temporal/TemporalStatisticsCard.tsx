import React from "react";
import { Calendar, GitCommit } from "lucide-react";
import { TemporalStatistics } from "@/lib/types/temporal-context";

interface TemporalStatisticsCardProps {
  stats: TemporalStatistics;
}

export default function TemporalStatisticsCard({ stats }: TemporalStatisticsCardProps) {
  return (
    <div className="border border-border bg-card/25 p-4 font-mono space-y-4 relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        TEMPORAL // DELAY
      </div>
      
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
        <Calendar className="w-4 h-4 text-primary" />
        Temporal Offset Analytics
      </h3>

      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="border border-border/40 bg-background/30 p-2.5">
          <div className="text-[7px] text-muted-foreground uppercase tracking-widest">MIN DELAY</div>
          <div className="text-xs font-bold text-slate-200 mt-1 uppercase">
            {stats.min.toFixed(0)} DAYS
          </div>
        </div>
        <div className="border border-primary/20 bg-primary/5 p-2.5">
          <div className="text-[7px] text-primary uppercase tracking-widest font-bold">AVG DELAY</div>
          <div className="text-sm font-bold text-primary mt-0.5 uppercase">
            {stats.average.toFixed(1)} DAYS
          </div>
        </div>
        <div className="border border-border/40 bg-background/30 p-2.5">
          <div className="text-[7px] text-muted-foreground uppercase tracking-widest">MAX DELAY</div>
          <div className="text-xs font-bold text-slate-200 mt-1 uppercase">
            {stats.max.toFixed(0)} DAYS
          </div>
        </div>
      </div>

      <div className="border border-border/30 bg-background/20 p-2 text-[8px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-1">
          <GitCommit className="w-3 h-3 text-primary shrink-0" />
          <span>Optimal target offset: &lt; 90 days.</span>
        </div>
        <div className="flex items-center gap-1">
          <GitCommit className="w-3 h-3 text-primary shrink-0" />
          <span>Calculated relative to LISS-IV scene pass date.</span>
        </div>
      </div>
    </div>
  );
}
