"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileCode2,
  ArrowLeft,
  Eye,
  Info,
  Calendar,
  Layers
} from "lucide-react"
import { getDataset } from "@/lib/dataset-api"
import {
  runDatasetInspection,
  getDatasetInspection,
  getDatasetInspectionFiles
} from "@/lib/dataset-inspection-api"
import {
  runDatasetMetadata,
  getDatasetMetadata
} from "@/lib/dataset-metadata-api"
import {
  runDatasetPreview,
  getDatasetPreview,
  getDatasetPreviewImageUrl,
  getDatasetPreviewThumbnailUrl
} from "@/lib/dataset-preview-api"
import { Dataset } from "@/lib/types/dataset"
import { DatasetInspection, DatasetFile } from "@/lib/types/dataset-inspection"
import { DatasetMetadata as MetadataType } from "@/lib/types/dataset-metadata"
import { DatasetPreview as PreviewType } from "@/lib/types/dataset-preview"

export default function DatasetInspectionPage() {
  const params = useParams()
  const router = useRouter()
  const datasetId = params.dataset_id as string

  // State
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [inspection, setInspection] = useState<DatasetInspection | null>(null)
  const [files, setFiles] = useState<DatasetFile[]>([])
  const [metadata, setMetadata] = useState<MetadataType | null>(null)
  const [preview, setPreview] = useState<PreviewType | null>(null)

  // Loading states
  const [loadingDataset, setLoadingDataset] = useState<boolean>(true)
  const [loadingInspection, setLoadingInspection] = useState<boolean>(true)
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false)
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(true)
  const [loadingPreview, setLoadingPreview] = useState<boolean>(true)

  // Action running states
  const [runningInspection, setRunningInspection] = useState<boolean>(false)
  const [runningMetadata, setRunningMetadata] = useState<boolean>(false)
  const [runningPreview, setRunningPreview] = useState<boolean>(false)

  // UI Control states
  const [previewZoom, setPreviewZoom] = useState<number>(1)
  const [showMetadataModal, setShowMetadataModal] = useState<boolean>(false)
  const [showFullPreviewModal, setShowFullPreviewModal] = useState<boolean>(false)

  // Feedback banners
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const triggerSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => {
      setSuccess((prev) => (prev === msg ? null : prev))
    }, 4000)
  }

  // Load essential dataset record
  const loadDatasetRecord = async () => {
    setLoadingDataset(true)
    try {
      const ds = await getDataset(datasetId)
      setDataset(ds)
    } catch (err: any) {
      console.error(err)
      setError("Failed to locate dataset record in database.")
    } finally {
      setLoadingDataset(false)
    }
  }

  // Load Inspection Data
  const loadInspectionData = async () => {
    setLoadingInspection(true)
    try {
      const inspectData = await getDatasetInspection(datasetId)
      setInspection(inspectData)
      if (inspectData && inspectData.inspection_status === "COMPLETED") {
        setLoadingFiles(true)
        const fileList = await getDatasetInspectionFiles(datasetId)
        setFiles(fileList)
      }
    } catch (err: any) {
      if (err.message && err.message.includes("404")) {
        setInspection(null)
      } else {
        console.error(err)
        setError("Error loading dataset inspection summary.")
      }
    } finally {
      setLoadingInspection(false)
      setLoadingFiles(false)
    }
  }

  // Load Metadata record
  const loadMetadata = async () => {
    setLoadingMetadata(true)
    try {
      const meta = await getDatasetMetadata(datasetId)
      setMetadata(meta)
    } catch (err: any) {
      if (err.message && err.message.includes("404")) {
        setMetadata(null)
      } else {
        console.error(err)
      }
    } finally {
      setLoadingMetadata(false)
    }
  }

  // Load Preview record
  const loadPreview = async () => {
    setLoadingPreview(true)
    try {
      const prevData = await getDatasetPreview(datasetId)
      setPreview(prevData)
    } catch (err: any) {
      if (err.message && err.message.includes("404")) {
        setPreview(null)
      } else {
        console.error(err)
      }
    } finally {
      setLoadingPreview(false)
    }
  }

  useEffect(() => {
    if (datasetId) {
      loadDatasetRecord()
      loadInspectionData()
      loadMetadata()
      loadPreview()
    }
  }, [datasetId])

  // Trigger Scanner
  const handleRunInspection = async () => {
    setRunningInspection(true)
    setError(null)
    setInspection(null)
    setFiles([])
    try {
      const res = await runDatasetInspection(datasetId)
      setInspection(res)
      triggerSuccess("Filesystem scan completed successfully.")
      if (res.inspection_status === "COMPLETED") {
        setLoadingFiles(true)
        const fileList = await getDatasetInspectionFiles(datasetId)
        setFiles(fileList)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Filesystem scanning failed. Verify raw image pathway.")
    } finally {
      setRunningInspection(false)
      setLoadingFiles(false)
    }
  }

  // Trigger Metadata extraction
  const handleRunMetadata = async () => {
    setRunningMetadata(true)
    setError(null)
    setMetadata(null)
    try {
      const res = await runDatasetMetadata(datasetId)
      setMetadata(res)
      triggerSuccess("Metadata intelligence extraction completed.")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Metadata extraction failed.")
    } finally {
      setRunningMetadata(false)
    }
  }

  // Trigger Preview compilation
  const handleRunPreview = async () => {
    setRunningPreview(true)
    setError(null)
    setPreview(null)
    setPreviewZoom(1)
    try {
      const res = await runDatasetPreview(datasetId)
      setPreview(res)
      triggerSuccess("Visual preview stack rendered.")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to render visual preview stack.")
    } finally {
      setRunningPreview(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="space-y-6 font-mono pb-12 text-slate-100">
      {/* Upper Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/datasets")}
            className="inline-flex items-center space-x-1 text-xs text-primary hover:underline uppercase text-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Inventory Registry</span>
          </button>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-primary" />
            DATASET INSPECTION COMMAND
          </h1>
          {dataset && (
            <p className="text-xs text-slate-300 uppercase tracking-widest text-[10px]">
              LOCKED NODE: <span className="text-white font-bold select-all">{dataset.dataset_name}</span> &middot; {dataset.dataset_path}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          {loadingDataset ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-muted-foreground uppercase text-[10px]">LOADING SENSOR SPEC...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-muted-foreground uppercase text-[10px]">INSPECTOR: LOCKED</span>
            </>
          )}
        </div>
      </div>

      {/* Notifications Banners */}
      {success && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-400 text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(16,185,129,0.3)]">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-[10px] uppercase hover:underline opacity-80 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(239,68,68,0.3)]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[10px] uppercase hover:underline opacity-80 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Layout */}
      <div className="space-y-6">
        
        {/* Step 1: Run Inspection Card */}
        <div className="border border-border bg-card/20 p-5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            STEP 01 // FILESYSTEM SCAN
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">1. Filesystem Inspection</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Scan workspace directories to verify physical GeoTIFF files and operational auxiliary reports.
              </p>
            </div>
            <button
              disabled={runningInspection || loadingInspection}
              onClick={handleRunInspection}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shrink-0"
            >
              {runningInspection ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  RUNNING SCAN...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  RUN INSPECTION
                </>
              )}
            </button>
          </div>

          {/* Inspection results container */}
          {loadingInspection ? (
            <div className="flex items-center justify-center p-8 space-x-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>FETCHING FILE PROFILE FROM SYSTEM DATABASE...</span>
            </div>
          ) : !inspection ? (
            <div className="border border-dashed border-border bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-2 min-h-[120px]">
              <AlertTriangle className="w-5 h-5 text-amber-500/60 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">No Inspection Profile Found</h4>
                <p className="text-[10px] text-muted-foreground max-w-sm mt-0.5 leading-normal">
                  This dataset workspace has not been scanned. Run inspection scanner to index TIFF files.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Metric strip */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                  Scan Inventory Summary
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
                  <div className="border border-border bg-card/40 p-2.5">
                    <div className="text-[8px] text-muted-foreground uppercase">Status</div>
                    <div className="text-xs font-black text-primary mt-1">{inspection.inspection_status}</div>
                  </div>
                  <div className="border border-border bg-card/40 p-2.5">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold">Total Files</div>
                    <div className="text-xs font-black text-foreground mt-1">{inspection.total_files}</div>
                  </div>
                  <div className="border border-border bg-card/40 p-2.5">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold">TIF (Bands)</div>
                    <div className="text-xs font-black text-cyan-400 mt-1">{inspection.total_tif_files}</div>
                  </div>
                  <div className="border border-border bg-card/40 p-2.5">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold">TXT (Report)</div>
                    <div className="text-xs font-black text-foreground mt-1">{inspection.total_txt_files}</div>
                  </div>
                  <div className="border border-border bg-card/40 p-2.5">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold">XML (Aux)</div>
                    <div className="text-xs font-black text-amber-500 mt-1">{inspection.total_xml_files}</div>
                  </div>
                  <div className="border border-border bg-card/40 p-2.5">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold">META (Profile)</div>
                    <div className="text-xs font-black text-pink-500 mt-1">{inspection.total_meta_files}</div>
                  </div>
                  <div className="border border-border bg-card/40 p-2.5">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold">JPG (Preview)</div>
                    <div className="text-xs font-black text-emerald-400 mt-1">{inspection.total_jpg_files}</div>
                  </div>
                  <div className="border border-border bg-card/40 p-2.5">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold">Scan Date</div>
                    <div className="text-[9px] font-black text-muted-foreground mt-1 truncate" title={new Date(inspection.updated_at).toLocaleString()}>
                      {new Date(inspection.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Discovered files index list */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                  Detailed Discovered File Inventory
                </div>
                {loadingFiles ? (
                  <div className="flex items-center space-x-2 text-[10px] text-muted-foreground p-4 bg-muted/10 border border-border border-dashed">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>FETCHING FILE INVENTORY...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-[10px] text-muted-foreground p-3 border border-border border-dashed italic">
                    No files indexed on disc workspace.
                  </div>
                ) : (
                  <div className="border border-border bg-card/15 overflow-hidden">
                    <div className="overflow-x-auto max-h-[180px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase tracking-widest text-[9px] sticky top-0 bg-background/95 backdrop-blur z-10">
                            <th className="p-3 font-bold">File Name</th>
                            <th className="p-3 font-bold">Ext</th>
                            <th className="p-3 font-bold">Category</th>
                            <th className="p-3 font-bold">Relative Path</th>
                            <th className="p-3 font-bold text-right">Size</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 text-slate-300">
                          {files.map((file) => (
                            <tr key={file.file_id} className="hover:bg-muted/5 transition-colors">
                              <td className="p-3 font-bold text-foreground truncate max-w-[150px]" title={file.file_name}>
                                {file.file_name}
                              </td>
                              <td className="p-3 text-muted-foreground">{file.file_extension}</td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 border text-[8px] font-bold tracking-wider uppercase ${
                                  file.file_category === "TIF"
                                    ? "border-cyan-500/20 text-cyan-400 bg-cyan-500/5"
                                    : file.file_category === "XML"
                                    ? "border-amber-500/20 text-amber-500 bg-amber-500/5"
                                    : file.file_category === "TXT"
                                    ? "border-foreground/20 text-foreground bg-muted/10"
                                    : file.file_category === "META"
                                    ? "border-pink-500/20 text-pink-400 bg-pink-500/5"
                                    : file.file_category === "JPG"
                                    ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                                    : "border-border text-muted-foreground bg-muted/5"
                                }`}>
                                  {file.file_category}
                                </span>
                              </td>
                              <td className="p-3 text-muted-foreground truncate max-w-[220px]" title={file.relative_path}>
                                {file.relative_path}
                              </td>
                              <td className="p-3 text-right text-muted-foreground">{formatSize(file.file_size_bytes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Metadata extraction & properties modal */}
        <div className="border border-border bg-card/20 p-5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            STEP 02 // METADATA ATTRIBUTES
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">2. Metadata Intelligence</h2>
              {metadata && (
                <span className={`px-1.5 py-0.5 border text-[8px] font-bold tracking-widest uppercase ${
                  metadata.metadata_status === "COMPLETED"
                    ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                    : metadata.metadata_status === "EXTRACTING"
                    ? "border-amber-500/20 text-amber-500 bg-amber-500/5 animate-pulse"
                    : "border-red-500/20 text-red-400 bg-red-500/5"
                }`}>
                  {metadata.metadata_status}
                </span>
              )}
            </div>
            <button
              disabled={runningMetadata || loadingMetadata}
              onClick={handleRunMetadata}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 hover:border-primary transition-all font-bold tracking-widest uppercase text-[9px] flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {runningMetadata ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  EXTRACTING...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  {metadata ? "RE-RUN EXTRACTION" : "RUN EXTRACTION"}
                </>
              )}
            </button>
          </div>

          {loadingMetadata ? (
            <div className="flex items-center justify-center p-6 space-x-2 text-[10px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>FETCHING METADATA TELEMETRY FROM PLATFORM ENGINE...</span>
            </div>
          ) : !metadata ? (
            <div className="border border-dashed border-border bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-2 min-h-[120px]">
              <Info className="w-5 h-5 text-muted-foreground/50" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">No Metadata Extracted</h4>
                <p className="text-[10px] text-muted-foreground max-w-sm mt-0.5 leading-normal">
                  The geospatial metadata intelligence profile is missing. Run the extraction engine to analyze TIFF tags.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Properties Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10px]">
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">CRS</div>
                  <div className="text-xs font-bold text-foreground mt-1 truncate" title={metadata.coordinate_system || "N/A"}>
                    {metadata.coordinate_system || "N/A"}
                  </div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Projection</div>
                  <div className="text-xs font-bold text-foreground mt-1 truncate" title={metadata.projection_name || "N/A"}>
                    {metadata.projection_name || "N/A"}
                  </div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">EPSG Code</div>
                  <div className="text-xs font-bold text-cyan-400 mt-1">{metadata.epsg_code || "N/A"}</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">UTM Zone</div>
                  <div className="text-xs font-bold text-foreground mt-1">{metadata.utm_zone || "N/A"}</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Spectral Bands</div>
                  <div className="text-xs font-bold text-foreground mt-1">{metadata.band_count || "N/A"}</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Raster Size</div>
                  <div className="text-xs font-bold text-foreground mt-1 truncate">
                    {metadata.raster_width && metadata.raster_height
                      ? `${metadata.raster_width} x ${metadata.raster_height}`
                      : "N/A"}
                  </div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Pixel Resolution</div>
                  <div className="text-xs font-bold text-amber-500 mt-1 truncate">
                    {metadata.pixel_size_x && metadata.pixel_size_y
                      ? `${Math.abs(metadata.pixel_size_x).toFixed(2)}m x ${Math.abs(metadata.pixel_size_y).toFixed(2)}m`
                      : "N/A"}
                  </div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Acquisition Date</div>
                  <div className="text-xs font-bold text-pink-500 mt-1 truncate" title={metadata.acquisition_date || "N/A"}>
                    {metadata.acquisition_date || "N/A"}
                  </div>
                </div>
              </div>

              {/* View Properties Modal Trigger */}
              <div className="flex justify-start">
                <button
                  onClick={() => setShowMetadataModal(true)}
                  className="px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs uppercase font-bold tracking-widest transition-all rounded-sm flex items-center gap-1.5 shadow-[0_0_12px_-4px_rgba(6,182,212,0.3)]"
                >
                  <Eye className="w-4 h-4" />
                  View Metadata Details
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Dataset visual preview */}
        <div className="border border-border bg-card/20 p-5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            STEP 03 // VISUAL SCAN
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">3. Dataset Visual Preview</h2>
              {preview && (
                <span className={`px-1.5 py-0.5 border text-[8px] font-bold tracking-widest uppercase ${
                  preview.preview_status === "COMPLETED"
                    ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                    : preview.preview_status === "GENERATING"
                    ? "border-amber-500/20 text-amber-500 bg-amber-500/5 animate-pulse"
                    : "border-red-500/20 text-red-400 bg-red-500/5"
                }`}>
                  {preview.preview_status}
                </span>
              )}
            </div>
            <button
              disabled={runningPreview || loadingPreview}
              onClick={handleRunPreview}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 hover:border-primary transition-all font-bold tracking-widest uppercase text-[9px] flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {runningPreview ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  GENERATING...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  {preview ? "RE-GENERATE PREVIEW" : "GENERATE PREVIEW"}
                </>
              )}
            </button>
          </div>

          {loadingPreview ? (
            <div className="flex items-center justify-center p-6 space-x-2 text-[10px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>FETCHING PREVIEW IMAGES FROM TELEMETRY DEPOT...</span>
            </div>
          ) : !preview ? (
            <div className="border border-dashed border-border bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-2 min-h-[120px]">
              <Info className="w-5 h-5 text-muted-foreground/50" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">No Preview Available</h4>
                <p className="text-[10px] text-muted-foreground max-w-sm mt-0.5 leading-normal">
                  Click generate preview to assemble spectral bands into RGB composited raster maps.
                </p>
              </div>
            </div>
          ) : preview.preview_status !== "COMPLETED" ? (
            <div className="border border-border bg-card/10 p-6 text-center text-xs text-muted-foreground">
              {preview.preview_status === "GENERATING" ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary animate-pulse" />
                  <span>GENERATING DECI-RESOLUTION PREVIEWS (RGB STACK)...</span>
                </div>
              ) : (
                <div className="text-red-400 uppercase font-bold flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Preview Generation Failed. Check directory write access.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10px]">
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase">Resolution</div>
                  <div className="text-xs font-bold text-foreground mt-1">{preview.preview_width} x {preview.preview_height}</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Stacked Bands</div>
                  <div className="text-xs font-bold text-foreground mt-1">{preview.band_count} (RGB Output)</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Compute Latency</div>
                  <div className="text-xs font-bold text-cyan-400 mt-1">{preview.generation_time_ms} ms</div>
                </div>
                <div className="border border-border bg-card/30 p-2.5">
                  <div className="text-[8px] text-muted-foreground uppercase font-bold">Action Control</div>
                  <button
                    onClick={() => setShowFullPreviewModal(true)}
                    className="text-[9px] uppercase hover:underline text-primary font-bold mt-1.5 block mx-auto flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    Open Full Preview
                  </button>
                </div>
              </div>

              {/* Massive Preview display */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Left Thumbnail panel */}
                <div className="md:col-span-1 border border-border bg-card/30 p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-[9px] text-muted-foreground uppercase font-bold">Quick Thumbnail</div>
                    <div className="border border-border/80 bg-background/50 flex items-center justify-center p-2 min-h-[140px] rounded-sm">
                      {dataset && (
                        <img
                          src={getDatasetPreviewThumbnailUrl(datasetId)}
                          alt="Thumbnail"
                          className="max-h-[130px] max-w-full object-contain border border-border"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <div className="text-[9px] text-muted-foreground uppercase font-bold">Scale Tuning</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setPreviewZoom(Math.max(1, previewZoom - 0.5))}
                        className="px-2 py-1 bg-muted hover:bg-muted/70 border border-border text-[9px] font-bold"
                        disabled={previewZoom <= 1}
                      >
                        Zoom -
                      </button>
                      <button
                        onClick={() => setPreviewZoom(Math.min(4, previewZoom + 0.5))}
                        className="px-2 py-1 bg-muted hover:bg-muted/70 border border-border text-[9px] font-bold"
                        disabled={previewZoom >= 4}
                      >
                        Zoom +
                      </button>
                      <button
                        onClick={() => setPreviewZoom(1)}
                        className="px-2 py-1 bg-muted hover:bg-muted/70 border border-border text-[9px] font-bold"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="text-[8px] text-muted-foreground font-bold uppercase">Zoom state: {previewZoom}x</div>
                  </div>
                </div>

                {/* Larger main frame */}
                <div className="md:col-span-3 border border-border bg-black/50 overflow-hidden relative flex items-center justify-center min-h-[400px] max-h-[550px] rounded-sm">
                  <div className="absolute top-2 left-2 bg-background/80 border border-border px-2 py-0.5 text-[8px] tracking-widest text-muted-foreground uppercase z-10">
                    Main Viewer // DECIMATED RASTER (ENLARGED)
                  </div>
                  <div
                    className="w-full h-full overflow-auto flex items-center justify-center p-4 scrollbar-thin scrollbar-thumb-border"
                    style={{ cursor: "grab" }}
                  >
                    {dataset && (
                      <img
                        src={getDatasetPreviewImageUrl(datasetId)}
                        alt="Dataset Preview"
                        className="object-contain transition-transform duration-200"
                        style={{
                          transform: `scale(${previewZoom})`,
                          maxHeight: "480px",
                          maxWidth: "100%",
                        }}
                        loading="lazy"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: View Metadata Properties Table */}
      {showMetadataModal && metadata && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-border bg-card max-w-2xl w-full p-6 space-y-6 shadow-[0_0_50px_-12px_rgba(6,182,212,0.3)] relative overflow-hidden font-mono text-xs">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[8px] text-primary tracking-widest uppercase">
              REGISTER // METADATA PROPERTIES
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Geospatial Metadata Properties Register
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Exhaustive GDAL attributes parsed from registered TIFF files.
              </p>
            </div>

            <div className="border border-border bg-card/15 overflow-hidden rounded-sm">
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase tracking-widest text-[9px] sticky top-0 bg-background/95 z-10">
                      <th className="p-2.5 font-bold">Property Field</th>
                      <th className="p-2.5 font-bold">Extracted Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-muted-foreground">
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Coordinate Reference System</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.coordinate_system || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Map Projection Name</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.projection_name || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">EPSG Identifier Code</td>
                      <td className="p-2.5 select-all text-cyan-400 font-bold">EPSG:{metadata.epsg_code || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">UTM Grid Reference Zone</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.utm_zone || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Top-Left Origin Easting (X)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.origin_x !== null ? metadata.origin_x.toFixed(6) : "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Top-Left Origin Northing (Y)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.origin_y !== null ? metadata.origin_y.toFixed(6) : "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Horizontal Pixel Pitch (X)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.pixel_size_x !== null ? `${metadata.pixel_size_x.toFixed(6)} meters` : "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Vertical Pixel Pitch (Y)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.pixel_size_y !== null ? `${metadata.pixel_size_y.toFixed(6)} meters` : "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Raster Column Width (Pixels)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.raster_width || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Raster Row Height (Scan Lines)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.raster_height || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Multi-Spectral Band Count</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.band_count || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Observation Capture Date</td>
                      <td className="p-2.5 select-all text-pink-400 font-bold">{metadata.acquisition_date || "N/A"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowMetadataModal(false)}
                className="px-4 py-2 border border-border bg-muted/20 hover:bg-muted/40 uppercase tracking-widest text-[10px] font-bold rounded-sm"
              >
                Close Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Preview Image Dialog */}
      {showFullPreviewModal && dataset && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="border border-border bg-card max-w-5xl w-full h-[85vh] p-6 space-y-4 shadow-[0_0_50px_-12px_rgba(6,182,212,0.4)] relative flex flex-col justify-between font-mono">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[8px] text-primary tracking-widest uppercase">
              POPUP // RGB FULL PREVIEW
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Fullscreen Visual Preview
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase">
                Raster stack: {dataset.dataset_name} &middot; {dataset.dataset_path}
              </p>
            </div>

            <div className="flex-1 border border-border bg-black/60 overflow-hidden relative flex items-center justify-center rounded-sm">
              <div className="w-full h-full overflow-auto p-4 flex items-center justify-center scrollbar-thin scrollbar-thumb-border">
                <img
                  src={getDatasetPreviewImageUrl(datasetId)}
                  alt="Full Dataset Preview"
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[9px] text-muted-foreground uppercase">Deci-resolution preview output (Phase 2 Visualizer)</span>
              <button
                onClick={() => setShowFullPreviewModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] rounded-sm"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
