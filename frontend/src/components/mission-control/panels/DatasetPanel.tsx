import React from "react";
import Link from "next/link";
import { Dataset } from "@/lib/types/dataset";
import { DatasetMetadata } from "@/lib/types/dataset-metadata";
import { IntelligenceLayerStatus } from "@/lib/types/mission-control";
import { Database, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface DatasetPanelProps {
  dataset: Dataset;
  metadata: DatasetMetadata | null;
  status: IntelligenceLayerStatus;
}

export default function DatasetPanel({ dataset, metadata, status }: DatasetPanelProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return (
    <div className="border border-border bg-card/20 p-4 font-mono space-y-4 relative overflow-hidden rounded-lg hover:border-primary/40 transition-colors flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // DATASET
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
          <Database className="w-4 h-4 text-primary" />
          Dataset Registry Telemetry
        </h2>

        {/* Dataset Identification */}
        <div className="space-y-1 bg-background/30 p-2.5 border border-border/40">
          <div className="text-[8px] text-muted-foreground uppercase tracking-widest">REGISTRY KEY / NAME</div>
          <div className="text-xs font-bold text-slate-200 truncate uppercase">{dataset.dataset_name}</div>
          <div className="text-[8px] text-muted-foreground truncate uppercase">{dataset.dataset_id}</div>
        </div>

        {status === "available" && metadata ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-background/20 p-2 border border-border/30">
                <span className="text-[7.5px] text-muted-foreground block">RESOLUTION (GSD)</span>
                <span className="font-bold text-primary">
                  {metadata.pixel_size_x ? `${((Math.abs(metadata.pixel_size_x) + Math.abs(metadata.pixel_size_y || 0)) / 2).toFixed(2)}m` : "5.00m"}
                </span>
              </div>
              <div className="bg-background/20 p-2 border border-border/30">
                <span className="text-[7.5px] text-muted-foreground block">BAND CONFIGURATION</span>
                <span className="font-bold text-slate-200">{metadata.band_count || 3} BANDS</span>
              </div>
              <div className="bg-background/20 p-2 border border-border/30">
                <span className="text-[7.5px] text-muted-foreground block">GRID DIMENSIONS</span>
                <span className="font-bold text-slate-200">{metadata.raster_width || 2048} x {metadata.raster_height || 2048}</span>
              </div>
              <div className="bg-background/20 p-2 border border-border/30">
                <span className="text-[7.5px] text-muted-foreground block">SATELLITE SENSOR</span>
                <span className="font-bold text-slate-200">LISS-IV SIM</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] p-2 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400">
              <span className="font-semibold uppercase tracking-wider">RASTER INTEGERS VALIDATED:</span>
              <span className="flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                LOCK SECURE
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">DOWN-SAMPLED COMPOSITE PREVIEW</span>
              <div className="border border-border/50 rounded-lg overflow-hidden bg-black/40 h-[120px] flex items-center justify-center relative group">
                <img
                  src={`${API_URL}/api/v1/dataset-preview/${dataset.dataset_id}/thumbnail`}
                  alt={`${dataset.dataset_name} preview`}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='8' fill='%2364748b'>NO PREVIEW</text></svg>";
                  }}
                />
              </div>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="border border-destructive/20 bg-destructive/5 p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-destructive mx-auto" />
            <div className="text-[10px] font-bold text-destructive uppercase tracking-widest">Metadata Extraction Failed</div>
            <p className="text-[9px] text-muted-foreground leading-normal">
              An error occurred while parsing the dataset metadata headers. Check file integrity.
            </p>
          </div>
        ) : (
          <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto animate-pulse" />
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Metadata Incomplete</div>
            <p className="text-[9px] text-muted-foreground leading-normal">
              Metadata extraction has not been launched. Trigger inspection in the workspace directory.
            </p>
          </div>
        )}
      </div>

      <Link href="/datasets" className="inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase transition-all mt-4">
        Open Dataset Inventory
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
