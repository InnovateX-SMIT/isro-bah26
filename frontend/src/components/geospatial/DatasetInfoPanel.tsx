"use client"

import React from "react";
import { Dataset } from "@/lib/types/dataset";
import { DatasetMetadata } from "@/lib/types/dataset-metadata";
import { GeospatialContext } from "@/lib/types/geospatial";
import { Server, Compass, Grid, Crosshair, AlertCircle } from "lucide-react";

interface DatasetInfoPanelProps {
  dataset: Dataset | null;
  metadata: DatasetMetadata | null;
  context: GeospatialContext | null;
  loading: boolean;
}

export default function DatasetInfoPanel({ dataset, metadata, context, loading }: DatasetInfoPanelProps) {
  if (loading) {
    return (
      <div className="border border-border bg-card/20 p-6 flex flex-col items-center justify-center space-y-3 font-mono h-full min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Syncing Telemetry...</span>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="border border-border border-dashed bg-card/5 p-8 flex flex-col items-center justify-center text-center space-y-3 font-mono h-full min-h-[300px]">
        <Compass className="w-10 h-10 text-muted-foreground/40 animate-pulse-slow" />
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Node Target Selected</h4>
          <p className="text-[10px] text-muted-foreground/60 max-w-xs mt-1">Select a registered dataset from the telemetry registry list to project spatial visualization.</p>
        </div>
      </div>
    );
  }

  const resX = metadata?.pixel_size_x ? Math.abs(metadata.pixel_size_x) : null;
  const resY = metadata?.pixel_size_y ? Math.abs(metadata.pixel_size_y) : null;

  return (
    <div className="border border-border bg-card/40 flex flex-col justify-between h-full font-mono text-xs">
      {/* Header Info */}
      <div className="p-4 border-b border-border/60 space-y-1 bg-muted/5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-muted-foreground tracking-widest uppercase">Target locks</span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold border border-primary/40 bg-primary/5 text-primary rounded-lg uppercase tracking-wider">
            {dataset.dataset_status}
          </span>
        </div>
        <h3 className="font-bold text-foreground truncate uppercase text-sm select-all" title={dataset.dataset_name}>
          {dataset.dataset_name}
        </h3>
        <p className="text-[9px] text-muted-foreground truncate select-all">{dataset.dataset_path}</p>
      </div>

      {/* Main Metadata List */}
      <div className="p-4 space-y-5 flex-1 overflow-y-auto max-h-[500px]">
        {/* CRS & EPSG block */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-primary text-[10px] uppercase font-bold tracking-widest">
            <Compass className="w-3.5 h-3.5" />
            <span>Map projection systems</span>
          </div>
          <div className="bg-muted/15 border border-border/40 p-2.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">CRS Reference:</span>
              <span className="text-foreground font-bold">{context?.crs || metadata?.coordinate_system || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projection Model:</span>
              <span className="text-foreground truncate max-w-[150px]" title={context?.projection || metadata?.projection_name || "N/A"}>
                {context?.projection || metadata?.projection_name || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EPSG Code:</span>
              <span className="text-primary font-bold">EPSG:{context?.epsg || metadata?.epsg_code || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Raster Dimension & Resolution Block */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-primary text-[10px] uppercase font-bold tracking-widest">
            <Grid className="w-3.5 h-3.5" />
            <span>Raster structure specs</span>
          </div>
          <div className="bg-muted/15 border border-border/40 p-2.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Width x Height:</span>
              <span className="text-foreground">
                {metadata?.raster_width ? `${metadata.raster_width} px` : "N/A"} ×{" "}
                {metadata?.raster_height ? `${metadata.raster_height} px` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spatial Resolution:</span>
              <span className="text-foreground">
                {resX && resY ? `${resX}m × ${resY}m` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spectral Bands:</span>
              <span className="text-foreground font-bold">{metadata?.band_count || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Center Coordinate Block */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-primary text-[10px] uppercase font-bold tracking-widest">
            <Crosshair className="w-3.5 h-3.5" />
            <span>Geographic center point</span>
          </div>
          <div className="bg-muted/15 border border-border/40 p-2.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Center Latitude:</span>
              <span className="text-foreground font-bold select-all">
                {context?.center.lat ? `${context.center.lat.toFixed(6)}° N` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Center Longitude:</span>
              <span className="text-foreground font-bold select-all">
                {context?.center.lon ? `${context.center.lon.toFixed(6)}° E` : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Bounds Coordinates block */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-primary text-[10px] uppercase font-bold tracking-widest">
            <Server className="w-3.5 h-3.5" />
            <span>Geographic bounds envelope</span>
          </div>
          <div className="bg-muted/15 border border-border/40 p-2.5 grid grid-cols-2 gap-2 text-[10px]">
            <div className="border border-border/30 p-1.5 bg-card/30">
              <div className="text-muted-foreground text-[8px] uppercase">North Limit (MaxY)</div>
              <div className="text-foreground font-bold truncate mt-0.5">
                {context?.bounds.north ? `${context.bounds.north.toFixed(6)}°` : "N/A"}
              </div>
            </div>
            <div className="border border-border/30 p-1.5 bg-card/30">
              <div className="text-muted-foreground text-[8px] uppercase">South Limit (MinY)</div>
              <div className="text-foreground font-bold truncate mt-0.5">
                {context?.bounds.south ? `${context.bounds.south.toFixed(6)}°` : "N/A"}
              </div>
            </div>
            <div className="border border-border/30 p-1.5 bg-card/30">
              <div className="text-muted-foreground text-[8px] uppercase">East Limit (MaxX)</div>
              <div className="text-foreground font-bold truncate mt-0.5">
                {context?.bounds.east ? `${context.bounds.east.toFixed(6)}°` : "N/A"}
              </div>
            </div>
            <div className="border border-border/30 p-1.5 bg-card/30">
              <div className="text-muted-foreground text-[8px] uppercase">West Limit (MinX)</div>
              <div className="text-foreground font-bold truncate mt-0.5">
                {context?.bounds.west ? `${context.bounds.west.toFixed(6)}°` : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Warning if metadata doesn't exist */}
        {!metadata && (
          <div className="flex items-start space-x-2 border border-destructive/30 bg-destructive/5 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-[10px] text-destructive-foreground space-y-1 font-mono uppercase">
              <p className="font-bold">Missing metadata lock</p>
              <p className="normal-case text-muted-foreground text-[9px]">
                Please run the Metadata Extraction pipeline in the Analysis panel to calculate coordinates.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer System Lock status */}
      <div className="p-3 border-t border-border bg-muted/10 text-[9px] text-muted-foreground flex justify-between">
        <span>TELEMETRY FEED:</span>
        <span className={context ? "text-primary font-bold animate-pulse-slow" : "text-muted-foreground"}>
          {context ? "CONNECTED // ONLINE" : "STALE // DISCONNECTED"}
        </span>
      </div>
    </div>
  );
}
