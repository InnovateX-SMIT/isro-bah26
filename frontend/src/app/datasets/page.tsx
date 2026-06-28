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
  CloudSun,
  Sparkles,
  Eye,
  Clock,
  Shield,
  GitCompare
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
      setError("Failed to discover demo datasets.")
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
      setError("Failed to retrieve analysis sessions.")
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
      setError("Failed to load registered datasets.")
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
      triggerSuccess("Dataset registry refreshed.")
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
      triggerSuccess(`Dataset registration removed.`)
      await fetchRegistered(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || `Failed to delete dataset registration.`)
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
            Data Inventory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage and inspect registered LISS-IV satellite datasets
          </p>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-400 text-xs flex items-center justify-between rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-semibold">{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-xs hover:underline opacity-80 font-semibold"
          >
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
          <button
            onClick={() => setError(null)}
            className="text-xs hover:underline opacity-80 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* A. Available Demo Datasets */}
      <div className="border border-border bg-card/25 p-5 space-y-4 rounded-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-primary" />
          Available Demo Datasets
        </h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Pre-loaded LISS-IV imagery folders discovered on local disk.
        </p>

        {loadingDemos ? (
          <div className="flex items-center space-x-2 text-[10px] text-muted-foreground p-3 bg-muted/15 border border-border border-dashed rounded-lg">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Scanning for datasets...</span>
          </div>
        ) : demoDatasets.length === 0 ? (
          <div className="text-[10px] text-amber-500 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            No demo datasets found. Add scene folders under datasets/demo/ to discover them.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {demoDatasets.map((ds, idx) => (
              <div key={idx} className="p-3 border border-border bg-background/30 flex flex-col space-y-1 hover:border-primary/50 transition-colors rounded-lg">
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
          className="px-5 py-2.5 bg-primary text-primary-foreground font-bold tracking-wider uppercase text-xs flex items-center gap-2 hover:bg-primary/90 transition-all rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Register Dataset
        </button>
      </div>

      {/* B. Operational Dataset Registry (Registered Datasets) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            Registered Datasets
          </h2>
          <button
            disabled={loadingRegistered}
            onClick={handleRefresh}
            className="inline-flex items-center space-x-1.5 text-xs text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRegistered ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingRegistered && registered.length === 0 ? (
          <div className="border border-border bg-card/10 h-48 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2 rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Loading datasets...</span>
          </div>
        ) : registered.length === 0 ? (
          <div className="border border-dashed border-border bg-card/10 p-12 text-center flex flex-col items-center justify-center min-h-[200px] space-y-4 rounded-xl">
            <Database className="w-8 h-8 text-primary/45 animate-pulse" />
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                No Registered Datasets
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click "Register Dataset" above to link a satellite scene for analysis.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {registered.map((ds) => {
              const isDeleting = deletingId === ds.dataset_id
              return (
                <div
                  key={ds.dataset_id}
                  className="border border-border bg-card/20 rounded-xl p-5 hover:border-border/80 transition-all"
                >
                  {/* Dataset header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">{ds.dataset_name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="px-2 py-0.5 bg-muted/30 border border-border rounded-md uppercase font-semibold tracking-wider">
                          {ds.dataset_type}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-md uppercase font-semibold tracking-wider">
                          {ds.dataset_status}
                        </span>
                        <span className="text-muted-foreground/60">
                          Session: {ds.analysis_session_id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons — larger, clearly spaced */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Primary: Inspect */}
                    <button
                      onClick={() => handleInspectDataset(ds.dataset_id)}
                      className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wider uppercase text-xs flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      <FileCode2 className="w-4 h-4" />
                      Inspect
                    </button>

                    {/* Viewer */}
                    <button
                      onClick={() => router.push(`/datasets/${ds.dataset_id}/viewer`)}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-primary/30 font-bold tracking-wider uppercase text-xs flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Viewer
                    </button>

                    {/* Cloud */}
                    <button
                      onClick={() => router.push(`/datasets/${ds.dataset_id}/cloud`)}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-primary/30 font-bold tracking-wider uppercase text-xs flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      <CloudSun className="w-4 h-4" />
                      Cloud
                    </button>

                    {/* Temporal */}
                    <button
                      onClick={() => router.push(`/datasets/${ds.dataset_id}/temporal`)}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-primary/30 font-bold tracking-wider uppercase text-xs flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      <Clock className="w-4 h-4" />
                      Temporal
                    </button>

                    {/* Reconstruction */}
                    <button
                      onClick={() => router.push(`/datasets/${ds.dataset_id}/reconstruction`)}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-primary/30 font-bold tracking-wider uppercase text-xs flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Reconstruct
                    </button>

                    {/* Confidence */}
                    <button
                      onClick={() => router.push(`/datasets/${ds.dataset_id}/confidence`)}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-primary/30 font-bold tracking-wider uppercase text-xs flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      <Shield className="w-4 h-4" />
                      Confidence
                    </button>

                    {/* Comparison */}
                    <button
                      onClick={() => router.push(`/datasets/${ds.dataset_id}/comparison`)}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-primary/30 font-bold tracking-wider uppercase text-xs flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      <GitCompare className="w-4 h-4" />
                      Comparison
                    </button>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Session */}
                    <button
                      onClick={() => handleViewSession(ds.analysis_session_id)}
                      className="px-3 py-2 border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground font-semibold tracking-wider uppercase text-[10px] flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Session
                    </button>

                    {/* Unregister */}
                    <button
                      disabled={isDeleting}
                      onClick={() => setConfirmDeleteId(ds.dataset_id)}
                      className="px-3 py-2 border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-semibold tracking-wider uppercase text-[10px] flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialog Modal: Register Dataset */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-border bg-card max-w-md w-full p-6 space-y-5 shadow-2xl relative overflow-hidden font-mono text-xs text-slate-100 rounded-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Register Dataset
              </h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Field 1: Analysis Session dropdown */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                  Target Session
                </label>
                {loadingSessions ? (
                  <div className="flex items-center space-x-2 text-[10px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Loading Sessions...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-[10px] text-amber-500 leading-normal border border-amber-500/20 bg-amber-500/5 p-2 rounded-lg">
                    No active sessions. Create a session on the Analysis page first.
                  </div>
                ) : (
                  <select
                    value={formSessionId}
                    onChange={(e) => setFormSessionId(e.target.value)}
                    className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
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
                  Source Type
                </label>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setIsCustomPath(false)}
                    className={`py-2 border font-bold uppercase tracking-wider rounded-lg ${
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
                    className={`py-2 border font-bold uppercase tracking-wider rounded-lg ${
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
                    Select Scene
                  </label>
                  {demoDatasets.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground italic border border-border p-2 bg-muted/10 rounded-lg">
                      No discovered datasets.
                    </div>
                  ) : (
                    <select
                      value={selectedDemoPath}
                      onChange={(e) => handleDemoChange(e.target.value)}
                      className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
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
                      Scene Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hyderabad_LISS_IV"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      Folder Path
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. datasets/uploaded/scene1"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={registering || sessions.length === 0}
                className="w-full mt-2 py-3 bg-primary text-primary-foreground font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed rounded-lg"
              >
                {registering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Register Dataset
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
          <div className="border border-red-500/30 bg-card max-w-md w-full p-6 space-y-6 shadow-2xl relative overflow-hidden rounded-2xl font-mono text-slate-100">
            <div className="flex items-start space-x-3 text-red-400">
              <AlertTriangle className="w-5.5 h-5.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Remove Dataset
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  This will unregister dataset{" "}
                  <span className="font-mono text-foreground font-bold">
                    {confirmDeleteId.substring(0, 8)}...
                  </span>{" "}
                  from the platform. Raw satellite files on disk will not be affected.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 text-xs">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border border-border bg-muted/20 hover:bg-muted/40 uppercase tracking-wider text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(confirmDeleteId)
                  setConfirmDeleteId(null)
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white uppercase tracking-wider text-xs font-bold rounded-lg"
              >
                Remove
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
          <span>Loading datasets...</span>
        </div>
      }
    >
      <DatasetsDashboard />
    </Suspense>
  )
}
