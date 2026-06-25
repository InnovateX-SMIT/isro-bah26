"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Clock,
  Layers,
  FileText,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Database,
  Calendar,
  Sparkles,
  Server,
  TrendingUp,
  BarChart2
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getMissionControlProfile } from "@/lib/mission-control-api"
import {
  getProviders,
  getProvidersHealth,
  getTemporalContextPackage,
  generateTemporalContext
} from "@/lib/temporal-context-api"

import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { MissionControlProfile } from "@/lib/types/mission-control"
import {
  ProviderInfoResponse,
  SystemHealthResponse,
  TemporalContextPackageResponse
} from "@/lib/types/temporal-context"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"
import TemporalStatisticsCard from "@/components/temporal/TemporalStatisticsCard"
import CloudStatisticsCard from "@/components/temporal/CloudStatisticsCard"
import SpatialStatisticsCard from "@/components/temporal/SpatialStatisticsCard"
import ProviderStatisticsCard from "@/components/temporal/ProviderStatisticsCard"

export default function TemporalIntelligenceHubPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)
  const [packageData, setPackageData] = useState<TemporalContextPackageResponse | null>(null)
  const [providers, setProviders] = useState<ProviderInfoResponse[]>([])
  const [providersHealth, setProvidersHealth] = useState<SystemHealthResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [compiling, setCompiling] = useState(false)

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const ds = await getDataset(datasetId)
      setDataset(ds)

      try {
        const meta = await getDatasetMetadata(datasetId)
        setMetadata(meta)
      } catch (err) {
        console.log("No metadata extracted yet")
      }

      const prof = await getMissionControlProfile(datasetId)
      setProfile(prof)

      const sessionId = ds.analysis_session_id

      // Load temporal details
      try {
        const pkg = await getTemporalContextPackage(sessionId)
        setPackageData(pkg)
      } catch (err) {
        console.log("Temporal context package not compiled yet")
      }

      try {
        const provs = await getProviders()
        setProviders(provs)
        const health = await getProvidersHealth()
        setProvidersHealth(health)
      } catch (err) {
        console.log("Failed to load providers registry details")
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load Temporal Workspace metadata.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadData(true)
    }
  }, [datasetId])

  const handleCompileContext = async () => {
    if (!dataset) return
    setCompiling(true)
    setError(null)
    try {
      await generateTemporalContext(dataset.analysis_session_id)
      await loadData(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to compile temporal context package.")
    } finally {
      setCompiling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Synchronizing Orbit Parameters...
        </span>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-sm space-y-4 font-mono max-w-xl mx-auto my-12">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Orbit Sync Lock Failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || `Temporal Context details for dataset ${datasetId} are unreachable.`}
        </p>
        <button
          onClick={() => router.push("/datasets")}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Return to Datacenter
        </button>
      </div>
    )
  }

  const isContextAvailable = packageData !== null && packageData.selected_references?.length > 0

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[{ label: "Temporal Intelligence" }]}
            />
            <h1 className="text-lg font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary animate-pulse" />
              Temporal Intelligence Overview
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Session Stack: <span className="text-foreground select-all">{dataset.analysis_session_id}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
            <span className={`w-1.5 h-1.5 rounded-full ${isContextAvailable ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`}></span>
            <span className="text-muted-foreground uppercase text-[9px] tracking-wider">
              {isContextAvailable ? "TEMPORAL STACK: ENGAGED" : "TEMPORAL STACK: STANDBY"}
            </span>
          </div>
        </div>

        {/* Orbit Core Metrics */}
        {isContextAvailable && packageData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TemporalStatisticsCard stats={packageData.temporal_statistics} />
            <CloudStatisticsCard stats={packageData.cloud_statistics} />
            <SpatialStatisticsCard stats={packageData.spatial_statistics} />
            <ProviderStatisticsCard stats={packageData.provider_summary} />
          </div>
        )}

        {/* Summary Narrative or Empty State */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Briefing Card */}
            <div className="border border-border bg-card/25 p-5 rounded-sm space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                Briefing
              </div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                Operational Temporal Guidance Summary
              </h2>
              {isContextAvailable ? (
                <p className="text-[11px] leading-relaxed text-slate-300 font-sans border-t border-border/20 pt-3">
                  {packageData?.context_summary}
                </p>
              ) : (
                <div className="space-y-4 py-4">
                  <p className="text-xs text-muted-foreground font-sans">
                    No historical reference observations have been selected or compiled into the temporal package for this session yet. You can trigger lazy generation of the baseline temporal context below.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleCompileContext}
                      disabled={compiling}
                      className="px-4 py-2 bg-primary hover:bg-primary/95 text-background font-bold text-[10px] tracking-widest uppercase rounded-sm border border-primary/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {compiling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Compiling Stack...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Temporal Context
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => router.push(`/mission-control/temporal?dataset=${datasetId}`)}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-[10px] tracking-widest uppercase rounded-sm border border-border flex items-center gap-1.5 transition-all"
                    >
                      Open Stepper Wizard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hub Actions Grid */}
            {isContextAvailable && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => router.push(`/datasets/${datasetId}/temporal/references`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <Layers className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Historical References</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Browse orbital parameters, cloud cover ratings, and rankings for the {packageData?.selected_references?.length} selected target observations.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open Gallery <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div 
                  onClick={() => router.push(`/datasets/${datasetId}/temporal/timeline`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <Clock className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Orbit Timeline</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Understand spatial chronological offsets relative to the target dataset footprint in days.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open Timeline <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div 
                  onClick={() => router.push(`/datasets/${datasetId}/temporal/metadata`)}
                  className="border border-border bg-card/10 hover:bg-card/25 p-4 rounded-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <FileText className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Reference Metadata</h3>
                    <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                      Inspect structural attributes, coverage grids, sensor types, and provider details.
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest mt-2">
                    Open Registry <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Provider Information & Health */}
          <div className="space-y-6">
            
            {/* Providers registry status */}
            <div className="border border-border bg-card/20 p-5 rounded-sm space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Server className="w-4 h-4 text-primary" />
                Connectivity Registry
              </h3>
              <p className="text-[10px] text-muted-foreground font-sans">
                Real-time connection interfaces to historical catalog indexes.
              </p>
              
              <div className="space-y-2 border-t border-border/20 pt-3">
                {providers.map((prov, i) => {
                  const healthInfo = providersHealth?.providers.find(h => h.name === prov.name)
                  const isHealthy = healthInfo ? healthInfo.healthy : true
                  return (
                    <div key={i} className="border border-border/40 p-2.5 bg-background/30 rounded-sm text-[10px] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-200">{prov.name}</div>
                        <div className="text-[9px] text-muted-foreground uppercase">{prov.is_primary ? "Primary Provider" : "Alternate"}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-pulse"}`}></span>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          {isHealthy ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quality Summary */}
            {isContextAvailable && packageData && (
              <div className="border border-border bg-card/20 p-5 rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Quality Averages
                </h3>
                <div className="space-y-2 border-t border-border/20 pt-3 text-[10px]">
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Total Stack Count:</span>
                    <span className="font-bold text-slate-200">{packageData.selected_references.length} references</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Avg Spatial Overlap:</span>
                    <span className="font-bold text-cyan-400">{(packageData.spatial_statistics.average).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                    <span className="text-slate-400">Avg Cloud Cover:</span>
                    <span className="font-bold text-amber-500">{(packageData.cloud_statistics.average).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Avg Temporal Distance:</span>
                    <span className="font-bold text-pink-400">{(packageData.temporal_statistics.average).toFixed(1)} days</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Workspace Sidebar navigation */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="temporal"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
    </div>
  )
}
