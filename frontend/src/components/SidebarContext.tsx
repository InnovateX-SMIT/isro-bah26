"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface SidebarContextType {
  isPinned: boolean
  isExpanded: boolean
  isHovered: boolean
  setIsPinned: (pinned: boolean) => void
  setIsHovered: (hovered: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinnedState] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem("sidebar_pinned")
    if (stored !== null) {
      setIsPinnedState(stored === "true")
    } else {
      // Default to Auto-Hide mode (unpinned)
      setIsPinnedState(false)
    }
  }, [])

  const setIsPinned = (pinned: boolean) => {
    setIsPinnedState(pinned)
    localStorage.setItem("sidebar_pinned", String(pinned))
  }

  // Expanded state is active if pinned or currently hovered
  const isExpanded = isPinned || isHovered

  return (
    <SidebarContext.Provider
      value={{
        isPinned,
        isExpanded,
        isHovered,
        setIsPinned,
        setIsHovered
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}
