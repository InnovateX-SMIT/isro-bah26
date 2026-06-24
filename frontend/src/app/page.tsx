"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { checkBackendHealth } from "@/lib/api"
import { 
  ShieldCheck, Activity, Play, ServerCrash
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

      {/* 4. Workflow Overview */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">End-to-End Operational Pipeline</h2>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-border bg-card/25 font-mono text-xs">
          {[
            { num: "01", name: "Dataset Ingestion" },
            { num: "02", name: "Metadata Intelligence" },
            { num: "03", name: "Historical Discovery" },
            { num: "04", name: "Cloud Intelligence" },
            { num: "05", name: "Reconstruction" },
            { num: "06", name: "Confidence" }
          ].map((step, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span className="text-primary font-bold">{step.num}</span>
              <span className="text-foreground font-bold tracking-wide uppercase">{step.name}</span>
              {i < 5 && <span className="text-muted-foreground/45 ml-4">·</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
