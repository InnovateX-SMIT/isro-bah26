import React from "react"
import { Database, Cloud, Clock, Shield } from "lucide-react"

export type ComparisonMode = "original" | "cloud" | "reference" | "confidence"

interface ComparisonSelectorProps {
  currentMode: ComparisonMode
  onChangeMode: (mode: ComparisonMode) => void
}

export default function ComparisonSelector({ currentMode, onChangeMode }: ComparisonSelectorProps) {
  const modes = [
    {
      id: "original" as ComparisonMode,
      label: "Original vs Reconstruction",
      desc: "Compare original scene with AI restored output",
      icon: Database,
      color: "text-blue-400"
    },
    {
      id: "cloud" as ComparisonMode,
      label: "Cloud Mask vs Reconstruction",
      desc: "Overlay cloud mask footprint on AI restored output",
      icon: Cloud,
      color: "text-amber-400"
    },
    {
      id: "reference" as ComparisonMode,
      label: "Reference vs Reconstruction",
      desc: "Compare GEE historical reference with AI output",
      icon: Clock,
      color: "text-pink-400"
    },
    {
      id: "confidence" as ComparisonMode,
      label: "Confidence vs Reconstruction",
      desc: "Examine pixel trust margins on AI restored output",
      icon: Shield,
      color: "text-emerald-400"
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {modes.map((m) => {
        const Icon = m.icon
        const isActive = currentMode === m.id
        return (
          <button
            key={m.id}
            onClick={() => onChangeMode(m.id)}
            className={`text-left p-3.5 border transition-all duration-300 rounded-sm font-mono flex items-start space-x-3 group cursor-pointer ${
              isActive
                ? "border-primary bg-primary/10 shadow-[0_0_15px_-4px_rgba(6,182,212,0.4)]"
                : "border-border/60 bg-card/10 hover:border-primary/50 hover:bg-card/20"
            }`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${isActive ? m.color : "text-muted-foreground"}`} />
            <div className="space-y-1 overflow-hidden">
              <span className={`text-[10.5px] font-black uppercase tracking-wider block ${isActive ? "text-foreground" : "text-slate-300"}`}>
                {m.label}
              </span>
              <span className="text-[9px] text-muted-foreground leading-normal font-sans block truncate">
                {m.desc}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
