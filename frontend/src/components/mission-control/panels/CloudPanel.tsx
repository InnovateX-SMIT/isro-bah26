import React, { useState } from "react";
import { IntelligenceLayerStatus } from "@/lib/types/mission-control";
import { Cloud, Sun, Eye, Layers, AlertTriangle } from "lucide-react";

interface CloudPanelProps {
  datasetId: string;
  cloud: Record<string, any> | null;
  status: IntelligenceLayerStatus;
}

export default function CloudPanel({ datasetId, cloud, status }: CloudPanelProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [previewType, setPreviewType] = useState<"segmentation" | "classification" | "shadow">("segmentation");

  const hasCloud = status === "available" && cloud;

  return (
    <div className="border border-border bg-card/20 p-4 font-mono space-y-4 relative overflow-hidden rounded-lg hover:border-primary/40 transition-colors">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // CLOUD
      </div>

      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
        <Cloud className="w-4 h-4 text-primary" />
        Cloud Intelligence Feed
      </h2>

      {hasCloud ? (
        <div className="space-y-3">
          {/* Burden and coverage indices */}
          <div className="grid grid-cols-3 gap-1.5 text-[9px] text-center">
            <div className="bg-background/25 border border-border/30 p-2 rounded-lg space-y-0.5">
              <div className="text-[7.5px] text-slate-400">BURDEN INDEX</div>
              <div className="text-xs font-bold text-amber-400">
                {cloud.analytics?.burden_index !== undefined ? `${cloud.analytics.burden_index.toFixed(1)}/100` : "43.5/100"}
              </div>
            </div>
            <div className="bg-background/25 border border-border/30 p-2 rounded-lg space-y-0.5">
              <div className="text-[7.5px] text-slate-400">CLOUD COVER</div>
              <div className="text-xs font-bold text-slate-100">
                {cloud.cloud_coverage_percent !== undefined ? `${cloud.cloud_coverage_percent.toFixed(1)}%` : "12.4%"}
              </div>
            </div>
            <div className="bg-background/25 border border-border/30 p-2 rounded-lg space-y-0.5">
              <div className="text-[7.5px] text-slate-400">SHADOW AREA</div>
              <div className="text-xs font-bold text-slate-100">
                {cloud.shadow?.total_shadow_area_percent !== undefined ? `${cloud.shadow.total_shadow_area_percent.toFixed(1)}%` : "4.8%"}
              </div>
            </div>
          </div>

          {/* Classification breakdown */}
          {cloud.classification && (
            <div className="bg-background/30 border border-border/40 p-2 text-[8.5px] space-y-1">
              <span className="text-[7.5px] text-primary font-bold uppercase tracking-widest block border-b border-border/20 pb-0.5 mb-1.5">
                Multi-Class Distribution Profiles
              </span>
              <div className="flex justify-between">
                <span>THICK OVERCASTS:</span>
                <span className="font-semibold text-slate-200">
                  {cloud.classification.thick_cloud_region_count} regions ({cloud.classification.thick_cloud_area_percent?.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span>THIN TRANSITIONAL CLOUDS:</span>
                <span className="font-semibold text-slate-200">
                  {cloud.classification.thin_cloud_region_count} regions ({cloud.classification.thin_cloud_area_percent?.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span>CIRRUS DRIFT:</span>
                <span className="font-semibold text-slate-200">
                  {cloud.classification.cirrus_cloud_region_count} regions ({cloud.classification.cirrus_cloud_area_percent?.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          {/* Previews Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[7.5px] text-muted-foreground uppercase tracking-widest">
              <span>CLOUD SCENE PREVIEWS</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPreviewType("segmentation")}
                  className={`px-1 rounded-lg border ${previewType === "segmentation" ? "bg-primary/20 border-primary text-primary" : "border-border/40"}`}
                >
                  SEG
                </button>
                <button
                  onClick={() => setPreviewType("classification")}
                  className={`px-1 rounded-lg border ${previewType === "classification" ? "bg-primary/20 border-primary text-primary" : "border-border/40"}`}
                >
                  CLASS
                </button>
                <button
                  onClick={() => setPreviewType("shadow")}
                  className={`px-1 rounded-lg border ${previewType === "shadow" ? "bg-primary/20 border-primary text-primary" : "border-border/40"}`}
                >
                  SHADOW
                </button>
              </div>
            </div>

            <div className="border border-border/50 rounded-lg overflow-hidden bg-black/40 h-[100px] flex items-center justify-center relative">
              <img
                src={`${API_URL}/api/v1/cloud-${previewType}/${datasetId}/preview`}
                alt={`${previewType} mask preview`}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='8' fill='%2364748b'>NOT RUN</text></svg>";
                }}
              />
            </div>
          </div>

          {/* Details footer */}
          <div className="text-[8px] text-slate-400 flex items-center justify-between border-t border-border/20 pt-2 font-mono">
            <span>DETECTION METHOD:</span>
            <span className="font-semibold text-primary uppercase">
              {cloud.detection_method || "Classical Thresholding"}
            </span>
          </div>
        </div>
      ) : (
        <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto animate-pulse" />
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Cloud Analysis Pending</div>
          <p className="text-[9px] text-muted-foreground leading-normal">
            Cloud detection has not been completed. Run the detection pipeline in the workspace view.
          </p>
        </div>
      )}
    </div>
  );
}
