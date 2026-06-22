"use client"

import React from "react";
import { Crosshair, Navigation, Globe, Compass, Grid } from "lucide-react";

interface CoordinatePanelProps {
  lat?: number;
  lon?: number;
  crs?: string;
  projection?: string;
  areaSqKm?: number;
}

export default function CoordinatePanel({
  lat,
  lon,
  crs,
  projection,
  areaSqKm
}: CoordinatePanelProps) {
  const hasData = lat !== undefined && lon !== undefined;

  return (
    <div className="border border-border bg-card/25 p-4 font-mono text-xs space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // GEODETIC
      </div>

      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
        <Crosshair className="w-4 h-4 text-primary" />
        Coordinate Intelligence
      </h2>

      <div className="border border-border/40 bg-black/40 p-3 space-y-3 font-mono text-[11px] leading-relaxed">
        <div className="text-primary/70 border-b border-border/20 pb-1 text-[9px] uppercase tracking-widest font-bold">
          -----------------------------------<br />
          Dataset Location<br />
          -----------------------------------
        </div>

        <div className="space-y-1.5 text-slate-300">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Navigation className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              <span>Latitude:</span>
            </span>
            <span className="font-bold text-foreground select-all">
              {hasData ? `${lat.toFixed(6)}° N` : "N/A"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Navigation className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              <span>Longitude:</span>
            </span>
            <span className="font-bold text-foreground select-all">
              {hasData ? `${lon.toFixed(6)}° E` : "N/A"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Globe className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              <span>CRS:</span>
            </span>
            <span className="font-bold text-foreground select-all truncate max-w-[130px]" title={crs}>
              {crs || "N/A"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Compass className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              <span>Projection:</span>
            </span>
            <span className="font-bold text-foreground select-all truncate max-w-[130px]" title={projection}>
              {projection || "N/A"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Grid className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              <span>Area:</span>
            </span>
            <span className="font-bold text-primary select-all">
              {areaSqKm ? `${areaSqKm.toFixed(3)} km²` : "N/A"}
            </span>
          </div>
        </div>

        <div className="text-primary/70 text-[9px]">
          -----------------------------------
        </div>
      </div>
    </div>
  );
}
