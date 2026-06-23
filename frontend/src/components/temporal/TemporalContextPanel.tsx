import React, { useEffect, useState } from "react";
import { Dataset } from "@/lib/types/dataset";
import { IntelligenceLayerStatus } from "@/lib/types/mission-control";
import {
  generateTemporalContext,
  getTemporalContextPackage
} from "@/lib/temporal-context-api";
import { TemporalContextPackageResponse } from "@/lib/types/temporal-context";
import { Loader2, AlertTriangle, Shield, CheckCircle, Database, Calendar, Eye, FileText } from "lucide-react";
import TemporalContextSummaryCard from "./TemporalContextSummaryCard";
import TemporalStatisticsCard from "./TemporalStatisticsCard";
import CloudStatisticsCard from "./CloudStatisticsCard";
import SpatialStatisticsCard from "./SpatialStatisticsCard";
import ProviderStatisticsCard from "./ProviderStatisticsCard";

interface TemporalContextPanelProps {
  dataset: Dataset;
  status: IntelligenceLayerStatus;
  onRefresh?: () => void;
}

export default function TemporalContextPanel({ dataset, status, onRefresh }: TemporalContextPanelProps) {
  const [packageData, setPackageData] = useState<TemporalContextPackageResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = dataset.analysis_session_id;

  const fetchPackage = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTemporalContextPackage(sessionId);
      setPackageData(data);
    } catch (err: any) {
      console.error("Failed to load temporal context package:", err);
      setError(err.message || "Failed to retrieve temporal context package analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "available") {
      fetchPackage();
    } else {
      setPackageData(null);
    }
  }, [sessionId, status]);

  const handleGenerate = async () => {
    setProcessing(true);
    setError(null);
    try {
      await generateTemporalContext(sessionId);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error("Failed to generate temporal context:", err);
      setError(err.message || "Failed to compile Temporal Context Package.");
    } finally {
      setProcessing(false);
    }
  };

  if (status === "missing") {
    return (
      <div className="border border-cyan-500/20 bg-cyan-950/10 p-5 text-center font-mono space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
          TEMPORAL // PENDING
        </div>
        <Shield className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            // TEMPORAL CONTEXT PENDING
          </h3>
          <p className="text-[9px] text-muted-foreground max-w-sm mx-auto leading-normal">
            Historical imagery candidate evaluation and reference stack selection are complete.
            The final step requires aggregating statistics, compiling provider ratios, and writing the reconstruction-ready briefing summary.
          </p>
        </div>

        {error && (
          <div className="text-[9px] text-red-400 bg-red-950/20 border border-red-500/20 p-2 max-w-sm mx-auto">
            ERROR: {error}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={processing}
            className="px-4 py-2 border border-primary text-primary font-bold hover:bg-primary/20 hover:text-white transition-all duration-300 rounded-sm text-[10px] uppercase flex items-center space-x-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>COMPILING TEMPORAL BUNDLE...</span>
              </>
            ) : (
              <span>COMPILE TEMPORAL CONTEXT PACKAGE</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="border border-red-500/20 bg-red-500/5 p-5 text-center font-mono space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-red-500/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-red-400 tracking-widest uppercase">
          TEMPORAL // ERROR
        </div>
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-red-500">
          // TEMPORAL CONTEXT SYSTEM ERROR
        </h3>
        <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">
          Failed to process historical observation overlaps or compile provider telemetry.
        </p>
        <button
          onClick={handleGenerate}
          disabled={processing}
          className="mt-2 px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 text-[9px] uppercase transition-all duration-300 rounded-sm"
        >
          Retry Compilation
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-border bg-card/15 min-h-[200px] flex flex-col items-center justify-center p-6 space-y-3 font-mono">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <div className="space-y-0.5 text-center">
          <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-widest animate-pulse">
            Loading Temporal Context Bundle...
          </h4>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
            Fetching aggregate metrics, rankings, and provider logs
          </p>
        </div>
      </div>
    );
  }

  if (!packageData) return null;

  return (
    <div className="space-y-6 font-mono">
      {/* Upper Panel Grid: Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TemporalStatisticsCard stats={packageData.temporal_statistics} />
        <CloudStatisticsCard stats={packageData.cloud_statistics} />
        <SpatialStatisticsCard stats={packageData.spatial_statistics} />
        <ProviderStatisticsCard stats={packageData.provider_summary} />
      </div>

      {/* Middle briefing card */}
      <TemporalContextSummaryCard summary={packageData.context_summary} />

      {/* Selected reference scenes inventory table */}
      <div className="border border-border bg-card/25 p-4 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
          INVENTORY // REFERENCE STACK
        </div>
        
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
          <Database className="w-4 h-4 text-primary" />
          Ranked Historical Reference Scenes
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[9px] border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-background/40 text-muted-foreground uppercase tracking-widest text-[8px]">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3">Scene ID</th>
                <th className="py-2.5 px-3">Acquisition</th>
                <th className="py-2.5 px-3 text-center">Cloud</th>
                <th className="py-2.5 px-3 text-center">Overlap</th>
                <th className="py-2.5 px-3 text-right">Score</th>
                <th className="py-2.5 px-3">Selection Reason / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {packageData.selected_references.map((ref) => {
                const cand = ref.candidate;
                if (!cand) return null;
                const isTop = ref.rank_position === 1;
                return (
                  <tr
                    key={ref.id}
                    className={`hover:bg-primary/5 transition-colors duration-150 ${
                      isTop ? "bg-primary/5 font-semibold text-primary" : "text-slate-300"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isTop ? "bg-primary" : "bg-muted-foreground/35"}`} />
                        <span>#{ref.rank_position}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 uppercase tracking-wider truncate max-w-[80px]">
                      {cand.provider_name.replace("_", " ")}
                    </td>
                    <td className="py-3 px-3 font-semibold uppercase truncate max-w-[120px]" title={cand.candidate_id}>
                      {cand.candidate_id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-primary/70 shrink-0" />
                        {cand.acquisition_date}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={cand.cloud_cover < 10 ? "text-emerald-400" : "text-slate-300"}>
                        {cand.cloud_cover.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-200">
                      {cand.spatial_overlap.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-200">
                      {ref.ranking_score.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-[8.5px] italic text-slate-400 max-w-[240px] truncate" title={ref.selection_reason}>
                      {ref.selection_reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
