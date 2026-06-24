"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getGeospatialContext } from "@/lib/geospatial-api"
import { getDatasetLocationContext } from "@/lib/location-api"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { GeospatialContext } from "@/lib/types/geospatial"
import { LocationContext } from "@/lib/types/location"
import GeospatialMap from "@/components/geospatial/GeospatialMap"
import DatasetInfoPanel from "@/components/geospatial/DatasetInfoPanel"
import CoordinatePanel from "@/components/geospatial/CoordinatePanel"
import { ArrowLeft, Loader2, Compass, MapPin, Grid, AlertTriangle } from "lucide-react"

export default function GeospatialWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  // State
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [context, setContext] = useState<GeospatialContext | null>(null)
  const [location, setLocation] = useState<LocationContext | null>(null)

  // Loading states
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspaceData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch dataset info
      const ds = await getDataset(datasetId)
      setDataset(ds)

      // Fetch metadata
      try {
        const meta = await getDatasetMetadata(datasetId)
        setMetadata(meta)
      } catch (err) {
        console.warn("Metadata not computed yet", err)
      }

      // Fetch geospatial context (bounds and footprint)
      const geo = await getGeospatialContext(datasetId)
      setContext(geo)

      // Fetch location administrative details
      try {
        const loc = await getDatasetLocationContext(datasetId)
        setLocation(loc)
      } catch (err) {
        console.warn("Location context not computed yet", err)
      }

    } catch (err: any) {
      console.error(err)
      setError("Failed to consolidate workspace telemetry records.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadWorkspaceData()
    }
  }, [datasetId])

  const areaSqKm = metadata && metadata.raster_width && metadata.raster_height && metadata.pixel_size_x && metadata.pixel_size_y
    ? (metadata.raster_width * Math.abs(metadata.pixel_size_x) * metadata.raster_height * Math.abs(metadata.pixel_size_y)) / 1000000.0
    : undefined

  return (
    <div className="space-y-6 font-mono text-slate-100 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/geospatial")}
            className="inline-flex items-center space-x-1 text-xs text-primary hover:underline uppercase text-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Radar Selection</span>
          </button>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            GEOSPATIAL COMMAND WORKSPACE
          </h1>
          {dataset && (
            <p className="text-xs text-slate-300 uppercase tracking-widest text-[10px]">
              LOCKED TARGET: <span className="text-white font-bold select-all">{dataset.dataset_name}</span> &middot; {dataset.dataset_path}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase text-[10px]">WORKSPACE: ONLINE</span>
        </div>
      </div>

      {loading ? (
        <div className="border border-border bg-card/15 min-h-[450px] flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="space-y-1 text-center">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest animate-pulse">Consolidating GIS Workspace...</h4>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Mapping coordinates grids and fetching geocoding boundaries</p>
          </div>
        </div>
      ) : error ? (
        <div className="border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive flex flex-col items-center justify-center space-y-3">
          <AlertTriangle className="w-10 h-10" />
          <div>
            <h4 className="font-bold uppercase tracking-wider">Workspace Integration Failure</h4>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          {/* Left Columns: Map and Administrative Telemetry */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Massive Map container */}
            <div className="h-[600px] relative border border-border rounded-sm overflow-hidden bg-black/45">
              <GeospatialMap
                context={context}
                loading={false}
                error={null}
              />
            </div>

            {/* Below Map: Country / State / District / Admin Region / Zone Row */}
            <div className="space-y-2">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">// ADMINISTRATIVE BOUNDARIES LIMITS</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-[10px]">
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase">Country</div>
                  <div className="text-xs font-bold text-foreground mt-1 uppercase">{location?.country || "UNKNOWN"}</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase">State / Province</div>
                  <div className="text-xs font-bold text-foreground mt-1 uppercase">{location?.state || "UNKNOWN"}</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase">District Lock</div>
                  <div className="text-xs font-bold text-foreground mt-1 uppercase">{location?.district || "UNKNOWN"}</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase">Admin Region</div>
                  <div className="text-xs font-bold text-foreground mt-1 uppercase">{location?.administrative_region || "UNKNOWN"}</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Geographic Zone</div>
                  <div className="text-xs font-bold text-cyan-400 mt-1 uppercase">{location?.geographic_region || "UNKNOWN"}</div>
                </div>
              </div>
            </div>

            {/* Location Summary Report */}
            {location && (
              <div className="border border-border bg-card/25 p-4 space-y-2 relative overflow-hidden rounded-sm">
                <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                  REPORT // GEOGRAPHIC
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  Location Summary Report
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-line bg-black/30 border border-border/40 p-3 select-text">
                  {location.location_summary}
                </p>
              </div>
            )}

            {/* Footprint Vertex Nodes */}
            {context && context.footprint && context.footprint.length > 0 && (
              <div className="border border-border bg-card/25 p-4 space-y-3 relative overflow-hidden rounded-sm">
                <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
                  COORDINATES // VERTICES
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-primary" />
                  Footprint Vertex Nodes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[10px] text-muted-foreground max-h-[180px] overflow-y-auto pr-1">
                  {context.footprint.map((node, i) => (
                    <div key={i} className="border border-border/40 bg-background/50 p-2 flex justify-between select-all">
                      <span>Node #{String(i + 1).padStart(2, "0")}:</span>
                      <span className="font-bold text-slate-200">[{node[0].toFixed(5)}&deg; E, {node[1].toFixed(5)}&deg; N]</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Spec Panels stacked */}
          <div className="xl:col-span-1 space-y-6">
            <DatasetInfoPanel
              dataset={dataset}
              metadata={metadata}
              context={context}
              loading={false}
            />

            <CoordinatePanel
              lat={context?.center.lat}
              lon={context?.center.lon}
              crs={context?.crs || metadata?.coordinate_system || undefined}
              projection={context?.projection || metadata?.projection_name || undefined}
              areaSqKm={areaSqKm}
            />
          </div>
        </div>
      )}
    </div>
  )
}
