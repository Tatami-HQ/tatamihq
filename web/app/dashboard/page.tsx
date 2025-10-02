'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'
import MobileBottomNav from '@/components/MobileBottomNav'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [membersData, setMembersData] = useState({
    totalMembers: 0,
    activeMembers: 0,
    newThisMonth: 0,
    trend: 'up' // 'up', 'down', 'same'
  })
  const [memberAnalytics, setMemberAnalytics] = useState({
    genderRatio: { male: 0, female: 0 },
    ageRanges: { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0 },
    membershipTypes: {}
  })
  const [leadsData, setLeadsData] = useState({
    totalLeads: 0,
    newLead: 0,
    contacted: 0,
    booked: 0,
    attendedTrial: 0
  })
  const [trialBookings, setTrialBookings] = useState({
    today: 0,
    tomorrow: 0,
    thisWeek: 0
  })
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const router = useRouter()

  const fetchMembersData = async () => {
    try {
      setIsLoadingMembers(true)
      
      // Get current date info
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      // Fetch all members with detailed info for analytics
      const { data: allMembers, error: allError } = await supabase
        .from('members')
        .select('members_id, status, created_at, gender, date_of_birth, membership_type')

      if (allError) {
        console.error('Error fetching all members:', allError)
        return
      }

      // Fetch members from this month
      const { data: thisMonthMembers, error: thisMonthError } = await supabase
        .from('members')
        .select('members_id')
        .gte('created_at', startOfMonth.toISOString())

      if (thisMonthError) {
        console.error('Error fetching this month members:', thisMonthError)
        return
      }

      // Fetch members from last month for comparison
      const { data: lastMonthMembers, error: lastMonthError } = await supabase
        .from('members')
        .select('members_id')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString())

      if (lastMonthError) {
        console.error('Error fetching last month members:', lastMonthError)
        return
      }

      // Calculate analytics
      const totalMembers = allMembers?.length || 0
      const activeMembers = allMembers?.filter(m => m.status === 'Active').length || 0
      const newThisMonth = thisMonthMembers?.length || 0
      const newLastMonth = lastMonthMembers?.length || 0

      // Determine trend
      let trend = 'same'
      if (newThisMonth > newLastMonth) {
        trend = 'up'
      } else if (newThisMonth < newLastMonth) {
        trend = 'down'
      }

      setMembersData({
        totalMembers,
        activeMembers,
        newThisMonth,
        trend
      })

      // Calculate member analytics
      const calculateAge = (dob: string | null) => {
        if (!dob) return 0
        const today = new Date()
        const birthDate = new Date(dob)
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        return age
      }

      // Gender ratio
      const genderCount = { male: 0, female: 0 }
      allMembers?.forEach(member => {
        if (member.gender === 'Male') genderCount.male++
        if (member.gender === 'Female') genderCount.female++
      })

      // Age ranges
      const ageRanges = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0 }
      allMembers?.forEach(member => {
        const age = calculateAge(member.date_of_birth)
        if (age <= 18) ageRanges['0-18']++
        else if (age <= 30) ageRanges['19-30']++
        else if (age <= 45) ageRanges['31-45']++
        else if (age <= 60) ageRanges['46-60']++
        else ageRanges['60+']++
      })

      // Membership types
      const membershipTypes: { [key: string]: number } = {}
      allMembers?.forEach(member => {
        const type = member.membership_type || 'Unknown'
        membershipTypes[type] = (membershipTypes[type] || 0) + 1
      })

      setMemberAnalytics({
        genderRatio: genderCount,
        ageRanges,
        membershipTypes
      })

    } catch (error) {
      console.error('Error fetching members data:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const fetchLeadsData = async () => {
    try {
      setIsLoadingLeads(true)
      
      // Fetch all leads
      const { data: allLeads, error: allError } = await supabase
        .from('leads')
        .select('leads_id, status')

      if (allError) {
        console.error('Error fetching leads:', allError)
        return
      }

      // Count leads by status
      const statusCounts = {
        totalLeads: allLeads?.length || 0,
        newLead: allLeads?.filter(l => l.status === 'new').length || 0,
        contacted: allLeads?.filter(l => l.status === 'contacted').length || 0,
        booked: allLeads?.filter(l => l.status === 'booked').length || 0,
        attendedTrial: allLeads?.filter(l => l.status === 'attended_trial').length || 0
      }

      setLeadsData(statusCounts)

      // For now, set trial bookings to 0 (you'll add this functionality later)
      setTrialBookings({
        today: 0,
        tomorrow: 0,
        thisWeek: 0
      })

    } catch (error) {
      console.error('Error fetching leads data:', error)
    } finally {
      setIsLoadingLeads(false)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          fetchMembersData()
          fetchLeadsData()
        }
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
          fetchMembersData()
          fetchLeadsData()
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
    <div className="flex min-h-screen bg-black overflow-x-hidden">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden sm:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
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
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto pb-20 sm:pb-8">
          {/* Top Row Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 overflow-x-hidden">
            {/* Members Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl cursor-pointer relative overflow-hidden" onClick={() => router.push('/members')}>
              {/* Minimalist Logo Background */}
              <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
                <div className="text-8xl font-bold font-sans uppercase tracking-wide">
                  <span className="text-white">TATAMI</span>
                  <span className="text-blue-500">HQ</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    {/* Large Members Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Members</h2>
                      <p className="text-sm text-gray-400">Club Members</p>
                    </div>
                  </div>
                  
                  {isLoadingMembers ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  ) : (
                    <div className="text-right">
                      <div className="bg-blue-600/20 text-blue-400 text-sm px-3 py-1 rounded-full">
                        {membersData.activeMembers} Active
                      </div>
                    </div>
                  )}
                </div>
                
                {isLoadingMembers ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    {/* Main Stats */}
                    <div className="mb-6">
                      <div className="text-5xl font-bold text-blue-400 mb-2">
                        {membersData.totalMembers}
                      </div>
                      <div className="text-lg text-gray-400">
                        Total Members
                      </div>
                    </div>

                    {/* Analytics Grid with Background Icon */}
                    <div className="relative">
                      {/* Blue Glowing Members Icon Background */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                        <div className="relative">
                          <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50 blur-sm">
                            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl blur-lg opacity-30"></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-white/5 rounded-xl p-3">
                          <div className="text-2xl font-bold text-green-400">
                            {membersData.activeMembers}
                          </div>
                          <div className="text-xs text-gray-400">
                            Active
                          </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-xl p-3">
                          <div className="text-2xl font-bold text-blue-400">
                            {membersData.newThisMonth}
                          </div>
                          <div className="text-xs text-gray-400">
                            New This Month
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Animated Trend Line Graph */}
                    <div className="mt-4 flex items-center justify-center">
                      <div className="flex items-center space-x-3 px-4 py-2 rounded-full bg-white/5">
                        {membersData.trend === 'up' && (
                          <>
                            {/* Animated Upward Line Graph */}
                            <div className="relative w-16 h-8 flex items-end justify-between">
                              {/* Line path */}
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 32">
                                <path
                                  d="M4 26 L8 24 L12 25 L16 22 L20 18 L24 26 L28 8 L32 4"
                                  stroke="rgb(74, 222, 128)"
                                  strokeWidth="2"
                                  fill="none"
                                  className="animate-pulse"
                                  style={{ animationDelay: '0.2s' }}
                                />
                                {/* Animated dots */}
                                <circle cx="4" cy="26" r="1.5" fill="rgb(74, 222, 128)" className="animate-pulse" />
                                <circle cx="12" cy="25" r="1.5" fill="rgb(74, 222, 128)" className="animate-pulse" style={{ animationDelay: '0.1s' }} />
                                <circle cx="20" cy="18" r="1.5" fill="rgb(74, 222, 128)" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
                                <circle cx="24" cy="26" r="1.5" fill="rgb(74, 222, 128)" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
                                <circle cx="28" cy="8" r="1.5" fill="rgb(74, 222, 128)" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
                                <circle cx="32" cy="4" r="1.5" fill="rgb(74, 222, 128)" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
                              </svg>
                            </div>
                            <span className="text-green-400 text-sm font-medium">Growing</span>
                          </>
                        )}
                        {membersData.trend === 'down' && (
                          <>
                            {/* Animated Downward Line Graph */}
                            <div className="relative w-16 h-8 flex items-end justify-between">
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 32">
                                <path
                                  d="M4 4 L16 8 L28 12 L40 16 L52 20 L60 28"
                                  stroke="rgb(248, 113, 113)"
                                  strokeWidth="2"
                                  fill="none"
                                  className="animate-pulse"
                                  style={{ animationDelay: '0.2s' }}
                                />
                                {/* Animated dots */}
                                <circle cx="4" cy="4" r="1.5" fill="rgb(248, 113, 113)" className="animate-pulse" />
                                <circle cx="16" cy="8" r="1.5" fill="rgb(248, 113, 113)" className="animate-pulse" style={{ animationDelay: '0.1s' }} />
                                <circle cx="28" cy="12" r="1.5" fill="rgb(248, 113, 113)" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
                                <circle cx="40" cy="16" r="1.5" fill="rgb(248, 113, 113)" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
                                <circle cx="52" cy="20" r="1.5" fill="rgb(248, 113, 113)" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
                              </svg>
                            </div>
                            <span className="text-red-400 text-sm font-medium">Declining</span>
                          </>
                        )}
                        {membersData.trend === 'same' && (
                          <>
                            {/* Animated Steady Line Graph */}
                            <div className="relative w-16 h-8 flex items-end justify-between">
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 32">
                                <path
                                  d="M4 16 L16 16 L28 16 L40 16 L52 16 L60 16"
                                  stroke="rgb(156, 163, 175)"
                                  strokeWidth="2"
                                  fill="none"
                                  className="animate-pulse"
                                  style={{ animationDelay: '0.2s' }}
                                />
                                {/* Animated dots */}
                                <circle cx="4" cy="16" r="1.5" fill="rgb(156, 163, 175)" className="animate-pulse" />
                                <circle cx="16" cy="16" r="1.5" fill="rgb(156, 163, 175)" className="animate-pulse" style={{ animationDelay: '0.1s' }} />
                                <circle cx="28" cy="16" r="1.5" fill="rgb(156, 163, 175)" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
                                <circle cx="40" cy="16" r="1.5" fill="rgb(156, 163, 175)" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
                                <circle cx="52" cy="16" r="1.5" fill="rgb(156, 163, 175)" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
                              </svg>
                            </div>
                            <span className="text-gray-400 text-sm font-medium">Steady</span>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Member Analytics Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 hover:border-green-500/30 hover:shadow-green-500/10 hover:shadow-2xl hover:scale-105 transition-all duration-500 cursor-pointer group relative overflow-hidden" onClick={() => router.push('/members')}>
              {/* Animated background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    {/* Large Analytics Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors duration-300">Analytics</h2>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Member Insights</p>
                    </div>
                  </div>
                </div>
                
                {isLoadingMembers ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    {/* Gender Ratio */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Gender Distribution</h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-300">Male: {memberAnalytics.genderRatio.male}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                          <span className="text-sm text-gray-300">Female: {memberAnalytics.genderRatio.female}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div className="bg-gradient-to-r from-blue-500 to-pink-500 h-2 rounded-full" style={{
                          background: `linear-gradient(to right, #3b82f6 ${(memberAnalytics.genderRatio.male / (memberAnalytics.genderRatio.male + memberAnalytics.genderRatio.female || 1)) * 100}%, #ec4899 ${(memberAnalytics.genderRatio.male / (memberAnalytics.genderRatio.male + memberAnalytics.genderRatio.female || 1)) * 100}%)`
                        }}></div>
                      </div>
                    </div>

                    {/* Age Ranges */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Age Groups</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(memberAnalytics.ageRanges).map(([range, count]) => (
                          <div key={range} className="flex items-center justify-between">
                            <span className="text-gray-400">{range}</span>
                            <span className="text-green-400 font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Membership Type */}
                    <div className="bg-white/5 rounded-xl p-3 group-hover:bg-white/10 transition-all duration-300">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Popular Membership</h3>
                      <div className="text-lg font-bold text-green-400 group-hover:text-green-300 transition-colors duration-300">
                        {Object.entries(memberAnalytics.membershipTypes).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {Object.entries(memberAnalytics.membershipTypes).length > 0 ? 
                          `${Object.entries(memberAnalytics.membershipTypes).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[1] || 0} members` : 
                          '0 members'
                        }
                      </div>
                    </div>
                  </>
                )}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-x-hidden">
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
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}

