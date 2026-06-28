"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "./SidebarContext"
import {
  Home,
  Cpu,
  Database,
  BarChart3,
  Settings,
  ShieldAlert,
  Globe,
  Shield,
  Pin,
  PinOff,
  Download
} from "lucide-react"

export default function ClientSidebar() {
  const pathname = usePathname()
  const { isPinned, isExpanded, isHovered, setIsPinned, setIsHovered } = useSidebar()

  const navItems = [
    { label: "Mission Overview", href: "/", icon: Home },
    { label: "Analysis Pipeline", href: "/analysis", icon: Cpu },
    { label: "Data Inventory", href: "/datasets", icon: Database },
    { label: "Mission Control", href: "/mission-control", icon: Shield },
    { label: "Geospatial Map", href: "/mission-control/geospatial", icon: Globe },
    { label: "Export", href: "/export", icon: Download },
    { label: "Analytics Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "System Settings", href: "/settings", icon: Settings },
  ]

  // Keyboard accessibility: Escape key closes the sidebar when in auto-hide mode and expanded.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPinned && isHovered) {
        setIsHovered(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPinned, isHovered, setIsHovered])

  return (
    <div
      className="relative flex flex-row h-full shrink-0 z-40 select-none"
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
    >
      {/* 1. Rail Layout: Visible only when NOT pinned */}
      {!isPinned && (
        <div className="w-14 border-r border-border bg-card/20 flex flex-col items-center py-4 justify-between h-full font-mono text-[9px]">
          <div className="flex flex-col items-center space-y-6 w-full">
            {/* Platform logo */}
            <div className="p-1 border border-primary/20 bg-primary/5 rounded-sm">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>

            {/* Pin action mini trigger */}
            <button
              onClick={() => setIsPinned(true)}
              className="text-muted-foreground hover:text-primary transition-all p-1 cursor-pointer"
              title="Pin Sidebar (Always Expanded)"
            >
              <PinOff className="w-4 h-4 rotate-45" />
            </button>

            {/* Mini navigation icons */}
            <div className="flex flex-col items-center space-y-3 pt-2 w-full">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`p-2.5 border transition-all rounded-sm flex items-center justify-center ${
                      isActive
                        ? "bg-primary/10 border-primary text-primary shadow-[0_0_8px_-2px_rgba(6,182,212,0.25)]"
                        : "border-transparent text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                    }`}
                    title={item.label}
                  >
                    <item.icon className="w-4 h-4" />
                  </Link>
                )
              })}
            </div>
          </div>

          <div></div>
        </div>
      )}

      {/* 2. Expanded Sidebar Panel Drawer */}
      <aside
        className={`w-64 border-r border-border bg-card flex flex-col justify-between h-full font-mono text-xs transition-all duration-200 ease-in-out z-50 ${
          isPinned 
            ? "relative" 
            : `absolute left-0 top-0 bottom-0 shadow-[5px_0_25px_-5px_rgba(0,0,0,0.5)] transform ${
                isExpanded ? "translate-x-0" : "-translate-x-full"
              }`
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Brand header & Pin Action */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <div>
                <div className="font-bold tracking-widest text-foreground uppercase">ISRO-BAH26</div>
                <div className="text-[9px] text-muted-foreground tracking-widest uppercase">Geospatial Inpaint Node</div>
              </div>
            </div>

            {/* Pinned/Unpinned Switch toggle */}
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 border rounded-sm transition-all hover:bg-muted/20 flex items-center justify-center cursor-pointer ${
                isPinned 
                  ? "border-primary text-primary bg-primary/10" 
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
              title={isPinned ? "Unpin Sidebar (Auto-Hide Enabled)" : "Pin Sidebar (Always Visible)"}
            >
              {isPinned ? (
                <Pin className="w-3.5 h-3.5" />
              ) : (
                <PinOff className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Mode label status indicator */}
          <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase font-bold tracking-wider px-1">
            <span>Navigation Workspace</span>
            <span className={isPinned ? "text-primary" : "text-amber-500 animate-pulse"}>
              {isPinned ? "📌 Pinned" : "📍 Auto-Hide"}
            </span>
          </div>

          {/* Navigation Links list */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 border transition-all rounded-sm ${
                    isActive
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-[0_0_10px_-3px_rgba(6,182,212,0.25)]"
                      : "border-transparent text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="uppercase tracking-wider text-[10px]">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer System Version */}
        <div className="p-4 border-t border-border bg-muted/5 text-[9px] text-muted-foreground text-center">
          GEOSPATIAL PLATFORM // V1.0.0
        </div>
      </aside>
    </div>
  )
}
