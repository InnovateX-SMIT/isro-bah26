"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import {
  Database,
  Plus,
  RefreshCw,
  Trash2,
  Play,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileCode2,
  FolderOpen,
  Eye,
  Info
} from "lucide-react"
import {
  getDemoDatasets,
  registerDataset,
  getRegisteredDatasets,
  deleteDataset
} from "@/lib/dataset-api"
import { getAnalysisSessions } from "@/lib/analysis-api"
import {
  runDatasetInspection,
  getDatasetInspection,
  getDatasetInspectionFiles,
  deleteDatasetInspection
} from "@/lib/dataset-inspection-api"
import {
  runDatasetMetadata,
  getDatasetMetadata,
  deleteDatasetMetadata
} from "@/lib/dataset-metadata-api"
import { DemoDataset, Dataset } from "@/lib/types/dataset"
import { AnalysisSession } from "@/lib/types/analysis"
import { DatasetInspection, DatasetFile } from "@/lib/types/dataset-inspection"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"

function DatasetsDashboard() {
  const router = useRouter()

  // State arrays
  const [demoDatasets, setDemoDatasets] = useState<DemoDataset[]>([])
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [registered, setRegistered] = useState<Dataset[]>([])

  // Loading states
  const [loadingDemos, setLoadingDemos] = useState<boolean>(true)
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true)
  const [loadingRegistered, setLoadingRegistered] = useState<boolean>(true)
  const [registering, setRegistering] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Selection state
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)

  // Inspection states
  const [inspection, setInspection] = useState<DatasetInspection | null>(null)
  const [files, setFiles] = useState<DatasetFile[]>([])
  const [loadingInspection, setLoadingInspection] = useState<boolean>(false)
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false)
  const [runningInspection, setRunningInspection] = useState<boolean>(false)

  // Metadata states
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(false)
  const [runningMetadata, setRunningMetadata] = useState<boolean>(false)

  // Form states
  const [formSessionId, setFormSessionId] = useState<string>("")
  const [selectedDemoPath, setSelectedDemoPath] = useState<string>("")
  const [selectedDemoName, setSelectedDemoName] = useState<string>("")
  const [isCustomPath, setIsCustomPath] = useState<boolean>(false)
  const [customName, setCustomName] = useState<string>("")
  const [customPath, setCustomPath] = useState<string>("")

  // Confirm delete modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Status banners
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Data fetching helpers
  const fetchDemoDatasets = async () => {
    setLoadingDemos(true)
    try {
      const data = await getDemoDatasets()
      setDemoDatasets(data)
      if (data.length > 0) {
        setSelectedDemoPath(data[0].dataset_path)
        setSelectedDemoName(data[0].dataset_name)
      }
    } catch (err: any) {
      console.error(err)
      setError("Failed to discover demo datasets inside 'datasets/demo/'.")
    } finally {
      setLoadingDemos(false)
    }
  }

  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      const data = await getAnalysisSessions()
      setSessions(data)
      if (data.length > 0) {
        setFormSessionId(data[0].session_id)
      }
    } catch (err: any) {
      console.error(err)
      setError("Failed to retrieve analysis sessions from backend node.")
    } finally {
      setLoadingSessions(false)
    }
  }

  const fetchRegistered = async (showLoading = true) => {
    if (showLoading) setLoadingRegistered(true)
    try {
      const data = await getRegisteredDatasets()
      setRegistered(data)
    } catch (err: any) {
      console.error(err)
      setError("Failed to load registered dataset logs from SQLite database.")
    } finally {
      if (showLoading) setLoadingRegistered(false)
    }
  }

  // Load initial data
  const loadAllData = async () => {
    setError(null)
    await Promise.all([fetchDemoDatasets(), fetchSessions(), fetchRegistered(true)])
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Trigger manual refresh
  const handleRefresh = async () => {
    setError(null)
    await fetchRegistered(true)
    if (selectedDataset) {
      await handleSelectDataset(selectedDataset)
    }
    if (!error) {
      triggerSuccess("Registered database records refreshed.")
    }
  }

  const triggerSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => {
      setSuccess((prev) => (prev === msg ? null : prev))
    }, 4000)
  }

  // Handle Demo dataset dropdown change
  const handleDemoChange = (path: string) => {
    setSelectedDemoPath(path)
    const matched = demoDatasets.find((d) => d.dataset_path === path)
    if (matched) {
      setSelectedDemoName(matched.dataset_name)
    }
  }

  // Register Dataset Form Submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formSessionId) {
      setError("Please select or create an Analysis Session first.")
      return
    }

    const name = isCustomPath ? customName : selectedDemoName
    const path = isCustomPath ? customPath : selectedDemoPath
    const type = isCustomPath ? "CUSTOM" : "DEMO"

    if (!name.trim() || !path.trim()) {
      setError("Dataset name and path cannot be blank.")
      return
    }

    setRegistering(true)
    try {
      await registerDataset({
        analysis_session_id: formSessionId,
        dataset_name: name,
        dataset_path: path,
        dataset_type: type,
      })
      triggerSuccess(`Dataset '${name}' registered successfully.`)
      // Reset custom inputs if custom
      if (isCustomPath) {
        setCustomName("")
        setCustomPath("")
      }
      await fetchRegistered(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to register dataset.")
    } finally {
      setRegistering(false)
    }
  }

  // Delete dataset registration
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)

    // Clear selection if deleting the selected one
    if (selectedDataset?.dataset_id === id) {
      setSelectedDataset(null)
      setInspection(null)
      setFiles([])
      setMetadata(null)
    }

    try {
      await deleteDataset(id)
      triggerSuccess(`Dataset registration ${id} deleted successfully.`)
      await fetchRegistered(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || `Failed to delete dataset registration ${id}.`)
    } finally {
      setDeletingId(null)
    }
  }

  // Select dataset for inspection details
  const handleSelectDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset)
    setInspection(null)
    setFiles([])
    setMetadata(null)
    setLoadingInspection(true)
    setLoadingMetadata(true)
    setError(null)
    
    try {
      const inspectData = await getDatasetInspection(dataset.dataset_id)
      setInspection(inspectData)
      
      if (inspectData && inspectData.inspection_status === "COMPLETED") {
        setLoadingFiles(true)
        const fileList = await getDatasetInspectionFiles(dataset.dataset_id)
        setFiles(fileList)
      }
    } catch (err: any) {
      // 404 is normal if it has not been inspected yet, we don't display it as a blocking error
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

    try {
      const metadataData = await getDatasetMetadata(dataset.dataset_id)
      setMetadata(metadataData)
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

  // Run File Inspection recursively
  const handleRunInspection = async () => {
    if (!selectedDataset) return
    setRunningInspection(true)
    setError(null)
    setInspection(null)
    setFiles([])
    
    try {
      const inspectData = await runDatasetInspection(selectedDataset.dataset_id)
      setInspection(inspectData)
      triggerSuccess(`Filesystem scan completed for ${selectedDataset.dataset_name}.`)
      
      if (inspectData.inspection_status === "COMPLETED") {
        setLoadingFiles(true)
        const fileList = await getDatasetInspectionFiles(selectedDataset.dataset_id)
        setFiles(fileList)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Filesystem scanning failed. Verify the folder path is correct.")
    } finally {
      setRunningInspection(false)
      setLoadingFiles(false)
    }
  }

  // Run Metadata Extraction
  const handleRunMetadata = async () => {
    if (!selectedDataset) return
    setRunningMetadata(true)
    setError(null)
    setMetadata(null)
    
    try {
      const metadataData = await runDatasetMetadata(selectedDataset.dataset_id)
      setMetadata(metadataData)
      triggerSuccess(`Metadata intelligence extraction completed for ${selectedDataset.dataset_name}.`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Metadata extraction failed. Verify files are valid.")
    } finally {
      setRunningMetadata(false)
    }
  }

  // Navigate to session page
  const handleViewSession = (sessionId: string) => {
    router.push(`/analysis?session=${sessionId}`)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary font-mono uppercase">
            GEOSPATIAL INVENTORY NODE
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
            Discover demo satellite case studies and register dataset workspaces under analysis sessions
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase">DATACENTER: ONLINE</span>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-400 font-mono text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(16,185,129,0.3)]">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-bold">{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-[10px] uppercase hover:underline opacity-80 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 font-mono text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(239,68,68,0.3)]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-[10px] uppercase hover:underline opacity-80 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Layout Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Section: Discovery & Form Panel */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Section 1: Discovered Demo Datasets */}
          <div className="border border-border bg-card/25 p-5 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2.5 py-0.5 text-[8px] text-primary tracking-widest font-mono uppercase">
              SCAN // DEMO-DIR
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-primary" />
              Available Demo Datasets
            </h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Geospatial folders discovered inside `datasets/demo/` on local disk.
            </p>

            {loadingDemos ? (
              <div className="flex items-center space-x-2 text-[10px] font-mono text-muted-foreground p-3 bg-muted/15 border border-border border-dashed">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SCANNING DISK INDEX...</span>
              </div>
            ) : demoDatasets.length === 0 ? (
              <div className="text-[10px] font-mono text-amber-500 p-3 bg-amber-500/5 border border-amber-500/20">
                No demo datasets found. Add scene folders under datasets/demo/ to discover them.
              </div>
            ) : (
              <div className="divide-y divide-border/40 font-mono text-[10px] text-muted-foreground border border-border">
                {demoDatasets.map((ds, idx) => (
                  <div key={idx} className="p-2.5 flex flex-col space-y-1 hover:bg-muted/10">
                    <span className="text-foreground font-bold truncate">{ds.dataset_name}</span>
                    <span className="text-[9px] opacity-75 truncate">{ds.dataset_path}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Register Dataset Form */}
          <div className="border border-border bg-card/25 p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2.5 py-0.5 text-[8px] text-primary tracking-widest font-mono uppercase">
              FORM // REGISTRY
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-primary" />
              Register Dataset
            </h2>

            <form onSubmit={handleRegister} className="space-y-4 font-mono text-xs">
              
              {/* Field 1: Analysis Session dropdown */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                  1. Select Target Session
                </label>
                {loadingSessions ? (
                  <div className="flex items-center space-x-2 text-[10px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Loading Sessions...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-[10px] text-amber-500 leading-normal border border-amber-500/20 bg-amber-500/5 p-2 uppercase">
                    No active sessions. Create a session on the Analysis page first.
                  </div>
                ) : (
                  <select
                    value={formSessionId}
                    onChange={(e) => setFormSessionId(e.target.value)}
                    className="w-full bg-background border border-border p-2 focus:outline-none focus:border-primary font-mono text-xs text-foreground"
                  >
                    {sessions.map((s) => (
                      <option key={s.session_id} value={s.session_id}>
                        {s.session_id.substring(0, 8)}... ({s.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Field 2: Source Type Toggle */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                  2. Choose Source Type
                </label>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setIsCustomPath(false)}
                    className={`py-1.5 border font-bold uppercase tracking-wider ${
                      !isCustomPath
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/10 text-muted-foreground hover:bg-muted/20"
                    }`}
                  >
                    Demo Scene
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomPath(true)}
                    className={`py-1.5 border font-bold uppercase tracking-wider ${
                      isCustomPath
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/10 text-muted-foreground hover:bg-muted/20"
                    }`}
                  >
                    Custom Path
                  </button>
                </div>
              </div>

              {/* Field 3: Dataset select/inputs */}
              {!isCustomPath ? (
                /* Demo Dataset Selector */
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                    3. Discovered Demo Scene
                  </label>
                  {demoDatasets.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground italic border border-border p-2 bg-muted/10">
                      No discovered datasets.
                    </div>
                  ) : (
                    <select
                      value={selectedDemoPath}
                      onChange={(e) => handleDemoChange(e.target.value)}
                      className="w-full bg-background border border-border p-2 focus:outline-none focus:border-primary font-mono text-xs text-foreground"
                    >
                      {demoDatasets.map((d, i) => (
                        <option key={i} value={d.dataset_path}>
                          {d.dataset_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                /* Custom path inputs */
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      3. Custom Scene Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hyderabad_LISS_IV"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-background border border-border p-2 focus:outline-none focus:border-primary font-mono text-xs text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      4. Scene Folder Path
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. datasets/uploaded/scene1"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      className="w-full bg-background border border-border p-2 focus:outline-none focus:border-primary font-mono text-xs text-foreground"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={registering || sessions.length === 0}
                className="w-full mt-2 py-2 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]"
              >
                {registering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    REGISTERING...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    REGISTER DATASET
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Section: Registered Inventory List & Inspection Panel */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Registry Table Card */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
                Operational Dataset Registry
              </h2>
              <button
                disabled={loadingRegistered}
                onClick={handleRefresh}
                className="inline-flex items-center space-x-1.5 text-xs text-primary hover:underline font-mono uppercase disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRegistered ? "animate-spin" : ""}`} />
                <span>Refresh list</span>
              </button>
            </div>

            {loadingRegistered && registered.length === 0 ? (
              <div className="border border-border bg-card/10 h-48 flex flex-col items-center justify-center font-mono text-xs text-muted-foreground space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span>LOADING GEOSPATIAL REGISTRY LOGS...</span>
              </div>
            ) : registered.length === 0 ? (
              /* Empty State */
              <div className="border border-dashed border-border bg-card/10 p-12 text-center flex flex-col items-center justify-center min-h-[200px] space-y-4">
                <AlertTriangle className="w-8 h-8 text-primary/45 animate-pulse" />
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-mono">
                    No Registered Datasets Found
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    There are no registered datasets on the platform. Select an active session and link a demo scene or a custom folder path to begin.
                  </p>
                </div>
              </div>
            ) : (
              /* Registered datasets table */
              <div className="border border-border bg-card/10 overflow-hidden relative">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/15 text-muted-foreground uppercase tracking-widest text-[10px]">
                        <th className="p-4 font-bold">Name</th>
                        <th className="p-4 font-bold">Type</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold">Session ID</th>
                        <th className="p-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {registered.map((ds) => {
                        const isDeleting = deletingId === ds.dataset_id
                        const isSelected = selectedDataset?.dataset_id === ds.dataset_id
                        return (
                          <tr
                            key={ds.dataset_id}
                            className={`hover:bg-muted/5 transition-colors group ${
                              isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                            }`}
                          >
                            <td className="p-4 font-bold text-foreground/90 truncate max-w-[150px]" title={ds.dataset_name}>
                              {ds.dataset_name}
                            </td>
                            <td className="p-4">
                              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-muted/50 border border-border text-muted-foreground">
                                {ds.dataset_type}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                                {ds.dataset_status}
                              </span>
                            </td>
                            <td className="p-4 text-muted-foreground font-mono select-all">
                              {ds.analysis_session_id.substring(0, 8)}...
                            </td>
                            <td className="p-4 text-right">
                              <div className="inline-flex items-center space-x-2">
                                {/* Select / Inspect */}
                                <button
                                  onClick={() => handleSelectDataset(ds)}
                                  className={`px-3 py-1 border transition-all font-bold tracking-widest uppercase text-[9px] flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white border border-cyan-500/25 hover:border-cyan-500"
                                  }`}
                                >
                                  <FileCode2 className="w-3.5 h-3.5" />
                                  Inspect
                                </button>

                                {/* Open Session */}
                                <button
                                  onClick={() => handleViewSession(ds.analysis_session_id)}
                                  className="px-3 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 hover:border-primary transition-all font-bold tracking-widest uppercase text-[9px] flex items-center gap-1"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  Session
                                </button>

                                {/* Unregister */}
                                <button
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteId(ds.dataset_id)}
                                  className="px-3 py-1 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all font-bold tracking-widest uppercase text-[9px] flex items-center gap-1"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  Purge
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Dataset Inspection Console Panel */}
          <div className="space-y-4">
            <div className="border-b border-border pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
                Dataset Inspection Console
              </h2>
            </div>

            {!selectedDataset ? (
              /* No selection state */
              <div className="border border-border bg-card/10 p-8 text-center flex flex-col items-center justify-center min-h-[180px] space-y-2">
                <Info className="w-6 h-6 text-muted-foreground/50" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  No Dataset Selected for Inspection
                </h3>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  Click the **Inspect** button on any registered dataset in the table above to trigger the filesystem scanner and explore its contents.
                </p>
              </div>
            ) : (
              /* selected dataset view */
              <div className="border border-border bg-card/20 p-5 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[8px] text-primary tracking-widest font-mono uppercase">
                  CONSOLE // FS-WALKER
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-mono">
                      {selectedDataset.dataset_name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono select-all">
                      PATH: {selectedDataset.dataset_path}
                    </p>
                  </div>
                  <button
                    disabled={runningInspection || loadingInspection}
                    onClick={handleRunInspection}
                    className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shrink-0"
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

                {/* Sub-loading states */}
                {loadingInspection ? (
                  <div className="flex items-center justify-center p-8 space-x-2 text-xs font-mono text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>FETCHING FILE PROFILE FROM SYSTEM DATABASE...</span>
                  </div>
                ) : !inspection ? (
                  /* Empty state for inspection (not scanned yet) */
                  <div className="border border-dashed border-border bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[140px]">
                    <AlertTriangle className="w-6 h-6 text-primary/45 animate-pulse" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
                        No Inspection Profile Found
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-normal max-w-sm">
                        This dataset registration has not been scanned yet. Run the inspector to verify TIFF bands and report files.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Display Inspection Summary and Files Inventory */
                  <div className="space-y-6">
                    {/* Summary metrics card grid */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground/80 uppercase font-mono tracking-wider">
                        1. Scan Inventory Summary
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-center">
                        <div className="border border-border bg-card/40 p-2.5">
                          <div className="text-[8px] text-muted-foreground uppercase">Status</div>
                          <div className="text-xs font-black text-primary mt-1">
                            {inspection.inspection_status}
                          </div>
                        </div>
                        <div className="border border-border bg-card/40 p-2.5">
                          <div className="text-[8px] text-muted-foreground uppercase">Total Files</div>
                          <div className="text-xs font-black text-foreground mt-1">
                            {inspection.total_files}
                          </div>
                        </div>
                        <div className="border border-border bg-card/40 p-2.5">
                          <div className="text-[8px] text-muted-foreground uppercase">TIF (Bands)</div>
                          <div className="text-xs font-black text-cyan-400 mt-1">
                            {inspection.total_tif_files}
                          </div>
                        </div>
                        <div className="border border-border bg-card/40 p-2.5">
                          <div className="text-[8px] text-muted-foreground uppercase">TXT (Report)</div>
                          <div className="text-xs font-black text-foreground mt-1">
                            {inspection.total_txt_files}
                          </div>
                        </div>
                        <div className="border border-border bg-card/40 p-2.5">
                          <div className="text-[8px] text-muted-foreground uppercase">XML (Aux)</div>
                          <div className="text-xs font-black text-amber-500 mt-1">
                            {inspection.total_xml_files}
                          </div>
                        </div>
                        <div className="border border-border bg-card/40 p-2.5">
                          <div className="text-[8px] text-muted-foreground uppercase">META (Profile)</div>
                          <div className="text-xs font-black text-pink-500 mt-1">
                            {inspection.total_meta_files}
                          </div>
                        </div>
                        <div className="border border-border bg-card/40 p-2.5">
                          <div className="text-[8px] text-muted-foreground uppercase">JPG (Preview)</div>
                          <div className="text-xs font-black text-emerald-400 mt-1">
                            {inspection.total_jpg_files}
                          </div>
                        </div>
                        <div className="border border-border bg-card/40 p-2.5">
                          <div className="text-[8px] text-muted-foreground uppercase">Scan Date</div>
                          <div className="text-[9px] font-black text-muted-foreground mt-1 truncate" title={new Date(inspection.updated_at).toLocaleString()}>
                            {new Date(inspection.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Files table inventory */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground/80 uppercase font-mono tracking-wider">
                        2. Detailed File Inventory
                      </div>
                      
                      {loadingFiles ? (
                        <div className="flex items-center space-x-2 text-[10px] text-muted-foreground p-4 bg-muted/10 border border-border">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>FETCHING DISCOVERED FILES INDEX...</span>
                        </div>
                      ) : files.length === 0 ? (
                        <div className="text-[10px] text-muted-foreground p-3 border border-border italic">
                          No files cataloged under this scan.
                        </div>
                      ) : (
                        <div className="border border-border bg-card/15 overflow-hidden relative">
                          <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                            <table className="w-full text-left border-collapse font-mono text-[10px]">
                              <thead>
                                <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase tracking-widest text-[9px] sticky top-0 bg-background/95 backdrop-blur z-10">
                                  <th className="p-3 font-bold">File Name</th>
                                  <th className="p-3 font-bold">Ext</th>
                                  <th className="p-3 font-bold">Category</th>
                                  <th className="p-3 font-bold">Relative Path</th>
                                  <th className="p-3 font-bold text-right">Size</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {files.map((file) => (
                                  <tr
                                    key={file.file_id}
                                    className="hover:bg-muted/5 transition-colors"
                                  >
                                    <td className="p-3 font-bold text-foreground/90 truncate max-w-[150px]" title={file.file_name}>
                                      {file.file_name}
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                      {file.file_extension}
                                    </td>
                                    <td className="p-3">
                                      <span
                                        className={`px-1.5 py-0.5 border text-[8px] font-bold tracking-wider uppercase ${
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
                                        }`}
                                      >
                                        {file.file_category}
                                      </span>
                                    </td>
                                    <td className="p-3 text-muted-foreground select-all max-w-[200px] truncate" title={file.relative_path}>
                                      {file.relative_path}
                                    </td>
                                    <td className="p-3 text-right text-muted-foreground">
                                      {formatSize(file.file_size_bytes)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata Intelligence Panel */}
                    <div className="border-t border-border/40 pt-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
                            Metadata Intelligence
                          </h3>
                          {metadata && (
                            <span
                              className={`px-1.5 py-0.5 border text-[8px] font-bold tracking-widest uppercase ${
                                metadata.metadata_status === "COMPLETED"
                                  ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                                  : metadata.metadata_status === "EXTRACTING"
                                  ? "border-amber-500/20 text-amber-500 bg-amber-500/5 animate-pulse"
                                  : metadata.metadata_status === "FAILED"
                                  ? "border-red-500/20 text-red-400 bg-red-500/5"
                                  : "border-border text-muted-foreground bg-muted/5"
                              }`}
                            >
                              {metadata.metadata_status}
                            </span>
                          )}
                        </div>
                        <button
                          disabled={runningMetadata || loadingMetadata}
                          onClick={handleRunMetadata}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 hover:border-primary transition-all font-mono font-bold tracking-widest uppercase text-[9px] flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {runningMetadata ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Running Extraction...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              {metadata ? "Re-Run Extraction" : "Run Extraction"}
                            </>
                          )}
                        </button>
                      </div>

                      {loadingMetadata ? (
                        <div className="flex items-center justify-center p-6 space-x-2 text-[10px] font-mono text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>FETCHING METADATA TELEMETRY FROM PLATFORM ENGINE...</span>
                        </div>
                      ) : !metadata ? (
                        /* Empty state */
                        <div className="border border-dashed border-border bg-muted/5 p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[140px]">
                          <Info className="w-5 h-5 text-muted-foreground/50" />
                          <div className="space-y-1">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground font-mono">
                              No Metadata Profile Extracted
                            </h4>
                            <p className="text-[10px] text-muted-foreground leading-normal max-w-sm">
                              The geospatial metadata intelligence profile has not been created yet. Run the extraction engine to process GeoTIFF attributes.
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Metadata content */
                        <div className="space-y-6">
                          {/* Summary cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center text-[10px]">
                            <div className="border border-border bg-card/30 p-2.5">
                              <div className="text-[8px] text-muted-foreground uppercase">CRS</div>
                              <div className="text-xs font-bold text-foreground mt-1 truncate" title={metadata.coordinate_system || "N/A"}>
                                {metadata.coordinate_system || "N/A"}
                              </div>
                            </div>
                            <div className="border border-border bg-card/30 p-2.5">
                              <div className="text-[8px] text-muted-foreground uppercase">Projection</div>
                              <div className="text-xs font-bold text-foreground mt-1 truncate" title={metadata.projection_name || "N/A"}>
                                {metadata.projection_name || "N/A"}
                              </div>
                            </div>
                            <div className="border border-border bg-card/30 p-2.5">
                              <div className="text-[8px] text-muted-foreground uppercase">EPSG Code</div>
                              <div className="text-xs font-bold text-cyan-400 mt-1">
                                {metadata.epsg_code || "N/A"}
                              </div>
                            </div>
                            <div className="border border-border bg-card/30 p-2.5">
                              <div className="text-[8px] text-muted-foreground uppercase">UTM Zone</div>
                              <div className="text-xs font-bold text-foreground mt-1">
                                {metadata.utm_zone || "N/A"}
                              </div>
                            </div>
                            <div className="border border-border bg-card/30 p-2.5">
                              <div className="text-[8px] text-muted-foreground uppercase">Spectral Bands</div>
                              <div className="text-xs font-bold text-foreground mt-1">
                                {metadata.band_count || "N/A"}
                              </div>
                            </div>
                            <div className="border border-border bg-card/30 p-2.5">
                              <div className="text-[8px] text-muted-foreground uppercase">Raster Size</div>
                              <div className="text-xs font-bold text-foreground mt-1 truncate">
                                {metadata.raster_width && metadata.raster_height
                                  ? `${metadata.raster_width} x ${metadata.raster_height}`
                                  : "N/A"}
                              </div>
                            </div>
                            <div className="border border-border bg-card/30 p-2.5">
                              <div className="text-[8px] text-muted-foreground uppercase">Pixel Size</div>
                              <div className="text-xs font-bold text-amber-500 mt-1 truncate">
                                {metadata.pixel_size_x && metadata.pixel_size_y
                                  ? `${Math.abs(metadata.pixel_size_x).toFixed(2)}m x ${Math.abs(metadata.pixel_size_y).toFixed(2)}m`
                                  : "N/A"}
                              </div>
                            </div>
                            <div className="border border-border bg-card/30 p-2.5">
                              <div className="text-[8px] text-muted-foreground uppercase">Acquisition Date</div>
                              <div className="text-xs font-bold text-pink-500 mt-1 truncate" title={metadata.acquisition_date || "N/A"}>
                                {metadata.acquisition_date || "N/A"}
                              </div>
                            </div>
                          </div>

                          {/* Details Table */}
                          <div className="space-y-2">
                            <div className="text-[9px] font-bold text-muted-foreground/80 uppercase font-mono tracking-wider">
                              Geospatial Properties Register
                            </div>
                            <div className="border border-border bg-card/15 overflow-hidden">
                              <table className="w-full text-left border-collapse font-mono text-[10px]">
                                <thead>
                                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase tracking-widest text-[9px]">
                                    <th className="p-2.5 font-bold">Property Field</th>
                                    <th className="p-2.5 font-bold">Extracted Value</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 text-muted-foreground">
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Coordinate System (Datum)</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.coordinate_system || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Map Projection</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.projection_name || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">EPSG Identifier</td>
                                    <td className="p-2.5 select-all text-cyan-400 font-bold">{metadata.epsg_code || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">UTM Grid Zone</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.utm_zone || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Top-Left Origin X (Easting)</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.origin_x !== null ? metadata.origin_x.toFixed(6) : "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Top-Left Origin Y (Northing)</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.origin_y !== null ? metadata.origin_y.toFixed(6) : "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Horizontal Resolution (Pixel size X)</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.pixel_size_x !== null ? `${metadata.pixel_size_x.toFixed(6)} meters` : "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Vertical Resolution (Pixel size Y)</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.pixel_size_y !== null ? `${metadata.pixel_size_y.toFixed(6)} meters` : "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Raster Width (Pixels)</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.raster_width || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Raster Height (Scan lines)</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.raster_height || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Spectral Band Count</td>
                                    <td className="p-2.5 select-all text-foreground">{metadata.band_count || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-foreground/80">Capture Acquisition Date</td>
                                    <td className="p-2.5 select-all text-pink-400 font-bold">{metadata.acquisition_date || "N/A"}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-red-500/30 bg-card max-w-md w-full p-6 space-y-6 shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-500/10 border-l border-b border-border px-3 py-1 text-[8px] text-red-500 tracking-widest font-mono uppercase">
              ALERT // UNREGISTER DATA
            </div>
            <div className="flex items-start space-x-3 text-red-400 font-mono">
              <AlertTriangle className="w-5.5 h-5.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Unregister Dataset
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  You are about to remove dataset registration{" "}
                  <span className="font-mono text-foreground font-bold">
                    {confirmDeleteId}
                  </span>{" "}
                  from the platform context. The raw satellite files on disk will NOT be touched.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 text-xs font-mono">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border border-border bg-muted/20 hover:bg-muted/40 uppercase tracking-widest text-[10px] font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(confirmDeleteId)
                  setConfirmDeleteId(null)
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white uppercase tracking-widest text-[10px] font-bold shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)]"
              >
                Unregister
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DatasetsPage() {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-xs text-muted-foreground p-6 flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>LOADING DATA INVENTORY MODULES...</span>
        </div>
      }
    >
      <DatasetsDashboard />
    </Suspense>
  )
}
