"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Play,
  ShieldAlert,
  Cpu,
  Eye,
  Database,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Plus,
  Compass
} from "lucide-react"
import {
  createAnalysis,
  getAnalysisSessions,
  getAnalysisSession,
  deleteAnalysisSession
} from "@/lib/analysis-api"
import { AnalysisSession } from "@/lib/types/analysis"
import AnalysisStatsCard from "@/components/analysis/AnalysisStatsCard"
import AnalysisSessionTable from "@/components/analysis/AnalysisSessionTable"

function AnalysisSessionDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeSessionId = searchParams.get("session")

  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [activeSession, setActiveSession] = useState<AnalysisSession | null>(null)
  
  // Loading states
  const [loadingList, setLoadingList] = useState<boolean>(true)
  const [loadingActive, setLoadingActive] = useState<boolean>(false)
  const [creating, setCreating] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Status messages
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch all sessions
  const fetchSessions = async (showLoading = true) => {
    if (showLoading) setLoadingList(true)
    setError(null)
    try {
      const data = await getAnalysisSessions()
      setSessions(data)
    } catch (err: any) {
      console.error(err)
      setError(
        "Backend Offline. Ensure FastAPI server is running on port 8000 and database is initialized."
      )
    } finally {
      if (showLoading) setLoadingList(false)
    }
  }

  // Fetch active session details if selected
  const fetchActiveSession = async (id: string) => {
    setLoadingActive(true)
    setError(null)
    try {
      const data = await getAnalysisSession(id)
      setActiveSession(data)
    } catch (err: any) {
      console.error(err)
      setError(`Failed to retrieve session details for session ID ${id}.`)
      setActiveSession(null)
    } finally {
      setLoadingActive(false)
    }
  }

  // Load appropriate data based on router state
  useEffect(() => {
    if (activeSessionId) {
      fetchActiveSession(activeSessionId)
    } else {
      fetchSessions()
      setActiveSession(null)
    }
  }, [activeSessionId])

  // Trigger manual list refresh
  const handleRefresh = async () => {
    await fetchSessions(true)
    if (!error) {
      triggerSuccess("Session list refreshed.")
    }
  }

  // Create new session
  const handleCreateSession = async () => {
    setCreating(true)
    setError(null)
    try {
      const newSession = await createAnalysis()
      triggerSuccess(`Analysis Session ${newSession.session_id} successfully created.`)
      await fetchSessions(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to create new analysis session.")
    } finally {
      setCreating(false)
    }
  }

  // Delete session
  const handleDeleteSession = async (id: string) => {
    setDeletingId(id)
    setError(null)
    try {
      await deleteAnalysisSession(id)
      triggerSuccess(`Analysis Session ${id} successfully deleted.`)
      await fetchSessions(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || `Failed to delete session ${id}.`)
    } finally {
      setDeletingId(null)
    }
  }

  // Helper to show timed success alert
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => {
      setSuccessMessage((prev) => (prev === msg ? null : prev))
    }, 4000)
  }

  // Navigation handlers
  const handleOpenSession = (id: string) => {
    router.push(`/analysis?session=${id}`)
  }

  const handleBackToListing = () => {
    router.push("/analysis")
  }

  // Stats calculation
  const totalCount = sessions.length
  const activeCount = sessions.filter((s) => s.status === "active").length
  const completedCount = sessions.filter((s) => s.status === "completed").length

  // Render detail view if a session is selected
  if (activeSessionId) {
    return (
      <div className="space-y-6">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <button
              onClick={handleBackToListing}
              className="inline-flex items-center space-x-1 text-xs text-primary hover:underline font-mono uppercase"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Command Center</span>
            </button>
            <h1 className="text-xl font-bold tracking-wider text-primary font-mono uppercase">
              RECONSTRUCTION WORKFLOW
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest select-all font-mono">
              Session ID: {activeSessionId}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30 font-mono">
            {loadingActive ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-muted-foreground uppercase">LOADING TELEMETRY...</span>
              </>
            ) : activeSession ? (
              <>
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeSession.status === "active"
                      ? "bg-yellow-500 animate-pulse"
                      : activeSession.status === "completed"
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                ></span>
                <span className="text-muted-foreground uppercase">
                  Session State: {activeSession.status}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-destructive font-bold uppercase">DISCONNECTED</span>
              </>
            )}
          </div>
        </div>

        {/* Global Error Banner inside detailed view */}
        {error && (
          <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 font-mono text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(239,68,68,0.3)]">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[10px] uppercase hover:underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pipeline Telemetry Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stage 1: Ingestion */}
          <div className="border border-border bg-card/50 p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[9px] text-primary tracking-widest font-mono">
              STAGE-01
            </div>
            <h2 className="text-sm font-semibold tracking-wider uppercase flex items-center gap-2 text-foreground/95">
              <Database className="w-4 h-4 text-primary" />
              1. Ingest Dataset
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select local demo imagery or register a LISS-IV band directory.
            </p>
            <div className="border border-dashed border-border p-8 text-center text-xs text-muted-foreground bg-muted/10 font-mono">
              [LOCKED] Waiting for Phase 2 Dataset registration
            </div>
          </div>

          {/* Stage 2: Cloud Masking */}
          <div className="border border-border bg-card/50 p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[9px] text-primary tracking-widest font-mono">
              STAGE-02
            </div>
            <h2 className="text-sm font-semibold tracking-wider uppercase flex items-center gap-2 text-foreground/95">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              2. Cloud Intelligence
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate pixel-level cloud transparency maps and shadows.
            </p>
            <div className="h-[98px] border border-border bg-muted/20 flex flex-col items-center justify-center text-xs text-muted-foreground font-mono space-y-1">
              <span>Detections: --</span>
              <span>Mask Coverage: --</span>
            </div>
          </div>

          {/* Stage 3: Generative Inpainting */}
          <div className="border border-border bg-card/50 p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[9px] text-primary tracking-widest font-mono">
              STAGE-03
            </div>
            <h2 className="text-sm font-semibold tracking-wider uppercase flex items-center gap-2 text-foreground/95">
              <Cpu className="w-4 h-4 text-emerald-500" />
              3. AI Reconstruction
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fuse multi-temporal guidance observations to restore occlusions.
            </p>
            <button
              disabled
              className="w-full py-2 bg-primary/10 text-primary border border-primary/25 rounded text-xs font-semibold tracking-wider flex items-center justify-center gap-2 cursor-not-allowed font-mono"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              RUN RESTORATION
            </button>
          </div>
        </div>

        {/* Large Workspace Panel */}
        <div className="border border-border bg-card/30 min-h-[350px] flex flex-col items-center justify-center p-8 text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-4 left-4 font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
            OPERATIONAL DISPLAY ENGINE
          </div>
          <Compass className="w-9 h-9 text-primary/45 animate-spin-slow" />
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/90 font-mono">
              Session Ingest Pipeline Standby
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This session has been initialized. Complete the **Phase 2 — Dataset Intelligence**
              and **Phase 3 — Metadata Intelligence** layers to proceed with loading raster files
              into the operational display.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render main listing view (Command Center)
  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary font-mono uppercase">
            ANALYSIS COMMAND CENTER
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs border border-border px-3 py-1.5 bg-muted/30 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground uppercase">Console: ONLINE</span>
        </div>
      </div>

      {/* Stats Cards */}
      <AnalysisStatsCard
        total={totalCount}
        active={activeCount}
        completed={completedCount}
      />

      {/* Success / Error notification bar */}
      {successMessage && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 px-4 py-3.5 text-emerald-400 font-mono text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(16,185,129,0.3)] transition-all">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-bold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-[10px] uppercase hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3.5 text-red-400 font-mono text-xs flex items-center justify-between shadow-[0_0_10px_-5px_rgba(239,68,68,0.3)] transition-all">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-[10px] uppercase hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Actions / Session Listing Stacked Layout */}
      <div className="space-y-6">
        {/* Top: Create New Session card */}
        <div className="border border-border bg-card/45 p-6 space-y-4 relative overflow-hidden rounded-lg">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[8px] text-primary tracking-widest font-mono uppercase">
            ACTION // LAUNCH
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-primary" />
            Start Session
          </h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Create an isolated geospatial tracking environment for cloud removal tasks. This will allocate database references for tracking coordinates, cloud density, and AI metadata.
            </p>
            <button
              disabled={creating}
              onClick={handleCreateSession}
              className="py-2.5 px-6 bg-primary text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed rounded-md shrink-0"
            >
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  CREATING...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  START ANALYSIS
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom: Sessions list table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
              Geospatial Operations Index
            </h2>
            <button
              disabled={loadingList}
              onClick={handleRefresh}
              className="inline-flex items-center space-x-1.5 text-xs text-primary hover:underline font-mono uppercase disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
              <span>Refresh list</span>
            </button>
          </div>

          {loadingList && sessions.length === 0 ? (
            <div className="border border-border bg-card/10 h-64 flex flex-col items-center justify-center font-mono text-xs text-muted-foreground space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>CONNECTING TO CORE METADATA DATABASE...</span>
            </div>
          ) : sessions.length === 0 ? (
            /* Empty State */
            <div className="border border-dashed border-border bg-card/10 p-12 text-center space-y-6 flex flex-col items-center justify-center min-h-[300px] rounded-lg">
              <div className="space-y-2 max-w-md">
                <AlertTriangle className="w-8 h-8 text-primary/45 mx-auto animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-mono">
                  No Analysis Sessions Found
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Create your first analysis session to begin a geospatial reconstruction workflow.
                  This will allocate database references for tracking coordinates, cloud density, and AI metadata.
                </p>
              </div>
              <button
                disabled={creating}
                onClick={handleCreateSession}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] rounded-md"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                CREATE INITIAL SESSION
              </button>
            </div>
          ) : (
            /* Session Table */
            <AnalysisSessionTable
              sessions={sessions}
              onView={handleOpenSession}
              onDelete={handleDeleteSession}
              isDeletingId={deletingId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-xs text-muted-foreground p-6 flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>LOADING OPERATIONAL CONSOLE MODULES...</span>
        </div>
      }
    >
      <AnalysisSessionDashboard />
    </Suspense>
  )
}
