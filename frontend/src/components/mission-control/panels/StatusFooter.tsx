import React from "react";

interface StatusFooterProps {
  sessionId: string;
  timestamp: string;
  isLocked: boolean;
}

export default function StatusFooter({ sessionId, timestamp, isLocked }: StatusFooterProps) {
  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleString("en-US", { hour12: false })
    : new Date().toLocaleString("en-US", { hour12: false });

  return (
    <div className="border border-border bg-card/10 p-3 px-4 font-mono text-[9px] text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-2 rounded-lg select-none">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center space-x-1">
          <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">DATABASE TARGET:</span>
          <span className="text-slate-300 font-semibold font-mono">SQLite:///platform.db</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">ACTIVE SESSION:</span>
          <span className="text-slate-300 font-semibold font-mono truncate max-w-[150px] md:max-w-none">{sessionId || "N/A"}</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">LOCK CAPTURED:</span>
          <span className={`font-bold ${isLocked ? "text-emerald-400" : "text-amber-500 animate-pulse"}`}>
            {isLocked ? "YES // NODE ACTIVE" : "NO // STANDBY"}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">LAST TELEMETRY SYNC:</span>
          <span className="text-primary font-bold font-mono">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}
