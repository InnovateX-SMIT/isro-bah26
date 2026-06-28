"use client"

import React, { useEffect, useState } from "react"
import { Shield, Clock, HardDrive, Cpu } from "lucide-react"

export default function ClientHeader() {
  const [time, setTime] = useState<string>("")

  useEffect(() => {
    // Initialize time on client to avoid hydration mismatch
    const formatTime = () => {
      const now = new Date()
      return now.toISOString().replace("T", " ").substring(0, 19) + " UTC"
    }
    setTime(formatTime())
    
    const interval = setInterval(() => {
      setTime(formatTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10 shrink-0 relative overflow-hidden">
      {/* Scanline decorative beam */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none"></div>

      <div className="flex items-center space-x-3">
        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
        <div>
          <span className="font-mono text-xs text-primary/80 uppercase tracking-widest font-bold">AI-Powered Satellite Reconstruction</span>
          <h1 className="text-sm font-black tracking-widest uppercase text-foreground/95 -mt-0.5">GEOSPATIAL MISSION CONTROL</h1>
        </div>
      </div>

      {/* Telemetry and System Stats */}
      <div className="flex items-center space-x-6 font-mono text-[10px] text-muted-foreground">
        <div className="hidden md:flex items-center space-x-1.5 border border-border/40 px-2 py-0.5 bg-muted/10">
          <Cpu className="w-3.5 h-3.5 text-primary/70" />
          <span className="uppercase text-muted-foreground/80">CPU:</span>
          <span className="text-foreground/90">NOMINAL</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-1.5 border border-border/40 px-2 py-0.5 bg-muted/10">
          <HardDrive className="w-3.5 h-3.5 text-primary/70" />
          <span className="uppercase text-muted-foreground/80">DB:</span>
          <span className="text-emerald-500 font-bold">SQLITE_ONLINE</span>
        </div>

        <div className="flex items-center space-x-1.5 border border-primary/20 px-2 py-0.5 bg-primary/5 text-primary">
          <Clock className="w-3.5 h-3.5" />
          <span>{time || "LOADING TELEMETRY..."}</span>
        </div>
      </div>
    </header>
  )
}
