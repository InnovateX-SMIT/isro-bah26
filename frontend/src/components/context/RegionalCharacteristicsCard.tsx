"use client"

import React from "react";
import { GeospatialContextProfile } from "@/lib/types/geospatial-context";
import { ListCollapse } from "lucide-react";

interface RegionalCharacteristicsCardProps {
  profile: GeospatialContextProfile;
}

export default function RegionalCharacteristicsCard({ profile }: RegionalCharacteristicsCardProps) {
  return (
    <div className="border border-border bg-card/30 p-4 font-mono text-xs space-y-3 flex-1">
      <div className="text-[10px] text-primary font-bold uppercase tracking-widest border-b border-border/40 pb-2 flex items-center gap-1.5">
        <ListCollapse className="w-3.5 h-3.5" />
        <span>Regional Characteristics</span>
      </div>
      <ul className="space-y-2.5">
        {profile.regional_characteristics.map((char, index) => (
          <li key={index} className="flex items-start space-x-2 text-[10px]">
            <span className="w-1.5 h-1.5 bg-primary/80 rounded-full shrink-0 mt-1" />
            <span className="text-slate-300 uppercase tracking-wide select-all">{char}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
