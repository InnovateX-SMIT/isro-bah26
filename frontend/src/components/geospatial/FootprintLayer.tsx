"use client"

import React, { useState } from "react";
import { AreaChart, Copy, Check, Info } from "lucide-react";

interface FootprintLayerProps {
  footprintCoords?: number[][]; // [[lon, lat], ...]
  areaSqKm?: number;
  centroid?: {
    lat: number;
    lon: number;
  };
  bbox?: {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
  };
}

export default function FootprintLayer({
  footprintCoords,
  areaSqKm,
  centroid,
  bbox
}: FootprintLayerProps) {
  const [copied, setCopied] = useState(false);

  if (!footprintCoords || footprintCoords.length === 0) {
    return (
      <div className="border border-border bg-card/25 p-4 font-mono text-xs text-center text-amber-500 py-6 uppercase tracking-wider">
        <Info className="w-5 h-5 mx-auto mb-1 animate-pulse" />
        No Footprint intelligence generated. Select registered scene.
      </div>
    );
  }

  // Create GeoJSON structure
  const geojson = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [footprintCoords]
    },
    properties: {
      area_sq_km: areaSqKm || 0.0,
      centroid: centroid || { lat: 0.0, lon: 0.0 }
    }
  };

  const handleCopyGeoJson = () => {
    navigator.clipboard.writeText(JSON.stringify(geojson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border bg-card/25 p-4 font-mono text-xs space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // FOOTPRINT
      </div>
      
      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
        <AreaChart className="w-4 h-4 text-primary" />
        Footprint Intelligence
      </h2>

      <div className="space-y-2.5">
        {/* Footprint statistics readouts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border/40 bg-background/30 p-2.5 space-y-0.5">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">Calculated Area</span>
            <span className="text-sm font-bold text-primary block">
              {areaSqKm ? `${areaSqKm.toFixed(3)} sq km` : "N/A"}
            </span>
          </div>
          <div className="border border-border/40 bg-background/30 p-2.5 space-y-0.5">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">Centroid Coordinate</span>
            <span className="text-[10px] font-bold text-foreground block truncate">
              {centroid ? `${centroid.lat.toFixed(5)}°N, ${centroid.lon.toFixed(5)}°E` : "N/A"}
            </span>
          </div>
        </div>

        {/* Envelope Bounding Box info */}
        {bbox && (
          <div className="border border-border/40 bg-background/30 p-2.5 space-y-1">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">Bounding Box Envelope</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-slate-300">
              <div className="flex justify-between">
                <span>Min Lat:</span>
                <span className="font-bold text-foreground">{bbox.min_lat.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between">
                <span>Max Lat:</span>
                <span className="font-bold text-foreground">{bbox.max_lat.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between">
                <span>Min Lon:</span>
                <span className="font-bold text-foreground">{bbox.min_lon.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between">
                <span>Max Lon:</span>
                <span className="font-bold text-foreground">{bbox.max_lon.toFixed(6)}°</span>
              </div>
            </div>
          </div>
        )}

        {/* Action controls */}
        <div className="flex justify-between items-center border-t border-border/40 pt-3">
          <span className="text-[8px] text-muted-foreground uppercase tracking-widest">
            Format: GeoJSON Feature
          </span>
          <button
            onClick={handleCopyGeoJson}
            className="px-2.5 py-1.5 border border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider transition-all duration-200 flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy GeoJSON</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
