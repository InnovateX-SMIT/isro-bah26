import React from "react";
import Link from "next/link";
import { IntelligenceLayerStatus } from "@/lib/types/mission-control";
import { Activity, AlertTriangle, ArrowRight } from "lucide-react";

interface ConfidencePanelProps {
  datasetId: string;
  confidence: Record<string, any> | null;
  reliability: Record<string, any> | null;
  heatmap: Record<string, any> | null;
  analytics: Record<string, any> | null;
  status: IntelligenceLayerStatus;
}

export default function ConfidencePanel({ datasetId, confidence, reliability, heatmap, analytics, status }: ConfidencePanelProps) {
  const hasConfidence = status === "available" && confidence;

  return (
    <div className="border border-border bg-card/20 p-4 font-mono space-y-4 relative overflow-hidden rounded-sm hover:border-primary/40 transition-colors flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // CONFIDENCE
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
          <Activity className="w-4 h-4 text-primary" />
          Confidence & Reliability Intelligence
        </h2>

        {hasConfidence ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-background/25 border border-border/30 p-2 rounded-sm space-y-1">
                <span className="text-[7.5px] text-slate-400 block">RELIABILITY TIER</span>
                <span className={`font-bold ${
                  reliability?.dataset_reliability_tier?.toUpperCase() === "HIGH" ? "text-emerald-400" :
                  reliability?.dataset_reliability_tier?.toUpperCase() === "MODERATE" ? "text-sky-400" :
                  "text-amber-500"
                }`}>
                  {reliability?.dataset_reliability_tier || "MODERATE"}
                </span>
              </div>
              <div className="bg-background/25 border border-border/30 p-2 rounded-sm space-y-1">
                <span className="text-[7.5px] text-slate-400 block">MEAN SCORE</span>
                <span className="font-bold text-slate-100">
                  {reliability?.dataset_reliability_score !== undefined 
                    ? `${reliability.dataset_reliability_score}%` 
                    : `${(confidence.mean_confidence_score * 100).toFixed(1)}%`}
                </span>
              </div>
            </div>

            <div className="bg-background/30 p-2.5 border border-border/40 space-y-1.5 text-[9px]">
              <div className="flex justify-between text-slate-300">
                <span>UNRESTORED LOW tier AREA:</span>
                <span className="font-semibold text-slate-200">
                  {confidence.low_confidence_area_percent !== undefined 
                    ? `${confidence.low_confidence_area_percent.toFixed(1)}%` 
                    : "0.0%"}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>OVERLAY HEATMAP:</span>
                <span className="font-semibold text-emerald-400 uppercase">
                  {heatmap?.heatmap_status || "PENDING"}
                </span>
              </div>
            </div>

            {analytics?.headline_summary && (
              <div className="bg-black/25 border border-border/20 p-3 rounded-sm space-y-1.5 text-[8.5px] text-slate-400 italic">
                <div className="text-[7.5px] text-primary font-bold uppercase tracking-wider not-italic mb-1">
                  SUMMARY BRIEFING:
                </div>
                "{analytics.headline_summary}"
              </div>
            )}
          </div>
        ) : (
          <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto animate-pulse" />
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Confidence Score Pending</div>
            <p className="text-[9px] text-muted-foreground leading-normal">
              Confidence estimation metrics have not been run. Trigger estimation in the confidence workspace.
            </p>
          </div>
        )}
      </div>

      <Link href={`/datasets/${datasetId}/confidence`} className="inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase transition-all mt-4">
        Open Confidence Hub
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
