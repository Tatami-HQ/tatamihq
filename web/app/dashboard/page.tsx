'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('[Dashboard:getUser] Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[Dashboard:handleLogout] Logout error:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('[Dashboard:handleLogout] Unexpected error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Redirecting to login...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          </div>
          <ProfileDropdown 
            user={user} 
            isLoggingOut={isLoggingOut} 
            onLogout={handleLogout} 
          />
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Top Row Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Activity Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <h2 className="text-lg font-semibold text-white mb-4 group-hover:text-blue-400 transition-colors duration-300">Activity</h2>
              <div className="text-4xl font-bold text-blue-400 mb-2 group-hover:text-blue-300 transition-colors duration-300">70%</div>
              <div className="h-2 bg-gray-700 rounded-full mb-2 group-hover:bg-gray-600 transition-colors duration-300">
                <div className="h-full bg-blue-500 rounded-full w-[70%] group-hover:bg-blue-400 transition-colors duration-300"></div>
              </div>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">+12% from last week</p>
            </div>

            {/* Today's Tasks Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors duration-300">Today's Tasks</h2>
                <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded-full group-hover:bg-blue-500/30 group-hover:text-blue-300 transition-all duration-300">3</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center text-gray-300 text-sm group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 group-hover:bg-orange-400 transition-colors duration-300"></span>
                  Color Palette Selection
                </div>
                <div className="flex items-center text-gray-300 text-sm group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-3 group-hover:bg-gray-400 transition-colors duration-300"></span>
                  Creating Landing page
                </div>
                <div className="flex items-center text-gray-300 text-sm group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-3 group-hover:bg-gray-400 transition-colors duration-300"></span>
                  Competitive Analysis
                </div>
              </div>
            </div>

            {/* Today's Meetings Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors duration-300">Today's Meetings</h2>
                <span className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-full group-hover:bg-green-500/30 group-hover:text-green-300 transition-all duration-300">6</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center text-gray-300 text-sm group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 group-hover:bg-red-400 transition-colors duration-300"></span>
                  AM 10:00 - Team Standup
                </div>
                <div className="flex items-center text-gray-300 text-sm group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:bg-blue-400 transition-colors duration-300"></span>
                  PM 01:00 - Client Call
                </div>
                <div className="flex items-center text-gray-300 text-sm group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 group-hover:bg-purple-400 transition-colors duration-300"></span>
                  PM 03:00 - Planning
                </div>
              </div>
            </div>

            {/* Projects Worked Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <h2 className="text-lg font-semibold text-white mb-4 group-hover:text-blue-400 transition-colors duration-300">Projects Worked</h2>
              <div className="flex items-center justify-center h-24 mb-4">
                <div className="relative w-20 h-20 group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 via-blue-500 to-red-500 opacity-70 group-hover:opacity-90 transition-opacity duration-300"></div>
                  <div className="absolute inset-1 rounded-full bg-black flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-300">
                    <span className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors duration-300">4</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 text-center group-hover:text-gray-300 transition-colors duration-300">-5% from last month</p>
            </div>
          </div>

          {/* Bottom Row - Calendar and Reminders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar View */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <h2 className="text-lg font-semibold text-white mb-4 group-hover:text-blue-400 transition-colors duration-300">Projects Calendar</h2>
              <div className="grid grid-cols-5 gap-2 text-center text-gray-400 mb-4 text-sm">
                <div className="group-hover:text-gray-300 transition-colors duration-300">MON 18</div>
                <div className="group-hover:text-gray-300 transition-colors duration-300">TUE 19</div>
                <div className="text-red-400 font-semibold group-hover:text-red-300 transition-colors duration-300">WED 20</div>
                <div className="group-hover:text-gray-300 transition-colors duration-300">THU 21</div>
                <div className="group-hover:text-gray-300 transition-colors duration-300">FRI 22</div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-2 text-xs text-gray-200 group-hover:bg-gray-700/50 group-hover:border-gray-600/50 group-hover:text-white transition-all duration-300">
                  <p className="font-medium">Design Review</p>
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">09:00</p>
                </div>
                <div></div>
                <div className="bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-lg p-2 text-xs text-blue-200 group-hover:bg-blue-500/30 group-hover:border-blue-400/50 group-hover:text-blue-100 transition-all duration-300">
                  <p className="font-medium">Color Palette</p>
                  <p className="text-blue-300 group-hover:text-blue-200 transition-colors duration-300">09:00</p>
                </div>
                <div></div>
                <div className="bg-red-600/20 backdrop-blur-sm border border-red-500/30 rounded-lg p-2 text-xs text-red-200 group-hover:bg-red-500/30 group-hover:border-red-400/50 group-hover:text-red-100 transition-all duration-300">
                  <p className="font-medium">Client Meeting</p>
                  <p className="text-red-300 group-hover:text-red-200 transition-colors duration-300">10:00</p>
                </div>
              </div>
            </div>

            {/* Reminders Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <h2 className="text-lg font-semibold text-white mb-4 group-hover:text-blue-400 transition-colors duration-300">Reminders</h2>
              <div className="space-y-4">
                <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3 group-hover:bg-green-400 transition-colors duration-300"></span>
                  <div>
                    <p className="text-sm">09:30 AM - Check test results</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-300">Low Priority</p>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 group-hover:bg-red-400 transition-colors duration-300"></span>
                  <div>
                    <p className="text-sm">10:00 AM - Client Presentation</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-300">High Priority</p>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 group-hover:bg-red-400 transition-colors duration-300"></span>
                  <div>
                    <p className="text-sm">04:15 PM - Add new subtask</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-300">High Priority</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

