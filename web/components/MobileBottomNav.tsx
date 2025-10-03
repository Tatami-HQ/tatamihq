'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileBottomNav() {
  const pathname = usePathname()

  const navItems = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: 'Members', 
      href: '/members', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      name: 'Leads', 
      href: '/leads', 
      icon: (
        <div className="relative w-6 h-6">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <svg className="w-4 h-4 absolute -top-1 -right-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
        </div>
      )
    },
    { 
      name: 'Competitions', 
      href: '/competitions', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22v-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 18h8" />
        </svg>
      )
    },
  ]

  return (
    <div 
      className="fixed left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/10 z-50 sm:hidden"
      style={{
        bottom: 'env(safe-area-inset-bottom, 0px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        position: 'fixed',
        willChange: 'bottom, padding-bottom'
      }}
    >
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.name}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
