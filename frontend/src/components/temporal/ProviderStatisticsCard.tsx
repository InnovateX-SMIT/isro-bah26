import React from "react";
import { Layers, Database } from "lucide-react";
import { ProviderStatistics } from "@/lib/types/temporal-context";

interface ProviderStatisticsCardProps {
  stats: ProviderStatistics;
}

export default function ProviderStatisticsCard({ stats }: ProviderStatisticsCardProps) {
  const getProviderNiceName = (name: string) => {
    switch (name.toLowerCase()) {
      case "copernicus_scihub":
        return "COPERNICUS (SENTINEL)";
      case "usgs_earthexplorer":
        return "USGS (LANDSAT)";
      case "nasa_earthdata":
        return "NASA (MODIS/ASTER)";
      default:
        return name.toUpperCase();
    }
  };

  return (
    <div className="border border-border bg-card/25 p-4 font-mono space-y-4 relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        ARCHIVE // PROVIDERS
      </div>
      
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
        <Layers className="w-4 h-4 text-primary" />
        Satellite Provider Allocations
      </h3>

      <div className="space-y-3.5">
        <div className="border border-border/50 bg-background/30 p-2.5 flex items-center justify-between">
          <span className="text-[8px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Database className="w-3 h-3 text-primary/70" />
            UNIQUE PROVIDERS
          </span>
          <span className="text-xs font-bold text-foreground uppercase">
            {stats.providers_represented.length} PROVIDER(S)
          </span>
        </div>

        <div className="space-y-2 border border-border/40 bg-background/25 p-3 text-[9px]">
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider mb-1.5">STACK ALLOCATION DETAIL</div>
          {Object.entries(stats.provider_counts).map(([providerName, count], idx) => {
            const total = Object.values(stats.provider_counts).reduce((a, b) => a + b, 0);
            const percentage = (count / total) * 100;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>{getProviderNiceName(providerName)}:</span>
                  <span className="font-bold text-slate-200">{count} SCENE(S) ({percentage.toFixed(0)}%)</span>
                </div>
                {/* Visual bar */}
                <div className="w-full bg-border/20 h-1.5 rounded-sm overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
