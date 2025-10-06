'use client'

import { SidebarProvider } from '@/contexts/SidebarContext'
import { ReactNode } from 'react'

interface ClientSidebarProviderProps {
  children: ReactNode
}

export default function ClientSidebarProvider({ children }: ClientSidebarProviderProps) {
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  )
}
