"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  FileText,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Info,
  Layers,
  Globe,
  HardDrive
} from "lucide-react"

import { getDataset } from "@/lib/dataset-api"
import { getDatasetMetadata } from "@/lib/dataset-metadata-api"
import { getDatasetInspection, getDatasetInspectionFiles } from "@/lib/dataset-inspection-api"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { DatasetInspection, DatasetFile } from "@/lib/types/dataset-inspection"

import ViewerBreadcrumb from "@/components/ViewerBreadcrumb"
import ViewerSidebar from "@/components/ViewerSidebar"

type ActiveTabType = "acquisition" | "projection" | "raster" | "files"

export default function MetadataViewerPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [inspection, setInspection] = useState<DatasetInspection | null>(null)
  const [files, setFiles] = useState<DatasetFile[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTabType>("acquisition")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const ds = await getDataset(datasetId)
        setDataset(ds)

        try {
          const meta = await getDatasetMetadata(datasetId)
          setMetadata(meta)
        } catch (err) {
          console.log("No metadata extracted yet")
        }

        try {
          const inspectData = await getDatasetInspection(datasetId)
          setInspection(inspectData)
          if (inspectData && inspectData.inspection_status === "COMPLETED") {
            const fileList = await getDatasetInspectionFiles(datasetId)
            setFiles(fileList)
          }
        } catch (err) {
          console.log("No inspection data found")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Failed to load dataset metadata.")
      } finally {
        setLoading(false)
      }
    }
    if (datasetId) {
      loadData()
    }
  }, [datasetId])

  const formatSizeBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs uppercase text-muted-foreground tracking-widest">
          Parsing Telemetry Header Dictionaries...
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
            Metadata registry link failure
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {error || "Telemetry for the requested dataset is unavailable."}
        </p>
        <button
          onClick={() => router.push(`/datasets/${datasetId}/viewer`)}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border uppercase tracking-widest text-[10px] font-bold"
        >
          Back to Overview Hub
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden border border-border bg-card/15 rounded-sm glow-cyan-sm font-mono text-slate-100">
      
      {/* Central Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
        
        {/* Navigation Toolbar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/datasets/${datasetId}/viewer`)}
              className="inline-flex items-center space-x-1.5 text-[9px] text-primary hover:underline uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview Hub</span>
            </button>
            <ViewerBreadcrumb
              datasetName={dataset.dataset_name}
              datasetId={datasetId}
              items={[
                { label: "Original Dataset Viewer", href: `/datasets/${datasetId}/viewer` },
                { label: "Metadata Registry" }
              ]}
            />
            <h1 className="text-md font-bold uppercase text-foreground flex items-center gap-1.5 mt-1">
              <FileText className="w-4.5 h-4.5 text-primary" />
              Comprehensive Metadata Registry
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-muted-foreground uppercase text-[9px] tracking-wider">
              REGISTRY: VERIFIED
            </span>
          </div>
        </div>

        {/* Logical tab switcher */}
        <div className="flex border-b border-border bg-muted/10 p-1 rounded-sm text-[10px] uppercase font-bold tracking-wider">
          <button
            onClick={() => setActiveTab("acquisition")}
            className={`flex-1 py-2 text-center transition-colors rounded-sm cursor-pointer ${activeTab === "acquisition" ? "bg-primary text-background" : "text-muted-foreground hover:bg-muted"}`}
          >
            Acquisition Details
          </button>
          <button
            onClick={() => setActiveTab("projection")}
            className={`flex-1 py-2 text-center transition-colors rounded-sm cursor-pointer ${activeTab === "projection" ? "bg-primary text-background" : "text-muted-foreground hover:bg-muted"}`}
          >
            Spatial & Projection
          </button>
          <button
            onClick={() => setActiveTab("raster")}
            className={`flex-1 py-2 text-center transition-colors rounded-sm cursor-pointer ${activeTab === "raster" ? "bg-primary text-background" : "text-muted-foreground hover:bg-muted"}`}
          >
            Raster Properties
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 py-2 text-center transition-colors rounded-sm cursor-pointer ${activeTab === "files" ? "bg-primary text-background" : "text-muted-foreground hover:bg-muted"}`}
          >
            File Inventory ({files.length})
          </button>
        </div>

        {/* Tab content panel */}
        <div className="border border-border bg-card/25 p-5 min-h-[300px] rounded-sm space-y-4">
          
          {/* TAB 1: Acquisition details */}
          {activeTab === "acquisition" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5 border-b border-border pb-2">
                <Info className="w-4 h-4 text-primary" />
                Orbital Mission Ingest & Capture
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Dataset Name</span>
                  <span className="text-foreground text-sm font-black">{dataset.dataset_name}</span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Sensor Type</span>
                  <span className="text-foreground text-sm font-black">LISS-IV Multi-Spectral</span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Acquisition Date</span>
                  <span className="text-pink-400 text-sm font-black">{metadata?.acquisition_date || "Unknown"}</span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Physical Ingestion Path</span>
                  <span className="text-slate-300 text-[10px] break-all select-all font-mono">{dataset.dataset_path}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Spatial and projection CRS */}
          {activeTab === "projection" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5 border-b border-border pb-2">
                <Globe className="w-4 h-4 text-primary" />
                Geospatial Projections & Datums
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Coordinate System (CRS)</span>
                  <span className="text-foreground text-xs font-bold break-words">{metadata?.coordinate_system || "N/A"}</span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Projection Name</span>
                  <span className="text-foreground text-xs font-bold">{metadata?.projection_name || "N/A"}</span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">EPSG Code</span>
                  <span className="text-cyan-400 text-sm font-black">EPSG:{metadata?.epsg_code || "N/A"}</span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">UTM Hemisphere & Zone</span>
                  <span className="text-foreground text-sm font-black">{metadata?.utm_zone || "N/A"}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Raster details */}
          {activeTab === "raster" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5 border-b border-border pb-2">
                <Layers className="w-4 h-4 text-primary" />
                Raster Band Spec & Pixel Densities
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Raster Dimensions (X / Y)</span>
                  <span className="text-foreground text-sm font-black">
                    {metadata?.raster_width} columns x {metadata?.raster_height} scan lines
                  </span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Spatial Resolution (Pixel Pitch)</span>
                  <span className="text-amber-500 text-sm font-black">
                    {metadata && metadata.pixel_size_x !== null && metadata.pixel_size_y !== null
                      ? `${Math.abs(metadata.pixel_size_x).toFixed(4)}m x ${Math.abs(metadata.pixel_size_y).toFixed(4)}m`
                      : "N/A"}
                  </span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Upper Left Corner origin (Easting / Northing)</span>
                  <span className="text-foreground text-xs font-mono block">X: {metadata?.origin_x?.toFixed(6) ?? "N/A"}</span>
                  <span className="text-foreground text-xs font-mono block">Y: {metadata?.origin_y?.toFixed(6) ?? "N/A"}</span>
                </div>
                <div className="space-y-1 bg-background/30 p-3 border border-border/40 rounded-sm">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold block">Ingested Band Count</span>
                  <span className="text-foreground text-sm font-black">{metadata?.band_count || "N/A"} spectral bands</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Files Inventory */}
          {activeTab === "files" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5 border-b border-border pb-2">
                <HardDrive className="w-4 h-4 text-primary" />
                Physical Workspace Files Index
              </h3>

              {files.length === 0 ? (
                <div className="text-center p-8 text-xs text-muted-foreground border border-dashed border-border rounded-sm">
                  No files indexed for this dataset node. Run scan first.
                </div>
              ) : (
                <div className="border border-border bg-background/20 rounded-sm overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase tracking-widest text-[9px] sticky top-0 bg-background/95 backdrop-blur z-10">
                          <th className="p-3 font-bold">File Name</th>
                          <th className="p-3 font-bold">Category</th>
                          <th className="p-3 font-bold">Path relative to workspace</th>
                          <th className="p-3 font-bold text-right">Size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-slate-300">
                        {files.map((file) => (
                          <tr key={file.file_id} className="hover:bg-muted/5 transition-colors">
                            <td className="p-3 font-bold text-foreground truncate max-w-[150px]" title={file.file_name}>
                              {file.file_name}
                            </td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 border text-[8px] font-bold uppercase ${
                                file.file_category === "TIF" ? "border-cyan-500/20 text-cyan-400 bg-cyan-500/5" :
                                file.file_category === "XML" ? "border-amber-500/20 text-amber-500 bg-amber-500/5" :
                                file.file_category === "TXT" ? "border-foreground/20 text-foreground bg-muted/10" :
                                "border-border text-muted-foreground bg-muted/5"
                              }`}>
                                {file.file_category}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-[200px]" title={file.relative_path}>
                              {file.relative_path}
                            </td>
                            <td className="p-3 text-right font-mono text-muted-foreground">{formatSizeBytes(file.file_size_bytes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Sidebar Panel */}
      <ViewerSidebar
        dataset={dataset}
        metadata={metadata}
        mode="dataset"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
    </div>
  )
}
