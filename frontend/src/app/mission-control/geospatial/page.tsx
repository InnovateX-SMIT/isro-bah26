"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Dataset } from "@/lib/types/dataset"
import { MissionControlProfile } from "@/lib/types/mission-control"
import { getRegisteredDatasets } from "@/lib/dataset-api"
import { getMissionControlProfile } from "@/lib/mission-control-api"
import GeospatialMap from "@/components/geospatial/GeospatialMap"
import DatasetOverviewPanel from "@/components/mission-control/DatasetOverviewPanel"
import CoordinatePanel from "@/components/geospatial/CoordinatePanel"
import FootprintLayer from "@/components/geospatial/FootprintLayer"
import { Loader2, ArrowLeft, ArrowRight, Compass, Shield, MapPin, Database } from "lucide-react"

function GeospatialSubpageDashboard() {
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
    router.push(`/mission-control/geospatial?dataset=${dataset.dataset_id}`)
  }

  const { metadata, geospatial, location, status } = profile || {}

  const areaSqKm = metadata && metadata.raster_width && metadata.raster_height && metadata.pixel_size_x && metadata.pixel_size_y
    ? (metadata.raster_width * Math.abs(metadata.pixel_size_x) * metadata.raster_height * Math.abs(metadata.pixel_size_y)) / 1000000.0
    : undefined

  const centroid = geospatial && geospatial.center
    ? { lat: geospatial.center.lat, lon: geospatial.center.lon }
    : undefined

  const bbox = geospatial
    ? {
        min_lat: geospatial.bounds.south,
        min_lon: geospatial.bounds.west,
        max_lat: geospatial.bounds.north,
        max_lon: geospatial.bounds.east
      }
    : undefined

  return (
    <div className="space-y-6 font-mono text-slate-100 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/mission-control")}
            className="inline-flex items-center space-x-1 text-xs text-primary hover:underline uppercase text-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Mission Control</span>
          </button>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
            <Compass className="w-5.5 h-5.5 text-primary" />
            GEOSPATIAL INTELLIGENCE CONSOLE
          </h1>
          {selectedDataset && (
            <p className="text-xs text-slate-300 uppercase tracking-widest text-[10px]">
              NODE: <span className="text-white font-bold select-all">{selectedDataset.dataset_name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase text-[10px]">GEOSPATIAL LAYER: LOCKED</span>
        </div>
      </div>

      {/* Dataset registry bar selector */}
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
          <span className="font-bold uppercase tracking-wider block">TELEMETRY LINK FAILURE</span>
          <span className="text-[10px] text-muted-foreground">{error}</span>
        </div>
      )}

      {loadingProfile || loadingDatasets ? (
        <div className="border border-border bg-card/15 min-h-[450px] flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest animate-pulse">Aggregating Satellite Intelligence...</h4>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          
          {/* A. Large full-width map with fullscreen expansion */}
          <div className="h-[500px] relative border border-border bg-black/40 rounded-sm overflow-hidden">
            <GeospatialMap
              context={geospatial || null}
              loading={false}
              error={null}
            />
          </div>

          {/* B. Below map: 2-column row - Image Metadata Telemetry | Footprint Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DatasetOverviewPanel metadata={metadata || null} status={status?.metadata || "missing"} />
            
            <FootprintLayer
              footprintCoords={geospatial?.footprint}
              areaSqKm={areaSqKm}
              centroid={centroid}
              bbox={bbox}
            />
          </div>

          {/* C. Next row: Coordinate Intelligence | Location Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CoordinatePanel
              lat={geospatial?.center.lat}
              lon={geospatial?.center.lon}
              crs={geospatial?.crs || metadata?.coordinate_system || undefined}
              projection={geospatial?.projection || metadata?.projection_name || undefined}
              areaSqKm={areaSqKm}
            />

            {/* Location administrative lock panel */}
            <div className="border border-border bg-card/25 p-4 space-y-4 relative overflow-hidden rounded-sm flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                GEOCODE // LOCK
              </div>
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Administrative Geocoding Lock
                </h2>

                {status?.location === "available" && location ? (
                  <div className="space-y-2 text-[10px] text-slate-300">
                    <div className="border border-border/50 bg-background/30 p-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground uppercase tracking-widest text-[8px]">COUNTRY ORIGIN:</span>
                      <span className="font-bold text-foreground uppercase">{location.country}</span>
                    </div>
                    <div className="border border-border/50 bg-background/30 p-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground uppercase tracking-widest text-[8px]">PROVINCE / STATE:</span>
                      <span className="font-bold text-foreground uppercase">{location.state}</span>
                    </div>
                    <div className="border border-border/50 bg-background/30 p-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground uppercase tracking-widest text-[8px]">DISTRICT LOCK:</span>
                      <span className="font-bold text-foreground uppercase">{location.district}</span>
                    </div>
                    <div className="border border-border/50 bg-background/30 p-2.5 flex flex-col space-y-1">
                      <span className="text-muted-foreground uppercase tracking-widest text-[8px]">LOCATION SUMMARY:</span>
                      <p className="font-bold text-foreground uppercase whitespace-pre-line text-[9px] leading-relaxed bg-black/20 p-2 border border-border/30">
                        {location.location_summary}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-amber-500/15 bg-amber-500/5 p-4 text-[10px] text-amber-500/90 text-center">
                    Administrative boundary locks pending coordinate resolution.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* D. Bottom: Mission Briefing button linking to Subpage B */}
          {selectedDataset && (
            <div className="flex justify-end pt-4">
              <button
                onClick={() => router.push(`/mission-control/briefing?dataset=${selectedDataset.dataset_id}`)}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs flex items-center gap-2 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] rounded-sm"
              >
                <span>Mission Briefing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      ) : null}
    </div>
  )
}

export default function GeospatialSubpage() {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-xs text-muted-foreground p-6 flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>LOADING GEOSPATIAL INTELLIGENCE RADAR...</span>
        </div>
      }
    >
      <GeospatialSubpageDashboard />
    </Suspense>
  )
}
