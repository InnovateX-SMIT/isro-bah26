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
  deleteDataset,
  uploadDataset,
  finalizeUpload
} from "@/lib/dataset-api"
import { getAnalysisSessions } from "@/lib/analysis-api"
import { DemoDataset, Dataset } from "@/lib/types/dataset"
import { AnalysisSession } from "@/lib/types/analysis"

const OFFICIAL_DEMO_DATASET_URL = "https://drive.google.com/drive/folders/1xB-oTqETR_O_9ucFu0hT_jebR5xgGZRO?usp=sharing"

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

  // Metadata Recovery States
  const [showMetadataForm, setShowMetadataForm] = useState<boolean>(false)
  const [tempSessionId, setTempSessionId] = useState<string>("")
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [acqDate, setAcqDate] = useState<string>("")
  const [crsVal, setCrsVal] = useState<string>("")
  const [latVal, setLatVal] = useState<string>("")
  const [lonVal, setLonVal] = useState<string>("")
  const [sensorVal, setSensorVal] = useState<string>("LISS-IV")
  const [satelliteVal, setSatelliteVal] = useState<string>("IRS-P6")
  const [finalizing, setFinalizing] = useState<boolean>(false)

  // Form states
  const [formSessionId, setFormSessionId] = useState<string>("")
  const [selectedDemoPath, setSelectedDemoPath] = useState<string>("")
  const [selectedDemoName, setSelectedDemoName] = useState<string>("")
  const [isCustomPath, setIsCustomPath] = useState<boolean>(false)
  const [customName, setCustomName] = useState<string>("")
  const [customPath, setCustomPath] = useState<string>("")

  // Upload state variables
  const [registerSource, setRegisterSource] = useState<"demo" | "custom" | "upload">("demo")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadName, setUploadName] = useState<string>("")

  // Two-step Delete flow state
  const [deleteFlowId, setDeleteFlowId] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<number>(0)

  const initiateDeleteFlow = (id: string) => {
    setDeleteFlowId(id)
    setDeleteStep(1)
  }

  const handleNextDeleteStep = () => {
    setDeleteStep(2)
  }

  const handleCancelDelete = () => {
    setDeleteFlowId(null)
    setDeleteStep(0)
  }

  const executeDelete = async () => {
    if (deleteFlowId) {
      const id = deleteFlowId
      handleCancelDelete()
      await handleDelete(id)
    }
  }

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

    if (registerSource === "upload") {
      if (!uploadFile) {
        setError("Please select a ZIP file containing the LISS-IV dataset.")
        return
      }
      setUploading(true)
      setUploadProgress(0)
      try {
        const uploadRes = await uploadDataset(
          formSessionId,
          uploadName,
          uploadFile,
          (progress) => {
            setUploadProgress(progress)
          }
        )
        
        if (uploadRes.status === "METADATA_REQUIRED") {
          setTempSessionId(uploadRes.temp_session_id || "")
          setMissingFields(uploadRes.missing_fields || [])
          
          const meta = uploadRes.recovered_metadata || {}
          setAcqDate(meta.acquisition_date || "")
          setCrsVal(meta.crs || "")
          setLatVal(meta.latitude !== null && meta.latitude !== undefined ? String(meta.latitude) : "")
          setLonVal(meta.longitude !== null && meta.longitude !== undefined ? String(meta.longitude) : "")
          setSensorVal(meta.sensor || "LISS-IV")
          setSatelliteVal(meta.satellite || "IRS-P6")
          
          setShowMetadataForm(true)
        } else {
          triggerSuccess(`Dataset '${uploadName || uploadFile.name}' uploaded and registered successfully.`)
          setUploadFile(null)
          setUploadName("")
          setShowRegisterModal(false)
          await fetchRegistered(false)
        }
      } catch (err: any) {
        console.error(err)
        setError(`${err.message || "Failed to upload and register dataset"}. (Tip: If registration or processing fails, please continue with the pre-seeded demo data that is already pre-loaded.)`)
      } finally {
        setUploading(false)
        setUploadProgress(null)
      }
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
      setError(`${err.message || "Failed to register dataset"}. (Tip: If registration or processing fails, please continue with the pre-seeded demo data that is already pre-loaded.)`)
    } finally {
      setRegistering(false)
    }
  }

  // Finalize dataset upload registration with custom metadata
  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFinalizing(true)

    try {
      const finalName = uploadName || (uploadFile ? uploadFile.name.replace(".zip", "") : "uploaded_dataset")
      await finalizeUpload({
        temp_session_id: tempSessionId,
        analysis_session_id: formSessionId,
        dataset_name: finalName,
        metadata: {
          acquisition_date: acqDate,
          crs: crsVal,
          latitude: parseFloat(latVal),
          longitude: parseFloat(lonVal),
          sensor: sensorVal,
          satellite: satelliteVal
        }
      })

      triggerSuccess(`Dataset '${finalName}' registered successfully with custom metadata.`)
      
      // Reset fields
      setUploadFile(null)
      setUploadName("")
      setShowRegisterModal(false)
      setShowMetadataForm(false)
      setTempSessionId("")
      setMissingFields([])
      await fetchRegistered(false)
    } catch (err: any) {
      console.error(err)
      setError(`${err.message || "Failed to finalize registration"}. (Tip: If registration or processing fails, please continue with the pre-seeded demo data that is already pre-loaded.)`)
    } finally {
      setFinalizing(false)
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

                     {/* Spacer */}
                    <div className="flex-1" />

                    {/* Delete Data & Purge */}
                    <button
                      disabled={isDeleting}
                      onClick={() => initiateDeleteFlow(ds.dataset_id)}
                      className="px-3 py-2 border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-semibold tracking-wider uppercase text-[10px] flex items-center gap-1.5 rounded-lg transition-all"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Delete
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
          <div className="border border-border bg-card max-w-2xl w-full p-6 space-y-5 shadow-2xl relative overflow-hidden font-mono text-xs text-slate-100 rounded-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                {showMetadataForm ? "Recover Missing Metadata" : "Register Dataset"}
              </h2>
              <button
                onClick={() => {
                  setShowRegisterModal(false)
                  setShowMetadataForm(false)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showMetadataForm ? (
              <form onSubmit={handleFinalize} className="space-y-4">
                <div className="text-[10px] text-amber-500 border border-amber-500/20 bg-amber-500/5 p-2.5 rounded-lg leading-normal uppercase">
                  Dataset uploaded successfully, but some mandatory fields are missing. Please complete them to finalize registration.
                </div>

                {/* Field 1: Acquisition Date */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-bold tracking-wider ${
                    missingFields.includes("acquisition_date") ? "text-amber-500 font-extrabold" : "text-muted-foreground"
                  }`}>
                    Acquisition Date (YYYY-MM-DD)* {missingFields.includes("acquisition_date") && "(REQUIRED/MISSING)"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2025-08-12"
                    value={acqDate}
                    onChange={(e) => setAcqDate(e.target.value)}
                    className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                  />
                </div>

                {/* Field 2: CRS */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-bold tracking-wider ${
                    missingFields.includes("crs") ? "text-amber-500 font-extrabold" : "text-muted-foreground"
                  }`}>
                    Coordinate Reference System (CRS)* {missingFields.includes("crs") && "(REQUIRED/MISSING)"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EPSG:32643"
                    value={crsVal}
                    onChange={(e) => setCrsVal(e.target.value)}
                    className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                  />
                </div>

                {/* Fields 3 & 4: Latitude & Longitude in 2 cols */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={`text-[10px] uppercase font-bold tracking-wider ${
                      missingFields.includes("latitude") ? "text-amber-500 font-extrabold" : "text-muted-foreground"
                    }`}>
                      Latitude* {missingFields.includes("latitude") && "(MISSING)"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 17.385"
                      value={latVal}
                      onChange={(e) => setLatVal(e.target.value)}
                      className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-[10px] uppercase font-bold tracking-wider ${
                      missingFields.includes("longitude") ? "text-amber-500 font-extrabold" : "text-muted-foreground"
                    }`}>
                      Longitude* {missingFields.includes("longitude") && "(MISSING)"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 78.486"
                      value={lonVal}
                      onChange={(e) => setLonVal(e.target.value)}
                      className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                    />
                  </div>
                </div>

                {/* Fields 5 & 6: Sensor & Satellite */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      Sensor
                    </label>
                    <input
                      type="text"
                      required
                      value={sensorVal}
                      onChange={(e) => setSensorVal(e.target.value)}
                      className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      Satellite
                    </label>
                    <input
                      type="text"
                      required
                      value={satelliteVal}
                      onChange={(e) => setSatelliteVal(e.target.value)}
                      className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                    />
                  </div>
                </div>

                {/* Submit button for finalizing */}
                <button
                  type="submit"
                  disabled={finalizing}
                  className="w-full mt-2 py-3 bg-primary text-primary-foreground font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed rounded-lg"
                >
                  {finalizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Finalizing Registration...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Complete Registration</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
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
                      onClick={() => {
                        setRegisterSource("demo")
                        setIsCustomPath(false)
                      }}
                      className={`py-2 border font-bold uppercase tracking-wider rounded-lg ${
                        registerSource === "demo"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/10 text-muted-foreground hover:bg-muted/20"
                      }`}
                    >
                      Demo Scene
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterSource("upload")
                        setIsCustomPath(false)
                      }}
                      className={`py-2 border font-bold uppercase tracking-wider rounded-lg ${
                        registerSource === "upload"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/10 text-muted-foreground hover:bg-muted/20"
                      }`}
                    >
                      Upload ZIP
                    </button>
                  </div>
                </div>

                {/* Field 3: Dataset select/inputs */}
                {registerSource === "demo" && (
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
                )}

                {registerSource === "upload" && (
                  /* Upload ZIP inputs */
                  <div className="space-y-4">
                    {/* Official Demo Dataset Download Help Box - Placed FIRST */}
                    <div className="pb-4 border-b border-border/60 space-y-3 font-sans text-slate-300">
                      <div className="flex items-center space-x-2 text-primary">
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Recommended for First-Time Users</span>
                      </div>
                      
                      <div className="space-y-1 text-[11px] leading-relaxed">
                        <p className="font-semibold text-slate-100 font-mono text-[10px] uppercase tracking-wider">Don't have a LISS-IV dataset?</p>
                        <p className="text-muted-foreground">Download the official pre-packaged demo dataset containing the necessary Green, Red, and NIR band TIFF files to run the entire analysis pipeline.</p>
                      </div>

                      <a
                        href={OFFICIAL_DEMO_DATASET_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary font-bold tracking-wider uppercase text-[10px] rounded-lg transition-all font-mono"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        Download Official Demo Dataset
                      </a>

                      <div className="text-[10px] text-muted-foreground space-y-1.5 pt-1">
                        <p className="font-bold uppercase tracking-wider text-slate-400 font-mono">Setup Guide:</p>
                        <ol className="list-decimal list-inside space-y-0.5 font-mono text-[9px] uppercase tracking-wide">
                          <li>Create a new Analysis Session.</li>
                          <li>Download and save the official demo ZIP archive.</li>
                          <li>Browse and select the downloaded ZIP file below.</li>
                          <li>Click <b>Upload & Register</b> to start ingestion.</li>
                          <li>Begin Dataset Inspection and run the temporal pipelines.</li>
                        </ol>
                        <p className="italic pt-1 leading-normal text-[9px] font-mono tracking-wide text-slate-400">
                          * The demo dataset only needs to be downloaded once. After downloading, upload the ZIP and the platform will automatically extract, validate, and register it.
                        </p>
                      </div>
                    </div>

                    {/* Ingestion upload controls - Placed SECOND */}
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                          Dataset Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Hyderabad_LISS_IV (Leave blank to use ZIP name)"
                          value={uploadName}
                          onChange={(e) => setUploadName(e.target.value)}
                          className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                          LISS-IV ZIP Archive
                        </label>
                        <input
                          type="file"
                          accept=".zip"
                          required
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setUploadFile(e.target.files[0])
                            }
                          }}
                          className="w-full bg-background border border-border p-2.5 focus:outline-none focus:border-primary text-xs text-foreground file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Progress Bar if uploading */}
                {uploading && uploadProgress !== null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <span>Uploading & Processing</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={registering || uploading || sessions.length === 0}
                  className="w-full mt-2 py-3 bg-primary text-primary-foreground font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed rounded-lg"
                >
                  {registering || uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {uploading ? "Uploading & Processing..." : "Registering..."}
                    </>
                  ) : (
                    <>
                      {registerSource === "upload" ? <RefreshCw className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {registerSource === "upload" ? "Upload & Register" : "Register Dataset"}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Confirm Deletion */}
      {deleteStep === 1 && deleteFlowId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-red-500/30 bg-card max-w-md w-full p-6 space-y-6 shadow-2xl relative overflow-hidden rounded-2xl font-mono text-slate-100">
            <div className="absolute top-0 right-0 bg-red-500/10 border-l border-b border-border px-3 py-1 text-[8px] text-red-500 tracking-widest uppercase">
              PROMPT // DELETION STEP 1
            </div>
            <div className="flex items-start space-x-3 text-red-400">
              <AlertTriangle className="w-5.5 h-5.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Delete Generated Data?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  Are you sure you want to delete all generated files and registration record for dataset{" "}
                  <span className="font-mono text-foreground font-bold">
                    {deleteFlowId.substring(0, 8)}...
                  </span>
                  ?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 text-xs">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 border border-border bg-muted/20 hover:bg-muted/40 uppercase tracking-wider text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleNextDeleteStep}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white uppercase tracking-wider text-xs font-bold rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Confirm Purge */}
      {deleteStep === 2 && deleteFlowId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-red-500/30 bg-card max-w-md w-full p-6 space-y-6 shadow-2xl relative overflow-hidden rounded-2xl font-mono text-slate-100">
            <div className="absolute top-0 right-0 bg-red-500/10 border-l border-b border-border px-3 py-1 text-[8px] text-red-500 tracking-widest uppercase">
              WARNING // CRITICAL PURGE
            </div>
            <div className="flex items-start space-x-3 text-red-500">
              <AlertTriangle className="w-5.5 h-5.5 shrink-0 animate-bounce" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Are you absolutely sure?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  This will permanently delete all previews, cloud masks, reconstructions, and temporal reference files from disk. This operation is irreversible!
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 text-xs">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 border border-border bg-muted/20 hover:bg-muted/40 uppercase tracking-wider text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white uppercase tracking-wider text-xs font-bold shadow-[0_0_15px_-3px_rgba(239,68,68,0.6)] rounded-lg"
              >
                Yes, delete everything
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
