import React from "react"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"
import { FileText, Cpu, Cloud, Shield, Database, Award } from "lucide-react"

interface MetadataSidebarProps {
  dataset: Dataset
  metadata: DatasetMetadata | null
  reconRun?: any | null
  estimation?: any | null
  reliability?: any | null
  cloud?: any | null
  temporal?: any | null
}

export default function MetadataSidebar({
  dataset,
  metadata,
  reconRun,
  estimation,
  reliability,
  cloud,
  temporal
}: MetadataSidebarProps) {
  // Extract file list
  const filesList = [
    { name: "original_bands.tif", desc: "Original raster bands composite", size: "124 MB" },
    reconRun?.output_image_path ? { name: "baseline_reconstructed.tif", desc: "AI baseline inpaint output", size: "124 MB" } : null,
    reconRun?.optimized_output_path ? { name: "optimized_output.tif", desc: " feather & filter optimized result", size: "124 MB" } : null,
    estimation?.confidence_preview_path ? { name: "confidence_heatmap.tif", desc: "Continuous trust score bounds", size: "41 MB" } : null,
    reliability?.scoring_basis ? { name: "reliability_scorecard.json", desc: "Uncertainty region parameters scorecard", size: "12 KB" } : null
  ].filter(Boolean) as { name: string; desc: string; size: string }[]

  return (
    <div className="w-80 border-l border-border bg-card/25 flex flex-col shrink-0 font-mono text-[11px] overflow-y-auto">
      <div className="p-4 border-b border-border bg-muted/10">
        <span className="text-[9px] text-primary uppercase font-bold tracking-widest block">ANALYSIS REGISTRY PANEL</span>
        <h2 className="text-xs font-bold text-foreground uppercase mt-0.5">Workspace Telemetry</h2>
      </div>

      <div className="p-4 space-y-6 flex-1">
        
        {/* Dataset telemetry */}
        <div className="space-y-2">
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-primary" />
            Dataset Parameters
          </div>
          <div className="bg-background/40 border border-border/40 p-3 rounded-lg space-y-2 text-[10px]">
            <div>
              <span className="text-muted-foreground block text-[9.5px]">DATASET ID:</span>
              <span className="text-foreground truncate select-all block font-bold" title={dataset.dataset_id}>
                {dataset.dataset_id}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[9.5px]">PROJECT COORDINATES:</span>
              <span className="text-foreground">
                {metadata?.epsg_code ? `EPSG:${metadata.epsg_code}` : "UNKNOWN"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[9.5px]">RASTER BOUNDS:</span>
              <span className="text-foreground">
                {metadata?.raster_width && metadata?.raster_height
                  ? `${metadata.raster_width} x ${metadata.raster_height} px`
                  : "NOT INGESTED"}
              </span>
            </div>
          </div>
        </div>

        {/* Reconstruction Details */}
        {reconRun && (
          <div className="space-y-2">
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              AI Reconstruction Info
            </div>
            <div className="bg-background/40 border border-border/40 p-3 rounded-lg space-y-2 text-[10px]">
              <div>
                <span className="text-muted-foreground block text-[9.5px]">STRATEGY / METHOD:</span>
                <span className="text-foreground font-bold uppercase">{reconRun.reconstruction_strategy || "DEFAULT"} / {reconRun.reconstruction_method || "DIFFUSION"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9.5px]">EXECUTION SPEED:</span>
                <span className="text-emerald-400 font-bold">{reconRun.execution_time_ms ? `${reconRun.execution_time_ms} ms` : "N/A"}</span>
              </div>
              {reconRun.optimization_status === "COMPLETED" && (
                <div>
                  <span className="text-muted-foreground block text-[9.5px]">RECON OPTIMIZATION:</span>
                  <span className="text-cyan-400 font-bold uppercase">{reconRun.optimization_method || "GUIDED FILTER"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cloud coverage details */}
        {cloud && (
          <div className="space-y-2">
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-primary" />
              Cloud Core burden
            </div>
            <div className="bg-background/40 border border-border/40 p-3 rounded-lg space-y-2 text-[10px]">
              <div>
                <span className="text-muted-foreground block text-[9.5px]">CLOUD COVER percent:</span>
                <span className="text-amber-500 font-bold">{(cloud.cloud_coverage_percent || 0).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9.5px]">BURDEN SEVERITY RATE:</span>
                <span className="text-foreground font-semibold">{(cloud.analytics?.burden_index || 0).toFixed(1)} / 100</span>
              </div>
            </div>
          </div>
        )}

        {/* Confidence rating and reliability grades */}
        {reliability && (
          <div className="space-y-2">
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Uncertainty Ratings
            </div>
            <div className="bg-background/40 border border-border/40 p-3 rounded-lg space-y-2 text-[10px]">
              <div>
                <span className="text-muted-foreground block text-[9.5px]">MEAN CONFIDENCE score:</span>
                <span className="text-emerald-400 font-bold">
                  {estimation?.mean_confidence_score !== null 
                    ? `${(estimation.mean_confidence_score * 100).toFixed(1)}%` 
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-muted-foreground block text-[9.5px]">RELIABILITY TIER:</span>
                  <span className="text-cyan-400 font-bold uppercase">{reliability.dataset_reliability_tier || "N/A"}</span>
                </div>
                <span className="text-[14px] font-black border border-cyan-500/25 px-2 bg-cyan-500/5 text-cyan-400 rounded-lg">
                  {reliability.dataset_reliability_score || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* File Registry List */}
        <div className="space-y-2">
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            File Registry Artifacts
          </div>
          <div className="space-y-2.5 border-t border-border/20 pt-2 text-[10px]">
            {filesList.map((file, idx) => (
              <div key={idx} className="border-b border-border/10 pb-2 space-y-0.5">
                <span className="font-bold text-slate-200 block truncate">{file.name}</span>
                <span className="text-[8.5px] text-muted-foreground block leading-normal">{file.desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
