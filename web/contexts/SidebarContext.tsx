'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // During SSR, always return collapsed state to prevent hydration mismatch
  const value = isClient ? { isCollapsed, setIsCollapsed } : { isCollapsed: false, setIsCollapsed: () => {} }

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    // During SSR, return a default context to prevent hydration mismatch
    if (typeof window === 'undefined') {
      return { isCollapsed: false, setIsCollapsed: () => {} }
    }
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
