import React, { useState, useEffect, useRef } from "react";
import { WorkflowLogEntry } from "@/lib/types/workflow";
import { Terminal, Search, Trash2, ArrowDownCircle, ChevronDown, ChevronUp } from "lucide-react";

interface WorkflowLogsPanelProps {
  logs: WorkflowLogEntry[];
}

export default function WorkflowLogsPanel({ logs }: WorkflowLogsPanelProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<"ALL" | "INFO" | "WARNING" | "ERROR">("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, collapsed]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.event.toLowerCase().includes(searchText.toLowerCase()) ||
      log.stage.toLowerCase().includes(searchText.toLowerCase());

    const matchesSeverity =
      selectedSeverity === "ALL" || log.severity.toUpperCase() === selectedSeverity;

    return matchesSearch && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "ERROR":
        return "text-red-400 font-bold";
      case "WARNING":
        return "text-amber-400";
      case "INFO":
      default:
        return "text-slate-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "ready":
        return "text-emerald-400";
      case "running":
        return "text-sky-400";
      case "failed":
        return "text-red-400 font-bold animate-pulse";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="border border-border bg-card/20 rounded-lg font-mono overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div className="bg-background/80 border-b border-border/50 p-3 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Operational Telemetry Console Logs
          </span>
          <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded-lg font-bold uppercase">
            LIVE
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-border/20 rounded-lg transition-all"
            aria-label={collapsed ? "Expand logs panel" : "Collapse logs panel"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-background/30 p-2.5 border border-border/30 rounded-lg">
            {/* Severity filter tabs */}
            <div className="flex gap-1 text-[8.5px]">
              {(["ALL", "INFO", "WARNING", "ERROR"] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 font-bold border transition-colors ${
                    selectedSeverity === sev
                      ? "bg-primary text-background border-primary"
                      : "bg-transparent text-foreground border-border hover:bg-border/10"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Controls right (search & auto-scroll) */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
              {/* Search */}
              <div className="relative flex items-center w-full sm:w-[180px]">
                <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="FILTER LOGS..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 text-[9px] bg-black/45 border border-border text-foreground font-mono uppercase tracking-wide focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
                />
              </div>

              {/* Auto Scroll Checkbox */}
              <label className="flex items-center space-x-1.5 cursor-pointer text-[9px] text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded bg-black border-border text-primary focus:ring-0 focus:ring-offset-0"
                />
                <span className="flex items-center gap-1 font-semibold uppercase">
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                  Auto-Scroll
                </span>
              </label>
            </div>
          </div>

          {/* Terminal logs listing */}
          <div className="bg-black/60 border border-border/40 rounded-lg p-4 h-[180px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-border">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => {
                const logTime = new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false });
                return (
                  <div key={index} className="text-[9.5px] leading-relaxed flex flex-wrap gap-x-2 items-start font-mono text-slate-300">
                    <span className="text-muted-foreground select-none">[{logTime}]</span>
                    <span className={`uppercase font-bold text-[8.5px] select-none ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                    <span className="text-primary font-semibold select-none">[{log.stage.toUpperCase()}]</span>
                    <span className="flex-1 break-words text-slate-100">{log.event}</span>
                    <span className={`uppercase font-bold text-[8.5px] select-none ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">
                No logs matching filter constraints
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Logs Footer status */}
          <div className="text-[8px] text-muted-foreground flex justify-between uppercase select-none">
            <span>TERMINAL REFRESH RATE: AUTOMATIC</span>
            <span>SHOWING {filteredLogs.length} OF {logs.length} LOG RECORDS</span>
          </div>
        </div>
      )}
    </div>
  );
}
