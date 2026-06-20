"use client"

import React from "react";
import { GeospatialContext } from "@/lib/types/geospatial";
import { Navigation, ShieldCheck } from "lucide-react";

interface DatasetBoundsLayerProps {
  context: GeospatialContext | null;
}

export default function DatasetBoundsLayer({ context }: DatasetBoundsLayerProps) {
  if (!context || !context.footprint || context.footprint.length < 4) {
    return null;
  }

  // Corners coordinates mapping: 
  // Index 0: Top-Left (UL)
  // Index 1: Top-Right (UR)
  // Index 2: Bottom-Right (LR)
  // Index 3: Bottom-Left (LL)
  const corners = [
    { label: "Top-Left (UL)", lon: context.footprint[0][0], lat: context.footprint[0][1] },
    { label: "Top-Right (UR)", lon: context.footprint[1][0], lat: context.footprint[1][1] },
    { label: "Bottom-Right (LR)", lon: context.footprint[2][0], lat: context.footprint[2][1] },
    { label: "Bottom-Left (LL)", lon: context.footprint[3][0], lat: context.footprint[3][1] },
  ];

  return (
    <div className="border border-border bg-card/45 p-4 font-mono text-xs space-y-3">
      <div className="flex items-center space-x-1.5 text-primary text-[10px] uppercase font-bold tracking-widest">
        <Navigation className="w-3.5 h-3.5" />
        <span>Footprint vertex nodes</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {corners.map((corner, index) => (
          <div key={index} className="border border-border/40 bg-muted/5 p-2 space-y-1">
            <div className="flex justify-between items-center text-[9px] text-muted-foreground uppercase border-b border-border/20 pb-1">
              <span>{corner.label}</span>
              <ShieldCheck className="w-3 h-3 text-primary/60" />
            </div>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">LAT:</span>
                <span className="text-foreground font-bold">{corner.lat.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">LON:</span>
                <span className="text-foreground font-bold">{corner.lon.toFixed(6)}°</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
