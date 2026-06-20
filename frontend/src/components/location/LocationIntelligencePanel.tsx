"use client"

import React from "react";
import { LocationContext } from "@/lib/types/location";
import LocationBadgeGroup from "./LocationBadgeGroup";
import LocationSummaryCard from "./LocationSummaryCard";
import { Globe, Loader2 } from "lucide-react";

interface LocationIntelligencePanelProps {
  location: LocationContext | null;
  loading: boolean;
}

export default function LocationIntelligencePanel({ location, loading }: LocationIntelligencePanelProps) {
  if (loading) {
    return (
      <div className="border border-border bg-card/20 p-8 flex flex-col items-center justify-center space-y-3 font-mono rounded-sm min-h-[140px]">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse-slow">
          Resolving Administrative Coordinates...
        </span>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="border border-border border-dashed bg-card/5 p-8 flex flex-col items-center justify-center text-center space-y-3 font-mono rounded-sm min-h-[140px]">
        <Globe className="w-8 h-8 text-muted-foreground/30 animate-pulse-slow" />
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location Radar Offline</h4>
          <p className="text-[9px] text-muted-foreground/60 max-w-sm mt-0.5">
            Sync dataset bounds context to calculate physical geography references.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Badge Group Grid */}
      <LocationBadgeGroup location={location} />

      {/* Summary Text Panel */}
      <LocationSummaryCard location={location} />
    </div>
  );
}
