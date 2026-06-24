"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Dataset } from "@/lib/types/dataset"
import { MissionControlProfile } from "@/lib/types/mission-control"
import { getRegisteredDatasets } from "@/lib/dataset-api"
import { getMissionControlProfile } from "@/lib/mission-control-api"
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Anchor, 
  Thermometer, 
  Shield, 
  Award, 
  FileText,
  Database
} from "lucide-react"

function BriefingSubpageDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const datasetIdFromUrl = searchParams.get("dataset")

  // State
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [profile, setProfile] = useState<MissionControlProfile | null>(null)

  // Loading States
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true)
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDatasets = async () => {
    setLoadingDatasets(true)
    setError(null)
    try {
      const list = await getRegisteredDatasets()
      setDatasets(list)
      
      if (list.length > 0) {
        const target = datasetIdFromUrl 
          ? list.find(d => d.dataset_id === datasetIdFromUrl) || list[0]
          : list[0]
        
        setSelectedDataset(target)
        await handleLoadProfile(target.dataset_id)
      }
    } catch (err: any) {
      console.error(err)
      setError("Failed to fetch registered datasets.")
    } finally {
      setLoadingDatasets(false)
    }
  }

  const handleLoadProfile = async (id: string) => {
    setLoadingProfile(true)
    setError(null)
    try {
      const data = await getMissionControlProfile(id)
      setProfile(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load Mission Control profile.")
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [datasetIdFromUrl])

  const handleSelectDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset)
    router.push(`/mission-control/briefing?dataset=${dataset.dataset_id}`)
  }

  const { metadata, location, context, status } = profile || {}

  const pixelSizeX = metadata?.pixel_size_x ? Math.abs(metadata.pixel_size_x).toFixed(2) : null
  const pixelSizeY = metadata?.pixel_size_y ? Math.abs(metadata.pixel_size_y).toFixed(2) : null

  return (
    <div className="space-y-6 font-mono text-slate-100 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push(`/mission-control/geospatial?dataset=${selectedDataset?.dataset_id}`)}
            className="inline-flex items-center space-x-1 text-xs text-primary hover:underline uppercase text-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Geospatial Intelligence</span>
          </button>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
            <FileText className="w-5.5 h-5.5 text-primary" />
            MISSION BRIEFING & ENVIRONMENTAL CONTEXT
          </h1>
          {selectedDataset && (
            <p className="text-xs text-slate-300 uppercase tracking-widest text-[10px]">
              NODE: <span className="text-white font-bold select-all">{selectedDataset.dataset_name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase text-[10px]">BRIEFING: ONLINE</span>
        </div>
      </div>

      {/* Dataset registry selector */}
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

      {error && !loadingProfile && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-xs">
          <span className="font-bold uppercase tracking-wider block">BRIEFING CONSOLE LINK FAILURE</span>
          <span className="text-[10px] text-muted-foreground">{error}</span>
        </div>
      )}

      {loadingProfile || loadingDatasets ? (
        <div className="border border-border bg-card/15 min-h-[400px] flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest animate-pulse">Consolidating Mission Briefing...</h4>
        </div>
      ) : profile ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Column 1: Mission Summary (bulleted list) */}
          <div className="border border-border bg-card/25 p-6 space-y-4 relative overflow-hidden rounded-sm">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[8px] text-primary tracking-widest uppercase">
              SUMMARY // CRITERIA
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Shield className="w-4 h-4 text-primary" />
              Satellite Image Overview Summary
            </h2>
            
            <div className="border border-border/40 bg-black/45 p-4 rounded-sm shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none" />
              
              <ul className="space-y-3.5 text-xs text-slate-300 relative z-10 select-text leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">&bull;</span>
                  <span>Dataset acquired on <span className="text-white font-bold">{metadata?.acquisition_date || "2026-02-15"}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">&bull;</span>
                  <span>Spatial Resolution is <span className="text-white font-bold">{pixelSizeX && pixelSizeY ? `${pixelSizeX}m x ${pixelSizeY}m` : "N/A"}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">&bull;</span>
                  <span>Contains <span className="text-white font-bold">{metadata?.band_count || "N/A"}</span> spectral bands</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">&bull;</span>
                  <span>Geographic region: <span className="text-white font-bold uppercase">{location?.geographic_region || "Unknown"}</span> ({location?.state || "Unknown"})</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">&bull;</span>
                  <span>Temporal reference observations available: <span className={`${status?.temporal === "available" ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}`}>{status?.temporal === "available" ? "YES" : "NO"}</span></span>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 2: Environmental Context Profile */}
          <div className="border border-border bg-card/25 p-6 space-y-5 relative overflow-hidden rounded-sm">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[8px] text-primary tracking-widest uppercase">
              ENVIRONMENT // SPECIFICS
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
              <MapPin className="w-4 h-4 text-primary" />
              Environmental Context Profile
            </h2>

            {status?.context === "available" && context ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border/50 bg-background/30 p-3 space-y-1">
                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest flex items-center gap-0.5">
                      <Anchor className="w-3 h-3 text-primary" /> Terrain Type
                    </span>
                    <span className="font-bold text-foreground uppercase block text-[11px]">{context.terrain_type}</span>
                  </div>
                  <div className="border border-border/50 bg-background/30 p-3 space-y-1">
                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest flex items-center gap-0.5">
                      <TreePineIcon className="w-3 h-3 text-primary" /> Environment Nature
                    </span>
                    <span className="font-bold text-foreground uppercase block text-[11px]">{context.environment_type}</span>
                  </div>
                </div>

                <div className="border border-border/50 bg-background/30 p-3 space-y-2">
                  <span className="text-[8px] text-muted-foreground uppercase tracking-widest">REGIONAL SPECIFICS:</span>
                  <div className="grid grid-cols-1 gap-1.5 text-[10px] text-slate-300">
                    <div className="flex justify-between border-b border-border/10 pb-1">
                      <span>Dominant Landscape:</span>
                      <span className="font-bold text-slate-200 uppercase">{context.dominant_landscape}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/10 pb-1">
                      <span>Hydrological Context:</span>
                      <span className="font-bold text-slate-200 uppercase truncate max-w-[170px]" title={context.hydrology_context}>{context.hydrology_context}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agricultural Context:</span>
                      <span className="font-bold text-slate-200 uppercase">{context.agricultural_context}</span>
                    </div>
                  </div>
                </div>

                {/* Semicolon split characteristics items */}
                <div className="border border-border/50 bg-background/30 p-3 space-y-1.5">
                  <span className="text-[8px] text-muted-foreground uppercase tracking-widest block font-bold">Inferred Regional Characteristics</span>
                  <ul className="list-inside list-disc text-[10px] text-slate-300 space-y-1 pl-1">
                    {context.regional_characteristics.map((char, idx) => (
                      <li key={idx} className="uppercase">{char}</li>
                    ))}
                  </ul>
                </div>

                <div className="border border-primary/20 bg-primary/5 p-3 rounded-sm text-[9px] text-primary flex items-center space-x-2">
                  <Award className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold uppercase block">Explainability Basis</span>
                    <span className="text-slate-300">{context.inference_basis}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-amber-500/15 bg-amber-500/5 p-6 text-[11px] text-amber-500/90 text-center">
                Geomorphic terrain inference profiling pending location locked context.
              </div>
            )}
          </div>

          {/* D. Bottom row navigation actions */}
          {selectedDataset && (
            <div className="lg:col-span-2 flex justify-between pt-4">
              <button
                onClick={() => router.push(`/mission-control/geospatial?dataset=${selectedDataset.dataset_id}`)}
                className="px-5 py-2.5 border border-border bg-card/30 text-muted-foreground hover:text-white uppercase text-xs font-bold rounded-sm"
              >
                Back to Geospatial
              </button>
              
              <button
                onClick={() => router.push(`/mission-control/temporal?dataset=${selectedDataset.dataset_id}`)}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs flex items-center gap-2 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] rounded-sm"
              >
                <span>Temporal Intelligence</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      ) : null}
    </div>
  )
}

function TreePineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m17 14 3-3-3-3h1L12 2 9 8h1L7 11 10 14h-1L12 20 15 14z" />
      <path d="M12 22v-2" />
    </svg>
  )
}

export default function BriefingSubpage() {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-xs text-muted-foreground p-6 flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>LOADING BRIEFING CONSOLE MODULES...</span>
        </div>
      }
    >
      <BriefingSubpageDashboard />
    </Suspense>
  )
}
