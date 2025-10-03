'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface ProfileDropdownProps {
  user: User | null
  isLoggingOut: boolean
  onLogout: () => void
}

export default function ProfileDropdown({ user, isLoggingOut, onLogout }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOutState, setIsLoggingOutState] = useState(false)
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update button position when dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonRect(rect)
    }
  }, [isOpen])

  const handleLogout = async () => {
    setIsLoggingOutState(true)
    try {
      await onLogout()
    } finally {
      setIsLoggingOutState(false)
    }
  }

  const menuItems = [
    {
      name: 'Profile',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onClick: () => {
        setIsOpen(false)
        // TODO: Navigate to profile page
        console.log('[ProfileDropdown] Profile clicked')
      }
    },
    {
      name: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      onClick: () => {
        setIsOpen(false)
        router.push('/settings')
      }
    },
    {
      name: 'Help & Support',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: () => {
        setIsOpen(false)
        // TODO: Navigate to help page
        console.log('[ProfileDropdown] Help clicked')
      }
    },
    {
      name: 'Sign Out',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      onClick: handleLogout,
      isDestructive: true
    }
  ]

  const dropdownContent = isOpen && buttonRect && (
    <>
      {/* Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[9998]"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dropdown Menu */}
      <div 
        ref={dropdownRef}
        className="fixed w-56 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl z-[9999]"
        style={{
          top: buttonRect.bottom + 8,
          right: window.innerWidth - buttonRect.right,
        }}
      >
        <div className="py-2">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-medium text-white">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {menuItems.map((item, index) => (
              <button
                key={item.name}
                onClick={item.onClick}
                disabled={isLoggingOutState && item.name === 'Sign Out'}
                className={`w-full flex items-center px-4 py-2 text-sm transition-colors duration-200 ${
                  item.isDestructive
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
                {isLoggingOutState && item.name === 'Sign Out' && (
                  <div className="ml-auto">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center p-2 rounded-lg hover:bg-white/5 transition-all duration-200"
      >
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold text-base">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Portal Dropdown */}
      {typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  )
}
