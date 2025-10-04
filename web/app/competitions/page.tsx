'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { handleAuthError, clearAuthSession } from '@/lib/authUtils'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'
import MobileBottomNav from '@/components/MobileBottomNav'
import AnimatedBackground from '@/components/AnimatedBackground'
import AddCompetitionModal from '@/components/AddCompetitionModal'
import LogResultsModal from '@/components/LogResultsModal'
import RegisterMembersModal from '@/components/RegisterMembersModal'
import CompetitionsMap from '@/components/CompetitionsMap'

export interface Competition {
  competitions_id: number
  clubs_id: number | null
  martial_art_id: number | null
  Name: string | null
  date_start: string | null
  location: string | null
  overall_rank: number | null
  total_gold: number | null
  total_silver: number | null
  total_bronze: number | null
  created_at: string
  organisations_id: number | null
  date_end: string | null
  singular_day_event: boolean | null
  competition_profile_picture: string | null
  competition_downloads: string | null
}

export default function CompetitionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null)
  const [showLogResultsModal, setShowLogResultsModal] = useState(false)
  const [showRegisterMembersModal, setShowRegisterMembersModal] = useState(false)
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('[Competitions:getUser] Auth error:', error)
          const sessionCleared = await handleAuthError(error)
          if (sessionCleared) {
            router.push('/login')
            return
          }
        }
        
        setUser(user)
        if (user) {
          fetchCompetitions()
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('[Competitions:getUser] Unexpected error:', error)
        await clearAuthSession()
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Competitions:authStateChange] Event:', event, 'Session exists:', !!session)
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          router.push('/login')
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          fetchCompetitions()
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const fetchCompetitions = async () => {
    try {
      setIsLoadingCompetitions(true)
      setError('')
      
      console.log('[Competitions:fetchCompetitions] Fetching competitions from Supabase...')
      
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('date_start', { ascending: false })

      if (error) {
        console.error('[Competitions:fetchCompetitions] Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        setError(`Failed to load competitions: ${error.message || 'Unknown error occurred'}`)
        return
      }

      console.log('[Competitions:fetchCompetitions] Fetched competitions:', data)
      setCompetitions(data || [])
    } catch (error) {
      console.error('[Competitions:fetchCompetitions] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoadingCompetitions(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[Competitions:handleLogout] Logout error:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('[Competitions:handleLogout] Unexpected error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleAddCompetition = async (competitionData: Omit<Competition, 'competitions_id' | 'created_at'>) => {
    try {
      console.log('Adding competition with data:', competitionData)
      
      if (!user) {
        setError('You must be logged in to add competitions')
        return
      }

      const { data: insertResult, error: insertError } = await supabase
        .from('competitions')
        .insert([competitionData])
        .select()
      
      if (insertError) {
        console.error('Insert failed:', insertError)
        setError(`Failed to add competition: ${insertError.message}`)
        return
      }
      
      if (insertResult && insertResult[0]) {
        console.log('SUCCESS! Competition added:', insertResult[0])
        setCompetitions(prev => [insertResult[0], ...prev])
        setShowAddModal(false)
        setError('')
      } else {
        console.error('No data returned from insert')
        setError('No data returned from insert')
      }
    } catch (error) {
      console.error('Unexpected error in handleAddCompetition:', error)
      setError(`Unexpected error: ${error}`)
    }
  }

  const handleUpdateCompetition = async (competitionData: Omit<Competition, 'competitions_id' | 'created_at'>) => {
    try {
      if (!editingCompetition) return

      const { data, error } = await supabase
        .from('competitions')
        .update(competitionData)
        .eq('competitions_id', editingCompetition.competitions_id)
        .select()

      if (error) {
        console.error('[Competitions:handleUpdateCompetition] Error updating competition:', error)
        setError('Failed to update competition. Please try again.')
        return
      }

      if (data && data[0]) {
        setCompetitions(prev => prev.map(competition => 
          competition.competitions_id === editingCompetition.competitions_id ? { ...competition, ...data[0] } : competition
        ))
        setEditingCompetition(null)
        setError('')
      }
    } catch (error) {
      console.error('[Competitions:handleUpdateCompetition] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleDeleteCompetition = async (id: number) => {
    if (!confirm('Are you sure you want to delete this competition?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('competitions_id', id)

      if (error) {
        console.error('[Competitions:handleDeleteCompetition] Error deleting competition:', error)
        setError('Failed to delete competition. Please try again.')
        return
      }

      setCompetitions(prev => prev.filter(competition => competition.competitions_id !== id))
      setError('')
    } catch (error) {
      console.error('[Competitions:handleDeleteCompetition] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleLogResults = async (competitionId: number, resultsData: {
    overall_rank: number | null
    total_gold: number | null
    total_silver: number | null
    total_bronze: number | null
  }) => {
    try {
      // Update competition with overall results
      const { data, error } = await supabase
        .from('competitions')
        .update(resultsData)
        .eq('competitions_id', competitionId)
        .select()

      if (error) throw error

      if (data && data[0]) {
        setCompetitions(prev => prev.map(comp => 
          comp.competitions_id === competitionId ? data[0] : comp
        ))
      }

      // Refresh competitions to get updated data
      fetchCompetitions()
    } catch (error) {
      console.error('Error logging results:', error)
      throw error
    }
  }

  const handleRegisterMembers = async (entries: Array<{
    competitions_id: number
    competition_disciplines_id: number | null
    members_id: number
    competition_coaches_id: number | null
  }>) => {
    try {
      const { data, error } = await supabase
        .from('competition_entries')
        .insert(entries)
        .select()

      if (error) throw error

      // Optionally refresh competition data or show success message
      console.log('Members registered successfully:', data)
    } catch (error) {
      console.error('Error registering members:', error)
      throw error
    }
  }

  const getUpcomingCompetitions = () => {
    const today = new Date().toISOString().split('T')[0]
    
    return competitions.filter(comp => {
      if (!comp.date_start) return false
      
      // For single day events, check if start date is today or in the future
      if (comp.singular_day_event) {
        return comp.date_start >= today
      }
      
      // For multi-day events, check if end date is today or in the future
      const endDate = comp.date_end || comp.date_start
      return endDate >= today
    })
  }

  const getPastCompetitions = () => {
    const today = new Date().toISOString().split('T')[0]
    
    return competitions.filter(comp => {
      if (!comp.date_start) return false
      
      // For single day events, check if start date is before today
      if (comp.singular_day_event) {
        return comp.date_start < today
      }
      
      // For multi-day events, check if end date is before today
      const endDate = comp.date_end || comp.date_start
      return endDate < today
    })
  }

  const filteredUpcoming = getUpcomingCompetitions().filter(comp => {
    if (!searchQuery.trim()) return true
    const searchTerm = searchQuery.toLowerCase()
    return (
      comp.Name?.toLowerCase().includes(searchTerm) ||
      comp.location?.toLowerCase().includes(searchTerm)
    )
  })

  const filteredPast = getPastCompetitions().filter(comp => {
    if (!searchQuery.trim()) return true
    const searchTerm = searchQuery.toLowerCase()
    return (
      comp.Name?.toLowerCase().includes(searchTerm) ||
      comp.location?.toLowerCase().includes(searchTerm)
    )
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateRange = (startDate: string | null, endDate: string | null, isSingularDay: boolean | null) => {
    if (!startDate) return 'TBD'
    
    const start = new Date(startDate)
    
    if (isSingularDay || !endDate || startDate === endDate) {
      return start.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    const end = new Date(endDate)
    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    })
    const endFormatted = end.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    return `${startFormatted} - ${endFormatted}`
  }

  const CompetitionCard = ({ competition, isUpcoming }: { competition: Competition, isUpcoming: boolean }) => (
    <div 
      className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 group cursor-pointer shadow-2xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/50"
      onClick={() => {
        setEditingCompetition(competition)
      }}
    >
      {/* Large Background Image with Dimmed Overlay */}
      {competition.competition_profile_picture && (
        <div className="absolute inset-0 z-0">
          <img
            src={competition.competition_profile_picture}
            alt="Competition background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
      )}
      
      {/* Fallback gradient background */}
      {!competition.competition_profile_picture && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20"></div>
      )}

      {/* Content */}
      <div className="relative z-10 p-6 min-h-[200px] flex flex-col">
        {/* Header with status badges and log results button */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors duration-300 mb-2">
              {competition.Name || 'Unnamed Competition'}
            </h3>
            <p className="text-gray-200 text-sm">
              {formatDateRange(competition.date_start, competition.date_end, competition.singular_day_event)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Log Results Button - Top right */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedCompetition(competition)
                setShowLogResultsModal(true)
              }}
              className="bg-blue-600/80 hover:bg-blue-600 hover:scale-105 text-white px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 backdrop-blur-sm border border-blue-400/30"
            >
              Log Results
            </button>
            {!isUpcoming && competition.overall_rank && (
              <span className="bg-yellow-600/80 backdrop-blur-sm text-yellow-100 text-xs px-3 py-1 rounded-full border border-yellow-400/30">
                Rank #{competition.overall_rank}
              </span>
            )}
          </div>
        </div>

        {/* Location */}
        {competition.location && (
          <div className="flex items-center text-gray-200 text-sm mb-4">
            <svg className="w-4 h-4 mr-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {competition.location}
          </div>
        )}

        {/* Results */}
        {!isUpcoming && (competition.total_gold || competition.total_silver || competition.total_bronze) && (
          <div className="flex items-center space-x-4 mb-4">
            {competition.total_gold && competition.total_gold > 0 && (
              <div className="flex items-center text-yellow-300">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-sm font-medium">{competition.total_gold}</span>
              </div>
            )}
            {competition.total_silver && competition.total_silver > 0 && (
              <div className="flex items-center text-gray-300">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-sm font-medium">{competition.total_silver}</span>
              </div>
            )}
            {competition.total_bronze && competition.total_bronze > 0 && (
              <div className="flex items-center text-orange-300">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-sm font-medium">{competition.total_bronze}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-3 mt-auto pt-4">
          {/* Register Members Button - Only for upcoming competitions */}
          {isUpcoming && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedCompetition(competition)
                setShowRegisterMembersModal(true)
              }}
              className="bg-green-600/80 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-green-400/30 hover:scale-105"
            >
              Register Members
            </button>
          )}
        </div>

        {/* Live Analytics - Show when results are logged */}
        {!isUpcoming && (competition.total_gold || competition.total_silver || competition.total_bronze || competition.overall_rank) && (
          <div className="flex justify-center mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.location.href = `/competitions/${competition.competitions_id}/analytics`
              }}
              className="flex items-center space-x-2 bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-1 hover:bg-green-900/30 hover:border-green-500/50 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">Live</span>
              </div>
              <div className="relative w-12 h-3">
                <svg className="w-full h-full" viewBox="0 0 48 12">
                  <path
                    d="M2,10 L6,8 L10,9 L14,6 L18,7 L22,4 L26,5 L30,3 L34,4 L38,2 L42,3 L46,1"
                    stroke="url(#gradient)"
                    strokeWidth="1.5"
                    fill="none"
                    className="animate-pulse"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <circle cx="46" cy="1" r="1" fill="#10b981" className="animate-ping" />
                </svg>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <AnimatedBackground />
        <div className="relative z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <AnimatedBackground />
        <div className="relative z-10 text-white">Redirecting to login...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-black overflow-x-hidden relative">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden sm:block relative z-10">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-x-hidden relative z-10">
        {/* Header */}
        <header className="bg-black border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Competitions</h1>
              <p className="text-gray-400 text-sm mt-1">Manage your martial arts competitions and results</p>
            </div>
            <ProfileDropdown 
              user={user} 
              isLoggingOut={isLoggingOut} 
              onLogout={handleLogout} 
            />
          </div>
        </header>

        {/* Main Content */}
        <main 
          className="flex-1 p-4 sm:p-6 sm:pb-6"
          style={{
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="mb-6">
            {/* Top Row - Add Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {/* Competition count */}
                <div className="text-sm text-gray-400">
                  {isLoadingCompetitions ? 'Loading...' : `${competitions.length} total competitions`}
                </div>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Competition
              </button>
            </div>

            {/* Bottom Row - Search Bar */}
            <div className="flex items-center space-x-3 mb-4">
              {/* Search Bar */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search competitions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* View Toggle */}
              <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    viewMode === 'cards'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    viewMode === 'map'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Map View */}
          {viewMode === 'map' && (
            <div className="mb-8">
              <CompetitionsMap
                competitions={competitions}
                selectedCompetition={selectedCompetition}
                onCompetitionSelect={(competition) => setSelectedCompetition(competition)}
              />
            </div>
          )}

          {/* Upcoming Competitions Section */}
          {viewMode === 'cards' && (
            <>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upcoming Competitions
                <span className="ml-2 bg-blue-600/20 text-blue-400 text-sm px-2 py-1 rounded-full">
                  {filteredUpcoming.length}
                </span>
              </h2>
            </div>
            
            {isLoadingCompetitions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredUpcoming.length === 0 ? (
              <div className="text-center py-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
                <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No upcoming competitions</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUpcoming.map((competition) => (
                  <CompetitionCard 
                    key={competition.competitions_id} 
                    competition={competition} 
                    isUpcoming={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Past Competitions Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Past Competitions
                <span className="ml-2 bg-gray-600/20 text-gray-400 text-sm px-2 py-1 rounded-full">
                  {filteredPast.length}
                </span>
              </h2>
            </div>
            
            {isLoadingCompetitions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredPast.length === 0 ? (
              <div className="text-center py-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
                <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No past competitions</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPast.map((competition) => (
                  <CompetitionCard 
                    key={competition.competitions_id} 
                    competition={competition} 
                    isUpcoming={false}
                  />
                ))}
              </div>
            )}
          </div>
            </>
          )}

        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="relative z-10">
        <MobileBottomNav />
      </div>

      {/* Add Competition Modal */}
      {showAddModal && (
        <AddCompetitionModal
          onClose={() => setShowAddModal(false)}
          onAddCompetition={handleAddCompetition}
        />
      )}

      {/* Edit Competition Modal */}
      {editingCompetition && (
        <AddCompetitionModal
          onClose={() => {
            setEditingCompetition(null)
            setError('')
          }}
          onAddCompetition={handleUpdateCompetition}
          editingCompetition={editingCompetition}
          onDeleteCompetition={handleDeleteCompetition}
        />
      )}

      {/* Log Results Modal */}
      {showLogResultsModal && selectedCompetition && (
        <LogResultsModal
          competition={selectedCompetition}
          onClose={() => {
            setShowLogResultsModal(false)
            setSelectedCompetition(null)
          }}
          onLogResults={handleLogResults}
        />
      )}

      {/* Register Members Modal */}
      {showRegisterMembersModal && selectedCompetition && (
        <RegisterMembersModal
          competition={selectedCompetition}
          onClose={() => {
            setShowRegisterMembersModal(false)
            setSelectedCompetition(null)
          }}
          onRegisterMembers={handleRegisterMembers}
        />
      )}
    </div>
  )
}
