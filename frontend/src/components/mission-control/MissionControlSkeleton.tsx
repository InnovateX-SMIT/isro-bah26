import React from "react";

export default function MissionControlSkeleton() {
  return (
    <div className="space-y-6 font-mono text-slate-400 select-none animate-pulse">
      
      {/* 1. Status Bar skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-border/40 bg-card/10 p-2.5 rounded-sm h-12 flex flex-col justify-between">
            <div className="h-2 bg-slate-800 rounded w-16" />
            <div className="h-3 bg-slate-700 rounded w-12" />
          </div>
        ))}
      </div>

      {/* 2. Pipeline skeleton */}
      <div className="border border-border/40 bg-card/15 p-4 rounded-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-3 bg-slate-700 rounded w-32" />
          <div className="h-3 bg-slate-700 rounded w-24" />
        </div>
        <div className="w-full bg-slate-900 border border-border/20 h-3 rounded-sm" />
        <div className="flex justify-between gap-2 overflow-x-auto py-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2 shrink-0 w-16">
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-border/30" />
              <div className="h-2 bg-slate-800 rounded w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. System Audit Checklist skeleton */}
      <div className="border border-border/40 bg-card/10 p-4 space-y-3 rounded-sm">
        <div className="h-3 bg-slate-700 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-900/50 border border-border/20 p-3 h-10 rounded-sm" />
          ))}
        </div>
      </div>

      {/* 4. Grid Layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Dataset Panel */}
          <div className="border border-border/40 bg-card/10 p-4 space-y-4 rounded-sm h-[220px]">
            <div className="h-3 bg-slate-700 rounded w-32" />
            <div className="space-y-2">
              <div className="h-8 bg-slate-900/60 rounded" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-slate-900/40 rounded" />
                <div className="h-10 bg-slate-900/40 rounded" />
              </div>
            </div>
          </div>
          {/* Geospatial Panel */}
          <div className="border border-border/40 bg-card/10 p-4 space-y-4 rounded-sm h-[320px]">
            <div className="h-3 bg-slate-700 rounded w-32" />
            <div className="h-[140px] bg-slate-900/80 rounded" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-800 rounded w-2/3" />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Briefing summary */}
          <div className="border border-border/40 bg-card/10 p-5 rounded-sm h-[130px] space-y-3">
            <div className="h-3 bg-slate-700 rounded w-48" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-850 rounded w-full" />
              <div className="h-3 bg-slate-850 rounded w-5/6" />
            </div>
          </div>

          {/* 2x2 Sub-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-border/40 bg-card/10 p-4 rounded-sm h-[190px] space-y-4">
                <div className="h-3 bg-slate-700 rounded w-28" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-850 rounded w-full" />
                  <div className="h-3 bg-slate-850 rounded w-4/5" />
                  <div className="h-3 bg-slate-850 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Logs Panel skeleton */}
      <div className="border border-border/40 bg-card/10 p-4 rounded-sm h-[160px] space-y-3">
        <div className="h-3 bg-slate-700 rounded w-48" />
        <div className="h-[90px] bg-slate-950/70 rounded" />
      </div>
    </div>
  );
}
