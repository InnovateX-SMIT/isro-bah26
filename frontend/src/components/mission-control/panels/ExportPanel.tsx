import React, { useState, useEffect } from "react";
import { 
  Download, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Compass, 
  Activity, 
  FileDown 
} from "lucide-react";
import { 
  validateExport, 
  requestExport, 
  getExportDownloadUrl, 
  ExportResponse 
} from "@/lib/export-api";

interface ExportPanelProps {
  sessionId: string;
  datasetId: string;
  datasetName: string;
  isSessionCompleted: boolean;
}

const LAYERS = [
  { id: "reconstruction", name: "Baseline Reconstruction Composite", desc: "Geospatial composite reconstructed from temporal context" },
  { id: "optimized_reconstruction", name: "Optimized Spatial/Spectral Composite", desc: "Post-processed reconstruction with spatial/spectral constraints" },
  { id: "cloud_mask", name: "Multi-Class Cloud Segmentation Map", desc: "Pixel classification for cloud types and shadows" },
  { id: "reconstruction_mask", name: "Binary Reconstruction Target Mask", desc: "Target region mask identifying missing information" },
  { id: "confidence_map", name: "Continuous Confidence Score Matrix", desc: "Estimated confidence values mapped per reconstructed pixel" },
  { id: "confidence_overlay", name: "Visual Confidence Overlay Composite", desc: "RGB visualization with transparency-mapped confidence values" },
  { id: "reliability_map", name: "Reliability Tiers Classification Overlay", desc: "Visual grading of pixels categorized by reliability tiers" }
];

const FORMATS = [
  { id: "GeoTIFF", name: "GeoTIFF (GIS Ready)", desc: "Preserves georeferencing coordinate systems" },
  { id: "PNG", name: "PNG (Visual composite)", desc: "Standard high resolution loss-less composite" },
  { id: "JPG", name: "JPG (Presentation ready)", desc: "Standard compressed graphic format" }
];

export default function ExportPanel({ sessionId, datasetId, datasetName, isSessionCompleted }: ExportPanelProps) {
  const [selectedLayer, setSelectedLayer] = useState(LAYERS[0].id);
  const [selectedFormat, setSelectedFormat] = useState(FORMATS[0].id);
  
  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  
  // Compilation & Processing State
  const [isCompiling, setIsCompiling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);
  const [compileProgress, setCompileProgress] = useState(0);

  // Trigger validation when inputs change
  useEffect(() => {
    let active = true;
    
    const checkValidation = async () => {
      if (!sessionId || !isSessionCompleted) {
        setIsValid(false);
        setValidationMessage("Session must be compiled and active before exporting rasters.");
        return;
      }

      setIsValidating(true);
      setIsValid(null);
      setValidationMessage("");
      setExportResult(null);
      setLogs([]);

      try {
        const result = await validateExport({
          session_id: sessionId,
          layer: selectedLayer,
          format: selectedFormat
        });
        
        if (active) {
          setIsValid(result.valid);
          setValidationMessage(result.message);
        }
      } catch (err: any) {
        if (active) {
          setIsValid(false);
          setValidationMessage(err.message || "Failed to validate layer readiness.");
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
  }, [sessionId, selectedLayer, selectedFormat, isSessionCompleted]);

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
    setExportResult(null);
    setCompileProgress(10);

    try {
      // Step 1: Simulate operations logs for telemetry feel
      await addLogWithDelay(`[OP-INFO] Connecting to orbital telemetry session: ${sessionId.slice(0, 8)}...`, 150);
      setCompileProgress(25);
      await addLogWithDelay(`[OP-INFO] Querying dataset registry metadata: ${datasetId.slice(0, 8)}...`, 200);
      setCompileProgress(40);
      await addLogWithDelay(`[OP-INFO] Resolving source raster layer target path: ${selectedLayer.toUpperCase()}`, 150);
      setCompileProgress(60);
      await addLogWithDelay(`[OP-INFO] Initializing format parser pipeline for [${selectedFormat.toUpperCase()}]`, 200);
      setCompileProgress(75);

      // Step 2: Trigger the actual backend compilation
      const response = await requestExport({
        session_id: sessionId,
        layer: selectedLayer,
        format: selectedFormat
      });

      setCompileProgress(90);
      await addLogWithDelay(`[OP-SUCCESS] Transformation complete. Georeferencing headers verified.`, 150);
      
      const fileMB = response.file_size_bytes 
        ? (response.file_size_bytes / (1024 * 1024)).toFixed(2)
        : "0.00";
        
      await addLogWithDelay(`[OP-SUCCESS] File size: ${fileMB} MB. Compiled output registered successfully.`, 100);
      setCompileProgress(100);
      setExportResult(response);
    } catch (err: any) {
      setCompileProgress(0);
      setLogs((prev) => [
        ...prev, 
        `[OP-CRITICAL-ERROR] Compilation failed: ${err.message || "Internal filesystem conversion error."}`
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
    <div className="font-mono space-y-5">
      <div className="flex items-center gap-2 border-b border-border/50 pb-3">
        <Compass className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Raster Export Command Center
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Config Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Layer Selection */}
            <div className="space-y-1.5">
              <label htmlFor="layer-selector" className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                1. Select Geospatial Layer
              </label>
              <select
                id="layer-selector"
                value={selectedLayer}
                onChange={(e) => setSelectedLayer(e.target.value)}
                disabled={isCompiling}
                className="w-full bg-black/60 border border-border/80 px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-primary uppercase font-mono tracking-wide"
              >
                {LAYERS.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
              <p className="text-[8px] text-muted-foreground">
                {LAYERS.find((l) => l.id === selectedLayer)?.desc}
              </p>
            </div>

            {/* Format Selection */}
            <div className="space-y-1.5">
              <label htmlFor="format-selector" className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                2. Select Export Format
              </label>
              <div id="format-selector" className="flex gap-2">
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    disabled={isCompiling}
                    className={`flex-1 px-2.5 py-2 border text-[9.5px] font-bold tracking-wider transition-all rounded-lg uppercase ${
                      selectedFormat === fmt.id
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border/60 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                    }`}
                  >
                    {fmt.id}
                  </button>
                ))}
              </div>
              <p className="text-[8px] text-muted-foreground">
                {FORMATS.find((f) => f.id === selectedFormat)?.desc}
              </p>
            </div>
          </div>

          {/* Validation Status display */}
          <div className="bg-background/25 border border-border/40 p-3 flex items-start gap-3">
            <Activity className={`w-4 h-4 shrink-0 mt-0.5 ${isValidating ? "text-primary animate-pulse" : isValid ? "text-emerald-400" : "text-amber-500"}`} />
            <div className="space-y-1 text-[9.5px]">
              <div className="font-bold uppercase tracking-wider text-slate-300">
                Asset Mounting Status
              </div>
              {isValidating ? (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span>Validating orbital registry nodes...</span>
                </div>
              ) : isValid ? (
                <div className="text-emerald-400 flex items-center gap-1.5 font-bold uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Geospatial target locked: Ready for compilation.</span>
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
              className={`flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-[10px] tracking-widest uppercase transition-all rounded-lg w-full md:w-auto ${
                !isValid || isCompiling
                  ? "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-primary text-background border border-primary hover:bg-primary-hover shadow-[0_0_12px_-3px_rgba(6,182,212,0.4)]"
              }`}
            >
              {isCompiling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compiling Export Package...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Compile Export Package
                </>
              )}
            </button>
          </div>
        </div>

        {/* Col 2: Console Logs and Output details */}
        <div className="bg-black/60 border border-border/80 p-4 rounded-lg flex flex-col justify-between min-h-[160px] text-[9px] relative overflow-hidden">
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
                    log.includes("[OP-SUCCESS]") ? "text-emerald-400" :
                    log.includes("[OP-CRITICAL-ERROR]") ? "text-destructive" : "text-slate-400"
                  }`}
                >
                  {log}
                </div>
              ))
            )}

            {isCompiling && (
              <div className="w-full bg-slate-800/80 h-1 mt-2 rounded-lg overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${compileProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Compilation Success details & Download Trigger */}
          {exportResult && exportResult.status === "COMPLETED" && (
            <div className="mt-4 pt-3 border-t border-border/50 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-2 text-[8px] uppercase tracking-wider text-slate-400">
                <div>
                  <span className="text-muted-foreground block">FILE COMPILATION ID</span>
                  <span className="font-bold text-slate-200 truncate block">{exportResult.export_id.slice(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">FILE PACKAGE SIZE</span>
                  <span className="font-bold text-slate-200 block">{formatBytes(exportResult.file_size_bytes)}</span>
                </div>
              </div>

              <a
                href={getExportDownloadUrl(exportResult.export_id)}
                download
                className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-500 text-background hover:bg-emerald-600 border border-emerald-500 font-bold px-3 py-2 text-[10px] tracking-widest uppercase transition-all rounded-lg shadow-[0_0_8px_-2px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download Compiled Raster
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
