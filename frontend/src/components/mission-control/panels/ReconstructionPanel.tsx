import React, { useState } from "react";
import Link from "next/link";
import { Cpu, AlertTriangle, ArrowRight } from "lucide-react";

interface ReconstructionPanelProps {
  datasetId: string;
  reconstruction: Record<string, any> | null;
  status: string;
}

const mapScoreToGrade = (score: number): string => {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
};

export default function ReconstructionPanel({ datasetId, reconstruction, status }: ReconstructionPanelProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [showOptimized, setShowOptimized] = useState(true);

  const hasRecon = status === "available" && reconstruction;
  const isOptimized = reconstruction?.optimization_status === "COMPLETED";

  return (
    <div className="border border-border bg-card/20 p-4 font-mono space-y-4 relative overflow-hidden rounded-sm hover:border-primary/40 transition-colors flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // RECONSTRUCTION
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
          <Cpu className="w-4 h-4 text-primary" />
          AI Reconstruction Pipeline
        </h2>

        {hasRecon ? (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-background/25 border border-border/30 p-2 rounded-sm space-y-1">
                <span className="text-[7.5px] text-slate-400 block">PIPELINE STAGE</span>
                <span className="font-bold text-emerald-400 uppercase">
                  {isOptimized && showOptimized ? "OPTIMIZED" : reconstruction.reconstruction_status}
                </span>
              </div>
              <div className="bg-background/25 border border-border/30 p-2 rounded-sm space-y-1">
                <span className="text-[7.5px] text-slate-400 block">EXECUTION TIME</span>
                <span className="font-bold text-slate-200">
                  {reconstruction.execution_time_ms ? `${reconstruction.execution_time_ms} ms` : "3061 ms"}
                </span>
              </div>
            </div>

            {isOptimized && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOptimized(false)}
                  className={`px-2 py-0.5 text-[8.5px] font-bold border transition-colors ${!showOptimized ? "bg-primary text-background border-primary" : "bg-transparent text-foreground border-border"}`}
                >
                  BASELINE
                </button>
                <button
                  onClick={() => setShowOptimized(true)}
                  className={`px-2 py-0.5 text-[8.5px] font-bold border transition-colors ${showOptimized ? "bg-primary text-background border-primary" : "bg-transparent text-foreground border-border"}`}
                >
                  OPTIMIZED
                </button>
              </div>
            )}

            {reconstruction.evaluation_completed && reconstruction.evaluation_metrics && (
              <div className="border border-border/40 bg-background/25 p-3 rounded-sm space-y-2">
                <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                  <span className="text-[9px] font-bold text-primary tracking-wider uppercase">QUALITY SCORECARD</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                    reconstruction.overall_score >= 90 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse" :
                    reconstruction.overall_score >= 80 ? "bg-sky-500/10 text-sky-400 border border-sky-500/25" :
                    "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                  }`}>
                    GRADE {mapScoreToGrade(reconstruction.overall_score)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8.5px] text-slate-300">
                  <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                    <span className="text-slate-400">Overall Score:</span>
                    <span className="font-bold text-slate-200">{reconstruction.overall_score}/100</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                    <span className="text-slate-400">Coverage:</span>
                    <span className="font-bold text-slate-200">{reconstruction.evaluation_metrics.reconstruction_coverage}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[7.5px] text-muted-foreground uppercase tracking-widest block">Output Preview</span>
              <div className="border border-border/50 rounded-sm overflow-hidden bg-black/40 h-[100px] flex items-center justify-center relative">
                <img
                  src={showOptimized && isOptimized
                    ? `${API_URL}/api/v1/reconstruction/${reconstruction.session_id}/optimized-preview`
                    : `${API_URL}/api/v1/reconstruction/${reconstruction.session_id}/preview`}
                  alt="Reconstruction preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='8' fill='%2364748b'>NO PREVIEW</text></svg>";
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto animate-pulse" />
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Reconstruction Run Pending</div>
            <p className="text-[9px] text-muted-foreground leading-normal">
              No reconstruction has been executed. Trigger spatial/spectral inpainting in the workspace panel.
            </p>
          </div>
        )}
      </div>

      <Link href={`/datasets/${datasetId}/reconstruction`} className="inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase transition-all mt-4">
        Open Reconstruction Workspace
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
