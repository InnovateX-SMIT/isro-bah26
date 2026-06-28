"use client"

import React from "react"
import Link from "next/link"
import { Play } from "lucide-react"

export default function MissionControlLander() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <section className="w-full max-w-4xl border border-border bg-card/25 p-12 md:p-16 rounded-lg relative overflow-hidden text-center space-y-8">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-3 py-1 text-[9px] text-primary tracking-widest font-mono uppercase">
          OPERATIONAL SYSTEM
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-wider text-foreground">
            AI-POWERED GEOSPATIAL <span className="text-primary">RECONSTRUCTION</span> PLATFORM
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest font-mono max-w-2xl mx-auto leading-relaxed">
            Generative AI-Based Cloud Removal and Reconstruction for LISS-IV Satellite Imagery
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <Link 
            href="/analysis" 
            className="px-8 py-3.5 bg-primary text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-primary/95 transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] rounded-md"
          >
            <Play className="w-4 h-4 fill-primary-foreground" />
            START RECONSTRUCTION PIPELINE
          </Link>
        </div>
      </section>
    </div>
  )
}
