"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Dataset } from "@/lib/types/dataset"
import { MissionControlProfile } from "@/lib/types/mission-control"
import { getRegisteredDatasets } from "@/lib/dataset-api"
import { getMissionControlProfile } from "@/lib/mission-control-api"
import {
  getProviders,
  getProvidersHealth,
  runDiscovery,
  getDiscoveredCandidates,
  runReferenceSelection,
  getSelectedReferences,
  generateTemporalContext,
  getTemporalContextPackage
} from "@/lib/temporal-context-api"
import { getAnalysisSession } from "@/lib/analysis-api"
import {
  ProviderInfoResponse,
  SystemHealthResponse,
  TemporalCandidate,
  SelectedReference,
  TemporalContextPackageResponse
} from "@/lib/types/temporal-context"
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
  ArrowLeft,
  Clock
} from "lucide-react"
import TemporalStatisticsCard from "@/components/temporal/TemporalStatisticsCard"
import CloudStatisticsCard from "@/components/temporal/CloudStatisticsCard"
import SpatialStatisticsCard from "@/components/temporal/SpatialStatisticsCard"
import ProviderStatisticsCard from "@/components/temporal/ProviderStatisticsCard"

function TemporalSubpageDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const datasetIdFromUrl = searchParams.get("dataset")

  // State
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)

  // Stepper & Session status
  const [activeStep, setActiveStep] = useState<number>(1)
  const [sessionStatus, setSessionStatus] = useState<string>("created")
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Providers State
  const [providers, setProviders] = useState<ProviderInfoResponse[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("GoogleEarthEngine")
  const [providersHealth, setProvidersHealth] = useState<SystemHealthResponse | null>(null)
  const [refreshingHealth, setRefreshingHealth] = useState<boolean>(false)

  // Step 2: Discovery State
  const [discoveryWindow, setDiscoveryWindow] = useState<number>(30)
  const [runningDiscovery, setRunningDiscovery] = useState<boolean>(false)

  // Step 3: Selection State
  const [discoveredCandidates, setDiscoveredCandidates] = useState<TemporalCandidate[]>([])
  const [numReferences, setNumReferences] = useState<number>(3)
  const [weightCloud, setWeightCloud] = useState<number>(0.4)
  const [weightTemporal, setWeightTemporal] = useState<number>(0.3)
  const [weightSpatial, setWeightSpatial] = useState<number>(0.2)
  const [weightQuality, setWeightQuality] = useState<number>(0.1)
  const [runningSelection, setRunningSelection] = useState<boolean>(false)

  // Step 4: Context Compilation State
  const [selectedReferences, setSelectedReferences] = useState<SelectedReference[]>([])
  const [compilingContext, setCompilingContext] = useState<boolean>(false)

  // Step 5: Dashboard State (Final Package)
  const [packageData, setPackageData] = useState<TemporalContextPackageResponse | null>(null)
  const [loadingPackage, setLoadingPackage] = useState<boolean>(false)

  // Weights Validation
  const totalWeight = parseFloat((weightCloud + weightTemporal + weightSpatial + weightQuality).toFixed(4))
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.001

  // 1. Fetch Registered Datasets
  const fetchDatasets = async () => {
    try {
      const list = await getRegisteredDatasets()
      setDatasets(list)
      
      if (list.length > 0) {
        const target = datasetIdFromUrl 
          ? list.find(d => d.dataset_id === datasetIdFromUrl) || list[0]
          : list[0]
        
        setSelectedDataset(target)
        await handleLoadProfile(target.dataset_id)
        await initWorkflow(target)
      }
    } catch (err: any) {
      console.error(err)
      setError("Failed to fetch registered datasets.")
    }
  }

  const handleLoadProfile = async (id: string) => {
    try {
      const data = await getMissionControlProfile(id)
      setProfile(data)
    } catch (err: any) {
      console.error(err)
    }
  }

  // Initialize Workflow & Fetch State
  const initWorkflow = async (target: Dataset) => {
    setLoadingWorkspace(true)
    setError(null)
    const sessionId = target.analysis_session_id
    const datasetStatus = target.dataset_status

    try {
      // 1. Fetch Providers registry info and connectivity health reports
      const provs = await getProviders()
      setProviders(provs)
      
      const health = await getProvidersHealth()
      setProvidersHealth(health)

      // 2. Fetch target Analysis Session lifecycle status
      const session = await getAnalysisSession(sessionId)
      setSessionStatus(session.status)

      // 3. Coordinate wizard step mapping based on database/session status
      if (session.status === "TEMPORAL_CONTEXT_GENERATED") {
        setSessionStatus("TEMPORAL_CONTEXT_READY")
        setActiveStep(5)
        await fetchFinalPackage(sessionId)
      } else if (session.status === "REFERENCE_SELECTION_COMPLETE") {
        setActiveStep(4)
        await fetchSelectedReferences(sessionId)
      } else if (session.status === "TEMPORAL_CONTEXT_RETRIEVED") {
        setActiveStep(3)
        await fetchCandidates(sessionId)
      } else {
        setActiveStep(1)
      }
    } catch (err: any) {
      console.error("Temporal wizard initialization failed:", err)
      setError(err.message || "Failed to initialize Temporal Intelligence workspace module.")
    } finally {
      setLoadingWorkspace(false)
    }
  }

  const fetchCandidates = async (sessionId: string) => {
    try {
      const res = await getDiscoveredCandidates(sessionId)
      setDiscoveredCandidates(res.candidates)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSelectedReferences = async (sessionId: string) => {
    try {
      const refs = await getSelectedReferences(sessionId)
      setSelectedReferences(refs)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchFinalPackage = async (sessionId: string) => {
    setLoadingPackage(true)
    try {
      const data = await getTemporalContextPackage(sessionId)
      setPackageData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPackage(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [datasetIdFromUrl])

  const handleSelectDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset)
    router.push(`/mission-control/temporal?dataset=${dataset.dataset_id}`)
  }

  // Actions
  const handleRefreshProvidersHealth = async () => {
    setRefreshingHealth(true)
    try {
      const health = await getProvidersHealth()
      setProvidersHealth(health)
    } catch (err) {
      console.error(err)
    } finally {
      setRefreshingHealth(false)
    }
  }

  const handleRunDiscovery = async () => {
    if (!selectedDataset) return
    setRunningDiscovery(true)
    setError(null)
    const sessionId = selectedDataset.analysis_session_id
    try {
      const res = await runDiscovery(sessionId, {
        provider_name: selectedProvider,
        temporal_window_days: discoveryWindow
      })
      setDiscoveredCandidates(res.candidates)
      setSessionStatus("TEMPORAL_DISCOVERY_COMPLETE")
      setActiveStep(3)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Historical imagery discovery scan failed.")
    } finally {
      setRunningDiscovery(false)
    }
  }

  const handleRunSelection = async () => {
    if (!selectedDataset) return
    if (!isWeightValid) {
      setError("Ranking weights must sum up to exactly 1.0 for system compliance.")
      return
    }
    setRunningSelection(true)
    setError(null)
    const sessionId = selectedDataset.analysis_session_id
    try {
      const res = await runReferenceSelection(sessionId, {
        num_references: numReferences,
        weights: {
          cloud_cover: weightCloud,
          temporal_distance: weightTemporal,
          spatial_overlap: weightSpatial,
          data_quality: weightQuality
        }
      })
      setSelectedReferences(res.selected_references)
      setSessionStatus("REFERENCE_SELECTION_COMPLETE")
      setActiveStep(4)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Reference ranking and selection stack extraction failed.")
    } finally {
      setRunningSelection(false)
    }
  }

  const handleCompileContext = async () => {
    if (!selectedDataset) return
    setCompilingContext(true)
    setError(null)
    const sessionId = selectedDataset.analysis_session_id
    try {
      const res = await generateTemporalContext(sessionId)
      setPackageData(res)
      setSessionStatus("TEMPORAL_CONTEXT_READY")
      setActiveStep(5)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Fusing stacks and generating temporal briefing package failed.")
    } finally {
      setCompilingContext(false)
    }
  }

  const handleResetWorkflow = () => {
    setActiveStep(1)
    setError(null)
  }

  const steps = [
    { num: 1, name: "Providers" },
    { num: 2, name: "Discovery" },
    { num: 3, name: "Selection" },
    { num: 4, name: "Compilation" },
    { num: 5, name: "Dashboard" }
  ]

  return (
    <div className="space-y-6 font-mono text-slate-100 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push(`/mission-control/briefing?dataset=${selectedDataset?.dataset_id}`)}
            className="inline-flex items-center space-x-1 text-xs text-primary hover:underline uppercase text-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Mission Briefing</span>
          </button>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
            <Clock className="w-5.5 h-5.5 text-primary" />
            TEMPORAL INTELLIGENCE WORKSPACE
          </h1>
          {selectedDataset && (
            <p className="text-xs text-slate-300 uppercase tracking-widest text-[10px]">
              NODE: <span className="text-white font-bold select-all">{selectedDataset.dataset_name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase text-[10px]">TEMPORAL LAYER: LOCKED</span>
        </div>
      </div>

      {/* Dataset selector */}
      {datasets.length > 0 && (
        <div className="border border-border bg-card/25 p-4 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            ORBITAL // ACTIVE NODES
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Database className="w-4 h-4 text-primary" />
            Switch Active Satellite Image Node
          </div>
          <div className="flex flex-wrap gap-2.5 max-h-[80px] overflow-y-auto pr-1">
            {datasets.map((ds) => {
              const isSelected = selectedDataset?.dataset_id === ds.dataset_id
              return (
                <button
                  key={ds.dataset_id}
                  onClick={() => handleSelectDataset(ds)}
                  className={`px-3 py-2 border text-[10px] tracking-wide transition-all rounded-sm ${
                    isSelected
                      ? "bg-primary/20 border-primary text-primary font-bold shadow-[0_0_8px_-2px_rgba(6,182,212,0.3)]"
                      : "border-border/60 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                  }`}
                >
                  <span className="uppercase">{ds.dataset_name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stepper Wizard content */}
      {loadingWorkspace ? (
        <div className="border border-cyan-500/20 bg-cyan-950/10 min-h-[300px] flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="space-y-0.5 text-center">
            <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-widest animate-pulse">
              Syncing Temporal Intelligence Workspace...
            </h4>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Stepper bar */}
          <div className="grid grid-cols-5 gap-1 text-[8.5px] tracking-wider text-center uppercase pb-3 border-b border-border/40">
            {steps.map((s) => {
              const isCurrent = activeStep === s.num
              const isCompleted = activeStep > s.num
              return (
                <button
                  key={s.num}
                  disabled={s.num > activeStep && sessionStatus !== "TEMPORAL_CONTEXT_READY"}
                  onClick={() => setActiveStep(s.num)}
                  className={`p-2 border transition-all duration-300 rounded-sm text-left relative overflow-hidden ${
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
              )
            })}
          </div>

          {/* Diagnostics Error block */}
          {error && (
            <div className="border border-red-500/30 bg-red-500/5 p-3 text-red-400 flex items-start gap-2.5 rounded-sm relative overflow-hidden">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider block text-[10px]">TEMPORAL INTELLIGENCE FAILURE</span>
                <p className="text-[9.5px] text-muted-foreground leading-normal">{error}</p>
              </div>
            </div>
          )}

          {/* Activity loaders */}
          {runningDiscovery && (
            <div className="border border-primary/20 bg-card/25 min-h-[220px] flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">STATUS: TEMPORAL_DISCOVERY_RUNNING</h4>
            </div>
          )}

          {runningSelection && (
            <div className="border border-primary/20 bg-card/25 min-h-[220px] flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">STATUS: REFERENCE_SELECTION_RUNNING</h4>
            </div>
          )}

          {compilingContext && (
            <div className="border border-primary/20 bg-card/25 min-h-[220px] flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">STATUS: TEMPORAL_CONTEXT_GENERATING</h4>
            </div>
          )}

          {/* Stepper steps panels */}
          {!runningDiscovery && !runningSelection && !compilingContext && (
            <>
              {/* STEP 1: Providers Selection */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="border border-border/80 bg-card/15 p-4 space-y-4 relative overflow-hidden rounded-sm">
                    <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                      REGISTRY // PROVIDERS
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Server className="w-4 h-4 text-primary" />
                      Step 1 // Verify Historical Temporal Providers
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {providers.map((p) => {
                        const healthDetail = providersHealth?.providers.find(h => h.name === p.name)
                        const isSelected = selectedProvider === p.name
                        return (
                          <div
                            key={p.name}
                            onClick={() => setSelectedProvider(p.name)}
                            className={`border p-4 rounded-sm transition-all duration-300 cursor-pointer flex flex-col justify-between ${
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
                                  <span className="bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 text-[7px] font-bold rounded-sm uppercase tracking-widest">
                                    PRIMARY
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-normal">
                                {p.description}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(p.supported_sensors || (p.name === "GoogleEarthEngine" ? ["Landsat-8", "Sentinel-2"] : ["LISS-IV", "LISS-III"])).map(s => (
                                  <span key={s} className="bg-muted/30 text-slate-400 px-1 py-0.5 text-[7px] font-mono rounded-sm border border-border/40">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Health diagnostic */}
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
                                    <span className="text-red-400 font-bold text-[8px] uppercase">MOCK ENVIRONMENT</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleRefreshProvidersHealth}
                      disabled={refreshingHealth}
                      className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted/10 text-[9px] uppercase transition-all duration-300 rounded-sm flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshingHealth ? "animate-spin" : ""}`} />
                      Refresh Connectivity Diagnostics
                    </button>
                    
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-4 py-1.5 border border-primary text-primary hover:bg-primary/20 hover:text-white transition-all duration-300 rounded-sm text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_-4px_rgba(6,182,212,0.3)]"
                    >
                      <span>Proceed to Discovery</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Discovery */}
              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="border border-border/80 bg-card/15 p-4 space-y-4 relative overflow-hidden rounded-sm">
                    <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                      DISCOVERY // ARCHIVE
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Database className="w-4 h-4 text-primary" />
                      Step 2 // Historical Imagery Discovery Configuration
                    </h3>

                    <div className="border border-primary/10 bg-primary/5 p-3 text-[9px] text-primary flex items-start gap-2.5 rounded-sm">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 leading-relaxed">
                        <span className="font-bold uppercase tracking-wider block">TARGET GEOSPATIAL BOUNDS DETECTED</span>
                        <span>The scan will query boundaries matching <b>{selectedDataset?.dataset_name}</b>.</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Target Scene Acquisition Date</label>
                        <div className="flex items-center gap-2 border border-border/60 bg-muted/15 px-3 py-2 text-slate-300 font-mono rounded-sm select-all">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{profile?.metadata?.acquisition_date || "2026-02-15"}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Search window range</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[30, 90, 180].map((days) => (
                            <button
                              key={days}
                              onClick={() => setDiscoveryWindow(days)}
                              className={`py-2 border font-mono text-[9.5px] tracking-wide transition-all rounded-sm ${
                                discoveryWindow === days
                                  ? "bg-primary/20 border-primary text-primary font-bold"
                                  : "border-border/60 text-muted-foreground hover:bg-muted/10"
                              }`}
                            >
                              &plusmn; {days} DAYS
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted/10 text-[9px] uppercase transition-all duration-300 rounded-sm flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Providers
                    </button>
                    
                    <button
                      onClick={handleRunDiscovery}
                      className="px-4 py-1.5 border border-primary text-primary hover:bg-primary/20 hover:text-white transition-all duration-300 rounded-sm text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_-4px_rgba(6,182,212,0.35)] animate-pulse"
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
                  <div className="border border-border/80 bg-card/15 p-4 space-y-4 relative overflow-hidden rounded-sm">
                    <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                      INVENTORY // SCANS
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Sliders className="w-4 h-4 text-primary" />
                      Step 3 // Configure Reference Scoring Weights
                    </h3>

                    {/* Candidate Table */}
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Discovered Imagery Candidates List ({discoveredCandidates.length} Items)</span>
                      {discoveredCandidates.length === 0 ? (
                        <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center rounded-sm text-amber-500 font-mono text-[9px]">
                          Zero candidate historical reference images found. Try widening search range.
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[140px] border border-border/50">
                          <table className="w-full text-left text-[8.5px] border-collapse">
                            <thead>
                              <tr className="border-b border-border/60 bg-background/50 text-muted-foreground uppercase tracking-widest text-[7.5px] sticky top-0 z-10">
                                <th className="py-2 px-2.5">Candidate ID</th>
                                <th className="py-2 px-2.5">Provider</th>
                                <th className="py-2 px-2.5">Acquisition</th>
                                <th className="py-2 px-2.5 text-center">Cloud Cover</th>
                                <th className="py-2 px-2.5 text-center">Spatial Overlap</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20 text-slate-300">
                              {discoveredCandidates.map((c) => (
                                <tr key={c.id} className="hover:bg-primary/5">
                                  <td className="py-2 px-2.5 font-bold uppercase truncate max-w-[120px]">{c.candidate_id}</td>
                                  <td className="py-2 px-2.5 uppercase">{c.provider_name.replace("Provider", "")}</td>
                                  <td className="py-2 px-2.5">{c.acquisition_date}</td>
                                  <td className="py-2 px-2.5 text-center font-bold text-emerald-400">{c.cloud_cover.toFixed(1)}%</td>
                                  <td className="py-2 px-2.5 text-center font-bold text-slate-200">{c.spatial_overlap.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {discoveredCandidates.length > 0 && (
                      <div className="border-t border-border/40 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1 space-y-2">
                          <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">Reference Stack Capacity Limit</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={numReferences}
                            onChange={(e) => setNumReferences(parseInt(e.target.value) || 3)}
                            className="w-full bg-background/30 border border-border/80 focus:border-primary focus:outline-none px-3 py-1.5 rounded-sm font-bold text-center"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Weights tuning</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-sm ${isWeightValid ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-amber-500"}`}>
                              Total: {totalWeight.toFixed(2)} / 1.00
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-[9px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-300">
                                <span>Cloud Score:</span>
                                <span className="font-bold text-primary">{(weightCloud * 100).toFixed(0)}%</span>
                              </div>
                              <input type="range" min="0" max="1" step="0.05" value={weightCloud} onChange={(e) => setWeightCloud(parseFloat(e.target.value))} className="w-full accent-primary h-1 bg-muted rounded-sm cursor-pointer" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-300">
                                <span>Temporal Distance:</span>
                                <span className="font-bold text-primary">{(weightTemporal * 100).toFixed(0)}%</span>
                              </div>
                              <input type="range" min="0" max="1" step="0.05" value={weightTemporal} onChange={(e) => setWeightTemporal(parseFloat(e.target.value))} className="w-full accent-primary h-1 bg-muted rounded-sm cursor-pointer" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-300">
                                <span>Spatial Overlap:</span>
                                <span className="font-bold text-primary">{(weightSpatial * 100).toFixed(0)}%</span>
                              </div>
                              <input type="range" min="0" max="1" step="0.05" value={weightSpatial} onChange={(e) => setWeightSpatial(parseFloat(e.target.value))} className="w-full accent-primary h-1 bg-muted rounded-sm cursor-pointer" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-300">
                                <span>Data Quality:</span>
                                <span className="font-bold text-primary">{(weightQuality * 100).toFixed(0)}%</span>
                              </div>
                              <input type="range" min="0" max="1" step="0.05" value={weightQuality} onChange={(e) => setWeightQuality(parseFloat(e.target.value))} className="w-full accent-primary h-1 bg-muted rounded-sm cursor-pointer" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted/10 text-[9px] uppercase transition-all rounded-sm flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Discovery
                    </button>
                    
                    <button
                      disabled={discoveredCandidates.length === 0 || !isWeightValid}
                      onClick={handleRunSelection}
                      className="px-4 py-1.5 border border-primary text-primary hover:bg-primary/20 hover:text-white transition-all rounded-sm text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_-4px_rgba(6,182,212,0.35)] disabled:opacity-50"
                    >
                      <span>Select & Rank References</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Compilation */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="border border-border/80 bg-card/15 p-4 space-y-4 relative overflow-hidden rounded-sm">
                    <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                      STACKS // SELECTIONS
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Step 4 // Finalize Reference Selection Stack
                    </h3>

                    <p className="text-[9.5px] text-muted-foreground">
                      Confirm the candidates selected by the ranking algorithm below before compiling the final metadata package.
                    </p>

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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20 text-slate-300">
                          {selectedReferences.map((ref) => {
                            const isTop = ref.rank_position === 1
                            return (
                              <tr key={ref.id} className={`hover:bg-primary/5 ${isTop ? "bg-primary/5 text-primary font-bold" : ""}`}>
                                <td className="py-2.5 px-2.5 flex items-center gap-1">
                                  <span>#{ref.rank_position}</span>
                                </td>
                                <td className="py-2.5 px-2.5 font-bold uppercase truncate max-w-[120px]">{ref.candidate_id}</td>
                                <td className="py-2.5 px-2.5">{ref.candidate?.acquisition_date}</td>
                                <td className="py-2.5 px-2.5 text-center">{ref.candidate?.spatial_overlap.toFixed(1)}%</td>
                                <td className="py-2.5 px-2.5 text-center">{ref.candidate?.cloud_cover.toFixed(1)}%</td>
                                <td className="py-2.5 px-2.5 text-right">{ref.ranking_score.toFixed(1)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setActiveStep(3)}
                      className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted/10 text-[9px] uppercase transition-all rounded-sm flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Weights
                    </button>
                    
                    <button
                      onClick={handleCompileContext}
                      className="px-4 py-1.5 border border-primary text-primary hover:bg-primary/20 hover:text-white transition-all rounded-sm text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_-4px_rgba(6,182,212,0.35)]"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Compile Temporal Context</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: Dashboard */}
              {activeStep === 5 && (
                <div className="space-y-6">
                  
                  {loadingPackage ? (
                    <div className="border border-border bg-card/15 min-h-[220px] flex flex-col items-center justify-center p-6 space-y-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-[10px] text-muted-foreground uppercase">Aggregating telemetry...</span>
                    </div>
                  ) : packageData ? (
                    <>
                      {/* Status Banner */}
                      <div className="border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 rounded-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold text-emerald-400 uppercase tracking-widest text-[9.5px] block">TEMPORAL CONTEXT READY</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={handleResetWorkflow}
                          className="border border-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary px-4 py-2.5 text-[10px] uppercase font-bold transition-all rounded-sm flex items-center gap-1.5 shrink-0 shadow-[0_0_12px_-4px_rgba(6,182,212,0.4)]"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Re-Configure Steps
                        </button>
                      </div>

                      {/* Upper Panel Grid: Analytics Dashboard (2x2 grid) */}
                      <div className="space-y-1.5">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">// TEMPORAL MATRIX ANALYTICS</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border border-border bg-card/30 p-4">
                            <div className="text-primary font-bold uppercase text-[9px] tracking-wider border-b border-border/40 pb-1.5 mb-3">
                              Offset Analytics
                            </div>
                            <TemporalStatisticsCard stats={packageData.temporal_statistics} />
                          </div>
                          
                          <div className="border border-border bg-card/30 p-4">
                            <div className="text-primary font-bold uppercase text-[9px] tracking-wider border-b border-border/40 pb-1.5 mb-3">
                              Cloud Analytics
                            </div>
                            <CloudStatisticsCard stats={packageData.cloud_statistics} />
                          </div>

                          <div className="border border-border bg-card/30 p-4">
                            <div className="text-primary font-bold uppercase text-[9px] tracking-wider border-b border-border/40 pb-1.5 mb-3">
                              Footprint Overlap
                            </div>
                            <SpatialStatisticsCard stats={packageData.spatial_statistics} />
                          </div>

                          <div className="border border-border bg-card/30 p-4">
                            <div className="text-primary font-bold uppercase text-[9px] tracking-wider border-b border-border/40 pb-1.5 mb-3">
                              Provider Allocation
                            </div>
                            <ProviderStatisticsCard stats={packageData.provider_summary} />
                          </div>
                        </div>
                      </div>

                      {/* Temporal Briefing: Convert paragraph to bullets */}
                      <div className="border border-border bg-card/25 p-5 space-y-3 relative overflow-hidden rounded-sm">
                        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                          INTEL // BRIEFING
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
                          <Info className="w-4 h-4 text-primary" />
                          Temporal Context Report Summary
                        </h3>
                        <div className="border border-border/40 bg-black/45 p-4 rounded-sm shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
                          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none" />
                          
                          <ul className="space-y-3 text-xs text-slate-300 relative z-10 select-text leading-relaxed">
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold shrink-0">&bull;</span>
                              <span><span className="text-white font-bold">{packageData.selected_references.length}</span> historical references successfully compiled in reference stack</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold shrink-0">&bull;</span>
                              <span>Average cloud cover across references is <span className="text-white font-bold">{packageData.cloud_statistics.average.toFixed(1)}%</span></span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold shrink-0">&bull;</span>
                              <span>Average spatial overlap bounds ratio is <span className="text-white font-bold">{packageData.spatial_statistics.average.toFixed(1)}%</span></span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold shrink-0">&bull;</span>
                              <span>Average temporal offset index is <span className="text-white font-bold">{packageData.temporal_statistics.average.toFixed(1)} days</span></span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold shrink-0">&bull;</span>
                              <span>Fusing primary Earth Observation provider: <span className="text-emerald-400 font-bold uppercase">{packageData.provider_summary.providers_represented.join(", ") || "GoogleEarthEngine"}</span> (Mock Mode active)</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Selected reference scenes inventory table */}
                      <div className="border border-border bg-card/25 p-4 space-y-4 relative overflow-hidden rounded-sm">
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
                                <th className="py-2.5 px-3">Selection Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30 text-slate-300">
                              {packageData.selected_references.map((ref) => {
                                const cand = ref.candidate
                                if (!cand) return null
                                const isTop = ref.rank_position === 1
                                return (
                                  <tr key={ref.id} className={`hover:bg-primary/5 transition-all ${isTop ? "bg-primary/5 text-primary font-bold" : ""}`}>
                                    <td className="py-3 px-3">#{ref.rank_position}</td>
                                    <td className="py-3 px-3 uppercase tracking-wider">{cand.provider_name.replace("Provider", "")}</td>
                                    <td className="py-3 px-3">{cand.acquisition_date}</td>
                                    <td className="py-3 px-3 text-center">{cand.cloud_cover.toFixed(1)}%</td>
                                    <td className="py-3 px-3 text-center">{cand.spatial_overlap.toFixed(1)}%</td>
                                    <td className="py-3 px-3 text-right">{ref.ranking_score.toFixed(1)}</td>
                                    <td className="py-3 px-3 text-[8.5px] italic text-slate-400 max-w-[240px] truncate" title={ref.selection_reason}>{ref.selection_reason}</td>
                                  </tr>
                                )
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
      )}
    </div>
  )
}

export default function TemporalSubpage() {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-xs text-muted-foreground p-6 flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>LOADING TEMPORAL INTELLIGENCE MODULES...</span>
        </div>
      }
    >
      <TemporalSubpageDashboard />
    </Suspense>
  )
}
