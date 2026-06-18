"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { checkBackendHealth } from "@/lib/api"
import { 
  Terminal, ShieldCheck, ShieldAlert, Cpu, 
  Database, Activity, ArrowRight, Layers, 
  HelpCircle, Compass, Play, ServerCrash
} from "lucide-react"

export default function MissionControlLander() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "offline">("checking")
  const [dbStatus, setDbStatus] = useState<string>("UNKNOWN")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [retryCount, setRetryCount] = useState<number>(0)

  // Polling backend health every 5 seconds
  useEffect(() => {
    let active = true

    async function checkHealth() {
      try {
        const res = await checkBackendHealth()
        if (active) {
          if (res.status === "healthy") {
            setBackendStatus("connected")
            setDbStatus("ONLINE (SQLITE)")
            setErrorMsg("")
          } else {
            setBackendStatus("offline")
            setErrorMsg(`Unexpected status: ${res.status}`)
          }
        }
      } catch (err: any) {
        if (active) {
          setBackendStatus("offline")
          setDbStatus("OFFLINE")
          setErrorMsg(err.message || "Failed to fetch backend health endpoint")
        }
      }
    }

    checkHealth()
    const interval = setInterval(() => {
      setRetryCount(prev => prev + 1)
    }, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [retryCount])

  const workflowSteps = [
    { num: "01", name: "Dataset Ingestion", desc: "Demo dataset preloaded or user uploads multi-band LISS-IV GeoTIFF.", icon: Database },
    { num: "02", name: "Metadata Intelligence", desc: "Automatic extraction of bands, coordinates, projection systems, and sensor metadata.", icon: Layers },
    { num: "03", name: "Historical Discovery", desc: "Discover and retrieve temporal reference observations of the target region.", icon: Compass },
    { num: "04", name: "Cloud Segmentation", desc: "AI-based cloud mask and shadow generation using deep neural networks.", icon: ShieldAlert },
    { num: "05", name: "Generative Inpainting", desc: "Reconstruct occluded terrains using multi-temporal fusion models.", icon: Cpu },
    { num: "06", name: "Confidence Evaluation", desc: "Estimate pixel-level restoration reliability scoring and output GeoTIFF.", icon: ShieldCheck }
  ]

  const techStack = [
    { category: "Frontend Core", items: ["Next.js (App Router)", "TypeScript", "TailwindCSS", "shadcn/ui"] },
    { category: "Backend Engine", items: ["FastAPI (Asynchronous)", "Python 3.14", "Uvicorn"] },
    { category: "Storage Layer", items: ["SQLite (SQLAlchemy 2.0)", "Local-First Session Cache"] },
    { category: "GIS & Reconstruction", items: ["GDAL & Rasterio Foundation", "PyTorch Core AI Models", "OpenCV & NumPy"] },
    { category: "DevOps Orchestration", items: ["Docker Containerization", "Docker Compose Orchestration"] }
  ]

  return (
    <div className="space-y-12 pb-12">
      {/* 1. Hero Section */}
      <section className="border border-border bg-card/25 p-8 md:p-12 relative overflow-hidden glow-cyan">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[10px] text-primary tracking-widest font-mono uppercase">
          OPERATIONAL STATE // ACTIVE
        </div>
        
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary font-mono tracking-widest uppercase">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Project Phase 0: Foundation Node</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-wider text-foreground">
              AI-POWERED GEOSPATIAL <span className="text-primary">RECONSTRUCTION</span> PLATFORM
            </h1>
            <p className="text-sm md:text-base text-muted-foreground uppercase tracking-widest font-mono">
              Generative AI-Based Cloud Removal and Reconstruction for LISS-IV Satellite Imagery
            </p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            A local-first, modular mission control platform utilizing historical references and deep generative neural networks to restore analysis-ready geospatial features underneath dense cloud cover.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link 
              href="/analysis" 
              className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-primary/95 transition-colors shadow-[0_0_15px_-3px_rgba(6,182,212,0.5)]"
            >
              <Play className="w-4 h-4 fill-primary-foreground" />
              START RECONSTRUCTION PIPELINE
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Primary Acceptance Test: Backend Connection Status */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">Acceptance Criteria Check</h2>
        {backendStatus === "checking" && (
          <div className="border border-yellow-500/20 bg-yellow-500/5 px-4 py-3.5 flex items-center justify-between text-yellow-500 font-mono text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping"></span>
              <span>VERIFYING CONNECTION TO FASTAPI CORE NODE...</span>
            </div>
            <span className="text-[10px] opacity-75">PINGING PORT 8000</span>
          </div>
        )}

        {backendStatus === "connected" && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 px-4 py-3.5 flex items-center justify-between text-emerald-400 font-mono text-xs shadow-[0_0_10px_-5px_rgba(16,185,129,0.3)]">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span className="font-bold">Backend Connected</span>
            </div>
            <div className="flex items-center space-x-6 text-[10px]">
              <span>NODE STATUS: <span className="text-emerald-400 font-bold">HEALTHY</span></span>
              <span>DB: <span className="text-foreground">{dbStatus}</span></span>
              <span className="hidden md:inline bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 uppercase tracking-widest text-[9px]">ONLINE</span>
            </div>
          </div>
        )}

        {backendStatus === "offline" && (
          <div className="border border-destructive/30 bg-destructive/5 px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-destructive font-mono text-xs">
            <div className="flex items-start md:items-center space-x-2.5">
              <ServerCrash className="w-5 h-5 text-destructive animate-pulse" />
              <div>
                <span className="font-bold">Backend Offline</span>
                <span className="text-muted-foreground text-[10px] ml-2 uppercase font-mono">({errorMsg})</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-[10px]">
              <span>RETRIES: <span className="text-foreground">{retryCount}</span></span>
              <span className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 uppercase tracking-widest text-[9px]">TIMEOUT / OFFLINE</span>
            </div>
          </div>
        )}
      </section>

      {/* 3. Project Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border border-border bg-card/10 p-6 space-y-4 relative overflow-hidden">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">Mission Summary</h2>
          <h3 className="text-lg font-bold text-foreground">Explainable Generative Sat-Inpainting</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The platform is engineered around the LISS-IV remote sensing standards. Instead of classical black-box image inpainting, the platform establishes physical geospatial explainability: extracting satellite metadata projections, validating bands dynamically, checking temporal historical orbits, generating cloud confidence scores, and preserving actual coordinate spatial alignments.
          </p>
        </div>

        <div className="border border-border bg-card/10 p-6 space-y-4 relative overflow-hidden">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">Local-First Storage</h2>
          <h3 className="text-lg font-bold text-foreground">SQLite Session Management</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All user sessions, processed dataset logs, coordinates footprint history, and AI metrics are recorded inside a local-first SQLite relational node. This layout removes infrastructure hosting complexities during operational hackathon presentations and permits instant session restore.
          </p>
        </div>
      </section>

      {/* 4. Workflow Overview */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">End-to-End Operational Pipeline</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
          {workflowSteps.map((step, i) => (
            <div key={i} className="border border-border bg-card/40 hover:bg-card/70 p-4 space-y-2.5 transition-colors relative overflow-hidden group">
              <div className="absolute top-2 right-2 text-primary/10 group-hover:text-primary/20 text-4xl font-extrabold transition-colors">
                {step.num}
              </div>
              <step.icon className="w-5 h-5 text-primary" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">{step.name}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Technology Overview */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Architectural Technology Matrix</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {techStack.map((stack, i) => (
            <div key={i} className="border border-border bg-card/20 p-4 space-y-3 font-mono text-[11px]">
              <h3 className="text-primary font-bold uppercase border-b border-border pb-1.5">{stack.category}</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                {stack.items.map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 bg-primary/60 rounded-full shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
