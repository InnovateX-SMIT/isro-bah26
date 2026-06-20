"use client"

import React from "react";
import { LocationContext } from "@/lib/types/location";
import { Globe, MapPin, Landmark, Shield, Compass } from "lucide-react";

interface LocationBadgeGroupProps {
  location: LocationContext;
}

export default function LocationBadgeGroup({ location }: LocationBadgeGroupProps) {
  const items = [
    { label: "Country", value: location.country, icon: Globe },
    { label: "State / Province", value: location.state, icon: MapPin },
    { label: "District / County", value: location.district, icon: Landmark },
    { label: "Admin Region", value: location.administrative_region, icon: Shield },
    { label: "Geographic Zone", value: location.geographic_region, icon: Compass },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className="border border-border bg-card/30 p-3 flex items-start space-x-2.5 font-mono text-xs hover:border-primary/45 hover:bg-card/50 transition-all duration-300 group"
        >
          <item.icon className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200" />
          <div className="space-y-0.5 min-w-0">
            <div className="text-[8px] text-muted-foreground uppercase tracking-widest">{item.label}</div>
            <div className="font-bold text-foreground truncate uppercase text-[10px] select-all" title={item.value}>
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
