import React, { useEffect, useState } from "react";
import { Dataset } from "@/lib/types/dataset";
import { DatasetMetadata } from "@/lib/types/dataset-metadata";
import { IntelligenceLayerStatus } from "@/lib/types/mission-control";
import {
  getProviders,
  getProvidersHealth,
  runDiscovery,
  getDiscoveredCandidates,
  runReferenceSelection,
  getSelectedReferences,
  generateTemporalContext,
  getTemporalContextPackage,
  getTemporalProgress
} from "@/lib/temporal-context-api";
import { getAnalysisSession } from "@/lib/analysis-api";
import {
  ProviderInfoResponse,
  SystemHealthResponse,
  TemporalCandidate,
  SelectedReference,
  TemporalContextPackageResponse
} from "@/lib/types/temporal-context";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Database,
  Calendar,
  RefreshCw,
  Layers,
  Sliders,
  Play,
  Settings,
  Server,
  Info,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import TemporalContextSummaryCard from "./TemporalContextSummaryCard";
import TemporalStatisticsCard from "./TemporalStatisticsCard";
import CloudStatisticsCard from "./CloudStatisticsCard";
import SpatialStatisticsCard from "./SpatialStatisticsCard";
import ProviderStatisticsCard from "./ProviderStatisticsCard";

interface TemporalContextPanelProps {
  dataset: Dataset;
  metadata?: DatasetMetadata | null;
  status: IntelligenceLayerStatus;
  onRefresh?: () => void;
}

const isLocalCacheEmpty = (provider: string, candidates: TemporalCandidate[]) => {
  if (provider !== "LocalHistoricalCache") return false;
  return candidates.length === 0 || candidates.every(c => c.candidate_id.startsWith("local_cache"));
};

export default function TemporalContextPanel({ dataset, metadata, status, onRefresh }: TemporalContextPanelProps) {
  const sessionId = dataset.analysis_session_id;

  // Stepper & Session status
  const [activeStep, setActiveStep] = useState<number>(1);
  const [sessionStatus, setSessionStatus] = useState<string>("created");
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Providers State
  const [providers, setProviders] = useState<ProviderInfoResponse[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("GoogleEarthEngine");
  const [providersHealth, setProvidersHealth] = useState<SystemHealthResponse | null>(null);
  const [refreshingHealth, setRefreshingHealth] = useState<boolean>(false);

  // Step 2: Discovery State
  const [discoveryWindow, setDiscoveryWindow] = useState<number>(30);
  const [runningDiscovery, setRunningDiscovery] = useState<boolean>(false);

  // Step 3: Selection State
  const [discoveredCandidates, setDiscoveredCandidates] = useState<TemporalCandidate[]>([]);
  const [numReferences, setNumReferences] = useState<number>(3);
  const [weightCloud, setWeightCloud] = useState<number>(0.4);
  const [weightTemporal, setWeightTemporal] = useState<number>(0.3);
  const [weightSpatial, setWeightSpatial] = useState<number>(0.2);
  const [weightQuality, setWeightQuality] = useState<number>(0.1);
  const [runningSelection, setRunningSelection] = useState<boolean>(false);

  // Step 4: Context Compilation State
  const [selectedReferences, setSelectedReferences] = useState<SelectedReference[]>([]);
  const [compilingContext, setCompilingContext] = useState<boolean>(false);

  // Step 5: Dashboard State (Final Package)
  const [packageData, setPackageData] = useState<TemporalContextPackageResponse | null>(null);
  const [loadingPackage, setLoadingPackage] = useState<boolean>(false);

  // Active progress tracker state for polling
  const [progress, setProgress] = useState<{ stage: string; completed: number; total: number } | null>(null);

  // Poll progress from backend while active operations are running
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (runningDiscovery || runningSelection) {
      const fetchProgress = async () => {
        try {
          const res = await getTemporalProgress(sessionId);
          setProgress(res);
        } catch (err) {
          console.error("Failed to fetch progress status:", err);
        }
      };

      fetchProgress();
      intervalId = setInterval(fetchProgress, 750);
    } else {
      setTimeout(() => {
        setProgress(null);
      }, 0);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [runningDiscovery, runningSelection, sessionId]);

  // Weights Validation
  const totalWeight = parseFloat((weightCloud + weightTemporal + weightSpatial + weightQuality).toFixed(4));
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.001;

  // Initialize Workflow & Fetch State
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await getDiscoveredCandidates(sessionId);
        setDiscoveredCandidates(res.candidates);
      } catch (err: unknown) {
        console.error("Failed to load candidates:", err);
        setError("Failed to sync candidate inventory list from database.");
      }
    };

    const fetchSelectedReferences = async () => {
      try {
        const refs = await getSelectedReferences(sessionId);
        setSelectedReferences(refs);
      } catch (err: unknown) {
        console.error("Failed to load selected references:", err);
        setError("Failed to sync selected reference stack from database.");
      }
    };

    const fetchFinalPackage = async () => {
      setLoadingPackage(true);
      try {
        const data = await getTemporalContextPackage(sessionId);
        setPackageData(data);
      } catch (err: unknown) {
        const errorVal = err as Error;
        console.error("Failed to load temporal context package:", errorVal);
        setError("Failed to retrieve final compiled temporal package metrics.");
      } finally {
        setLoadingPackage(false);
      }
    };

    const initWorkflow = async () => {
      setLoadingWorkspace(true);
      setError(null);
      try {
        // 1. Fetch Providers registry info and connectivity health reports
        const provs = await getProviders();
        setProviders(provs);
        
        const health = await getProvidersHealth();
        setProvidersHealth(health);

        // 2. Fetch target Analysis Session lifecycle status
        const session = await getAnalysisSession(sessionId);
        setSessionStatus(session.status);

        // 3. Coordinate wizard step mapping based on database/session status
        if (status === "available" || session.status === "TEMPORAL_CONTEXT_GENERATED") {
          setSessionStatus("TEMPORAL_CONTEXT_READY");
          setActiveStep(5);
          await fetchFinalPackage();
        } else if (session.status === "REFERENCE_SELECTION_COMPLETE") {
          setActiveStep(4);
          await fetchSelectedReferences();
        } else if (session.status === "TEMPORAL_CONTEXT_RETRIEVED") {
          setActiveStep(3);
          await fetchCandidates();
        } else {
          setActiveStep(1);
        }
      } catch (err: unknown) {
        const errorVal = err as Error;
        console.error("Temporal wizard initialization failed:", errorVal);
        setError(errorVal.message || "Failed to initialize Temporal Intelligence workflow module.");
      } finally {
        setLoadingWorkspace(false);
      }
    };

    initWorkflow();
  }, [sessionId, status]);

  // Actions
  const handleRefreshProvidersHealth = async () => {
    setRefreshingHealth(true);
    try {
      const health = await getProvidersHealth();
      setProvidersHealth(health);
    } catch (err: unknown) {
      console.error("Health diagnostics check failed:", err);
    } finally {
      setRefreshingHealth(false);
    }
  };

  const handleRunDiscovery = async () => {
    setRunningDiscovery(true);
    setError(null);
    try {
      // Transitioning to TEMPORAL_DISCOVERY_RUNNING
      const res = await runDiscovery(sessionId, {
        provider_name: selectedProvider,
        temporal_window_days: discoveryWindow
      });
      setDiscoveredCandidates(res.candidates);
      setSessionStatus("TEMPORAL_DISCOVERY_COMPLETE");
      setActiveStep(3);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const errorVal = err as Error;
      console.error("Discovery run failed:", errorVal);
      setError(errorVal.message || "Historical imagery archive discovery scan failed.");
    } finally {
      setRunningDiscovery(false);
    }
  };

  const handleRunSelection = async () => {
    if (!isWeightValid) {
      setError("Ranking weights must sum up to exactly 1.0 for system compliance.");
      return;
    }
    setRunningSelection(true);
    setError(null);
    try {
      // Transitioning to REFERENCE_SELECTION_RUNNING
      const res = await runReferenceSelection(sessionId, {
        num_references: numReferences,
        weights: {
          cloud_cover: weightCloud,
          temporal_distance: weightTemporal,
          spatial_overlap: weightSpatial,
          data_quality: weightQuality
        }
      });
      setSelectedReferences(res.selected_references);
      setSessionStatus("REFERENCE_SELECTION_COMPLETE");
      setActiveStep(4);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const errorVal = err as Error;
      console.error("Selection execution failed:", errorVal);
      setError(errorVal.message || "Reference ranking and selection stack extraction failed.");
    } finally {
      setRunningSelection(false);
    }
  };

  const handleCompileContext = async () => {
    setCompilingContext(true);
    setError(null);
    try {
      // Transitioning to TEMPORAL_CONTEXT_GENERATING
      const res = await generateTemporalContext(sessionId);
      setPackageData(res);
      setSessionStatus("TEMPORAL_CONTEXT_READY");
      setActiveStep(5);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const errorVal = err as Error;
      console.error("Context compilation failed:", errorVal);
      setError(errorVal.message || "Fusing stacks and generating temporal briefing package failed.");
    } finally {
      setCompilingContext(false);
    }
  };

  const handleResetWorkflow = () => {
    setActiveStep(1);
    setError(null);
  };

  // Render Loader if Workspace initializing
  if (loadingWorkspace) {
    return (
      <div className="border border-cyan-500/20 bg-cyan-950/10 min-h-[300px] flex flex-col items-center justify-center p-6 space-y-4 font-mono">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <div className="space-y-0.5 text-center">
          <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-widest animate-pulse">
            Syncing Temporal Intelligence Workspace...
          </h4>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
            Fetching Provider configurations, health statuses, and session cache
          </p>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, name: "Providers" },
    { num: 2, name: "Discovery" },
    { num: 3, name: "Selection" },
    { num: 4, name: "Compilation" },
    { num: 5, name: "Dashboard" }
  ];

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      
      {/* 1. Header/Stepper Bar */}
      <div className="grid grid-cols-5 gap-1 text-[8.5px] tracking-wider text-center uppercase pb-3 border-b border-border/40">
        {steps.map((s) => {
          const isCurrent = activeStep === s.num;
          const isCompleted = activeStep > s.num;
          return (
            <button
              key={s.num}
              disabled={s.num > activeStep && sessionStatus !== "TEMPORAL_CONTEXT_READY"}
              onClick={() => setActiveStep(s.num)}
              className={`p-2 border transition-all duration-300 rounded-lg text-left relative overflow-hidden ${
                isCurrent
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-[0_0_8px_-2px_rgba(6,182,212,0.35)]"
                  : isCompleted
                  ? "border-emerald-500/30 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/20"
                  : "border-border/40 text-muted-foreground bg-muted/5 cursor-not-allowed opacity-60"
              }`}
            >
              <div className="absolute top-1 right-1 font-bold text-[7px] text-muted-foreground/40">
                0{s.num}
              </div>
              <div className="font-bold truncate pr-3">{s.name}</div>
              <div className="mt-0.5 text-[6.5px] opacity-75 flex items-center gap-0.5 font-semibold">
                {isCurrent ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                ) : isCompleted ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                )}
                {isCurrent ? "ACTIVE" : isCompleted ? "COMPLETE" : "LOCKED"}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Error Diagnostic Board */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/5 p-3 text-red-400 flex items-start gap-2.5 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-red-500/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-red-400 tracking-widest uppercase">
            DIAGNOSTICS
          </div>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block text-[10px]">TEMPORAL INTELLIGENCE FAILURE</span>
            <p className="text-[9.5px] text-muted-foreground leading-normal">{error}</p>
          </div>
        </div>
      )}

      {/* 3. Loaders for API Execution / Progression */}
      {runningDiscovery && (
        <div className="border border-primary/20 bg-card/25 min-h-[220px] flex flex-col items-center justify-center p-6 space-y-3.5 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">
              STATUS: TEMPORAL_DISCOVERY_RUNNING
            </h4>
            {progress && (
              <div className="w-48 h-1.5 bg-muted/40 rounded-full mx-auto my-2 overflow-hidden border border-border/40">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                />
              </div>
            )}
            <p className="text-[9px] text-muted-foreground max-w-sm mx-auto leading-relaxed uppercase">
              {progress
                ? `GEE imagery search progress: ${progress.completed}/${progress.total} (${progress.stage.replace(/_/g, ' ')})`
                : "Historical Discovery Engine is scanning registered archive catalogues to locate overlaps matching the geospatial footprint bounds"}
            </p>
          </div>
        </div>
      )}

      {runningSelection && (
        <div className="border border-primary/20 bg-card/25 min-h-[220px] flex flex-col items-center justify-center p-6 space-y-3.5 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">
              STATUS: REFERENCE_SELECTION_RUNNING
            </h4>
            {progress && (
              <div className="w-48 h-1.5 bg-muted/40 rounded-full mx-auto my-2 overflow-hidden border border-border/40">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                />
              </div>
            )}
            <p className="text-[9px] text-muted-foreground max-w-sm mx-auto leading-relaxed uppercase">
              {progress
                ? `Scoring candidates: ${progress.completed}/${progress.total} (${progress.stage.replace(/_/g, ' ')})`
                : "Reference Selection Engine is running scoring algorithms across discovered candidates, executing temporal decay equations and sorting the reference stack"}
            </p>
          </div>
        </div>
      )}

      {compilingContext && (
        <div className="border border-primary/20 bg-card/25 min-h-[220px] flex flex-col items-center justify-center p-6 space-y-3.5 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">
              STATUS: TEMPORAL_CONTEXT_GENERATING
            </h4>
            <p className="text-[9px] text-muted-foreground max-w-sm mx-auto leading-relaxed uppercase">
              Temporal Context Generation Engine is compiling ratios, resolving cloud averages, and synthesizing final operations briefing text
            </p>
          </div>
        </div>
      )}

      {/* 4. Active Stepper Workflow Panels */}
      {!runningDiscovery && !runningSelection && !compilingContext && (
        <>
          {/* STEP 1: Providers Registry */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="border border-border/80 bg-card/15 p-4 space-y-4 relative overflow-hidden rounded-lg">
                <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                  REGISTRY // PROVIDERS
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Server className="w-4 h-4 text-primary" />
                  Step 1 // Verify Historical Temporal Providers
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map((p) => {
                    const healthDetail = providersHealth?.providers.find(h => h.name === p.name);
                    const isSelected = selectedProvider === p.name;
                    return (
                      <div
                        key={p.name}
                        onClick={() => setSelectedProvider(p.name)}
                        className={`border p-4 rounded-lg transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-primary/5 border-primary shadow-[0_0_8px_-3px_rgba(6,182,212,0.25)]"
                            : "border-border bg-background/20 hover:border-border/80 hover:bg-background/30"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase text-[10px] tracking-wide text-slate-200">
                              {p.name.replace(/([A-Z])/g, " $1")}
                            </span>
                            {p.is_primary && (
                              <span className="bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 text-[7px] font-bold rounded-lg uppercase tracking-widest">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-muted-foreground leading-normal">
                            {p.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(p.supported_sensors || (p.name === "GoogleEarthEngine" ? ["Landsat-8", "Sentinel-2"] : ["LISS-IV", "LISS-III"])).map(s => (
                              <span key={s} className="bg-muted/30 text-slate-400 px-1 py-0.5 text-[7px] font-mono rounded-lg border border-border/40">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Health reporting */}
                        <div className="border-t border-border/40 mt-3 pt-2 flex items-center justify-between">
                          <span className="text-[8px] text-muted-foreground uppercase">Live status:</span>
                          <span className="flex items-center gap-1">
                            {refreshingHealth ? (
                              <Loader2 className="w-3 h-3 text-primary animate-spin" />
                            ) : healthDetail?.healthy ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-emerald-400 font-bold text-[8px] uppercase">ONLINE ({healthDetail.latency_ms}ms)</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span className="text-red-400 font-bold text-[8px] uppercase">UNREACHABLE</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleRefreshProvidersHealth}
                  disabled={refreshingHealth}
                  className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted/10 text-[9px] uppercase transition-all duration-300 rounded-lg flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshingHealth ? "animate-spin" : ""}`} />
                  Refresh Connectivity Diagnostics
                </button>
                
                <button
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-1.5 border border-primary text-primary hover:bg-primary/20 hover:text-white transition-all duration-300 rounded-lg text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_-4px_rgba(6,182,212,0.3)]"
                >
                  <span>Proceed to Discovery</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Historical Discovery */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="border border-border/80 bg-card/15 p-4 space-y-4 relative overflow-hidden rounded-lg">
                <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                  DISCOVERY // ARCHIVE
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Database className="w-4 h-4 text-primary" />
                  Step 2 // Historical Imagery Discovery Configuration
                </h3>

                <div className="border border-primary/10 bg-primary/5 p-3 text-[9px] text-primary flex items-start gap-2.5 rounded-lg">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <div className="space-y-0.5 leading-relaxed">
                    <span className="font-bold uppercase tracking-wider block">TARGET GEOSPATIAL BOUNDS DETECTED</span>
                    <span>The scan will execute bounds intersection queries using the live georeferenced footprint limits registered for dataset <b>{dataset.dataset_name}</b>.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Target Acquisition Date (Read-only) */}
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Target Scene Acquisition Date</label>
                    <div className="flex items-center gap-2 border border-border/60 bg-muted/15 px-3 py-2 text-slate-300 font-mono rounded-lg select-all">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{metadata?.acquisition_date || "2026-02-15"}</span>
                      <span className="text-[7.5px] text-muted-foreground uppercase bg-muted/30 border border-border/30 px-1 py-0.5 rounded-lg ml-auto font-sans font-semibold">BASELINE</span>
                    </div>
                  </div>

                  {/* Temporal search range selection */}
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Temporal Query Search Range (Window)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[30, 90, 180].map((days) => (
                        <button
                          key={days}
                          onClick={() => setDiscoveryWindow(days)}
                          className={`py-2 border font-mono text-[9.5px] tracking-wide transition-all duration-300 rounded-lg ${
                            discoveryWindow === days
                              ? "bg-primary/20 border-primary text-primary font-bold shadow-[0_0_8px_-3px_rgba(6,182,212,0.25)]"
                              : "border-border/60 text-muted-foreground hover:bg-muted/10"
                          }`}
                        >
                          ± {days} DAYS
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[9px] text-muted-foreground leading-normal border-t border-border/40 pt-3">
                  * System will scan archives for satellite observations taken between <b>{
                    new Date(new Date(metadata?.acquisition_date || "2026-02-15").getTime() - (discoveryWindow * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
                  }</b> and <b>{
                    new Date(new Date(metadata?.acquisition_date || "2026-02-15").getTime() + (discoveryWindow * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
                  }</b>.
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveStep(1)}
                  className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted/10 text-[9px] uppercase transition-all duration-300 rounded-lg flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Providers
                </button>
                
                <button
                  onClick={handleRunDiscovery}
                  className="px-4 py-1.5 border border-primary text-primary hover:bg-primary/20 hover:text-white transition-all duration-300 rounded-lg text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_-4px_rgba(6,182,212,0.35)] animate-pulse"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Discovery Scan</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Reference Selection */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="border border-border/80 bg-card/15 p-4 space-y-4 relative overflow-hidden rounded-lg">
                <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                  INVENTORY // SCANS
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Step 3 // Configure Reference Scoring Weights
                </h3>

                {/* Candidate Inventory Table */}
                <div className="space-y-1.5">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Discovered Imagery Candidates List ({discoveredCandidates.length} Items found)</span>
                  {isLocalCacheEmpty(selectedProvider, discoveredCandidates) ? (
                    <div className="border border-dashed border-border bg-card/10 p-8 text-center flex flex-col items-center justify-center space-y-4 rounded-xl min-h-[220px]">
                      <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">No cached historical references available.</h4>
                        <p className="text-[11px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                          This dataset has no locally cached historical imagery.
                        </p>
                        <div className="text-[11px] text-muted-foreground max-w-md mx-auto pt-2 text-left sm:text-center">
                          <p className="font-semibold text-slate-300">To retrieve historical references:</p>
                          <ul className="list-disc list-inside mt-1 inline-block text-left">
                            <li>Run Google Earth Discovery</li>
                            <li>Import previously cached references.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : discoveredCandidates.length === 0 ? (
                    <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center rounded-lg text-amber-500 font-mono text-[9px]">
                      Zero candidate historical reference images found. Try widening search range or checking provider status.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[140px] border border-border/50">
                      <table className="w-full text-left text-[8.5px] border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 bg-background/50 text-muted-foreground uppercase tracking-widest text-[7.5px] sticky top-0 z-10">
                            <th className="py-2 px-2.5">Candidate ID</th>
                            <th className="py-2 px-2.5">Provider</th>
                            <th className="py-2 px-2.5">Sensor</th>
                            <th className="py-2 px-2.5">Acquisition</th>
                            <th className="py-2 px-2.5 text-center">Cloud Cover</th>
                            <th className="py-2 px-2.5 text-center">Spatial Overlap</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {discoveredCandidates.map((c) => (
                            <tr key={c.id} className="hover:bg-primary/5 text-slate-300">
                              <td className="py-2 px-2.5 font-bold uppercase truncate max-w-[120px]" title={c.candidate_id}>{c.candidate_id}</td>
                              <td className="py-2 px-2.5 uppercase tracking-wider">{c.provider_name.replace("Provider", "")}</td>
                              <td className="py-2 px-2.5 font-semibold text-[8px]">{(c.metadata?.sensor_name as string) || "LISS-IV"}</td>
                              <td className="py-2 px-2.5 flex items-center gap-1"><Calendar className="w-2.5 h-2.5 text-primary" /> {c.acquisition_date}</td>
                              <td className="py-2 px-2.5 text-center font-bold text-emerald-400">{c.cloud_cover.toFixed(1)}%</td>
                              <td className="py-2 px-2.5 text-center font-bold text-slate-200">{c.spatial_overlap.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Parameters configuration */}
                {discoveredCandidates.length > 0 && !isLocalCacheEmpty(selectedProvider, discoveredCandidates) && (
                  <div className="border-t border-border/40 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* References Count */}
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Reference Stack Capacity Limit</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={numReferences}
                        onChange={(e) => setNumReferences(parseInt(e.target.value) || 3)}
                        className="w-full bg-background/30 border border-border/80 focus:border-primary focus:outline-none px-3 py-1.5 rounded-lg font-mono font-bold text-slate-200 text-center"
                      />
                      <p className="text-[7.5px] text-muted-foreground leading-normal uppercase">
                        Specifies the maximum size of references to include in the final reconstruction stack.
                      </p>
                    </div>

                    {/* Weights sliders */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Decay Ranking Multipliers</span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border rounded-lg ${
                          isWeightValid 
                            ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 animate-pulse" 
                            : "text-amber-500 border-amber-500/20 bg-amber-500/5"
                        }`}>
                          Total Weight: {totalWeight.toFixed(2)} / 1.00
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[7.5px] text-slate-300">
                            <span>Cloud Score:</span>
                            <span className="font-bold text-primary">{(weightCloud * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={weightCloud}
                            onChange={(e) => setWeightCloud(parseFloat(e.target.value))}
                            className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[7.5px] text-slate-300">
                            <span>Temporal Relevance:</span>
                            <span className="font-bold text-primary">{(weightTemporal * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={weightTemporal}
                            onChange={(e) => setWeightTemporal(parseFloat(e.target.value))}
                            className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[7.5px] text-slate-300">
                            <span>Spatial Overlap:</span>
                            <span className="font-bold text-primary">{(weightSpatial * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={weightSpatial}
                            onChange={(e) => setWeightSpatial(parseFloat(e.target.value))}
                            className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[7.5px] text-slate-300">
                            <span>Data Quality:</span>
                            <span className="font-bold text-primary">{(weightQuality * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={weightQuality}
                            onChange={(e) => setWeightQuality(parseFloat(e.target.value))}
                            className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveStep(2)}
                  className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted/10 text-[9px] uppercase transition-all duration-300 rounded-lg flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Discovery Setup
                </button>
                
                <button
                  disabled={discoveredCandidates.length === 0 || !isWeightValid || isLocalCacheEmpty(selectedProvider, discoveredCandidates)}
                  onClick={handleRunSelection}
                  className="px-4 py-1.5 border border-primary text-primary hover:bg-primary/20 hover:text-white transition-all duration-300 rounded-lg text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_-4px_rgba(6,182,212,0.35)] disabled:border-border/40 disabled:text-muted-foreground disabled:bg-muted/5 disabled:cursor-not-allowed"
                >
                  <span>Select & Rank References</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Context Compilation */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="border border-border/80 bg-card/15 p-4 space-y-4 relative overflow-hidden rounded-lg">
                <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                  STACKS // SELECTIONS
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Step 4 // Finalize Reference Selection Stack
                </h3>

                <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                  The reference stack selection is locked. Confirm the candidates selected by the ranking algorithm below before compiling the final metadata package.
                </p>

                {/* References stack list */}
                <div className="overflow-x-auto border border-border/50">
                  <table className="w-full text-left text-[8.5px] border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-background/50 text-muted-foreground uppercase tracking-widest text-[7.5px]">
                        <th className="py-2 px-2.5">Rank</th>
                        <th className="py-2 px-2.5">Candidate ID</th>
                        <th className="py-2 px-2.5">Acquisition Date</th>
                        <th className="py-2 px-2.5 text-center">Overlap</th>
                        <th className="py-2 px-2.5 text-center">Cloud</th>
                        <th className="py-2 px-2.5 text-right">Score</th>
                        <th className="py-2 px-2.5">Selection Logic Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {selectedReferences.map((ref) => {
                        const isTop = ref.rank_position === 1;
                        return (
                          <tr key={ref.id} className={`hover:bg-primary/5 ${isTop ? "bg-primary/5 text-primary font-bold" : "text-slate-300"}`}>
                            <td className="py-2.5 px-2.5 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isTop ? "bg-primary" : "bg-muted-foreground/35"}`} />
                              <span>#{ref.rank_position}</span>
                            </td>
                            <td className="py-2.5 px-2.5 font-bold uppercase truncate max-w-[120px]" title={ref.candidate_id}>{ref.candidate_id}</td>
                            <td className="py-2.5 px-2.5">{ref.candidate?.acquisition_date}</td>
                            <td className="py-2.5 px-2.5 text-center">{ref.candidate?.spatial_overlap.toFixed(1)}%</td>
                            <td className="py-2.5 px-2.5 text-center">{ref.candidate?.cloud_cover.toFixed(1)}%</td>
                            <td className="py-2.5 px-2.5 text-right text-slate-200">{ref.ranking_score.toFixed(1)}</td>
                            <td className="py-2.5 px-2.5 text-[8px] text-slate-400 truncate max-w-[160px]" title={ref.selection_reason}>{ref.selection_reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveStep(3)}
                  className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted/10 text-[9px] uppercase transition-all duration-300 rounded-lg flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Weight Optimization
                </button>
                
                <button
                  onClick={handleCompileContext}
                  className="px-4 py-1.5 border border-primary text-primary hover:bg-primary/20 hover:text-white transition-all duration-300 rounded-lg text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_-4px_rgba(6,182,212,0.35)] animate-pulse"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Compile Temporal Context</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Overview Dashboard */}
          {activeStep === 5 && (
            <div className="space-y-6">
              
              {loadingPackage ? (
                <div className="border border-border bg-card/15 min-h-[220px] flex flex-col items-center justify-center p-6 space-y-3 font-mono">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-[10px] text-muted-foreground uppercase">Aggregating telemetry...</span>
                </div>
              ) : packageData ? (
                <>
                  {/* Status Banner */}
                  <div className="border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold text-emerald-400 uppercase tracking-widest text-[9.5px] block">TEMPORAL CONTEXT READY</span>
                        <span className="text-[8.5px] text-muted-foreground uppercase">Temporal bundle successfully compiled and mounted to orbital database</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleResetWorkflow}
                      className="border border-border/80 hover:border-primary text-muted-foreground hover:text-primary px-3 py-1.5 text-[8.5px] uppercase transition-all duration-300 rounded-lg flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      Re-Configure Steps
                    </button>
                  </div>

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
                  <div className="border border-border bg-card/25 p-4 space-y-4 relative overflow-hidden rounded-lg">
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
                                  {cand.provider_name.replace("Provider", "").replace("_", " ")}
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
                </>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
