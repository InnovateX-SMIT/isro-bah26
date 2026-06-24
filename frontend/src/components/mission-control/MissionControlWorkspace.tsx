import React from "react"
import Link from "next/link"
import { MissionControlProfile } from "@/lib/types/mission-control"
import MissionControlStatusBar from "./MissionControlStatusBar"
import { 
  MapPin, 
  Compass, 
  Clock, 
  Shield, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Cloud, 
  Cpu, 
  Activity, 
  Lock,
  Database,
  Globe
} from "lucide-react"

interface MissionControlWorkspaceProps {
  profile: MissionControlProfile
  onRefresh?: () => void
}

export default function MissionControlWorkspace({ profile }: MissionControlWorkspaceProps) {
  const { dataset, metadata, geospatial, location, context, status } = profile

  // Audit checklist triggers
  const hasCoordinates = geospatial && geospatial.center.lat !== undefined && geospatial.center.lon !== undefined
  const hasCrs = (geospatial && (geospatial.crs || geospatial.epsg)) || (metadata && (metadata.coordinate_system || metadata.epsg_code))
  const hasFootprint = geospatial && geospatial.footprint && geospatial.footprint.length > 0
  const hasLocation = location && location.country !== undefined && location.country !== "Unknown"

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* 1. Readiness status indicators matrix */}
      <MissionControlStatusBar status={status} />

      {/* 2. Geospatial Intelligence Section - Checklist Audit */}
      <div className="border border-border bg-card/25 p-4 space-y-3 text-[10px] relative overflow-hidden rounded-sm">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
          AUDIT // GEOSPATIAL
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" />
          GEOSPATIAL INTELLIGENCE CORE SYSTEM AUDIT
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className={`flex items-center justify-between p-2.5 border rounded-sm transition-all duration-300 ${
            hasCoordinates 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Coordinates Identified</span>
            {hasCoordinates ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-sm transition-all duration-300 ${
            hasCrs 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">CRS Identified</span>
            {hasCrs ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-sm transition-all duration-300 ${
            hasFootprint 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Footprint Generated</span>
            {hasFootprint ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>

          <div className={`flex items-center justify-between p-2.5 border rounded-sm transition-all duration-300 ${
            hasLocation 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-500/80"
          }`}>
            <span className="uppercase text-[9px] tracking-wide">Geographic Context Generated</span>
            {hasLocation ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500/50 shrink-0" />}
          </div>
        </div>
      </div>

      {/* 3. Overview Grid of Dedicated Subpages & Future Phases */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* SUBPAGE A: Geospatial Intelligence */}
        <div className="border border-border bg-card/20 p-5 rounded-sm flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-primary font-bold tracking-widest uppercase">MODULE // ACTIVE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
              <Globe className="w-4 h-4 text-primary" />
              Geospatial Intelligence
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Analyze map footprints, bounding limits, geodetic coordinates, and CRS identifiers dynamically.
            </p>
            {geospatial && (
              <div className="bg-background/40 p-2.5 text-[9px] text-slate-300 border border-border/40 space-y-1">
                <div>Center Lat: {geospatial.center.lat.toFixed(4)} N</div>
                <div>Center Lon: {geospatial.center.lon.toFixed(4)} E</div>
                <div className="truncate">CRS: {geospatial.crs || "LISS-IV UTM Grid"}</div>
              </div>
            )}
          </div>
          <Link
            href={`/mission-control/geospatial?dataset=${dataset.dataset_id}`}
            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Launch Geospatial Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* SUBPAGE B: Mission Briefing & Ecological Context */}
        <div className="border border-border bg-card/20 p-5 rounded-sm flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-primary font-bold tracking-widest uppercase">MODULE // ACTIVE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
              <MapPin className="w-4 h-4 text-primary" />
              Briefing & Context
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Consolidate physical administrative locks, physiographic terrain properties, and ecological profiles.
            </p>
            {location && (
              <div className="bg-background/40 p-2.5 text-[9px] text-slate-300 border border-border/40 space-y-1">
                <div className="truncate">Country: {location.country || "India"}</div>
                <div className="truncate">Province: {location.state}</div>
                <div className="truncate">District: {location.district}</div>
              </div>
            )}
          </div>
          <Link
            href={`/mission-control/briefing?dataset=${dataset.dataset_id}`}
            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Open Briefing & Context</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* SUBPAGE C: Temporal Intelligence */}
        <div className="border border-border bg-card/20 p-5 rounded-sm flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-primary font-bold tracking-widest uppercase">MODULE // ACTIVE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
              <Clock className="w-4 h-4 text-primary" />
              Temporal Intelligence
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Query historical earth archives, run decay equation algorithms, and compile multitemporal references.
            </p>
            <div className="bg-background/40 p-2.5 text-[9px] text-slate-300 border border-border/40 space-y-1">
              <div>Temporal State: <span className="text-primary font-bold uppercase">{status.temporal || "PENDING"}</span></div>
              <div>Primary Provider: Google Earth Engine</div>
            </div>
          </div>
          <Link
            href={`/mission-control/temporal?dataset=${dataset.dataset_id}`}
            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
          >
            <span>View Temporal Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* FUTURE PHASE: Cloud Intelligence */}
        <div className="border border-border bg-card/10 p-5 rounded-sm flex flex-col justify-between space-y-4 opacity-50 relative select-none">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-amber-500/80 font-mono font-bold tracking-widest uppercase">PHASE 6+ // STANDBY</span>
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
              <Cloud className="w-4 h-4 text-muted-foreground" />
              Cloud Intelligence
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Neural network segmentation to identify and generate pixel level transparency masks.
            </p>
            <div className="bg-background/40 p-2 py-1 text-[8.5px] border border-border text-center text-amber-500 font-bold uppercase tracking-wider">
              Not Yet Implemented / Phase 6+
            </div>
          </div>
        </div>

        {/* Terrain Reconstruction: Active or Placeholder */}
        {status.reconstruction === "available" && profile.reconstruction ? (
          <div className="border border-border bg-card/20 p-5 rounded-sm flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-primary font-bold tracking-widest uppercase">MODULE // ACTIVE</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
                <Cpu className="w-4 h-4 text-primary" />
                AI Reconstruction
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Generative multi-temporal diffusion networks to reconstruct topography hidden under clouds.
              </p>
              <div className="bg-background/40 p-2.5 text-[9px] text-slate-300 border border-border/40 space-y-1">
                <div>Status: <span className="text-emerald-400 font-bold uppercase">{profile.reconstruction.reconstruction_status}</span></div>
                <div>Method: <span className="font-mono text-primary">{profile.reconstruction.reconstruction_method || "N/A"}</span></div>
                <div>Time: {profile.reconstruction.execution_time_ms ? `${profile.reconstruction.execution_time_ms} ms` : "N/A"}</div>
              </div>
              {/* Preview image */}
              <div className="mt-3 border border-border rounded overflow-hidden bg-black/40 h-[100px] flex items-center justify-center relative">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/reconstruction/${profile.reconstruction.session_id}/preview`}
                  alt="Reconstruction Preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-border bg-card/10 p-5 rounded-sm flex flex-col justify-between space-y-4 opacity-50 relative select-none">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-amber-500/80 font-mono font-bold tracking-widest uppercase">PHASE 6+ // STANDBY</span>
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                AI Reconstruction
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Generative multi-temporal diffusion networks to reconstruct topography hidden under clouds.
              </p>
              <div className="bg-background/40 p-2 py-1 text-[8.5px] border border-border text-center text-amber-500 font-bold uppercase tracking-wider">
                Not Yet Implemented / Phase 6+
              </div>
            </div>
          </div>
        )}

        {/* FUTURE PHASE: Confidence Evaluation */}
        <div className="border border-border bg-card/10 p-5 rounded-sm flex flex-col justify-between space-y-4 opacity-50 relative select-none">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-amber-500/80 font-mono font-bold tracking-widest uppercase">PHASE 6+ // STANDBY</span>
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Confidence Rating
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Calculates pixel restoration uncertainty rates and output quality metrics.
            </p>
            <div className="bg-background/40 p-2 py-1 text-[8.5px] border border-border text-center text-amber-500 font-bold uppercase tracking-wider">
              Not Yet Implemented / Phase 6+
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
