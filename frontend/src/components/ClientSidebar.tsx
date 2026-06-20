"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Cpu, Database, BarChart3, Settings, ShieldAlert, Globe } from "lucide-react"

export default function ClientSidebar() {
  const pathname = usePathname()

  const navItems = [
    { label: "Mission Overview", href: "/", icon: Home },
    { label: "Analysis Pipeline", href: "/analysis", icon: Cpu },
    { label: "Data Inventory", href: "/datasets", icon: Database },
    { label: "Geospatial Map", href: "/geospatial", icon: Globe },
    { label: "Analytics Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "System Settings", href: "/settings", icon: Settings },
  ]

  return (
    <aside className="w-64 border-r border-border bg-card/40 flex flex-col justify-between shrink-0 font-mono text-xs">
      <div className="p-4 space-y-6">
        {/* Brand */}
        <div className="flex items-center space-x-2 border-b border-border/60 pb-4">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <div>
            <div className="font-bold tracking-widest text-foreground uppercase">ISRO-BAH26</div>
            <div className="text-[9px] text-muted-foreground tracking-widest uppercase">Geospatial Inpaint Node</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 border transition-all ${
                  isActive
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-[0_0_10px_-3px_rgba(6,182,212,0.25)]"
                    : "border-transparent text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer System Specs */}
      <div className="p-4 border-t border-border bg-muted/10 space-y-2 text-[10px] text-muted-foreground">
        <div className="flex justify-between">
          <span>PLATFORM:</span>
          <span className="text-foreground">LOCAL-FIRST</span>
        </div>
        <div className="flex justify-between">
          <span>COMPOSER:</span>
          <span className="text-foreground">V5.1.4</span>
        </div>
        <div className="flex justify-between">
          <span>ENGINE:</span>
          <span className="text-foreground">FASTAPI v1</span>
        </div>
        <div className="mt-2 text-center text-[9px] border border-border/40 py-1 uppercase tracking-widest bg-muted/20 text-muted-foreground">
          SYS_NODE // 0x48A9
        </div>
      </div>
    </aside>
  )
}
