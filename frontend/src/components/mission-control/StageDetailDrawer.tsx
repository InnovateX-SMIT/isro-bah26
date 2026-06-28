import React, { useEffect } from "react";
import { WorkflowStageDetail } from "@/lib/types/workflow";
import { X, Play, ShieldAlert, Cpu, Layers, HelpCircle, FileCheck, CheckCircle2, AlertTriangle, PlayCircle, Loader2 } from "lucide-react";

interface StageDetailDrawerProps {
  stage: WorkflowStageDetail | null;
  onClose: () => void;
}

export default function StageDetailDrawer({ stage, onClose }: StageDetailDrawerProps) {
  // Keypress event listener to dismiss on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!stage) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />;
      case "failed":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "blocked":
        return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      case "waiting":
        return <PlayCircle className="w-5 h-5 text-slate-400" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "running":
        return "bg-sky-500/10 border-sky-500/30 text-sky-400";
      case "failed":
        return "bg-destructive/10 border-destructive/30 text-destructive";
      case "blocked":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse";
      case "waiting":
        return "bg-slate-800 border-border text-slate-400";
      default:
        return "bg-background border-border text-muted-foreground";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 font-mono"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        className="w-full max-w-[480px] h-full bg-card/95 border-l border-border p-6 shadow-2xl flex flex-col justify-between overflow-y-auto relative animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(stage.status)}
              <h2 id="drawer-title" className="text-sm font-bold uppercase tracking-wider text-foreground">
                {stage.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-border/20 rounded-lg transition-colors"
              aria-label="Close details drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Overview Card */}
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div className="bg-background/40 border border-border/30 p-2.5 rounded-lg space-y-0.5">
              <span className="text-[7.5px] text-slate-400 uppercase">Stage Status</span>
              <span className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold border uppercase block w-fit ${getStatusBadgeClass(stage.status)}`}>
                {stage.status}
              </span>
            </div>
            <div className="bg-background/40 border border-border/30 p-2.5 rounded-lg space-y-0.5">
              <span className="text-[7.5px] text-slate-400 uppercase">Duration</span>
              <span className="font-bold text-slate-200 block text-xs">
                {stage.duration_ms ? `${stage.duration_ms.toFixed(1)} ms` : "0.0 ms"}
              </span>
            </div>
          </div>

          {/* Blocked by Warning */}
          {stage.status === "blocked" && stage.blocked_by && (
            <div className="border border-amber-500/30 bg-amber-500/5 p-3 rounded-lg space-y-1">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Pipeline Downstream Lock
              </span>
              <p className="text-[9.5px] text-amber-500/90 leading-relaxed">
                Processing is blocked. Upstream dependency **{stage.blocked_by}** failed to resolve.
              </p>
            </div>
          )}

          {/* Failure Stack */}
          {stage.error_summary && (
            <div className="border border-destructive/30 bg-destructive/5 p-3 rounded-lg space-y-1">
              <span className="text-[9px] font-bold text-destructive uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Traceback Stack
              </span>
              <pre className="text-[8.5px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono p-1 bg-black/30 rounded-lg">
                {stage.error_summary}
              </pre>
            </div>
          )}

          {/* Inputs Section */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-primary tracking-widest uppercase block border-b border-border/25 pb-1">
              Stage Input Parameters
            </span>
            {Object.keys(stage.inputs).length > 0 ? (
              <div className="bg-black/30 border border-border/20 p-2.5 rounded-lg space-y-1 text-[9px]">
                {Object.entries(stage.inputs).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-400 uppercase">{key}:</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[200px]" title={String(val)}>
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[9px] text-muted-foreground italic">No input arguments declared.</span>
            )}
          </div>

          {/* Outputs Section */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-primary tracking-widest uppercase block border-b border-border/25 pb-1">
              Generated Outputs
            </span>
            {Object.keys(stage.outputs).length > 0 ? (
              <div className="bg-black/30 border border-border/20 p-2.5 rounded-lg space-y-1 text-[9px]">
                {Object.entries(stage.outputs).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-400 uppercase">{key}:</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[200px]" title={String(val)}>
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[9px] text-muted-foreground italic">No outputs registered.</span>
            )}
          </div>

          {/* Related APIs */}
          {stage.related_apis.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-primary tracking-widest uppercase block border-b border-border/25 pb-1">
                Associated Subsystem APIs
              </span>
              <div className="space-y-1.5">
                {stage.related_apis.map((api, idx) => (
                  <div key={idx} className="bg-background/50 border border-border/20 p-1.5 px-2 rounded-lg text-[8px] font-mono text-slate-300 flex items-center justify-between">
                    <span>{api}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies checklist */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-primary tracking-widest uppercase block border-b border-border/25 pb-1">
              Required Upstream Lock Dependencies
            </span>
            <div className="flex flex-wrap gap-1.5">
              {stage.dependencies.length > 0 ? (
                stage.dependencies.map((dep, idx) => (
                  <span key={idx} className="bg-background border border-border px-2 py-0.5 rounded-lg text-[8px] text-slate-400 font-bold uppercase">
                    {dep}
                  </span>
                ))
              ) : (
                <span className="text-[9px] text-muted-foreground italic">No upstream constraints.</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[8px] text-slate-500 font-mono text-center border-t border-border/30 pt-4 mt-6 uppercase select-none">
          SYSTEM_NODE_KEY // {stage.name.replace(/\s+/g, "_").toUpperCase()}
        </div>
      </div>
    </div>
  );
}
