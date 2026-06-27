import React from "react";
import { WorkflowStageDetail } from "@/lib/types/workflow";
import { Shield, PlayCircle, Loader2, CheckCircle2, AlertTriangle, ShieldAlert, Cpu } from "lucide-react";

interface WorkflowPipelineProps {
  stages: WorkflowStageDetail[];
  overallProgress: number;
  totalTime: number;
  health: string;
  onStageClick: (stage: WorkflowStageDetail) => void;
}

export default function WorkflowPipeline({ stages, overallProgress, totalTime, health, onStageClick }: WorkflowPipelineProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "running":
        return <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />;
      case "failed":
        return <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse" />;
      case "blocked":
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />;
      case "waiting":
        return <PlayCircle className="w-3.5 h-3.5 text-slate-500" />;
      case "pending":
      default:
        return <Shield className="w-3.5 h-3.5 text-slate-700" />;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-400/80";
      case "running":
        return "border-sky-500/40 bg-sky-500/5 hover:border-sky-400/80 animate-pulse";
      case "failed":
        return "border-destructive/40 bg-destructive/5 hover:border-destructive/80";
      case "blocked":
        return "border-amber-500/40 bg-amber-500/5 hover:border-amber-400/80";
      case "waiting":
        return "border-slate-800 bg-slate-800/10 hover:border-slate-700";
      case "pending":
      default:
        return "border-slate-900 bg-slate-900/5 opacity-50 cursor-not-allowed";
    }
  };

  return (
    <div className="border border-border bg-card/25 p-4 rounded-sm font-mono space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        MONITOR // WORKFLOW
      </div>

      <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
        <Cpu className="w-4 h-4 text-primary" />
        Processing Workflow Pipeline
      </div>

      {/* Dynamic Progress Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-background/40 border border-border/30 p-3 rounded-sm text-[10px]">
        {/* Progress percent */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[9px] text-slate-400">
            <span>PIPELINE PROGRESS</span>
            <span className="font-bold text-primary">{overallProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-border/20">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Health */}
        <div className="flex flex-col justify-center space-y-1 md:border-l md:border-r border-border/20 md:px-4">
          <span className="text-[7.5px] text-slate-400 uppercase font-bold">SESSION HEALTH STATUS</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              health === "HEALTHY" ? "bg-emerald-400 animate-pulse" :
              health === "WARNING" ? "bg-sky-400" :
              health === "DEGRADED" ? "bg-amber-400" :
              "bg-destructive"
            }`} />
            <span className={`font-bold ${
              health === "HEALTHY" ? "text-emerald-400" :
              health === "WARNING" ? "text-sky-400" :
              health === "DEGRADED" ? "text-amber-400" :
              "text-destructive"
            }`}>
              {health} // STABLE
            </span>
          </div>
        </div>

        {/* Processing duration */}
        <div className="flex flex-col justify-center space-y-1">
          <span className="text-[7.5px] text-slate-400 uppercase font-bold">CUMULATIVE PROCESSING TIME</span>
          <span className="font-bold text-slate-200">
            {totalTime ? `${totalTime.toFixed(1)} ms` : "0.0 ms"}
          </span>
        </div>
      </div>

      {/* Grid of Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {stages.map((stage) => {
          const isPending = stage.status === "pending";
          return (
            <button
              key={stage.name}
              disabled={isPending}
              onClick={() => onStageClick(stage)}
              className={`p-3 border rounded-sm font-mono text-[9px] flex flex-col justify-between text-left h-[75px] transition-all duration-300 relative select-none ${getStatusBgColor(stage.status)}`}
            >
              <div className="flex items-center justify-between w-full border-b border-border/10 pb-1 mb-1">
                <span className="text-slate-400 font-bold uppercase tracking-wide truncate max-w-[130px]">
                  {stage.name}
                </span>
                {getStatusBadge(stage.status)}
              </div>

              <div className="space-y-0.5 text-[8.5px]">
                <div className="flex justify-between text-[7px] text-slate-500 font-mono">
                  <span>DURATION:</span>
                  <span className="font-semibold text-slate-400">
                    {stage.duration_ms ? `${stage.duration_ms.toFixed(0)}ms` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-[7px] text-slate-500 font-mono">
                  <span>STATUS:</span>
                  <span className={`font-semibold uppercase ${
                    stage.status === "completed" ? "text-emerald-400" :
                    stage.status === "running" ? "text-sky-400" :
                    stage.status === "failed" ? "text-destructive" :
                    stage.status === "blocked" ? "text-amber-400" :
                    "text-slate-400"
                  }`}>
                    {stage.status}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
