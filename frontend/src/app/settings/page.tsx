import React from "react"
import { Settings, Shield, Sliders, Database, Server } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary">SYSTEM SETTINGS</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Adjust platform nodes, database paths, and API integrations</p>
        </div>
        <button disabled className="px-3 py-1.5 bg-primary/10 text-primary/40 border border-primary/10 text-xs font-semibold tracking-wider flex items-center gap-1.5 cursor-not-allowed">
          SAVE CHANGES
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation tabs placeholder */}
        <div className="space-y-1">
          {[
            { label: "Pipeline Parameters", desc: "AI, cloud thresholds", icon: Sliders, active: true },
            { label: "Database Node", desc: "SQLite local engine config", icon: Database, active: false },
            { label: "API Configuration", desc: "FastAPI server endpoint", icon: Server, active: false },
            { label: "Security & Audits", desc: "Local-first access roles", icon: Shield, active: false },
          ].map((tab, i) => (
            <button
              key={i}
              className={`w-full text-left p-3 border text-xs tracking-wider flex items-center space-x-3 transition-colors ${
                tab.active
                  ? "bg-primary/10 border-primary text-primary font-bold"
                  : "bg-card/40 border-border text-muted-foreground hover:bg-card/70 hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <div>
                <p className="uppercase">{tab.label}</p>
                <p className="text-[10px] font-normal tracking-normal text-muted-foreground/80 mt-0.5">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Content placeholder */}
        <div className="md:col-span-2 border border-border bg-card/20 p-6 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Pipeline Settings</h2>

          <div className="space-y-4 text-xs font-mono">
            {/* Input 1 */}
            <div className="space-y-2">
              <label className="block text-muted-foreground uppercase tracking-widest">Cloud Detection Sensitivity Threshold</label>
              <input
                type="text"
                disabled
                value="0.65"
                className="w-full bg-muted/20 border border-border p-2.5 text-foreground rounded cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground/75 tracking-normal font-sans">Confidence threshold to tag a pixel as occluded by satellite cloud formations.</p>
            </div>

            {/* Input 2 */}
            <div className="space-y-2">
              <label className="block text-muted-foreground uppercase tracking-widest">Temporal Search Range (Months)</label>
              <input
                type="text"
                disabled
                value="12"
                className="w-full bg-muted/20 border border-border p-2.5 text-foreground rounded cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground/75 tracking-normal font-sans">Lookback window to query historical reference satellite tiles.</p>
            </div>

            {/* Select 1 */}
            <div className="space-y-2">
              <label className="block text-muted-foreground uppercase tracking-widest">AI Reconstruction Backbone</label>
              <select
                disabled
                className="w-full bg-muted/20 border border-border p-2.5 text-foreground rounded cursor-not-allowed uppercase"
              >
                <option>Multi-Temporal Diffusion Network (LISS-IV Optimized)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
