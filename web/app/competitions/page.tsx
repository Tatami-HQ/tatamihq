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
import { useSidebar } from '@/contexts/SidebarContext'
import { AnalyticsService, type ClubAnalytics } from '@/lib/analyticsUtils'

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
  const { isCollapsed } = useSidebar()
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
  const [openToAllResults, setOpenToAllResults] = useState(false)
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
  const [clubAnalytics, setClubAnalytics] = useState<ClubAnalytics | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailModalData, setDetailModalData] = useState({
    title: '',
    data: [] as any[],
    type: '',
    overviewData: {} as any
  })
  const [showIndividualBoutsModal, setShowIndividualBoutsModal] = useState(false)
  const [showTeamBoutsModal, setShowTeamBoutsModal] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedDiscipline, setSelectedDiscipline] = useState('All Disciplines')
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
      
      // Fetch analytics data after competitions are loaded
      fetchClubAnalytics()
    } catch (error) {
      console.error('[Competitions:fetchCompetitions] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoadingCompetitions(false)
    }
  }

  const fetchClubAnalytics = async () => {
    try {
      setIsLoadingAnalytics(true)
      console.log('Fetching club analytics...')
      
      const analytics = await AnalyticsService.getClubAnalytics()
      setClubAnalytics(analytics)
      
      console.log('Club analytics loaded:', analytics)
    } catch (error) {
      console.error('Error fetching club analytics:', error)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  const fetchAthletesDetail = async () => {
    try {
      console.log('Fetching athletes detail...')
      const { data: entriesData, error } = await supabase
        .from('competition_entries')
        .select(`
          members_id,
          member:members_id (
            first_name,
            last_name,
            profile_picture_url,
            gender
          )
        `)
        .not('members_id', 'is', null)

      if (error) {
        console.error('Error fetching athletes detail:', error)
        console.error('Athletes detail error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return []
      }

      console.log('Athletes detail entries data:', entriesData || [])

      // Get unique athletes with their data
      const uniqueAthletes = new Map()
      entriesData?.forEach(entry => {
        if (entry.member && Array.isArray(entry.member) && entry.member.length > 0 && !uniqueAthletes.has(entry.members_id)) {
          const member = entry.member[0]
          uniqueAthletes.set(entry.members_id, {
            id: entry.members_id,
            name: `${member.first_name} ${member.last_name}`,
            profilePicture: member.profile_picture_url,
            gender: member.gender
          })
        }
      })

      const result = Array.from(uniqueAthletes.values())
      console.log('Athletes detail result:', result)
      return result
    } catch (error) {
      console.error('Error fetching athletes detail:', error)
      return []
    }
  }

  const fetchBoutsDetail = async () => {
    try {
      console.log('Fetching bouts detail...')
      
      // Fetch ALL bouts data - individual bouts only (exclude team events)
      const { data: boutsData, error } = await supabase
        .from('competition_bouts')
        .select(`
          competition_bouts_id,
          result,
          round,
          medal,
          competition_entries_id,
          competition_teams_id,
          competitions_id,
          created_at
        `)
        .is('competition_teams_id', null) // Only individual bouts, not team events

      if (error) {
        console.error('Error fetching bouts detail:', error)
        console.error('Bouts detail error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return []
      }

      console.log('Bouts detail data (individual bouts only):', boutsData || [])
      console.log('Total individual bouts:', boutsData?.length || 0)

      // If we have data, get member names and competition details
      if (boutsData && boutsData.length > 0) {
        // Get unique entry IDs
        const entryIds = boutsData
          .map(bout => bout.competition_entries_id)
          .filter(id => id !== null)

        let memberNames = {}
        let competitionNames = {}
        
        // Get member details
        if (entryIds.length > 0) {
          try {
            const { data: entriesData } = await supabase
              .from('competition_entries')
              .select('competition_entries_id, members_id')
              .in('competition_entries_id', entryIds)

            const memberIds = entriesData?.map(entry => entry.members_id).filter(id => id !== null) || []
            if (memberIds.length > 0) {
              const { data: membersData } = await supabase
                .from('members')
                .select('members_id, first_name, last_name, profile_picture_url')
                .in('members_id', memberIds)

              memberNames = membersData?.reduce((acc: any, member) => {
                acc[member.members_id] = {
                  name: `${member.first_name} ${member.last_name}`,
                  profilePicture: member.profile_picture_url
                }
                return acc
              }, {}) || {}
            }
          } catch (memberError) {
            console.log('Could not fetch member names:', memberError)
          }
        }

        // Get competition details
        const competitionIds = [...new Set(boutsData.map(bout => bout.competitions_id).filter(id => id !== null))]
        if (competitionIds.length > 0) {
          try {
            const { data: competitionsData } = await supabase
              .from('competitions')
              .select('competitions_id, Name, date_start')
              .in('competitions_id', competitionIds)

            competitionNames = competitionsData?.reduce((acc: any, comp) => {
              acc[comp.competitions_id] = {
                name: comp.Name || 'Unknown Competition',
                date: comp.date_start || 'Unknown Date'
              }
              return acc
            }, {}) || {}
          } catch (compError) {
            console.log('Could not fetch competition names:', compError)
          }
        }

        return boutsData.map(bout => {
          const entryId = bout.competition_entries_id
          const memberInfo = (memberNames as any)[entryId] || { name: 'Unknown Member', profilePicture: null }
          const compInfo = (competitionNames as any)[bout.competitions_id] || { name: 'Unknown Competition', date: 'Unknown Date' }

          return {
            member: memberInfo.name,
            memberId: entryId,
            profilePicture: memberInfo.profilePicture,
            result: bout.result || 'Unknown',
            round: bout.round || 'Unknown',
            medal: bout.medal || null,
            competition: compInfo.name,
            date: compInfo.date,
            isTeamEvent: false, // We filtered out team events
            boutId: bout.competition_bouts_id,
            createdAt: bout.created_at
          }
        })
      }

      return []
    } catch (error) {
      console.error('Error fetching bouts detail:', error)
      return []
    }
  }

  const fetchCompetitionsDetail = async () => {
    try {
      console.log('Fetching competitions detail...')
      
      const { data: competitionsData, error } = await supabase
        .from('competitions')
        .select('competitions_id, Name, date_start, location, total_gold, total_silver, total_bronze, overall_rank, competition_profile_picture, profile_picture_url')
        .order('date_start', { ascending: false })

      if (error) {
        console.error('Error fetching competitions detail:', error)
        console.error('Competitions detail error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return []
      }

      console.log('Competitions detail data:', competitionsData || [])

      return competitionsData?.map(comp => ({
        id: comp.competitions_id,
        name: comp.Name || 'Unnamed Competition',
        date: comp.date_start || 'TBD',
        location: comp.location || 'TBD',
        gold: comp.total_gold || 0,
        silver: comp.total_silver || 0,
        bronze: comp.total_bronze || 0,
        rank: comp.overall_rank || 'N/A',
        profilePicture: comp.competition_profile_picture || comp.profile_picture_url || null
      })) || []
    } catch (error) {
      console.error('Error fetching competitions detail:', error)
      return []
    }
  }

  const handleWidgetClick = async (type: string) => {
    let data: any[] = []
    let title = ''
    let overviewData: any = {}

    switch (type) {
      case 'competitions':
        title = 'Competitions Overview'
        data = await fetchCompetitionsDetail()
        overviewData = {
          total: clubAnalytics?.competitionsAttended || 0,
          upcoming: data.filter(comp => comp.date !== 'TBD' && new Date(comp.date) > new Date()).length,
          completed: data.filter(comp => comp.date !== 'TBD' && new Date(comp.date) <= new Date()).length,
          totalMedals: clubAnalytics?.totalMedals || 0,
          scheduled: data.filter(comp => comp.date === 'TBD').length
        }
        break
      case 'athletes':
        title = 'All Competitors - Complete List'
        const competitorsData = await AnalyticsService.getAllCompetitors()
        data = competitorsData.competitors
        overviewData = {
          total: competitorsData.totalStats.totalCompetitors,
          totalCompetitions: competitorsData.totalStats.totalCompetitions,
          totalBouts: competitorsData.totalStats.totalBouts,
          totalWins: competitorsData.totalStats.totalWins,
          overallWinRate: competitorsData.totalStats.overallWinRate,
          totalMedals: competitorsData.totalStats.totalMedals
        }
        break
      case 'bouts':
        title = 'Bouts Overview'
        data = await fetchBoutsDetail()
        const wins = data.filter(bout => bout.result === 'Win' || bout.result === 'win').length
        const losses = data.filter(bout => bout.result === 'Loss' || bout.result === 'loss').length
        overviewData = {
          total: clubAnalytics?.totalBouts || 0,
          wins: wins,
          losses: losses,
          winRate: clubAnalytics?.winRate || 0,
          teamEvents: data.filter(bout => bout.isTeamEvent).length,
          individualEvents: data.filter(bout => !bout.isTeamEvent).length
        }
        break
      case 'winrate':
        title = 'Win Rate Analysis - Detailed Breakdown'
        const winRateData = await AnalyticsService.getWinRateAnalysis()
        data = [...winRateData.individualBouts, ...winRateData.teamBouts]
        overviewData = {
          winRate: winRateData.summary.overallWinRate,
          totalBouts: winRateData.summary.totalBouts,
          totalWins: winRateData.summary.totalWins,
          totalLosses: winRateData.summary.totalLosses,
          individualBouts: winRateData.summary.individualBouts,
          individualWins: winRateData.summary.individualWins,
          individualLosses: winRateData.summary.individualLosses,
          individualWinRate: winRateData.summary.individualWinRate,
          teamBouts: winRateData.summary.teamBouts,
          teamWins: winRateData.summary.teamWins,
          teamLosses: winRateData.summary.teamLosses,
          teamWinRate: winRateData.summary.teamWinRate,
          uniqueCompetitors: winRateData.summary.uniqueCompetitors,
          uniqueTeams: winRateData.summary.uniqueTeams,
          uniqueCompetitions: winRateData.summary.uniqueCompetitions,
          individualBoutsData: winRateData.individualBouts,
          teamBoutsData: winRateData.teamBouts
        }
        break
      case 'efficiency':
        title = 'Medal Efficiency Analysis'
        data = []
        overviewData = {
          efficiency: clubAnalytics?.medalEfficiency || 0,
          totalMedals: clubAnalytics?.totalMedals || 0,
          totalEntries: clubAnalytics?.totalCompetitors || 0,
          goldMedals: clubAnalytics?.goldMedals || 0,
          silverMedals: clubAnalytics?.silverMedals || 0,
          bronzeMedals: clubAnalytics?.bronzeMedals || 0
        }
        break
      case 'trend':
        title = 'Year-on-Year Trends'
        data = await AnalyticsService.getYearOnYearTrends()
        overviewData = {
          currentTrend: clubAnalytics?.yearOnYearTrend || 0,
          totalYears: data.length,
          latestYear: data[data.length - 1]?.year || new Date().getFullYear(),
          latestWinRate: data[data.length - 1]?.winRate || 0
        }
        break
      case 'topPerformer':
        title = 'Top Performers'
        data = []
        overviewData = {
          topPerformer: clubAnalytics?.topPerformer.name || 'N/A',
          medalPoints: clubAnalytics?.topPerformer.medals || 0,
          winRate: clubAnalytics?.topPerformer.winRate || 0,
          mostImproved: clubAnalytics?.mostImproved.name || 'N/A',
          improvement: clubAnalytics?.mostImproved.improvement || 0
        }
        break
      case 'levels':
        title = 'Competition Level Breakdown'
        data = []
        overviewData = {
          club: clubAnalytics?.competitionLevels.club || 0,
          national: clubAnalytics?.competitionLevels.national || 0,
          international: clubAnalytics?.competitionLevels.international || 0,
          total: (clubAnalytics?.competitionLevels.club || 0) + (clubAnalytics?.competitionLevels.national || 0) + (clubAnalytics?.competitionLevels.international || 0)
        }
        break
      default:
        return
    }

    setDetailModalData({ title, data, type, overviewData })
    setShowDetailModal(true)
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

  const handleViewAllResults = (competitionId: number) => {
    // Navigate to the competition results page
    router.push(`/competitions/${competitionId}/results`)
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
              className="bg-yellow-600/80 hover:bg-yellow-600 hover:scale-105 text-white px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 backdrop-blur-sm border border-yellow-400/30"
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
              className="bg-blue-600/80 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-blue-400/30 hover:scale-105"
            >
              Register Members
            </button>
          )}
          
          {/* View Analytics Button - For all competitions */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedCompetition(competition)
              setOpenToAllResults(true)
              setShowLogResultsModal(true)
            }}
            className="bg-green-600/80 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-green-400/30 hover:scale-105"
          >
            View Analytics
          </button>
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
    <div className="flex min-h-screen bg-black overflow-x-hidden relative ios-status-bar-fix">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:block relative z-10">
        <Sidebar />
      </div>
      
      <div className={`flex-1 flex flex-col overflow-x-hidden relative z-20 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
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
          className="flex-1 p-4 sm:p-6 pb-24 sm:pb-6"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 96px)'
          }}
        >
          {/* Competition Overview Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Club Competition Overview
              </h2>
            </div>
            
            {/* Overview Widgets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6">
              {/* Total Competitions */}
              <div 
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 lg:p-5 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer relative overflow-hidden group"
                onClick={() => handleWidgetClick('competitions')}
              >
                {/* Mobile glow effect */}
                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl sm:hidden"></div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 group-hover:text-blue-400 transition-colors duration-300">
                  {isLoadingAnalytics ? '...' : clubAnalytics?.competitionsAttended || 0}
                </div>
                <div className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Total Competitions</div>
              </div>

              {/* Total Athletes */}
              <div 
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:scale-105 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => handleWidgetClick('athletes')}
              >
                {/* Mobile glow effect */}
                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl sm:hidden"></div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {isLoadingAnalytics ? '...' : clubAnalytics?.totalCompetitors || 0}
                </div>
                <div className="text-sm text-gray-400">Total Athletes</div>
              </div>

              {/* Total Bouts */}
              <div 
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => handleWidgetClick('bouts')}
              >
                {/* Mobile glow effect */}
                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl sm:hidden"></div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {isLoadingAnalytics ? '...' : clubAnalytics?.totalBouts || 0}
                </div>
                <div className="text-sm text-gray-400">Total Bouts</div>
              </div>

              {/* Win Rate */}
              <div 
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 lg:p-5 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/30 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                onClick={() => handleWidgetClick('winrate')}
              >
                {/* Mobile glow effect */}
                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl sm:hidden"></div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {isLoadingAnalytics ? '...' : `${clubAnalytics?.winRate || 0}%`}
                </div>
                <div className="text-sm text-gray-400">Win Rate</div>
              </div>

              {/* Total Medals & Breakdown - Feature Widget */}
              <div className="col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-yellow-500/10 backdrop-blur-md border border-orange-500/20 rounded-2xl p-6 hover:scale-105 hover:shadow-xl hover:shadow-white/20 transition-all duration-300 relative overflow-hidden">
                {/* Mobile glow effect */}
                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl sm:hidden"></div>
                
                {/* Animated Sparkles Background */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="absolute top-2 left-4 w-1 h-1 bg-yellow-300 rounded-full animate-pulse opacity-60"></div>
                  <div className="absolute top-6 right-6 w-1 h-1 bg-orange-300 rounded-full animate-pulse opacity-80" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute top-12 left-8 w-1 h-1 bg-amber-300 rounded-full animate-pulse opacity-70" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute bottom-8 right-4 w-1 h-1 bg-yellow-400 rounded-full animate-pulse opacity-60" style={{ animationDelay: '1.5s' }}></div>
                  <div className="absolute bottom-4 left-6 w-1 h-1 bg-orange-400 rounded-full animate-pulse opacity-90" style={{ animationDelay: '0.8s' }}></div>
                  <div className="absolute top-8 right-8 w-1 h-1 bg-amber-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '1.2s' }}></div>
                  <div className="absolute bottom-6 right-12 w-1 h-1 bg-yellow-300 rounded-full animate-pulse opacity-75" style={{ animationDelay: '0.3s' }}></div>
                  <div className="absolute top-4 left-12 w-1 h-1 bg-orange-300 rounded-full animate-pulse opacity-65" style={{ animationDelay: '1.7s' }}></div>
                  {/* Additional sparkles for mobile */}
                  <div className="absolute top-10 left-2 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-pulse opacity-80" style={{ animationDelay: '0.2s' }}></div>
                  <div className="absolute bottom-10 right-2 w-0.5 h-0.5 bg-orange-400 rounded-full animate-pulse opacity-70" style={{ animationDelay: '1.8s' }}></div>
                  <div className="absolute top-16 right-3 w-0.5 h-0.5 bg-amber-400 rounded-full animate-pulse opacity-60" style={{ animationDelay: '0.7s' }}></div>
                </div>
                
                {/* Header Section */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">
                      {isLoadingAnalytics ? '...' : clubAnalytics?.totalMedals || 0}
                    </div>
                    <div className="text-sm text-orange-300 font-medium">Total Medals</div>
                  </div>
                </div>

                {/* Medals Breakdown Section */}
                <div className="bg-black/20 rounded-xl p-4 border border-orange-500/10">
                  <div className="text-sm text-orange-300 font-medium mb-3 text-center">Medal Breakdown</div>
                  <div className="space-y-3">
             <div className="flex items-center justify-between bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
               <div className="flex items-center">
                 <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 rounded-full mr-3 shadow-sm"></div>
                 <span className="text-sm text-yellow-200 font-semibold">Gold</span>
               </div>
               <span className="text-lg font-bold text-yellow-300">{isLoadingAnalytics ? '...' : clubAnalytics?.goldMedals || 0}</span>
             </div>
                    <div className="flex items-center justify-between bg-gray-500/10 rounded-lg p-3 border border-gray-400/20">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gradient-to-r from-gray-300 to-gray-200 rounded-full mr-3 shadow-sm"></div>
                        <span className="text-sm text-gray-200 font-semibold">Silver</span>
                      </div>
                      <span className="text-lg font-bold text-gray-300">{isLoadingAnalytics ? '...' : clubAnalytics?.silverMedals || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-orange-500/10 rounded-lg p-3 border border-orange-400/20">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-orange-300 rounded-full mr-3 shadow-sm"></div>
                        <span className="text-sm text-orange-200 font-semibold">Bronze</span>
                      </div>
                      <span className="text-lg font-bold text-orange-300">{isLoadingAnalytics ? '...' : clubAnalytics?.bronzeMedals || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Analytics Widgets */}
              {/* Medal Efficiency */}
              <div 
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:scale-105 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => handleWidgetClick('efficiency')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {isLoadingAnalytics ? '...' : `${clubAnalytics?.medalEfficiency || 0}%`}
                </div>
                <div className="text-sm text-gray-400">Medal Efficiency</div>
              </div>

              {/* Year-on-Year Trend */}
              <div 
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => handleWidgetClick('trend')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {isLoadingAnalytics ? '...' : `${(clubAnalytics?.yearOnYearTrend || 0) > 0 ? '+' : ''}${clubAnalytics?.yearOnYearTrend || 0}%`}
                </div>
                <div className="text-sm text-gray-400">YoY Improvement</div>
              </div>

              {/* Top Performer */}
              <div 
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/30 transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => handleWidgetClick('topPerformer')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                </div>
                <div className="text-lg font-bold text-white mb-1 truncate">
                  {isLoadingAnalytics ? '...' : clubAnalytics?.topPerformer.name || 'N/A'}
                </div>
                <div className="text-sm text-gray-400">{clubAnalytics?.topPerformer.medals || 0} pts</div>
              </div>

              {/* Competition Levels */}
              <div 
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => handleWidgetClick('levels')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {isLoadingAnalytics ? '...' : (clubAnalytics?.competitionLevels.club || 0) + (clubAnalytics?.competitionLevels.national || 0) + (clubAnalytics?.competitionLevels.international || 0)}
                </div>
                <div className="text-sm text-gray-400">Competition Levels</div>
              </div>
            </div>
          </div>
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
            setOpenToAllResults(false)
          }}
          onLogResults={handleLogResults}
          onViewAllResults={handleViewAllResults}
          openToAllResults={openToAllResults}
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

      {/* Detail Modal */}
      {showDetailModal && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-300 ${isCollapsed ? 'md:left-20' : 'md:left-64'}`} style={{ top: '80px' }}>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden mx-2 sm:mx-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white truncate pr-2">{detailModalData.title}</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[60vh]">

              {/* Detailed Data Section */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Detailed Data</h4>
                {detailModalData.type === 'athletes' && (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-500/10 rounded-lg p-4 text-center border border-blue-500/20">
                      <div className="text-2xl font-bold text-blue-400">{detailModalData.overviewData?.total || 0}</div>
                      <div className="text-sm text-gray-300">Total Competitors</div>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
                      <div className="text-2xl font-bold text-green-400">{detailModalData.overviewData?.totalBouts || 0}</div>
                      <div className="text-sm text-gray-300">Total Bouts</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-4 text-center border border-yellow-500/20">
                      <div className="text-2xl font-bold text-yellow-400">{detailModalData.overviewData?.overallWinRate || 0}%</div>
                      <div className="text-sm text-gray-300">Overall Win Rate</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-4 text-center border border-purple-500/20">
                      <div className="text-2xl font-bold text-purple-400">{detailModalData.overviewData?.totalMedals || 0}</div>
                      <div className="text-sm text-gray-300">Total Medals</div>
                    </div>
                  </div>

                  {/* Competitors List */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white mb-4">All Competitors</h3>
                    {detailModalData.data.map((competitor: any, index: number) => (
                      <div key={competitor.memberId} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                              {competitor.profilePicture ? (
                                <img 
                                  src={competitor.profilePicture} 
                                  alt={competitor.memberName}
                                  className="w-12 h-12 rounded-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                                    if (nextElement) nextElement.style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center" style={{display: competitor.profilePicture ? 'none' : 'flex'}}>
                                <span className="text-blue-400 font-semibold text-lg">
                                  {competitor.memberName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-lg font-medium text-white">{competitor.memberName}</div>
                              <div className="text-sm text-gray-400">
                                {competitor.totalCompetitions} competitions • {competitor.totalBouts} bouts • {competitor.totalWins} wins
                              </div>
                              <div className="text-xs text-gray-500">
                                First: {competitor.firstCompetition ? new Date(competitor.firstCompetition).toLocaleDateString() : 'N/A'} • 
                                Last: {competitor.lastCompetition ? new Date(competitor.lastCompetition).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-6 text-right">
                            <div>
                              <div className="text-lg font-bold text-white">{competitor.winRate}%</div>
                              <div className="text-xs text-gray-400">Win Rate</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-yellow-400">{competitor.totalMedals}</div>
                              <div className="text-xs text-gray-400">Medals</div>
                            </div>
                            <div className="flex space-x-2">
                              {competitor.goldMedals > 0 && (
                                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-medium">
                                  {competitor.goldMedals}G
                                </span>
                              )}
                              {competitor.silverMedals > 0 && (
                                <span className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs font-medium">
                                  {competitor.silverMedals}S
                                </span>
                              )}
                              {competitor.bronzeMedals > 0 && (
                                <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs font-medium">
                                  {competitor.bronzeMedals}B
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailModalData.type === 'competitions' && (
                <div className="space-y-4">
                  {detailModalData.data.map((comp: any, index: number) => (
                    <div key={index} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200">
                      <div className="flex items-center space-x-4 mb-3">
                        {/* Competition Profile Picture */}
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          {comp.profilePicture ? (
                            <img 
                              src={comp.profilePicture} 
                              alt={comp.name}
                              className="w-16 h-16 rounded-xl object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                                if (nextElement) nextElement.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center" style={{display: comp.profilePicture ? 'none' : 'flex'}}>
                            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-white font-medium truncate">{comp.name}</h4>
                            <span className="text-sm text-gray-400 flex-shrink-0 ml-2">{comp.date}</span>
                          </div>
                          <div className="text-sm text-gray-400 truncate">{comp.location}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          {comp.gold > 0 && (
                            <span className="text-yellow-400 flex items-center space-x-1">
                              <span>🥇</span>
                              <span>{comp.gold}</span>
                            </span>
                          )}
                          {comp.silver > 0 && (
                            <span className="text-gray-300 flex items-center space-x-1">
                              <span>🥈</span>
                              <span>{comp.silver}</span>
                            </span>
                          )}
                          {comp.bronze > 0 && (
                            <span className="text-orange-400 flex items-center space-x-1">
                              <span>🥉</span>
                              <span>{comp.bronze}</span>
                            </span>
                          )}
                        </div>
                        {comp.rank !== 'N/A' && (
                          <span className="text-blue-400 font-medium">#{comp.rank}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailModalData.type === 'winrate' && (
                <div className="space-y-6">
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-500/10 rounded-lg p-4 text-center border border-blue-500/20">
                      <div className="text-2xl font-bold text-blue-400">{detailModalData.overviewData?.totalBouts || 0}</div>
                      <div className="text-sm text-gray-300">Total Bouts</div>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
                      <div className="text-2xl font-bold text-green-400">{detailModalData.overviewData?.totalWins || 0}</div>
                      <div className="text-sm text-gray-300">Total Wins</div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
                      <div className="text-2xl font-bold text-red-400">{detailModalData.overviewData?.totalLosses || 0}</div>
                      <div className="text-sm text-gray-300">Total Losses</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-4 text-center border border-yellow-500/20">
                      <div className="text-2xl font-bold text-yellow-400">{detailModalData.overviewData?.winRate || 0}%</div>
                      <div className="text-sm text-gray-300">Overall Win Rate</div>
                    </div>
                  </div>

                  {/* Discipline Filter */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Filter by Discipline</h3>
                      <select
                        value={selectedDiscipline}
                        onChange={(e) => setSelectedDiscipline(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="All Disciplines">All Disciplines</option>
                        <option value="Sparring">Sparring</option>
                        <option value="Patterns">Patterns</option>
                        <option value="Power">Power</option>
                        <option value="Special Technique">Special Technique</option>
                        <option value="Self Defense">Self Defense</option>
                        <option value="Breaking">Breaking</option>
                      </select>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      Currently showing: {selectedDiscipline}
                    </div>
                  </div>

                  {/* Individual vs Team Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Individual Events */}
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Individual Events</h3>
                        <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                          {detailModalData.overviewData?.individualBouts || 0} bouts
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-400">{detailModalData.overviewData?.individualWins || 0}</div>
                          <div className="text-sm text-gray-400">Wins</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-400">{detailModalData.overviewData?.individualLosses || 0}</div>
                          <div className="text-sm text-gray-400">Losses</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-400">{detailModalData.overviewData?.individualWinRate || 0}%</div>
                          <div className="text-sm text-gray-400">Win Rate</div>
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-gray-400">
                        {detailModalData.overviewData?.uniqueCompetitors || 0} unique competitors
                      </div>
                      <button
                        onClick={() => setShowIndividualBoutsModal(true)}
                        className="mt-4 w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                      >
                        Show All Individual Bouts
                      </button>
                    </div>

                    {/* Team Events */}
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Team Events</h3>
                        <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium">
                          {detailModalData.overviewData?.teamBouts || 0} bouts
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-400">{detailModalData.overviewData?.teamWins || 0}</div>
                          <div className="text-sm text-gray-400">Wins</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-400">{detailModalData.overviewData?.teamLosses || 0}</div>
                          <div className="text-sm text-gray-400">Losses</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-400">{detailModalData.overviewData?.teamWinRate || 0}%</div>
                          <div className="text-sm text-gray-400">Win Rate</div>
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-gray-400">
                        {detailModalData.overviewData?.uniqueTeams || 0} unique teams
                      </div>
                      <button
                        onClick={() => setShowTeamBoutsModal(true)}
                        className="mt-4 w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                      >
                        Show All Team Bouts
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {detailModalData.type === 'bouts' && (
                <div className="space-y-3">
                  {detailModalData.data.map((bout: any, index: number) => (
                    <div key={index} className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {/* Member Profile Picture */}
                          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            {bout.memberId ? (
                              <img 
                                src={`/api/avatar/${bout.memberId}`}
                                alt={bout.member}
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => {
                                  // Fallback to initials if image fails
                                  e.currentTarget.style.display = 'none'
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                                  if (nextElement) nextElement.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center" style={{display: bout.memberId ? 'none' : 'flex'}}>
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-medium">{bout.member}</div>
                            <div className="text-xs text-gray-400">Bout #{index + 1}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {bout.medal && (
                            <span className="text-lg">
                              {bout.medal === 'Gold' ? '🥇' : bout.medal === 'Silver' ? '🥈' : bout.medal === 'Bronze' ? '🥉' : '🏆'}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bout.result === 'Win' || bout.result === 'win' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {bout.result}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{bout.competition}</span>
                        <div className="flex items-center space-x-2">
                          <span>{bout.date}</span>
                          {bout.round && <span>• Round {bout.round}</span>}
                          {bout.isTeamEvent && <span className="text-blue-400">• Team Event</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailModalData.data.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400">No data available</div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

              {/* Individual Bouts Modal */}
              {showIndividualBoutsModal && detailModalData.type === 'winrate' && (
                <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-300 ${isCollapsed ? 'md:left-20' : 'md:left-64'}`} style={{ top: '80px' }}>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl max-w-6xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden mx-2 sm:mx-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white">All Individual Bouts</h3>
              <button
                onClick={() => setShowIndividualBoutsModal(false)}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {detailModalData.overviewData?.individualBoutsData && detailModalData.overviewData.individualBoutsData.length > 0 ? (
                <div className="space-y-3">
                  <div className="mb-4 text-sm text-gray-400">
                    Showing {detailModalData.overviewData.individualBoutsData.length} individual bouts
                  </div>
                  {detailModalData.overviewData.individualBoutsData.map((bout: any, index: number) => (
                    <div key={bout.boutId} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            {bout.profilePicture ? (
                              <img 
                                src={bout.profilePicture} 
                                alt={bout.memberName}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                                  if (nextElement) nextElement.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center" style={{display: bout.profilePicture ? 'none' : 'flex'}}>
                              <span className="text-blue-400 font-semibold text-lg">
                                {bout.memberName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-lg font-medium text-white">{bout.memberName}</div>
                            <div className="text-sm text-gray-400">
                              vs {bout.opponent} • {bout.competitionName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(bout.date).toLocaleDateString()} • {bout.discipline || 'Unknown'} • {bout.category || 'Unknown'}
                              {bout.round && ` • Round: ${bout.round}`}
                              {bout.opponentClub && ` • Opponent Club: ${bout.opponentClub}`}
                              {bout.coach && ` • Coach: ${bout.coach}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-right">
                          <div className="text-center">
                            <div className={`text-lg font-bold ${bout.isWin ? 'text-green-400' : 'text-red-400'}`}>
                              {bout.result}
                            </div>
                                  <div className="text-xs text-gray-400">
                                    {(() => {
                                      // Check if we have valid score_for and score_against values
                                      const scoreFor = bout.scoreFor
                                      const scoreAgainst = bout.scoreAgainst
                                      
                                      // Convert to numbers if they're strings
                                      const numScoreFor = typeof scoreFor === 'string' ? parseInt(scoreFor) : scoreFor
                                      const numScoreAgainst = typeof scoreAgainst === 'string' ? parseInt(scoreAgainst) : scoreAgainst
                                      
                                      // Check if both are valid numbers
                                      if (numScoreFor !== null && numScoreFor !== undefined && !isNaN(numScoreFor) &&
                                          numScoreAgainst !== null && numScoreAgainst !== undefined && !isNaN(numScoreAgainst)) {
                                        return `${numScoreFor}-${numScoreAgainst}`
                                      }
                                      
                                      // Fallback to original score field
                                      if (bout.score) {
                                        return bout.score
                                      }
                                      
                                      // Last resort
                                      return 'No score'
                                    })()}
                                  </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">No individual bouts data available</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

              {/* Team Bouts Modal */}
              {showTeamBoutsModal && detailModalData.type === 'winrate' && (
                <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-300 ${isCollapsed ? 'md:left-20' : 'md:left-64'}`} style={{ top: '80px' }}>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl max-w-6xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden mx-2 sm:mx-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white">All Team Bouts</h3>
              <button
                onClick={() => setShowTeamBoutsModal(false)}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {detailModalData.overviewData?.teamBoutsData && detailModalData.overviewData.teamBoutsData.length > 0 ? (
                <div className="space-y-6">
                  <div className="mb-4 text-sm text-gray-400">
                    Showing {detailModalData.overviewData.teamBoutsData.length} team bouts
                  </div>
                  
                  {/* Group teams by team name */}
                  {(() => {
                    const teamGroups = detailModalData.overviewData.teamBoutsData.reduce((groups: any, bout: any) => {
                      const teamName = bout.teamName || 'Unknown Team'
                      if (!groups[teamName]) {
                        groups[teamName] = []
                      }
                      groups[teamName].push(bout)
                      return groups
                    }, {})

                    return Object.entries(teamGroups).map(([teamName, bouts]: [string, any]) => {
                      const teamWins = bouts.filter((b: any) => b.isWin).length
                      const teamLosses = bouts.filter((b: any) => b.isLoss).length
                      const teamWinRate = bouts.length > 0 ? Math.round((teamWins / bouts.length) * 100 * 10) / 10 : 0

                      return (
                        <div key={teamName} className="bg-white/5 rounded-xl p-6 border border-white/10">
                          {/* Team Header */}
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-white">{teamName}</h4>
                                <div className="text-sm text-gray-400">
                                  {bouts.length} bout{bouts.length !== 1 ? 's' : ''} • {teamWinRate}% win rate
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-400">{teamWins}</div>
                              <div className="text-sm text-gray-400">Wins</div>
                            </div>
                          </div>

                          {/* Team Performance Summary */}
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
                              <div className="text-lg font-bold text-green-400">{teamWins}</div>
                              <div className="text-xs text-gray-300">Wins</div>
                            </div>
                            <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
                              <div className="text-lg font-bold text-red-400">{teamLosses}</div>
                              <div className="text-xs text-gray-300">Losses</div>
                            </div>
                            <div className="bg-purple-500/10 rounded-lg p-3 text-center border border-purple-500/20">
                              <div className="text-lg font-bold text-purple-400">{teamWinRate}%</div>
                              <div className="text-xs text-gray-300">Win Rate</div>
                            </div>
                          </div>

                          {/* Individual Team Bouts */}
                          <div className="space-y-3">
                            <h5 className="text-lg font-semibold text-white mb-3">Team Bouts</h5>
                            {bouts.map((bout: any, index: number) => (
                              <div key={bout.boutId} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium">{bout.competitionName}</div>
                                    <div className="text-sm text-gray-400">
                                      vs {bout.opponent} • {new Date(bout.date).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {bout.discipline || 'Unknown'} • {bout.score || 'No score'}
                                      {bout.opponentClub && ` • Opponent Club: ${bout.opponentClub}`}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-4 text-right">
                                    <div className="text-center">
                                      <div className={`text-lg font-bold ${bout.isWin ? 'text-green-400' : 'text-red-400'}`}>
                                        {bout.result}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {bout.isWin ? 'Win' : 'Loss'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Team Members Section */}
                          <div className="mt-6 pt-6 border-t border-white/10">
                            <h5 className="text-lg font-semibold text-white mb-3">Team Members</h5>
                            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                              <div className="text-sm text-blue-300">
                                <div className="font-medium mb-2">Note: Team member details</div>
                                <div className="text-gray-400">
                                  Individual team member performance and details would be displayed here. 
                                  This requires additional data from the competition_team_members table or similar 
                                  to show which specific members were part of each team event.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">No team bouts data available</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
