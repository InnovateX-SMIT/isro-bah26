"use client"

import React from "react";
import { GeospatialContextProfile } from "@/lib/types/geospatial-context";
import TerrainContextCard from "./TerrainContextCard";
import EnvironmentalProfileCard from "./EnvironmentalProfileCard";
import RegionalCharacteristicsCard from "./RegionalCharacteristicsCard";
import ContextSummaryCard from "./ContextSummaryCard";
import { Trees, Loader2 } from "lucide-react";

interface GeospatialContextPanelProps {
  profile: GeospatialContextProfile | null;
  loading: boolean;
}

export default function GeospatialContextPanel({ profile, loading }: GeospatialContextPanelProps) {
  if (loading) {
    return (
      <div className="border border-border bg-card/20 p-8 flex flex-col items-center justify-center space-y-3 font-mono rounded-lg min-h-[180px]">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse-slow">
          De-serializing Environmental Context...
        </span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="border border-border border-dashed bg-card/5 p-8 flex flex-col items-center justify-center text-center space-y-3 font-mono rounded-lg min-h-[180px]">
        <Trees className="w-8 h-8 text-muted-foreground/30 animate-pulse-slow" />
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Context Radar Offline</h4>
          <p className="text-[9px] text-muted-foreground/60 max-w-sm mt-0.5">
            Select a target dataset to project ecological context analyses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 3 Columns Grid for the metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TerrainContextCard profile={profile} />
        <EnvironmentalProfileCard profile={profile} />
        <RegionalCharacteristicsCard profile={profile} />
      </div>

      {/* Full width summary report */}
      <ContextSummaryCard profile={profile} />
    </div>
  );
}
