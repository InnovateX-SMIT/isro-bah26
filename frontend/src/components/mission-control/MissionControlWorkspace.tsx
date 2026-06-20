import React from "react";
import { MissionControlProfile } from "@/lib/types/mission-control";
import MissionControlStatusBar from "./MissionControlStatusBar";
import DatasetOverviewPanel from "./DatasetOverviewPanel";
import IntelligenceSummaryPanel from "./IntelligenceSummaryPanel";
import GeospatialMap from "../geospatial/GeospatialMap";
import { MapPin, Compass, AlertCircle, Award, Anchor, Thermometer, Shield } from "lucide-react";

interface MissionControlWorkspaceProps {
  profile: MissionControlProfile;
}

export default function MissionControlWorkspace({ profile }: MissionControlWorkspaceProps) {
  const { dataset, metadata, geospatial, location, context, status, summary } = profile;

  return (
    <div className="space-y-6 font-mono">
      {/* 1. Readiness status indicators matrix */}
      <MissionControlStatusBar status={status} />

      {/* 2. Unified Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Visual Map lock and boundaries coordinates */}
        <div className="space-y-6">
          <div className="border border-border bg-card/25 p-4 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
              RADAR // SPATIAL SCAN
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Compass className="w-4 h-4 text-primary" />
              Live GIS Satellite Footprint
            </h2>

            {/* Map Frame container */}
            <div className="h-[320px] relative border border-border bg-black/30">
              <GeospatialMap
                context={geospatial}
                loading={status.geospatial === "missing" && status.metadata === "available"}
                error={status.geospatial === "error" ? "Geospatial coordinate calculations failed" : null}
              />
            </div>

            {/* Coordinate lock details overlay styling */}
            <div className="border border-border/40 bg-background/30 p-2.5 text-[9px] space-y-1.5">
              <div className="text-[8px] text-muted-foreground uppercase tracking-widest border-b border-border/30 pb-0.5">GEODETIC LOCK PARAMETERS</div>
              {geospatial ? (
                <>
                  <div className="flex justify-between">
                    <span>CENTER LATITUDE:</span>
                    <span className="font-bold text-primary">{geospatial.center.lat.toFixed(6)}° N</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CENTER LONGITUDE:</span>
                    <span className="font-bold text-primary">{geospatial.center.lon.toFixed(6)}° E</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NORTH LAT EXTENT:</span>
                    <span className="font-bold text-slate-300">{geospatial.bounds.north.toFixed(4)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SOUTH LAT EXTENT:</span>
                    <span className="font-bold text-slate-300">{geospatial.bounds.south.toFixed(4)}°</span>
                  </div>
                </>
              ) : (
                <div className="text-amber-500 text-center text-[8px] uppercase py-2">
                  No geodetic lock. Coordinate bounds calculation pending metadata.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Dataset Specs and Summary */}
        <div className="space-y-6">
          <DatasetOverviewPanel metadata={metadata} status={status.metadata} />
          
          <IntelligenceSummaryPanel summary={summary} status={status} />
        </div>

        {/* Right Column: Location Geocoding & Environmental Profile */}
        <div className="space-y-6">
          {/* Location intelligence card */}
          <div className="border border-border bg-card/25 p-4 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
              GEOCODE // LOCK
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
              <MapPin className="w-4 h-4 text-primary" />
              Administrative Geocoding lock
            </h2>

            {status.location === "available" && location ? (
              <div className="space-y-2 text-[10px]">
                <div className="border border-border/50 bg-background/30 p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground uppercase tracking-widest text-[8px]">COUNTRY ORIGIN:</span>
                  <span className="font-bold text-foreground uppercase">{location.country}</span>
                </div>
                <div className="border border-border/50 bg-background/30 p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground uppercase tracking-widest text-[8px]">PROVINCE / STATE:</span>
                  <span className="font-bold text-foreground uppercase">{location.state}</span>
                </div>
                <div className="border border-border/50 bg-background/30 p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground uppercase tracking-widest text-[8px]">DISTRICT LOCK:</span>
                  <span className="font-bold text-foreground uppercase">{location.district}</span>
                </div>
                <div className="border border-border/50 bg-background/30 p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground uppercase tracking-widest text-[8px]">ADMIN REGION:</span>
                  <span className="font-bold text-foreground uppercase">{location.administrative_region}</span>
                </div>
              </div>
            ) : (
              <div className="border border-amber-500/15 bg-amber-500/5 p-4 text-[10px] text-amber-500/90 text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                Administrative boundary locks pending coordinate resolution.
              </div>
            )}
          </div>

          {/* Environmental profile card */}
          <div className="border border-border bg-card/25 p-4 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
              ENVIRONMENT // CONTEXT
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Shield className="w-4 h-4 text-primary" />
              Environmental Context Profile
            </h2>

            {status.context === "available" && context ? (
              <div className="space-y-3 text-[10px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-border/50 bg-background/30 p-2 space-y-0.5">
                    <span className="text-[7px] text-muted-foreground uppercase tracking-widest flex items-center gap-0.5">
                      <Anchor className="w-2.5 h-2.5 text-primary" /> Terrain
                    </span>
                    <span className="font-bold text-foreground truncate uppercase block">{context.terrain_type}</span>
                  </div>
                  <div className="border border-border/50 bg-background/30 p-2 space-y-0.5">
                    <span className="text-[7px] text-muted-foreground uppercase tracking-widest flex items-center gap-0.5">
                      <Thermometer className="w-2.5 h-2.5 text-primary" /> Environment
                    </span>
                    <span className="font-bold text-foreground truncate uppercase block">{context.environment_type}</span>
                  </div>
                </div>

                <div className="border border-border/50 bg-background/30 p-2.5 space-y-1.5">
                  <span className="text-[8px] text-muted-foreground uppercase tracking-widest">REGIONAL SPECIFICS:</span>
                  <div className="grid grid-cols-1 gap-1 text-[9px] text-slate-300">
                    <div className="flex justify-between border-b border-border/10 pb-1">
                      <span>Dominant Landscape:</span>
                      <span className="font-bold text-slate-200 uppercase">{context.dominant_landscape}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/10 pb-1">
                      <span>Hydrological Context:</span>
                      <span className="font-bold text-slate-200 uppercase truncate max-w-[130px]" title={context.hydrology_context}>{context.hydrology_context}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agricultural Context:</span>
                      <span className="font-bold text-slate-200 uppercase">{context.agricultural_context}</span>
                    </div>
                  </div>
                </div>

                {/* Semicolon split characteristics items */}
                <div className="border border-border/50 bg-background/30 p-2.5 space-y-1">
                  <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">Inferred Regional Characteristics</span>
                  <ul className="list-inside list-disc text-[9px] text-slate-300 space-y-0.5 pl-1">
                    {context.regional_characteristics.map((char, idx) => (
                      <li key={idx} className="truncate uppercase">{char}</li>
                    ))}
                  </ul>
                </div>

                <div className="border border-primary/20 bg-primary/5 p-2 rounded-sm text-[8px] text-primary flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <div>
                    <span className="font-bold uppercase">Explainability basis:</span> {context.inference_basis}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-amber-500/15 bg-amber-500/5 p-4 text-[10px] text-amber-500/90 text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                Geomorphic terrain inference profiling pending location locked context.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
