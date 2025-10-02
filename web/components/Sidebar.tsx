'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Logo from './Logo'

interface SidebarProps {
  className?: string
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: 'Members', 
      href: '/members', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      name: 'Leads', 
      href: '/leads', 
      icon: (
        <div className="relative w-5 h-5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <svg className="w-3 h-3 absolute -top-1 -right-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
        </div>
      )
    },
    { 
      name: 'Competitions', 
      href: '/competitions', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22v-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 18h8" />
        </svg>
      )
    },
  ]

  return (
    <div className={`relative flex flex-col h-screen bg-black border-r border-white/10 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${className}`}>
      <div className="p-6 flex-1 flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-center mb-10">
          {isCollapsed ? (
            <div className="w-full flex justify-center px-2">
              <Logo size="responsive" className="text-[9px] leading-tight" />
            </div>
          ) : (
            <Logo size="md" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 relative">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white hover:border-white/10 border border-transparent'
                  } ${isCollapsed ? 'px-2' : 'px-3'}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <span className={`flex items-center justify-center w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
                  {!isCollapsed && item.name}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Collapse Button - positioned in the middle of the sidebar */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-5 h-8 bg-black border border-white/20 rounded-l-full flex items-center justify-center hover:bg-white/5 transition-all duration-200"
          >
            <svg 
              className={`w-3 h-3 text-white transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Bottom section for future additions */}
        {!isCollapsed && (
          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="text-xs text-gray-500 text-center">
              TatamiHQ v1.0
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
