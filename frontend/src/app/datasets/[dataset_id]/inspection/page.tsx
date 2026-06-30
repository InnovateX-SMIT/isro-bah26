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
  Layers,
  Play,
  Check,
  Circle
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

type PipelineStage = "idle" | "inspection" | "metadata" | "preview" | "complete"

const STAGES = [
  { key: "inspection" as const, label: "Filesystem Scan" },
  { key: "metadata" as const, label: "Metadata Extraction" },
  { key: "preview" as const, label: "Preview Generation" },
]

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

  // Pipeline state
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle")
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set())

  // Action running states (for individual re-runs)
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
      setError("Failed to locate dataset record.")
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
        setCompletedStages(prev => new Set(prev).add("inspection"))
      }
    } catch (err: any) {
      if (err.message && err.message.includes("404")) {
        setInspection(null)
      } else {
        console.error(err)
        setError(err.message || "Failed to load filesystem scan summary.")
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
      if (meta) setCompletedStages(prev => new Set(prev).add("metadata"))
    } catch (err: any) {
      if (err.message && err.message.includes("404")) {
        setMetadata(null)
      } else {
        console.error(err)
        setError(err.message || "Failed to load metadata summary.")
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
      if (prevData) setCompletedStages(prev => new Set(prev).add("preview"))
    } catch (err: any) {
      if (err.message && err.message.includes("404")) {
        setPreview(null)
      } else {
        console.error(err)
        setError(err.message || "Failed to load preview summary.")
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

  // Run Complete Pipeline
  const handleRunCompletePipeline = async () => {
    setPipelineError(null)
    setError(null)
    setCompletedStages(new Set())

    // Stage 1: Inspection
    setPipelineStage("inspection")
    try {
      const res = await runDatasetInspection(datasetId)
      setInspection(res)
      if (res.inspection_status === "COMPLETED") {
        setLoadingFiles(true)
        const fileList = await getDatasetInspectionFiles(datasetId)
        setFiles(fileList)
        setLoadingFiles(false)
      }
      setCompletedStages(prev => new Set(prev).add("inspection"))
    } catch (err: any) {
      console.error(err)
      setPipelineError(err.message || "Filesystem scan failed.")
      setPipelineStage("idle")
      return
    }

    // Stage 2: Metadata
    setPipelineStage("metadata")
    try {
      const res = await runDatasetMetadata(datasetId)
      setMetadata(res)
      setCompletedStages(prev => new Set(prev).add("metadata"))
    } catch (err: any) {
      console.error(err)
      setPipelineError(err.message || "Metadata extraction failed.")
      setPipelineStage("idle")
      return
    }

    // Stage 3: Preview
    setPipelineStage("preview")
    try {
      const res = await runDatasetPreview(datasetId)
      setPreview(res)
      setCompletedStages(prev => new Set(prev).add("preview"))
    } catch (err: any) {
      console.error(err)
      setPipelineError(err.message || "Preview generation failed.")
      setPipelineStage("idle")
      return
    }

    setPipelineStage("complete")
    triggerSuccess("Complete inspection finished successfully.")
    
    // Automatically refresh/reload page data in React state
    loadDatasetRecord()
    loadInspectionData()
    loadMetadata()
    loadPreview()
  }

  // Individual step runners
  const handleRunInspection = async () => {
    setRunningInspection(true)
    setError(null)
    setInspection(null)
    setFiles([])
    try {
      const res = await runDatasetInspection(datasetId)
      setInspection(res)
      triggerSuccess("Filesystem scan completed.")
      if (res.inspection_status === "COMPLETED") {
        setLoadingFiles(true)
        const fileList = await getDatasetInspectionFiles(datasetId)
        setFiles(fileList)
      }
      setCompletedStages(prev => new Set(prev).add("inspection"))
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Filesystem scan failed.")
    } finally {
      setRunningInspection(false)
      setLoadingFiles(false)
    }
  }

  const handleRunMetadata = async () => {
    setRunningMetadata(true)
    setError(null)
    setMetadata(null)
    try {
      const res = await runDatasetMetadata(datasetId)
      setMetadata(res)
      triggerSuccess("Metadata extraction completed.")
      setCompletedStages(prev => new Set(prev).add("metadata"))
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Metadata extraction failed.")
    } finally {
      setRunningMetadata(false)
    }
  }

  const handleRunPreview = async () => {
    setRunningPreview(true)
    setError(null)
    setPreview(null)
    setPreviewZoom(1)
    try {
      const res = await runDatasetPreview(datasetId)
      setPreview(res)
      triggerSuccess("Preview generation completed.")
      setCompletedStages(prev => new Set(prev).add("preview"))
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Preview generation failed.")
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

  const getProgressPercent = () => {
    if (pipelineStage === "complete") return 100
    if (pipelineStage === "idle") return completedStages.size * 33
    const stageIdx = STAGES.findIndex(s => s.key === pipelineStage)
    return Math.round(((stageIdx) / 3) * 100 + 16) // mid-stage
  }

  const isPipelineRunning = pipelineStage !== "idle" && pipelineStage !== "complete"
  const hasAnyData = inspection || metadata || preview

  return (
    <div className="space-y-6 font-mono pb-12 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/datasets")}
            className="inline-flex items-center space-x-1 text-xs text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Inventory</span>
          </button>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-primary" />
            Dataset Inspection
          </h1>
          {dataset && (
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{dataset.dataset_name}</span>
              <span className="mx-2 text-border">·</span>
              <span className="text-muted-foreground">{dataset.dataset_path}</span>
            </p>
          )}
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-400 text-xs flex items-center justify-between rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-xs hover:underline opacity-80 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 text-xs flex items-center justify-between rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline opacity-80 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {pipelineError && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 text-xs flex items-center justify-between rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold">Pipeline Error: {pipelineError}</span>
          </div>
          <button onClick={() => setPipelineError(null)} className="text-xs hover:underline opacity-80 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Action: Run Complete Inspection */}
      <div className="border border-border bg-card/20 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Complete Inspection Pipeline</h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed max-w-lg">
              Scan workspace directories, extract geospatial metadata from GeoTIFF files, and generate RGB preview composites — all in one step.
            </p>
          </div>
          <button
            disabled={isPipelineRunning || loadingDataset}
            onClick={handleRunCompletePipeline}
            className="px-6 py-3 bg-primary text-primary-foreground text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-primary/90 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shrink-0 rounded-xl"
          >
            {isPipelineRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run Complete Inspection
              </>
            )}
          </button>
        </div>

        {/* Pipeline Progress */}
        {(isPipelineRunning || pipelineStage === "complete" || completedStages.size > 0) && (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="progress-track">
              <div
                className={`progress-fill ${pipelineStage === "complete" ? "progress-fill-success" : ""}`}
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>

            {/* Stage Indicators */}
            <div className="grid grid-cols-3 gap-3">
              {STAGES.map((stage) => {
                const isCompleted = completedStages.has(stage.key)
                const isRunning = pipelineStage === stage.key
                const isPending = !isCompleted && !isRunning

                return (
                  <div
                    key={stage.key}
                    className={`flex items-center gap-2 p-3 border rounded-lg text-xs transition-all ${
                      isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                        : isRunning
                        ? "border-primary/30 bg-primary/5 text-primary stage-running"
                        : "border-border bg-card/10 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className="font-semibold">{stage.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Individual Step Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          disabled={runningInspection || isPipelineRunning}
          onClick={handleRunInspection}
          className={`px-4 py-3 border font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl ${
            inspection
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
              : "border-border bg-card/20 text-foreground hover:border-primary/30"
          }`}
        >
          {runningInspection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {inspection ? "Re-run Scan" : "Run Scan"}
        </button>
        <button
          disabled={runningMetadata || isPipelineRunning}
          onClick={handleRunMetadata}
          className={`px-4 py-3 border font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl ${
            metadata
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
              : "border-border bg-card/20 text-foreground hover:border-primary/30"
          }`}
        >
          {runningMetadata ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {metadata ? "Re-extract Metadata" : "Extract Metadata"}
        </button>
        <button
          disabled={runningPreview || isPipelineRunning}
          onClick={handleRunPreview}
          className={`px-4 py-3 border font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl ${
            preview
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
              : "border-border bg-card/20 text-foreground hover:border-primary/30"
          }`}
        >
          {runningPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {preview ? "Re-generate Preview" : "Generate Preview"}
        </button>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {/* Inspection Results */}
        {loadingInspection ? (
          <div className="flex items-center justify-center p-8 space-x-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading inspection data...</span>
          </div>
        ) : !inspection ? (
          !isPipelineRunning && (
            <div className="border border-dashed border-border bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[120px] rounded-xl">
              <Info className="w-5 h-5 text-muted-foreground/50" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">Inspection has not been generated yet.</h4>
                <p className="text-[10px] text-muted-foreground max-w-sm leading-normal">
                  Run the inspection pipeline to generate:
                </p>
                <div className="text-[10px] text-muted-foreground max-w-sm mt-1 text-left inline-block space-y-0.5">
                  <div>• Inspection Profile</div>
                  <div>• Metadata Summary</div>
                  <div>• Preview Images</div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Scan Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
              <div className="border border-border bg-card/40 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase">Status</div>
                <div className="text-xs font-black text-primary mt-1">{inspection.inspection_status}</div>
              </div>
              <div className="border border-border bg-card/40 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">Total Files</div>
                <div className="text-xs font-black text-foreground mt-1">{inspection.total_files}</div>
              </div>
              <div className="border border-border bg-card/40 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">TIF Bands</div>
                <div className="text-xs font-black text-cyan-400 mt-1">{inspection.total_tif_files}</div>
              </div>
              <div className="border border-border bg-card/40 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">TXT Reports</div>
                <div className="text-xs font-black text-foreground mt-1">{inspection.total_txt_files}</div>
              </div>
              <div className="border border-border bg-card/40 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">XML Aux</div>
                <div className="text-xs font-black text-amber-500 mt-1">{inspection.total_xml_files}</div>
              </div>
              <div className="border border-border bg-card/40 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">META</div>
                <div className="text-xs font-black text-pink-500 mt-1">{inspection.total_meta_files}</div>
              </div>
              <div className="border border-border bg-card/40 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">JPG</div>
                <div className="text-xs font-black text-emerald-400 mt-1">{inspection.total_jpg_files}</div>
              </div>
              <div className="border border-border bg-card/40 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">Scan Date</div>
                <div className="text-[9px] font-black text-muted-foreground mt-1 truncate" title={new Date(inspection.updated_at).toLocaleString()}>
                  {new Date(inspection.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* File inventory */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                  Discovered Files
                </div>
                <div className="border border-border bg-card/15 overflow-hidden rounded-lg">
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
                              <span className={`px-1.5 py-0.5 border text-[8px] font-bold tracking-wider uppercase rounded-md ${
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
              </div>
            )}
          </div>
        )}

        {/* Metadata Results */}
        {!loadingMetadata && metadata && (
          <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Metadata</h3>
              <button
                onClick={() => setShowMetadataModal(true)}
                className="px-3 py-1.5 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground text-xs uppercase font-bold tracking-wider transition-all rounded-lg flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                View Details
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10px]">
              <div className="border border-border bg-card/30 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">CRS</div>
                <div className="text-xs font-bold text-foreground mt-1 truncate" title={metadata.coordinate_system || "N/A"}>
                  {metadata.coordinate_system || "N/A"}
                </div>
              </div>
              <div className="border border-border bg-card/30 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">EPSG Code</div>
                <div className="text-xs font-bold text-cyan-400 mt-1">{metadata.epsg_code || "N/A"}</div>
              </div>
              <div className="border border-border bg-card/30 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">Raster Size</div>
                <div className="text-xs font-bold text-foreground mt-1 truncate">
                  {metadata.raster_width && metadata.raster_height
                    ? `${metadata.raster_width} x ${metadata.raster_height}`
                    : "N/A"}
                </div>
              </div>
              <div className="border border-border bg-card/30 p-2.5 rounded-lg">
                <div className="text-[8px] text-muted-foreground uppercase font-bold">Resolution</div>
                <div className="text-xs font-bold text-amber-500 mt-1 truncate">
                  {metadata.pixel_size_x && metadata.pixel_size_y
                    ? `${Math.abs(metadata.pixel_size_x).toFixed(2)}m × ${Math.abs(metadata.pixel_size_y).toFixed(2)}m`
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Results */}
        {!loadingPreview && preview && preview.preview_status === "COMPLETED" && (
          <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Preview</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {preview.preview_width} × {preview.preview_height} · {preview.band_count} bands · {preview.generation_time_ms}ms
                </span>
                <button
                  onClick={() => setShowFullPreviewModal(true)}
                  className="px-3 py-1.5 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground text-xs uppercase font-bold tracking-wider transition-all rounded-lg flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Full View
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Thumbnail */}
              <div className="md:col-span-1 border border-border bg-card/30 p-4 flex flex-col space-y-3 rounded-lg">
                <div className="text-[9px] text-muted-foreground uppercase font-bold">Thumbnail</div>
                <div className="border border-border/80 bg-background/50 flex items-center justify-center p-2 min-h-[140px] rounded-lg">
                  {dataset && (
                    <img
                      src={getDatasetPreviewThumbnailUrl(datasetId)}
                      alt="Thumbnail"
                      className="max-h-[130px] max-w-full object-contain rounded"
                      loading="lazy"
                    />
                  )}
                </div>
                {/* Zoom controls */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setPreviewZoom(Math.max(1, previewZoom - 0.5))}
                    className="px-2 py-1 bg-muted hover:bg-muted/70 border border-border text-[9px] font-bold rounded-md"
                    disabled={previewZoom <= 1}
                  >
                    −
                  </button>
                  <span className="text-[9px] text-muted-foreground font-bold px-1">{previewZoom}×</span>
                  <button
                    onClick={() => setPreviewZoom(Math.min(4, previewZoom + 0.5))}
                    className="px-2 py-1 bg-muted hover:bg-muted/70 border border-border text-[9px] font-bold rounded-md"
                    disabled={previewZoom >= 4}
                  >
                    +
                  </button>
                  <button
                    onClick={() => setPreviewZoom(1)}
                    className="px-2 py-1 bg-muted hover:bg-muted/70 border border-border text-[9px] font-bold rounded-md"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Main image */}
              <div className="md:col-span-3 border border-border bg-black/50 overflow-hidden relative flex items-center justify-center min-h-[400px] max-h-[550px] rounded-lg">
                <div
                  className="w-full h-full overflow-auto flex items-center justify-center p-4"
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

      {/* MODAL: Metadata Properties */}
      {showMetadataModal && metadata && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-border bg-card max-w-2xl w-full p-6 space-y-6 shadow-2xl relative overflow-hidden font-mono text-xs rounded-2xl">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                Geospatial Metadata
              </h3>
              <p className="text-[10px] text-muted-foreground">
                GDAL attributes parsed from registered TIFF files.
              </p>
            </div>

            <div className="border border-border bg-card/15 overflow-hidden rounded-lg">
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase tracking-widest text-[9px] sticky top-0 bg-background/95 z-10">
                      <th className="p-2.5 font-bold">Property</th>
                      <th className="p-2.5 font-bold">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-muted-foreground">
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Coordinate Reference System</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.coordinate_system || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Map Projection</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.projection_name || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">EPSG Code</td>
                      <td className="p-2.5 select-all text-cyan-400 font-bold">EPSG:{metadata.epsg_code || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">UTM Zone</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.utm_zone || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Origin Easting (X)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.origin_x !== null ? metadata.origin_x.toFixed(6) : "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Origin Northing (Y)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.origin_y !== null ? metadata.origin_y.toFixed(6) : "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Pixel Size (X)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.pixel_size_x !== null ? `${metadata.pixel_size_x.toFixed(6)} meters` : "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Pixel Size (Y)</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.pixel_size_y !== null ? `${metadata.pixel_size_y.toFixed(6)} meters` : "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Raster Width</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.raster_width || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Raster Height</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.raster_height || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Spectral Bands</td>
                      <td className="p-2.5 select-all text-foreground">{metadata.band_count || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-foreground/85">Acquisition Date</td>
                      <td className="p-2.5 select-all text-pink-400 font-bold">{metadata.acquisition_date || "N/A"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowMetadataModal(false)}
                className="px-4 py-2 border border-border bg-muted/20 hover:bg-muted/40 uppercase tracking-wider text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full Preview */}
      {showFullPreviewModal && dataset && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="border border-border bg-card max-w-5xl w-full h-[85vh] p-6 space-y-4 shadow-2xl relative flex flex-col justify-between font-mono rounded-2xl">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                Full Preview — {dataset.dataset_name}
              </h3>
            </div>

            <div className="flex-1 border border-border bg-black/60 overflow-hidden relative flex items-center justify-center rounded-lg">
              <div className="w-full h-full overflow-auto p-4 flex items-center justify-center">
                <img
                  src={getDatasetPreviewImageUrl(datasetId)}
                  alt="Full Dataset Preview"
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="flex justify-end items-center pt-2">
              <button
                onClick={() => setShowFullPreviewModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
