'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { handleAuthError } from '@/lib/authUtils'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'
import MobileBottomNav from '@/components/MobileBottomNav'
import AnimatedBackground from '@/components/AnimatedBackground'
import EditBoutModal from '@/components/EditBoutModal'

interface Competition {
  competitions_id: number
  clubs_id: number | null
  martial_art_id: number | null
  Name: string | null
  date_start: string | null
  date_end: string | null
  location: string | null
  overall_rank: number | null
  total_gold: number | null
  total_silver: number | null
  total_bronze: number | null
  created_at: string
  organisations_id: number | null
  singular_day_event: boolean | null
  competition_profile_picture: string | null
  competition_downloads: string | null
}

interface Member {
  members_id: number
  first_name: string | null
  last_name: string | null
  profile_picture_url: string | null
}

interface CompetitionEntry {
  competition_entries_id: number | null
  competitions_id: number | null
  competition_disciplines_id: number | null
  members_id: number | null
  competition_coaches_id: number | null
  created_at: string
  member?: Member
}

interface CompetitionDiscipline {
  competition_disciplines_id: number
  name: string | null
  martial_art_id: number | null
  team_event: boolean | null
}

interface CompetitionBout {
  competition_bouts_id: number
  competition_entries_id: number | null
  clubs_id: number | null
  round: string | null
  opponent_name: string | null
  opponent_club: string | null
  score_for: number | null
  score_against: number | null
  result: 'Win' | 'Loss' | null
  location_id: number | null
  created_at: string
  competition_teams_id: number | null
}

interface CompetitionResult {
  competition_results_id: number
  competition_entries_id: number | null
  medal: 'Gold' | 'Silver' | 'Bronze' | null
  round_reached: string | null
  created_at: string
}

interface CompetitionTeam {
  competition_teams_id: number
  created_at: string
  competitions_id: number | null
  competition_disciplines_id: number | null
  clubs_id: number | null
  location_id: number | null
  team_name: string | null
  competition_coaches_id: number | null
  result: string | null
  medal: string | null
}

interface CompetitionTeamMember {
  competition_team_members_id: number
  created_at: string
  competition_teams_id: number | null
  member_id: number | null
  member?: Member
}

export default function CompetitionResultsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([])
  const [competitionDisciplines, setCompetitionDisciplines] = useState<CompetitionDiscipline[]>([])
  const [competitionBouts, setCompetitionBouts] = useState<CompetitionBout[]>([])
  const [competitionResults, setCompetitionResults] = useState<CompetitionResult[]>([])
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([])
  const [teamMembers, setTeamMembers] = useState<CompetitionTeamMember[]>([])
  const [error, setError] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(null)
  const [showDisciplineFilter, setShowDisciplineFilter] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBout, setEditingBout] = useState<CompetitionBout | null>(null)
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitionEntry | null>(null)
  const router = useRouter()
  const params = useParams()
  const competitionId = params.id as string

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('[CompetitionResults:getUser] Auth error:', error)
          const sessionCleared = await handleAuthError(error)
          if (sessionCleared) {
            router.push('/login')
            return
          }
        }
        
        setUser(user)
        if (user && competitionId) {
          fetchCompetitionData()
        } else if (!user) {
          router.push('/login')
        }
      } catch (error) {
        console.error('[CompetitionResults:getUser] Unexpected error:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[CompetitionResults:authStateChange] Event:', event, 'Session exists:', !!session)
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          router.push('/login')
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          if (competitionId) {
            fetchCompetitionData()
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, competitionId])

  const fetchCompetitionData = async () => {
    if (!competitionId) return

    try {
      setError('')
      
      console.log('[CompetitionResults:fetchCompetitionData] Fetching competition data for ID:', competitionId)
      
      // Fetch competition details
      const { data: competitionData, error: competitionError } = await supabase
        .from('competitions')
        .select('*')
        .eq('competitions_id', competitionId)
        .single()

      if (competitionError) throw competitionError
      setCompetition(competitionData)

      // Fetch competition entries with member data
      const { data: entriesData, error: entriesError } = await supabase
        .from('competition_entries')
        .select(`
          *,
          member:members!inner(members_id, first_name, last_name, profile_picture_url)
        `)
        .eq('competitions_id', competitionId)

      if (entriesError) throw entriesError
      setCompetitionEntries(entriesData || [])

      // Fetch competition disciplines
      const { data: disciplinesData, error: disciplinesError } = await supabase
        .from('competition_disciplines')
        .select(`
          competition_disciplines_id,
          name,
          martial_art_id,
          team_event,
          competition_entries!inner(competitions_id)
        `)
        .eq('competition_entries.competitions_id', competitionId)

      if (disciplinesError) throw disciplinesError
      setCompetitionDisciplines(disciplinesData || [])

      // Fetch competition bouts
      const { data: boutsData, error: boutsError } = await supabase
        .from('competition_bouts')
        .select('*')
        .in('competition_entries_id', entriesData?.map(e => e.competition_entries_id).filter((id): id is number => id !== null) || [])

      if (boutsError) throw boutsError
      setCompetitionBouts(boutsData || [])

      // Fetch competition results
      const { data: resultsData, error: resultsError } = await supabase
        .from('competition_results')
        .select('*')
        .in('competition_entries_id', entriesData?.map(e => e.competition_entries_id).filter((id): id is number => id !== null) || [])

      if (resultsError) throw resultsError
      setCompetitionResults(resultsData || [])

      // Fetch competition teams for this competition
      const { data: teamsData, error: teamsError } = await supabase
        .from('competition_teams')
        .select('*')
        .eq('competitions_id', competitionId)

      if (teamsError) throw teamsError
      setCompetitionTeams(teamsData || [])

      // Fetch team members for all teams
      const teamIds = teamsData?.map(t => t.competition_teams_id).filter((id): id is number => id !== null) || []
      let teamMembersData: any[] = []
      if (teamIds.length > 0) {
        const { data, error: teamMembersError } = await supabase
          .from('competition_team_members')
          .select(`
            *,
            member:members!inner(members_id, first_name, last_name, profile_picture_url)
          `)
          .in('competition_teams_id', teamIds)

        if (teamMembersError) throw teamMembersError
        teamMembersData = data || []
      }
      setTeamMembers(teamMembersData || [])

      // Set first discipline as selected by default
      if (disciplinesData && disciplinesData.length > 0) {
        setSelectedDiscipline(disciplinesData[0].competition_disciplines_id)
      }

      console.log('[CompetitionResults:fetchCompetitionData] Data fetched successfully:', {
        competition: competitionData,
        entries: entriesData?.length || 0,
        disciplines: disciplinesData?.length || 0,
        bouts: boutsData?.length || 0,
        results: resultsData?.length || 0
      })

    } catch (error) {
      console.error('[CompetitionResults:fetchCompetitionData] Error:', error)
      setError('Failed to load competition data. Please try again.')
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[CompetitionResults:handleLogout] Logout error:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('[CompetitionResults:handleLogout] Unexpected error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleEditBout = (bout: CompetitionBout) => {
    console.log('[CompetitionResults:handleEditBout] Editing bout:', bout)
    
    // Find the competitor for this bout
    const competitor = competitionEntries.find(entry => entry.competition_entries_id === bout.competition_entries_id)
    
    if (competitor) {
      setEditingBout(bout)
      setEditingCompetitor(competitor)
      setShowEditModal(true)
    } else {
      setError('Could not find competitor information for this bout')
    }
  }

  const handleSaveBout = (updatedBout: CompetitionBout, updatedResult?: CompetitionResult) => {
    // Update the bout in our local state
    setCompetitionBouts(prev => prev.map(bout => 
      bout.competition_bouts_id === updatedBout.competition_bouts_id ? updatedBout : bout
    ))

    // Update the result if provided
    if (updatedResult) {
      setCompetitionResults(prev => {
        const existingIndex = prev.findIndex(r => r.competition_results_id === updatedResult.competition_results_id)
        if (existingIndex >= 0) {
          // Update existing result
          return prev.map(r => r.competition_results_id === updatedResult.competition_results_id ? updatedResult : r)
        } else {
          // Add new result
          return [...prev, updatedResult]
        }
      })
    }

    // Refresh competition entries to get updated coach information
    fetchCompetitionData()

    // Close the modal
    setShowEditModal(false)
    setEditingBout(null)
    setEditingCompetitor(null)
  }

  const getCompetitorStats = (competitionEntriesId: number) => {
    const bouts = competitionBouts.filter(bout => bout.competition_entries_id === competitionEntriesId)
    const wins = bouts.filter(bout => bout.result === 'Win').length
    const losses = bouts.filter(bout => bout.result === 'Loss').length
    const result = competitionResults.find(r => r.competition_entries_id === competitionEntriesId)
    
    return {
      wins,
      losses,
      totalBouts: bouts.length,
      medal: result?.medal || null,
      roundReached: result?.round_reached || null
    }
  }

  const getTeamStats = (teamId: number) => {
    const team = competitionTeams.find(t => t.competition_teams_id === teamId)
    const teamMembersForTeam = teamMembers.filter(member => member.competition_teams_id === teamId)
    const memberIds = teamMembersForTeam.map(m => m.member_id).filter((id): id is number => id !== null)
    
    // Get all bouts for team members
    const allBouts = competitionBouts.filter(bout => 
      memberIds.includes(bout.competition_entries_id || 0) && bout.competition_teams_id === teamId
    )
    
    const wins = allBouts.filter(bout => bout.result === 'Win').length
    const losses = allBouts.filter(bout => bout.result === 'Loss').length
    
    return {
      team,
      members: teamMembersForTeam,
      wins,
      losses,
      totalBouts: allBouts.length,
      medal: team?.medal || null,
      result: team?.result || null
    }
  }

  const getFilteredEntries = () => {
    if (!selectedDiscipline) {
      // For "All Disciplines", deduplicate by member ID to avoid showing the same member multiple times
      const seenMembers = new Set<number>()
      return competitionEntries.filter(entry => {
        if (!entry.members_id) return false
        if (seenMembers.has(entry.members_id)) return false
        seenMembers.add(entry.members_id)
        return true
      })
    }
    return competitionEntries.filter(entry => entry.competition_disciplines_id === selectedDiscipline)
  }

  const getFilteredTeams = () => {
    if (!selectedDiscipline) return competitionTeams
    return competitionTeams.filter(team => team.competition_disciplines_id === selectedDiscipline)
  }

  const getFilteredBouts = () => {
    if (!selectedDiscipline) {
      // For "All Disciplines", show all bouts (no filtering needed)
      return competitionBouts
    }
    
    const filteredEntries = getFilteredEntries()
    const filteredTeams = getFilteredTeams()
    const entryIds = filteredEntries.map(e => e.competition_entries_id).filter((id): id is number => id !== null)
    const teamIds = filteredTeams.map(t => t.competition_teams_id).filter((id): id is number => id !== null)
    
    return competitionBouts.filter(bout => 
      (bout.competition_entries_id !== null && entryIds.includes(bout.competition_entries_id)) ||
      (bout.competition_teams_id !== null && teamIds.includes(bout.competition_teams_id))
    )
  }

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

  if (!competition) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <AnimatedBackground />
        <div className="relative z-10 text-white">Competition not found</div>
      </div>
    )
  }

  const filteredEntries = getFilteredEntries()
  const filteredBouts = getFilteredBouts()

  return (
    <div className="flex min-h-screen bg-black overflow-x-hidden relative ios-status-bar-fix">
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/competitions')}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Competition Results</h1>
                <p className="text-gray-400 text-sm mt-1">{competition.Name}</p>
              </div>
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

          {/* Competition Info Header */}
          <div className="mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden relative max-w-md mx-auto">
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

            {/* Medal Glow Effects */}
            {competition.overall_rank && (
              <div className={`absolute inset-0 z-5 pointer-events-none ${
                competition.overall_rank === 1 
                  ? 'bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 shadow-[0_0_60px_rgba(250,204,21,0.3)]' 
                  : competition.overall_rank === 2 
                  ? 'bg-gradient-to-r from-gray-300/20 via-transparent to-gray-300/20 shadow-[0_0_60px_rgba(209,213,219,0.3)]'
                  : competition.overall_rank === 3
                  ? 'bg-gradient-to-r from-orange-400/20 via-transparent to-orange-400/20 shadow-[0_0_60px_rgba(251,146,60,0.3)]'
                  : ''
              }`}></div>
            )}

            {/* Content */}
            <div className="relative z-10 p-6 min-h-[200px] flex flex-col">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-2xl font-bold text-white">{competition.Name}</h2>
                    {competition.overall_rank && (
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold border backdrop-blur-sm ${
                        competition.overall_rank === 1 
                          ? 'bg-yellow-600/80 text-yellow-100 border-yellow-400/30' 
                          : competition.overall_rank === 2 
                          ? 'bg-gray-600/80 text-gray-100 border-gray-400/30'
                          : competition.overall_rank === 3
                          ? 'bg-orange-600/80 text-orange-100 border-orange-400/30'
                          : 'bg-blue-600/80 text-blue-100 border-blue-400/30'
                      }`}>
                        {competition.overall_rank === 1 ? '🥇 1st Place' : 
                         competition.overall_rank === 2 ? '🥈 2nd Place' : 
                         competition.overall_rank === 3 ? '🥉 3rd Place' : 
                         `#${competition.overall_rank}`}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-200">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDateRange(competition.date_start, competition.date_end, competition.singular_day_event)}
                  </div>
                  {competition.location && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {competition.location}
                    </div>
                  )}
                  </div>
                </div>
                
                {/* Overall Results Widget */}
                {(competition.total_gold || competition.total_silver || competition.total_bronze) && (
                  <div className="flex items-center space-x-4 mt-4 md:mt-0">
                  {competition.overall_rank && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">#{competition.overall_rank}</div>
                      <div className="text-xs text-gray-400">Overall Rank</div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    {competition.total_gold && competition.total_gold > 0 && (
                      <div className="flex items-center text-yellow-400">
                        <span className="text-lg">🥇</span>
                        <span className="ml-1 font-bold">{competition.total_gold}</span>
                      </div>
                    )}
                    {competition.total_silver && competition.total_silver > 0 && (
                      <div className="flex items-center text-gray-300">
                        <span className="text-lg">🥈</span>
                        <span className="ml-1 font-bold">{competition.total_silver}</span>
                      </div>
                    )}
                    {competition.total_bronze && competition.total_bronze > 0 && (
                      <div className="flex items-center text-orange-400">
                        <span className="text-lg">🥉</span>
                        <span className="ml-1 font-bold">{competition.total_bronze}</span>
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Discipline Filter */}
          {competitionDisciplines.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Filter by Discipline</h3>
                <button
                  onClick={() => setShowDisciplineFilter(!showDisciplineFilter)}
                  className="flex items-center space-x-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/30"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${showDisciplineFilter ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span>{showDisciplineFilter ? 'Hide' : 'Show'} Filters</span>
                </button>
              </div>
              
              {/* Collapsible Filter Options */}
              {showDisciplineFilter && (
                <div className="flex flex-wrap gap-3">
                  {/* All Disciplines Option */}
                  <button
                    onClick={() => setSelectedDiscipline(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      selectedDiscipline === null
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20 border-white/20 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>All Disciplines</span>
                    </div>
                  </button>
                  
                  {/* Individual Discipline Options */}
                  {competitionDisciplines.map((discipline) => (
                    <button
                      key={discipline.competition_disciplines_id}
                      onClick={() => setSelectedDiscipline(discipline.competition_disciplines_id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                        selectedDiscipline === discipline.competition_disciplines_id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20 border-white/20 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{discipline.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Show current selection when collapsed */}
              {!showDisciplineFilter && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Current filter:</span>
                  <span className="text-sm font-medium text-blue-400">
                    {selectedDiscipline === null 
                      ? 'All Disciplines' 
                      : competitionDisciplines.find(d => d.competition_disciplines_id === selectedDiscipline)?.name || 'Unknown'
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Stats Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Competitors</p>
                  <p className="text-2xl font-bold text-white">{filteredEntries.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Bouts</p>
                  <p className="text-2xl font-bold text-white">{filteredBouts.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Medals Won</p>
                  <p className="text-2xl font-bold text-white">
                    {(competition.total_gold || 0) + (competition.total_silver || 0) + (competition.total_bronze || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏆</span>
                </div>
              </div>
            </div>
          </div>

          {/* Competitors Results */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Competitor Results</h3>
            
            {/* Individual Competitors */}
            {filteredEntries.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Individual Competitors
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEntries.map((entry) => {
                    const member = entry.member
                    if (!member) return null

                    const stats = entry.competition_entries_id ? getCompetitorStats(entry.competition_entries_id) : null
                    
                    if (!stats) return null
                    
                    return (
                  <div
                    key={entry.competition_entries_id}
                    className={`backdrop-blur-md rounded-xl p-4 hover:bg-white/10 transition-all duration-200 relative overflow-hidden ${
                      stats.medal
                        ? `${
                            stats.medal === 'Gold' 
                              ? 'bg-gradient-to-br from-yellow-900/30 to-yellow-700/20 border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
                              : stats.medal === 'Silver'
                              ? 'bg-gradient-to-br from-gray-800/30 to-gray-600/20 border-gray-400/50 shadow-lg shadow-gray-400/20'
                              : 'bg-gradient-to-br from-orange-900/30 to-orange-700/20 border-orange-500/50 shadow-lg shadow-orange-500/20'
                          }`
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    {/* Medal glow overlay */}
                    {stats.medal && (
                      <div className="absolute inset-0 rounded-xl pointer-events-none">
                        <div className={`absolute inset-0 rounded-xl ${
                          stats.medal === 'Gold' 
                            ? 'bg-gradient-to-br from-yellow-400/10 to-transparent shadow-inner shadow-yellow-400/30' 
                            : stats.medal === 'Silver'
                            ? 'bg-gradient-to-br from-gray-400/10 to-transparent shadow-inner shadow-gray-400/30'
                            : 'bg-gradient-to-br from-orange-400/10 to-transparent shadow-inner shadow-orange-400/30'
                        }`}></div>
                      </div>
                    )}
                    
                    <div className="relative z-10 flex items-center space-x-3 mb-3">
                      {member.profile_picture_url ? (
                        <img
                          src={member.profile_picture_url}
                          alt={`${member.first_name} ${member.last_name}`}
                          className="w-10 h-10 rounded-full object-cover border border-white/20"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.first_name?.[0]?.toUpperCase() || 'M'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">
                          {member.first_name} {member.last_name}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {stats.wins}W - {stats.losses}L
                        </p>
                      </div>
                      {stats.medal && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          stats.medal === 'Gold' 
                            ? 'bg-yellow-500 text-yellow-900' 
                            : stats.medal === 'Silver'
                            ? 'bg-gray-400 text-gray-900'
                            : 'bg-orange-500 text-orange-900'
                        }`}>
                          {stats.medal === 'Gold' ? '🥇' :
                           stats.medal === 'Silver' ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Bouts:</span>
                        <span className="text-white">{stats.totalBouts}</span>
                      </div>
                      {stats.roundReached && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Round Reached:</span>
                          <span className="text-white">{stats.roundReached}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
                </div>
              </div>
            )}

            {/* Teams */}
            {getFilteredTeams().length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Teams
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFilteredTeams().map((team) => {
                    const stats = getTeamStats(team.competition_teams_id)
                    
                    return (
                      <div
                        key={team.competition_teams_id}
                        className={`backdrop-blur-md rounded-xl p-4 hover:bg-white/10 transition-all duration-200 relative overflow-hidden ${
                          stats.medal
                            ? `${
                                stats.medal === 'Gold' 
                                  ? 'bg-gradient-to-br from-yellow-900/30 to-yellow-700/20 border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
                                  : stats.medal === 'Silver'
                                  ? 'bg-gradient-to-br from-gray-800/30 to-gray-600/20 border-gray-400/50 shadow-lg shadow-gray-400/20'
                                  : 'bg-gradient-to-br from-orange-900/30 to-orange-700/20 border-orange-500/50 shadow-lg shadow-orange-500/20'
                              }`
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        {/* Team medal glow overlay */}
                        {stats.medal && (
                          <div className="absolute inset-0 rounded-xl pointer-events-none">
                            <div className={`absolute inset-0 rounded-xl ${
                              stats.medal === 'Gold' 
                                ? 'bg-gradient-to-br from-yellow-400/10 to-transparent shadow-inner shadow-yellow-400/30' 
                                : stats.medal === 'Silver'
                                ? 'bg-gradient-to-br from-gray-400/10 to-transparent shadow-inner shadow-gray-400/30'
                                : 'bg-gradient-to-br from-orange-400/10 to-transparent shadow-inner shadow-orange-400/30'
                            }`}></div>
                          </div>
                        )}
                        
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium truncate">
                                  {team.team_name || `Team ${team.competition_teams_id}`}
                                </h4>
                                <p className="text-xs text-gray-400">
                                  {stats.wins}W - {stats.losses}L ({stats.members.length} members)
                                </p>
                              </div>
                            </div>
                            {stats.medal && (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                stats.medal === 'Gold' 
                                  ? 'bg-yellow-500 text-yellow-900' 
                                  : stats.medal === 'Silver'
                                  ? 'bg-gray-400 text-gray-900'
                                  : 'bg-orange-500 text-orange-900'
                              }`}>
                                {stats.medal === 'Gold' ? '🥇' :
                                 stats.medal === 'Silver' ? '🥈' : '🥉'}
                              </div>
                            )}
                          </div>
                          
                          <div className="relative z-10 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Total Bouts:</span>
                              <span className="text-white">{stats.totalBouts}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Members:</span>
                              <span className="text-white">{stats.members.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bout Results */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Bout Results</h3>
              <p className="text-xs text-gray-400">Click on any bout to edit</p>
            </div>
            {filteredBouts.length === 0 ? (
              <div className="text-center py-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
                <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No bout results recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBouts.map((bout) => {
                  const entry = competitionEntries.find(e => e.competition_entries_id === bout.competition_entries_id)
                  const member = entry?.member
                  
                  return (
                    <div
                      key={bout.competition_bouts_id}
                      onClick={() => handleEditBout(bout)}
                      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-blue-500/30 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {member?.profile_picture_url ? (
                            <img
                              src={member.profile_picture_url}
                              alt={`${member.first_name} ${member.last_name}`}
                              className="w-8 h-8 rounded-full object-cover border border-white/20"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                              {member?.first_name?.[0]?.toUpperCase() || 'M'}
                            </div>
                          )}
                          <div>
                            <h4 className="text-white font-medium text-sm">
                              {member?.first_name} {member?.last_name}
                            </h4>
                            <p className="text-xs text-gray-400">{bout.round}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            bout.result === 'Win' 
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            {bout.result === 'Win' ? '🟢 Win' : '🔴 Loss'}
                          </div>
                          <svg className="w-4 h-4 text-gray-400 hover:text-blue-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-gray-400 mb-1">Our Score</p>
                          <p className="text-xl font-bold text-white">{bout.score_for}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 mb-1">Opponent Score</p>
                          <p className="text-xl font-bold text-white">{bout.score_against}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">vs</span>
                          <span className="text-white font-medium">
                            {bout.opponent_name}
                            {bout.opponent_club && (
                              <span className="text-gray-400 ml-1">({bout.opponent_club})</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="relative z-10">
        <MobileBottomNav />
      </div>

      {/* Edit Bout Modal */}
      {showEditModal && editingBout && editingCompetitor && (
        <EditBoutModal
          bout={editingBout}
          competitor={editingCompetitor}
          onClose={() => {
            setShowEditModal(false)
            setEditingBout(null)
            setEditingCompetitor(null)
          }}
          onSave={handleSaveBout}
        />
      )}
    </div>
  )
}
