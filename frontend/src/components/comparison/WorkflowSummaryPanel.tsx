import React from "react"
import { Database, Cloud, Clock, Cpu, Shield, Sparkles, Check } from "lucide-react"

interface WorkflowStep {
  name: string
  label: string
  icon: any
  status: "completed" | "active" | "standby"
}

interface WorkflowSummaryPanelProps {
  currentActive: string
  cloudStatus?: string
  temporalStatus?: string
  reconstructionStatus?: string
  confidenceStatus?: string
}

export default function WorkflowSummaryPanel({
  currentActive,
  cloudStatus = "available",
  temporalStatus = "available",
  reconstructionStatus = "available",
  confidenceStatus = "available"
}: WorkflowSummaryPanelProps) {
  const steps: WorkflowStep[] = [
    {
      name: "original",
      label: "Original scene",
      icon: Database,
      status: "completed"
    },
    {
      name: "cloud",
      label: "Cloud Intel",
      icon: Cloud,
      status: cloudStatus === "available" ? "completed" : "standby"
    },
    {
      name: "temporal",
      label: "Temporal stack",
      icon: Clock,
      status: temporalStatus === "available" ? "completed" : "standby"
    },
    {
      name: "reconstruction",
      label: "AI Reconstruction",
      icon: Cpu,
      status: reconstructionStatus === "available" ? "completed" : "standby"
    },
    {
      name: "confidence",
      label: "Confidence Evaluation",
      icon: Shield,
      status: confidenceStatus === "available" ? "completed" : "standby"
    },
    {
      name: "comparison",
      label: "Comparison Engine",
      icon: Sparkles,
      status: "active"
    }
  ]

  // Mark currentActive node as active
  const mappedSteps = steps.map((s) => {
    if (s.name === currentActive) {
      return { ...s, status: "active" as const }
    }
    return s
  })

  return (
    <div className="border border-border bg-card/25 p-5 rounded-lg space-y-4 relative overflow-hidden font-mono">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        Pipeline Diagram // Flowchart
      </div>
      <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
        End-to-End Processing Workflow Summary
      </h3>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 relative">
        {mappedSteps.map((step, idx) => {
          const Icon = step.icon
          const isCompleted = step.status === "completed"
          const isActive = step.status === "active"
          
          return (
            <React.Fragment key={step.name}>
              {/* Connector Line (Rendered between nodes) */}
              {idx > 0 && (
                <div className="hidden md:block flex-1 h-0.5 bg-border relative">
                  <div 
                    className={`absolute inset-0 h-full transition-all duration-500 ${
                      isCompleted || isActive ? "bg-primary animate-pulse" : "bg-transparent"
                    }`}
                  ></div>
                </div>
              )}

              {/* Node Card */}
              <div className={`flex items-center md:flex-col space-x-3 md:space-x-0 md:space-y-2 p-2.5 md:p-3 border rounded-lg transition-all duration-300 min-w-[150px] text-left md:text-center select-none ${
                isActive 
                  ? "border-primary bg-primary/10 shadow-[0_0_12px_-4px_rgba(6,182,212,0.35)] text-primary font-bold" 
                  : isCompleted 
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" 
                    : "border-border bg-muted/5 text-muted-foreground"
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                  isActive 
                    ? "border-primary bg-background text-primary" 
                    : isCompleted 
                      ? "border-emerald-500 bg-background text-emerald-400" 
                      : "border-border bg-muted/10 text-muted-foreground"
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-emerald-400 font-bold" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className="text-[7.5px] uppercase tracking-widest block font-bold text-muted-foreground">
                    STAGE // 0{idx + 1}
                  </span>
                  <span className="text-[10px] uppercase block tracking-wider font-semibold">
                    {step.label}
                  </span>
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
