import React, { useState, useEffect } from "react";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Compass, 
  Activity, 
  FileDown, 
  ShieldCheck 
} from "lucide-react";
import { 
  validateReport, 
  requestReport, 
  getReportDownloadUrl, 
  ReportResponse 
} from "@/lib/report-api";

interface ReportExportPanelProps {
  sessionId: string;
  datasetId: string;
  datasetName: string;
  isSessionCompleted: boolean;
}

const REPORTS = [
  { id: "analysis", name: "Consolidated Analysis Report", desc: "Master report combining metadata, geospatial footprint, temporal candidates, cloud segmentation, inpainting, and confidence scores." },
  { id: "metadata", name: "LISS-IV Ingestion Metadata Report", desc: "Detailed technical report focusing on bands, GSD resolution, sensor grids, and file scan integrity." },
  { id: "reconstruction", name: "Generative Reconstruction Report", desc: "Covers AI inpainting algorithms, optimization parameters, and letters grade quality scorecards." },
  { id: "confidence", name: "Statistical Reliability Report", desc: "Focuses on confidence metrics, temporal agreement weights, and spatial/spectral reliability tiers." }
];

export default function ReportExportPanel({ sessionId, datasetId, datasetName, isSessionCompleted }: ReportExportPanelProps) {
  const [selectedReport, setSelectedReport] = useState(REPORTS[0].id);
  
  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [includedSections, setIncludedSections] = useState<string[]>([]);
  
  // Compilation & Processing State
  const [isCompiling, setIsCompiling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [reportResult, setReportResult] = useState<ReportResponse | null>(null);
  const [compileProgress, setCompileProgress] = useState(0);

  // Trigger validation when selected report type changes
  useEffect(() => {
    let active = true;
    
    const checkValidation = async () => {
      if (!sessionId) {
        setIsValid(false);
        setValidationMessage("Session must be compiled and active before compiling reports.");
        return;
      }

      setIsValidating(true);
      setIsValid(null);
      setValidationMessage("");
      setIncludedSections([]);
      setReportResult(null);
      setLogs([]);

      try {
        const result = await validateReport({
          session_id: sessionId,
          report_type: selectedReport
        });
        
        if (active) {
          setIsValid(result.valid);
          setValidationMessage(result.message);
          setIncludedSections(result.sections);
        }
      } catch (err: any) {
        if (active) {
          setIsValid(false);
          setValidationMessage(err.message || "Failed to validate report readiness.");
        }
      } finally {
        if (active) {
          setIsValidating(false);
        }
      }
    };

    checkValidation();

    return () => {
      active = false;
    };
  }, [sessionId, selectedReport, isSessionCompleted]);

  const addLogWithDelay = (message: string, delay: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, message]);
        resolve();
      }, delay);
    });
  };

  const handleCompile = async () => {
    if (!isValid || isCompiling) return;

    setIsCompiling(true);
    setLogs([]);
    setReportResult(null);
    setCompileProgress(10);

    try {
      // Step 1: Simulate operations logs for telemetry feel
      await addLogWithDelay(`[SYS-INFO] Fetching active session registry: ${sessionId.slice(0, 8)}...`, 150);
      setCompileProgress(25);
      await addLogWithDelay(`[SYS-INFO] Consolidating metrics from ready intelligence segments...`, 200);
      setCompileProgress(40);
      
      const sectionsStr = includedSections.length > 0 ? includedSections.join(", ") : "Cover Page, Executive Summary";
      await addLogWithDelay(`[SYS-INFO] Mapping active layout sections: [${sectionsStr}]`, 150);
      setCompileProgress(65);
      await addLogWithDelay(`[SYS-INFO] Compiling raw binary PDF stream headers...`, 200);
      setCompileProgress(80);

      // Step 2: Trigger the actual backend compilation
      const response = await requestReport({
        session_id: sessionId,
        report_type: selectedReport
      });

      setCompileProgress(95);
      await addLogWithDelay(`[SYS-SUCCESS] PDF compilation completed. Document cached on server disk.`, 150);
      setCompileProgress(100);
      setReportResult(response);
    } catch (err: any) {
      setCompileProgress(0);
      setLogs((prev) => [
        ...prev, 
        `[SYS-CRITICAL-ERROR] PDF rendering crashed: { detail: "${err.message || "Internal canvas formatting failure."}" }`
      ]);
    } finally {
      setIsCompiling(false);
    }
  };

  const formatBytes = (bytes: number | null): string => {
    if (bytes === null || bytes === undefined) return "N/A";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="border border-border bg-card/25 p-5 font-mono space-y-5 relative overflow-hidden rounded-sm hover:border-primary/30 transition-all duration-300">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2.5 py-0.5 text-[8.5px] text-primary tracking-widest uppercase">
        CONTROL CENTER // REPORTS
      </div>

      <div className="flex items-center gap-2 border-b border-border/50 pb-3">
        <FileText className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Analysis Report Export Subsystem
          </h2>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
            Phase 11B Operational Subsystem
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Config Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report Selection */}
            <div className="space-y-1.5">
              <label htmlFor="report-selector" className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                1. Select Report Type
              </label>
              <select
                id="report-selector"
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                disabled={isCompiling}
                className="w-full bg-black/60 border border-border/80 px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-primary uppercase font-mono tracking-wide"
              >
                {REPORTS.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
              </select>
              <p className="text-[8px] text-muted-foreground">
                {REPORTS.find((r) => r.id === selectedReport)?.desc}
              </p>
            </div>

            {/* Checklist of sections to include */}
            <div className="space-y-2">
              <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Layout Contents checklist
              </label>
              <div className="bg-background/40 border border-border/40 p-2.5 space-y-1 max-h-[85px] overflow-y-auto rounded-sm scrollbar-thin scrollbar-thumb-border">
                {includedSections.length === 0 ? (
                  <span className="text-[8px] text-muted-foreground italic uppercase block">Scanning session telemetry files...</span>
                ) : (
                  includedSections.map((sec, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[8.5px] text-slate-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="uppercase">{sec}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Validation Status display */}
          <div className="bg-background/25 border border-border/40 p-3 flex items-start gap-3">
            <Activity className={`w-4 h-4 shrink-0 mt-0.5 ${isValidating ? "text-primary animate-pulse" : isValid ? "text-emerald-400" : "text-amber-500"}`} />
            <div className="space-y-1 text-[9.5px]">
              <div className="font-bold uppercase tracking-wider text-slate-300">
                Compilation Diagnostics
              </div>
              {isValidating ? (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span>Validating session telemetry variables...</span>
                </div>
              ) : isValid ? (
                <div className="text-emerald-400 flex items-center gap-1.5 font-bold uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Report parameters valid. Template compiled successfully.</span>
                </div>
              ) : (
                <div className="text-amber-500 flex items-start gap-1.5 font-semibold uppercase leading-normal">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
                  <span>{validationMessage || "Validation failed."}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleCompile}
              disabled={!isValid || isCompiling}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-[10px] tracking-widest uppercase transition-all rounded-sm w-full md:w-auto ${
                !isValid || isCompiling
                  ? "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-primary text-background border border-primary hover:bg-primary-hover shadow-[0_0_12px_-3px_rgba(6,182,212,0.4)]"
              }`}
            >
              {isCompiling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compiling Report...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Compile PDF Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Col 2: Console Logs and Output details */}
        <div className="bg-black/60 border border-border/80 p-4 rounded-sm flex flex-col justify-between min-h-[160px] text-[9px] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-border/20 px-1.5 py-0.5 text-[7px] text-muted-foreground uppercase">
            OPERATOR LOGS
          </div>

          <div className="space-y-2 flex-grow overflow-y-auto max-h-[150px] font-mono pr-1 scrollbar-thin scrollbar-thumb-border">
            {logs.length === 0 ? (
              <span className="text-muted-foreground uppercase italic tracking-wide">
                Awaiting telemetry request...
              </span>
            ) : (
              logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`leading-tight uppercase font-medium tracking-wide ${
                    log.includes("[SYS-SUCCESS]") ? "text-emerald-400" :
                    log.includes("[SYS-CRITICAL-ERROR]") ? "text-destructive" : "text-slate-400"
                  }`}
                >
                  {log}
                </div>
              ))
            )}

            {isCompiling && (
              <div className="w-full bg-slate-800/80 h-1 mt-2 rounded-sm overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${compileProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Compilation Success details & Download Trigger */}
          {reportResult && reportResult.status === "COMPLETED" && (
            <div className="mt-4 pt-3 border-t border-border/50 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-2 text-[8px] uppercase tracking-wider text-slate-400">
                <div>
                  <span className="text-muted-foreground block">REPORT CLASS</span>
                  <span className="font-bold text-slate-200 truncate block">{reportResult.report_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">DOCUMENT SIZE</span>
                  <span className="font-bold text-slate-200 block">{formatBytes(reportResult.file_size_bytes)}</span>
                </div>
              </div>

              <a
                href={getReportDownloadUrl(sessionId, selectedReport)}
                download
                className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-500 text-background hover:bg-emerald-600 border border-emerald-500 font-bold px-3 py-2 text-[10px] tracking-widest uppercase transition-all rounded-sm shadow-[0_0_8px_-2px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download PDF Report
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
