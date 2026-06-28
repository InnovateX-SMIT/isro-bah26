import React, { useState, useEffect, useRef } from "react";
import { 
  Archive, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Activity, 
  FileDown, 
  Check, 
  X,
  Compass
} from "lucide-react";
import { 
  validatePackage, 
  requestPackage, 
  getPackageStatus, 
  getPackageDownloadUrl, 
  PackageResponse 
} from "@/lib/package-api";

interface PackageExportPanelProps {
  sessionId: string;
  datasetId: string;
  datasetName: string;
  isSessionCompleted: boolean;
}

export default function PackageExportPanel({ sessionId, datasetId, datasetName, isSessionCompleted }: PackageExportPanelProps) {
  // UI States
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [availableAssets, setAvailableAssets] = useState<string[]>([]);
  const [missingAssets, setMissingAssets] = useState<string[]>([]);
  
  // Progress/Status States
  const [isCompiling, setIsCompiling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [packageResult, setPackageResult] = useState<PackageResponse | null>(null);
  const [compileProgress, setCompileProgress] = useState(0);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Periodic Polling Interval ID
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Asset Checklist mapping
  const CHECKLIST = [
    { key: "Dataset Metadata", label: "Dataset Metadata Scan" },
    { key: "Geospatial Context", label: "Geospatial Bounds Profile" },
    { key: "Location Context", label: "Administrative Reverse Location" },
    { key: "Temporal Context", label: "Historical Orbital Discovery References" },
    { key: "Cloud Segmentation Mask", label: "Cloud & Shadows Obscuration Maps" },
    { key: "AI Reconstruction Output", label: "Generative Inpainted Composites" },
    { key: "Confidence Map", label: "Pixel Reliability Grid Matrices" },
    { key: "Dataset Visual Preview", label: "Browse-ready Visual Preview Images" }
  ];

  // 1. Run Pre-flight Validation
  const checkValidation = async () => {
    if (!sessionId) {
      setIsValid(false);
      setValidationMessage("Session must be active before validating packages.");
      return;
    }

    setIsValidating(true);
    setIsValid(null);
    setValidationMessage("");
    setAvailableAssets([]);
    setMissingAssets([]);
    setPackageResult(null);

    try {
      const result = await validatePackage(sessionId);
      setIsValid(result.valid);
      setValidationMessage(result.message);
      setAvailableAssets(result.available_assets);
      setMissingAssets(result.missing_assets);
      
      // Look up current status from server to see if a compilation is already in progress or completed
      const statusRes = await getPackageStatus(sessionId);
      if (statusRes.status === "PROCESSING" || statusRes.status === "COMPLETED") {
        setPackageResult(statusRes);
        setCompileProgress(statusRes.progress);
        if (statusRes.message) {
          setLogs([`[PKG-SYS] Loaded session compile state: ${statusRes.status}`, `[PKG-SYS] Status: ${statusRes.message}`]);
        }
        if (statusRes.status === "PROCESSING") {
          startPolling();
        }
      }
    } catch (err: any) {
      setIsValid(false);
      setValidationMessage(err.message || "Failed to run pre-flight package validation.");
    } finally {
      setIsValidating(false);
    }
  };

  // Run validation on load and when session parameters change
  useEffect(() => {
    checkValidation();
    return () => {
      stopPolling();
    };
  }, [sessionId, isSessionCompleted]);

  // Scroll logs automatically
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Polling management
  const startPolling = () => {
    if (pollIntervalRef.current) return;
    setIsCompiling(true);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await getPackageStatus(sessionId);
        setPackageResult(response);
        setCompileProgress(response.progress);
        
        // Add unique logs as they come in
        setLogs((prev) => {
          const newLog = `[PKG-SYS] ${response.message.toUpperCase()}`;
          if (prev.length === 0 || prev[prev.length - 1] !== newLog) {
            return [...prev, newLog];
          }
          return prev;
        });

        if (response.status === "COMPLETED") {
          setLogs((prev) => [...prev, "[PKG-SUCCESS] Packaging job complete. ZIP bundle ready for download."]);
          stopPolling();
        } else if (response.status === "FAILED") {
          setLogs((prev) => [
            ...prev, 
            `[PKG-CRITICAL] Compilation failed: ${response.error_message || "Unknown error."}`
          ]);
          stopPolling();
        }
      } catch (err: any) {
        setLogs((prev) => [...prev, `[PKG-ERROR] Polling connection lost: ${err.message}`]);
        stopPolling();
      }
    }, 1500);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsCompiling(false);
  };

  // 2. Trigger async generation
  const handleCompilePackage = async () => {
    if (!isValid || isCompiling) return;
    
    setIsCompiling(true);
    setLogs(["[PKG-SYS] Initializing Consolidated Analysis Package request..."]);
    setCompileProgress(5);
    setPackageResult(null);

    try {
      const response = await requestPackage(sessionId);
      setPackageResult(response);
      setCompileProgress(response.progress);
      setLogs((prev) => [
        ...prev,
        `[PKG-SYS] Enqueued job: ${response.package_id.slice(0, 8)}`,
        `[PKG-SYS] Status: ${response.message.toUpperCase()}`
      ]);
      
      startPolling();
    } catch (err: any) {
      setIsCompiling(false);
      setCompileProgress(0);
      setLogs((prev) => [
        ...prev, 
        `[PKG-CRITICAL] Failed to trigger compiler pipeline: ${err.message}`
      ]);
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
    <div className="font-mono space-y-5">
      <div className="flex items-center gap-2 border-b border-border/50 pb-3">
        <Archive className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Consolidated Analysis Package Export
          </h2>
        </div>
      </div>

      <div className="space-y-4">
        {/* Left Side Checklist: Manifest checklist */}
        <div className="space-y-2">
          <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">
            1. Package Content Ingestion Checklist
          </label>
          <div className="bg-background/40 border border-border/40 p-3 space-y-2 max-h-[140px] overflow-y-auto rounded-lg scrollbar-thin scrollbar-thumb-border">
            {CHECKLIST.map((item) => {
              const isAvailable = availableAssets.includes(item.key);
              return (
                <div key={item.key} className="flex items-center justify-between text-[9px] font-mono leading-none py-0.5 border-b border-border/10 last:border-0 pb-1">
                  <span className={`uppercase ${isAvailable ? "text-slate-200" : "text-slate-500"}`}>
                    {item.label}
                  </span>
                  {isAvailable ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold text-[8px] uppercase">
                      <Check className="w-3 h-3 shrink-0 text-emerald-400" />
                      LOCKED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-600 text-[8px] uppercase">
                      <X className="w-3 h-3 shrink-0 text-slate-600" />
                      OMITTED
                    </span>
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-between text-[9px] font-mono leading-none py-0.5 border-b border-border/10 last:border-0 pb-1">
              <span className="uppercase text-slate-200">
                Diagnostic PDF reports
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold text-[8px] uppercase">
                <Check className="w-3 h-3 shrink-0 text-emerald-400" />
                ON-THE-FLY
              </span>
            </div>
          </div>
        </div>

        {/* Validation Check Diagnostics */}
        <div className="bg-background/25 border border-border/40 p-3 flex items-start gap-3">
          <Activity className={`w-4 h-4 shrink-0 mt-0.5 ${isValidating ? "text-primary animate-spin" : isValid ? "text-emerald-400" : "text-amber-500"}`} />
          <div className="space-y-1 text-[9.5px]">
            <div className="font-bold uppercase tracking-wider text-slate-300">
              Compilation Diagnostics
            </div>
            {isValidating ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span>Checking telemetry outputs...</span>
              </div>
            ) : isValid ? (
              <div className="text-emerald-400 flex items-start gap-1 font-bold uppercase leading-normal">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{validationMessage || "Validation verified."}</span>
              </div>
            ) : (
              <div className="text-amber-500 flex items-start gap-1.5 font-semibold uppercase leading-normal">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
                <span>{validationMessage || "Missing operational telemetry targets."}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleCompilePackage}
            disabled={!isValid || isCompiling}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-[10px] tracking-widest uppercase transition-all rounded-lg w-full ${
              !isValid || isCompiling
                ? "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-primary text-background border border-primary hover:bg-primary-hover shadow-[0_0_12px_-3px_rgba(6,182,212,0.4)]"
            }`}
          >
            {isCompiling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling Analysis Package...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Compile ZIP Package
              </>
            )}
          </button>
        </div>

        {/* Right Side: Log console drawer inline */}
        <div className="bg-black/60 border border-border/80 p-3 rounded-lg flex flex-col justify-between min-h-[140px] text-[8.5px] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-border/20 px-1.5 py-0.5 text-[6.5px] text-muted-foreground uppercase">
            COMPILER FEED
          </div>

          <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[110px] font-mono pr-1 scrollbar-thin scrollbar-thumb-border">
            {logs.length === 0 ? (
              <span className="text-muted-foreground uppercase italic tracking-wide">
                Console offline. Awaiting package request...
              </span>
            ) : (
              logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`leading-tight uppercase font-medium tracking-wide ${
                    log.includes("[PKG-SUCCESS]") ? "text-emerald-400" :
                    log.includes("[PKG-CRITICAL]") ? "text-destructive" :
                    log.includes("[PKG-SYS] CONSOLIDATED PACKAGE GENERATED") ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>

          {isCompiling && (
            <div className="w-full bg-slate-800/80 h-1 mt-2 rounded-lg overflow-hidden shrink-0">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${compileProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Success complete details with download link */}
        {packageResult && packageResult.status === "COMPLETED" && (
          <div className="pt-3 border-t border-border/50 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-2 text-[8px] uppercase tracking-wider text-slate-400">
              <div>
                <span className="text-muted-foreground block font-bold">PACKAGE FORMAT</span>
                <span className="font-bold text-slate-200 block">{packageResult.format} ARCHIVE</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-bold">ARCHIVE FILE SIZE</span>
                <span className="font-bold text-slate-200 block">{formatBytes(packageResult.file_size_bytes)}</span>
              </div>
            </div>

            <a
              href={getPackageDownloadUrl(sessionId)}
              download
              className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-500 text-background hover:bg-emerald-600 border border-emerald-500 font-bold px-3 py-2 text-[10px] tracking-widest uppercase transition-all rounded-lg shadow-[0_0_8px_-2px_rgba(16,185,129,0.3)] cursor-pointer"
            >
              <FileDown className="w-4 h-4 animate-bounce" />
              Download Analysis Package
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
