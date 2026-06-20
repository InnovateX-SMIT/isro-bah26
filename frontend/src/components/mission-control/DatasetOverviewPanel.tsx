import React from "react";
import { DatasetMetadata } from "@/lib/types/dataset-metadata";
import { IntelligenceLayerStatus } from "@/lib/types/mission-control";
import { Info, Calendar, Move, AlertTriangle, Layers, Maximize } from "lucide-react";

interface DatasetOverviewPanelProps {
  metadata: DatasetMetadata | null;
  status: IntelligenceLayerStatus;
}

export default function DatasetOverviewPanel({ metadata, status }: DatasetOverviewPanelProps) {
  if (status === "missing" || !metadata) {
    return (
      <div className="border border-amber-500/20 bg-amber-500/5 p-5 text-center font-mono space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">// METADATA INTELLIGENCE PENDING</h3>
        <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">
          Metadata profile has not been extracted yet. Please launch metadata processing on the registry page to resolve image parameters.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="border border-red-500/20 bg-red-500/5 p-5 text-center font-mono space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-red-500">// METADATA INTEGRITY ERROR</h3>
        <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">
          The metadata extraction pipeline failed to inspect this scene. Verify image formats and file permissions.
        </p>
      </div>
    );
  }

  const metrics = [
    { label: "COORDINATE DATUM", value: metadata.coordinate_system || "WGS 84", icon: Info },
    { label: "PROJECTION TYPE", value: metadata.projection_name || "UTM Projection", icon: Move },
    { label: "EPSG EPSG CODE", value: metadata.epsg_code ? `EPSG:${metadata.epsg_code}` : "N/A", icon: Layers },
    { label: "UTM ZONE NUMBER", value: metadata.utm_zone ? `ZONE ${metadata.utm_zone}N` : "N/A", icon: Move },
    { label: "ACQUISITION DATE", value: metadata.acquisition_date || "N/A", icon: Calendar },
    { label: "IMAGE BAND COUNT", value: metadata.band_count ? `${metadata.band_count} BANDS` : "N/A", icon: Layers },
  ];

  return (
    <div className="border border-border bg-card/25 p-4 font-mono space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        RASTER // SPECIFICATIONS
      </div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
        <Info className="w-4 h-4 text-primary" />
        Image Metadata Telemetry
      </h2>

      {/* Primary Grid Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="border border-border/50 bg-background/30 p-2.5 space-y-1">
              <span className="text-[8px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Icon className="w-3 h-3 text-primary/70" />
                {m.label}
              </span>
              <div className="text-xs font-bold text-foreground truncate uppercase">{m.value}</div>
            </div>
          );
        })}
      </div>

      {/* Dimensions & Resolution */}
      <div className="border border-border/50 bg-background/30 p-3 space-y-3">
        <span className="text-[8px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 border-b border-border/30 pb-1">
          <Maximize className="w-3.5 h-3.5 text-primary/70" />
          Scene Dimensions & Ground Sample Distance
        </span>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-0.5">
            <div className="text-[8px] text-muted-foreground uppercase">GRID WIDTH</div>
            <div className="text-xs font-bold text-slate-200">{metadata.raster_width ?? "N/A"} px</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[8px] text-muted-foreground uppercase">GRID HEIGHT</div>
            <div className="text-xs font-bold text-slate-200">{metadata.raster_height ?? "N/A"} px</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[8px] text-muted-foreground uppercase">RESOLUTION</div>
            <div className="text-xs font-bold text-primary">
              {metadata.pixel_size_x ? `${(metadata.pixel_size_x + Math.abs(metadata.pixel_size_y ?? 0)) / 2}m` : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Raster Origin Projected Coordinates */}
      <div className="border border-border/40 bg-background/25 p-3 text-[9px] space-y-1.5">
        <div className="text-[8px] text-muted-foreground uppercase tracking-wider">PROJECTED COORDINATE ORIGIN (UL CORNER)</div>
        <div className="flex justify-between text-slate-300">
          <span>ORIGIN X (EASTING):</span>
          <span className="font-bold text-slate-200">{metadata.origin_x?.toFixed(2) ?? "N/A"} m</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>ORIGIN Y (NORTHING):</span>
          <span className="font-bold text-slate-200">{metadata.origin_y?.toFixed(2) ?? "N/A"} m</span>
        </div>
      </div>
    </div>
  );
}
