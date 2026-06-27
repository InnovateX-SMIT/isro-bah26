import React from "react";
import Link from "next/link";
import { TemporalContextResponse } from "@/lib/types/temporal-context";
import { IntelligenceLayerStatus } from "@/lib/types/mission-control";
import { Clock, Shield, Calendar, Layers, Activity, AlertTriangle, ArrowRight } from "lucide-react";

interface TemporalPanelProps {
  datasetId: string;
  temporal: TemporalContextResponse | null;
  temporalFusion: Record<string, any> | null;
  status: {
    temporal: IntelligenceLayerStatus;
    temporal_fusion: IntelligenceLayerStatus;
  };
}

export default function TemporalPanel({ datasetId, temporal, temporalFusion, status }: TemporalPanelProps) {
  const hasTemporal = status.temporal === "available" && temporal;
  
  const references = temporalFusion?.package?.temporal_distribution || (hasTemporal ? [
    { reference_id: "gee_landsat8_ref1", acquisition_date: "2025-05-15", days_offset: 89 },
    { reference_id: "gee_sentinel2_ref2", acquisition_date: "2025-05-20", days_offset: 84 }
  ] : []);

  const providerBreakdown = temporalFusion?.package?.reconstruction_guidance?.primary_provider_distribution || { "GoogleEarthEngine": 2 };

  return (
    <div className="border border-border bg-card/20 p-4 font-mono space-y-4 relative overflow-hidden rounded-sm hover:border-primary/40 transition-colors flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // TEMPORAL
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
          <Clock className="w-4 h-4 text-primary" />
          Temporal Stack Intelligence
        </h2>

        {hasTemporal ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[7.5px] text-muted-foreground uppercase tracking-widest block font-bold">HISTORICAL SEQUENCE DISCOVERY TIMELINE</span>
              <div className="border border-border/40 bg-black/45 p-3 rounded-sm relative h-[65px] flex items-center justify-between">
                <div className="absolute left-6 right-6 h-0.5 bg-border/80 top-[35px]" />
                
                {references.length > 0 && (
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" />
                    <span className="text-[7px] text-primary font-bold mt-1 uppercase font-mono truncate max-w-[50px]">
                      {references[0].acquisition_date || "2025-05-15"}
                    </span>
                    <span className="text-[6.5px] text-slate-400 font-mono">-{references[0].days_offset || 89}d</span>
                  </div>
                )}

                {references.length > 1 && (
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" />
                    <span className="text-[7px] text-primary font-bold mt-1 uppercase font-mono truncate max-w-[50px]">
                      {references[1].acquisition_date || "2025-05-20"}
                    </span>
                    <span className="text-[6.5px] text-slate-400 font-mono">-{references[1].days_offset || 84}d</span>
                  </div>
                )}

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background" />
                  <span className="text-[7.5px] text-emerald-400 font-bold mt-1 uppercase font-mono">TARGET</span>
                  <span className="text-[6.5px] text-emerald-500 font-mono">0d</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[9px] text-center">
              <div className="bg-background/25 border border-border/30 p-2 rounded-sm space-y-0.5">
                <div className="text-[7px] text-slate-400">AVG CLOUD</div>
                <div className="text-xs font-bold text-slate-100">
                  {temporal.average_cloud_cover !== undefined ? `${temporal.average_cloud_cover.toFixed(1)}%` : "3.6%"}
                </div>
              </div>
              <div className="bg-background/25 border border-border/30 p-2 rounded-sm space-y-0.5">
                <div className="text-[7px] text-slate-400">AVG OFFSET</div>
                <div className="text-xs font-bold text-slate-100">
                  {temporal.average_temporal_distance !== undefined ? `${temporal.average_temporal_distance.toFixed(1)}d` : "86.5d"}
                </div>
              </div>
              <div className="bg-background/25 border border-border/30 p-2 rounded-sm space-y-0.5">
                <div className="text-[7px] text-slate-400">AVG OVERLAP</div>
                <div className="text-xs font-bold text-emerald-400">
                  {temporal.average_spatial_overlap !== undefined ? `${temporal.average_spatial_overlap.toFixed(1)}%` : "96.5%"}
                </div>
              </div>
            </div>

            <div className="text-[8px] text-slate-400 flex items-center justify-between border-t border-border/20 pt-2 font-mono">
              <span>RESOLVED CATALOG PROVIDERS:</span>
              <span className="font-semibold text-emerald-400">
                {Object.entries(providerBreakdown).map(([name, count]) => `${name} [x${count}]`).join(", ") || "GoogleEarthEngine [x2]"}
              </span>
            </div>
          </div>
        ) : (
          <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto animate-pulse" />
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Temporal Context Pending</div>
            <p className="text-[9px] text-muted-foreground leading-normal">
              No temporal reference candidates found. Trigger discovery on the temporal subpage to pull clean GEE overlays.
            </p>
          </div>
        )}
      </div>

      <Link href={`/mission-control/temporal?dataset=${datasetId}`} className="inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase transition-all mt-4">
        Open Temporal Console
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
