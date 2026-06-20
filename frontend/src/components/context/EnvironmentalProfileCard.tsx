"use client"

import React from "react";
import { GeospatialContextProfile } from "@/lib/types/geospatial-context";
import { Droplets, Wheat, Building2 } from "lucide-react";

interface EnvironmentalProfileCardProps {
  profile: GeospatialContextProfile;
}

export default function EnvironmentalProfileCard({ profile }: EnvironmentalProfileCardProps) {
  const elements = [
    { label: "Hydrology Reference", value: profile.hydrology_context, icon: Droplets },
    { label: "Agricultural Context", value: profile.agricultural_context, icon: Wheat },
    { label: "Urbanization Profile", value: profile.urbanization_context, icon: Building2 },
  ];

  return (
    <div className="border border-border bg-card/30 p-4 font-mono text-xs space-y-3 flex-1">
      <div className="text-[10px] text-primary font-bold uppercase tracking-widest border-b border-border/40 pb-2">
        Anthropogenic & Environmental
      </div>
      <div className="space-y-3">
        {elements.map((item, idx) => (
          <div key={idx} className="flex items-start space-x-2.5 p-2 bg-muted/5 border border-border/20">
            <item.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-[8px] text-muted-foreground uppercase tracking-widest">{item.label}</div>
              <div className="font-bold text-foreground uppercase text-[10px] select-all">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
