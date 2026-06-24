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

const mapScoreToGrade = (score: number): string => {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
};

export default function MissionControlWorkspace({ profile }: MissionControlWorkspaceProps) {
  const { dataset, metadata, geospatial, location, context, status } = profile
  const [showOptimized, setShowOptimized] = React.useState(true)

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
              Comprehensive metadata parsing, coordinate system discovery, footprint boundaries, and administrative location lookup.
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[10px] border-b border-border/20 pb-1">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  {location ? `${location.state || 'Unknown'}, ${location.country || 'India'}` : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-border/20 pb-1">
                <span className="text-muted-foreground">Center Coordinates:</span>
                <span className="font-mono text-slate-300">
                  {geospatial ? `${geospatial.center.lat.toFixed(4)}, ${geospatial.center.lon.toFixed(4)}` : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground">EPSG Code:</span>
                <span className="font-mono text-slate-300">
                  {metadata?.epsg_code ? `EPSG:${metadata.epsg_code}` : 'Not available'}
                </span>
              </div>
            </div>
          </div>
          <Link href={`/dataset/${dataset.dataset_id}/geospatial`} className="inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase transition-all">
            Open Geospatial Console
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* SUBPAGE B: Temporal Intelligence */}
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
              Automated Google Earth Engine catalog queries to query, discover, and filter clean historical image stacks.
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[10px] border-b border-border/20 pb-1">
                <span className="text-muted-foreground">Target Date:</span>
                <span className="font-semibold text-slate-300">
                  {metadata?.acquisition_date || 'Not available'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-border/20 pb-1">
                <span className="text-muted-foreground">Discovered Stack:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {profile.temporal?.reference_count ? `${profile.temporal.reference_count} candidates` : '0 candidates'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground">Avg Cloud Cover:</span>
                <span className="font-mono text-slate-300">
                  {profile.temporal?.average_cloud_cover !== undefined ? `${profile.temporal.average_cloud_cover.toFixed(1)}%` : 'Not available'}
                </span>
              </div>
            </div>
          </div>
          <Link href={`/dataset/${dataset.dataset_id}/temporal`} className="inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase transition-all">
            Open Temporal Console
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
                <span className="text-[8px] text-primary font-bold tracking-widest uppercase">
                  {profile.reconstruction.optimization_status === "COMPLETED" ? "MODULE // OPTIMIZED" : "MODULE // ACTIVE"}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
                <Cpu className="w-4 h-4 text-primary" />
                AI Reconstruction
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Generative multi-temporal diffusion networks to reconstruct topography hidden under clouds.
              </p>

              {profile.reconstruction.optimization_status === "COMPLETED" && (
                <div className="flex gap-2 my-2">
                  <button 
                    onClick={() => setShowOptimized(false)}
                    className={`px-2 py-0.5 text-[8.5px] font-bold border transition-colors ${!showOptimized ? 'bg-primary text-background border-primary' : 'bg-transparent text-foreground border-border'}`}
                  >
                    BASELINE
                  </button>
                  <button 
                    onClick={() => setShowOptimized(true)}
                    className={`px-2 py-0.5 text-[8.5px] font-bold border transition-colors ${showOptimized ? 'bg-primary text-background border-primary' : 'bg-transparent text-foreground border-border'}`}
                  >
                    OPTIMIZED
                  </button>
                </div>
              )}

              <div className="bg-background/40 p-2.5 text-[9px] text-slate-300 border border-border/40 space-y-1">
                <div>Status: <span className="text-emerald-400 font-bold uppercase">
                  {showOptimized && profile.reconstruction.optimization_status === "COMPLETED" 
                    ? "OPTIMIZED" 
                    : profile.reconstruction.reconstruction_status}
                </span></div>
                <div>Method: <span className="font-mono text-primary">
                  {showOptimized && profile.reconstruction.optimization_status === "COMPLETED" 
                    ? (profile.reconstruction.optimization_method || "N/A") 
                    : (profile.reconstruction.reconstruction_method || "N/A")}
                </span></div>
                <div>Time: {profile.reconstruction.execution_time_ms ? `${profile.reconstruction.execution_time_ms} ms` : "N/A"}</div>
              </div>

              {profile.reconstruction.evaluation_completed && profile.reconstruction.evaluation_metrics && (
                <div className="mt-3 border border-border/40 bg-background/25 p-3 rounded-sm space-y-2">
                  <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                    <span className="text-[9px] font-bold text-primary tracking-wider uppercase">QUALITY SCORECARD</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                      profile.reconstruction.overall_score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                      profile.reconstruction.overall_score >= 80 ? 'bg-sky-500/10 text-sky-400 border border-sky-500/25' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                    }`}>
                      GRADE {mapScoreToGrade(profile.reconstruction.overall_score)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8.5px]">
                    <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                      <span className="text-slate-400">Overall Score:</span>
                      <span className="font-bold text-slate-200">{profile.reconstruction.overall_score}/100</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                      <span className="text-slate-400">Coverage:</span>
                      <span className="font-bold text-slate-200">{profile.reconstruction.evaluation_metrics.reconstruction_coverage}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                      <span className="text-slate-400">Completeness:</span>
                      <span className="font-bold text-slate-200">{profile.reconstruction.evaluation_metrics.completeness_score}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                      <span className="text-slate-400">Temporal Agree:</span>
                      <span className="font-bold text-slate-200">{profile.reconstruction.evaluation_metrics.temporal_agreement_score}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                      <span className="text-slate-400">Spatial Consist:</span>
                      <span className="font-bold text-slate-200">{profile.reconstruction.evaluation_metrics.spatial_consistency_score}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                      <span className="text-slate-400">Boundary Qual:</span>
                      <span className="font-bold text-slate-200">{profile.reconstruction.evaluation_metrics.boundary_quality_score}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                      <span className="text-slate-400">Structural Edge:</span>
                      <span className="font-bold text-slate-200">{profile.reconstruction.evaluation_metrics.structural_preservation_score}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/10 pb-0.5">
                      <span className="text-slate-400">Artifact Clean:</span>
                      <span className="font-bold text-slate-200">{profile.reconstruction.evaluation_metrics.artifact_score}%</span>
                    </div>
                  </div>

                  {profile.reconstruction.evaluation_summary && (
                    <div className="text-[8px] leading-normal text-slate-400 bg-black/20 p-2 border border-border/10 italic rounded-sm">
                      "{profile.reconstruction.evaluation_summary}"
                    </div>
                  )}
                </div>
              )}

              {/* Preview image */}
              <div className="mt-3 border border-border rounded overflow-hidden bg-black/40 h-[100px] flex items-center justify-center relative">
                <img
                  src={showOptimized && profile.reconstruction.optimization_status === "COMPLETED"
                    ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/reconstruction/${profile.reconstruction.session_id}/optimized-preview`
                    : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/reconstruction/${profile.reconstruction.session_id}/preview`}
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
