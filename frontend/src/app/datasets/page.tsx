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
  X,
  Compass,
  CloudSun
} from "lucide-react"
import {
  getDemoDatasets,
  registerDataset,
  getRegisteredDatasets,
  deleteDataset
} from "@/lib/dataset-api"
import { getAnalysisSessions } from "@/lib/analysis-api"
import { DemoDataset, Dataset } from "@/lib/types/dataset"
import { AnalysisSession } from "@/lib/types/analysis"

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

  // Modal control
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false)

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
      setShowRegisterModal(false)
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

  // Navigate to session page
  const handleViewSession = (sessionId: string) => {
    router.push(`/analysis?session=${sessionId}`)
  }

  // Navigate to inspection subpage
  const handleInspectDataset = (datasetId: string) => {
    router.push(`/datasets/${datasetId}/inspection`)
  }

  return (
    <div className="space-y-6 font-mono text-slate-100 pb-12">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase">
            GEOSPATIAL INVENTORY NODE
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase text-[10px]">DATACENTER: ONLINE</span>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-400 text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(16,185,129,0.3)]">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider">{success}</span>
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
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(239,68,68,0.3)]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-[10px] uppercase hover:underline opacity-80 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* A. Available Demo Datasets (Full Width) */}
      <div className="border border-border bg-card/25 p-5 space-y-4 relative overflow-hidden rounded-sm">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[8px] text-primary tracking-widest uppercase">
          INDEX // AVAILABLE DEMO DATASETS
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-primary" />
          Available Demo Datasets
        </h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Geospatial imagery folders currently pre-loaded inside `datasets/demo/` on local disk.
        </p>

        {loadingDemos ? (
          <div className="flex items-center space-x-2 text-[10px] text-muted-foreground p-3 bg-muted/15 border border-border border-dashed">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>SCANNING DISK INDEX...</span>
          </div>
        ) : demoDatasets.length === 0 ? (
          <div className="text-[10px] text-amber-500 p-3 bg-amber-500/5 border border-amber-500/20">
            No demo datasets found. Add scene folders under datasets/demo/ to discover them.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {demoDatasets.map((ds, idx) => (
              <div key={idx} className="p-3 border border-border bg-background/30 flex flex-col space-y-1 hover:border-primary/50 transition-colors">
                <span className="text-foreground font-bold truncate text-[11px]">{ds.dataset_name}</span>
                <span className="text-[9px] text-muted-foreground truncate select-all">{ds.dataset_path}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Button to open dataset registration form modal */}
      <div className="flex justify-start">
        <button
          onClick={() => setShowRegisterModal(true)}
          className="px-5 py-2.5 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs flex items-center gap-2 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] rounded-sm"
        >
          <Plus className="w-4 h-4" />
          Register Dataset
        </button>
      </div>

      {/* B. Operational Dataset Registry (Registered Datasets Table) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            Operational Dataset Registry
          </h2>
          <button
            disabled={loadingRegistered}
            onClick={handleRefresh}
            className="inline-flex items-center space-x-1.5 text-xs text-primary hover:underline uppercase disabled:opacity-50 text-[10px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRegistered ? "animate-spin" : ""}`} />
            <span>Refresh list</span>
          </button>
        </div>

        {loadingRegistered && registered.length === 0 ? (
          <div className="border border-border bg-card/10 h-48 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>LOADING GEOSPATIAL REGISTRY LOGS...</span>
          </div>
        ) : registered.length === 0 ? (
          <div className="border border-dashed border-border bg-card/10 p-12 text-center flex flex-col items-center justify-center min-h-[200px] space-y-4">
            <Database className="w-8 h-8 text-primary/45 animate-pulse" />
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                No Registered Datasets Found
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                There are no registered datasets on the platform. Select Register Dataset above to link a scene or a custom folder path.
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-border bg-card/10 overflow-hidden relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/15 text-muted-foreground uppercase tracking-widest text-[10px]">
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Session ID</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-slate-300">
                  {registered.map((ds) => {
                    const isDeleting = deletingId === ds.dataset_id
                    return (
                      <tr
                        key={ds.dataset_id}
                        className="hover:bg-muted/5 transition-colors group"
                      >
                        <td className="p-4 font-bold text-foreground truncate max-w-[150px]" title={ds.dataset_name}>
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
                            {/* Inspect Subpage Route */}
                            <button
                              onClick={() => handleInspectDataset(ds.dataset_id)}
                              className="px-3 py-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white border border-cyan-500/25 hover:border-cyan-500 transition-all font-bold tracking-widest uppercase text-[9px] flex items-center gap-1"
                            >
                              <FileCode2 className="w-3.5 h-3.5" />
                              Inspect
                            </button>

                            {/* Original Dataset Viewer */}
                            <button
                              onClick={() => router.push(`/datasets/${ds.dataset_id}/viewer`)}
                              className="px-3 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 hover:border-primary transition-all font-bold tracking-widest uppercase text-[9px] flex items-center gap-1"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              Viewer
                            </button>

                            {/* Cloud Intelligence Viewer */}
                            <button
                              onClick={() => router.push(`/datasets/${ds.dataset_id}/cloud`)}
                              className="px-3 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/25 hover:border-emerald-500 transition-all font-bold tracking-widest uppercase text-[9px] flex items-center gap-1"
                            >
                              <CloudSun className="w-3.5 h-3.5" />
                              Cloud
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

      {/* Dialog Modal: Register Dataset */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-border bg-card max-w-md w-full p-6 space-y-4 shadow-[0_0_50px_-12px_rgba(6,182,212,0.25)] relative overflow-hidden font-mono text-xs text-slate-100">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[8px] text-primary tracking-widest uppercase">
              FORM // REGISTRY
            </div>

            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Register Dataset
              </h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              
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
                    className="w-full bg-background border border-border p-2 focus:outline-none focus:border-primary text-xs text-foreground rounded-sm"
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
                    className={`py-1.5 border font-bold uppercase tracking-wider rounded-sm ${
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
                    className={`py-1.5 border font-bold uppercase tracking-wider rounded-sm ${
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
                      className="w-full bg-background border border-border p-2 focus:outline-none focus:border-primary text-xs text-foreground rounded-sm"
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
                      className="w-full bg-background border border-border p-2 focus:outline-none focus:border-primary text-xs text-foreground rounded-sm"
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
                      className="w-full bg-background border border-border p-2 focus:outline-none focus:border-primary text-xs text-foreground rounded-sm"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={registering || sessions.length === 0}
                className="w-full mt-2 py-2.5 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] rounded-sm"
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
      )}

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-red-500/30 bg-card max-w-md w-full p-6 space-y-6 shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] relative overflow-hidden rounded-sm font-mono text-slate-100">
            <div className="absolute top-0 right-0 bg-red-500/10 border-l border-b border-border px-3 py-1 text-[8px] text-red-500 tracking-widest uppercase">
              ALERT // UNREGISTER DATA
            </div>
            <div className="flex items-start space-x-3 text-red-400">
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
            <div className="flex items-center justify-end space-x-3 text-xs">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border border-border bg-muted/20 hover:bg-muted/40 uppercase tracking-widest text-[10px] font-bold rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(confirmDeleteId)
                  setConfirmDeleteId(null)
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white uppercase tracking-widest text-[10px] font-bold shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)] rounded-sm"
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
