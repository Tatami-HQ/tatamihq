'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'
import MobileBottomNav from '@/components/MobileBottomNav'
import AnimatedBackground from '@/components/AnimatedBackground'

interface Competition {
  competitions_id: number
  Name: string | null
  date_start: string | null
  date_end: string | null
  singular_day_event: boolean | null
  location: string | null
  overall_rank: number | null
  total_gold: number | null
  total_silver: number | null
  total_bronze: number | null
  competition_profile_picture: string | null
  competition_downloads: string | null
  created_at: string
}

interface CompetitionEntry {
  competition_entries_id: number
  competitions_id: number
  competition_disciplines_id: number
  members_id: number
  created_at: string
  members?: {
    first_name: string
    last_name: string
  }
  competition_disciplines?: {
    name: string
  }
}

interface AnalyticsData {
  totalParticipants: number
  totalDisciplines: number
  medalDistribution: {
    gold: number
    silver: number
    bronze: number
  }
  topPerformers: Array<{
    member: string
    medals: number
  }>
  disciplineBreakdown: Array<{
    discipline: string
    participants: number
    medals: number
  }>
  performanceTrends: Array<{
    period: string
    medals: number
  }>
}

export default function CompetitionAnalytics() {
  const params = useParams()
  const router = useRouter()
  const competitionId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [entries, setEntries] = useState<CompetitionEntry[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error fetching user:', error)
        router.push('/login')
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

  useEffect(() => {
    if (competitionId) {
      fetchCompetitionData()
    }
  }, [competitionId])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const fetchCompetitionData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Fetch competition details
      const { data: competitionData, error: competitionError } = await supabase
        .from('competitions')
        .select('*')
        .eq('competitions_id', competitionId)
        .single()

      if (competitionError) throw competitionError

      // Fetch competition entries with member and discipline data
      const { data: entriesData, error: entriesError } = await supabase
        .from('competition_entries')
        .select(`
          *,
          members:members_id(first_name, last_name),
          competition_disciplines:competition_disciplines_id(name)
        `)

      if (entriesError) throw entriesError

      setCompetition(competitionData)
      setEntries(entriesData || [])

      // Generate analytics data
      const analytics = generateAnalyticsData(competitionData, entriesData || [])
      setAnalyticsData(analytics)

    } catch (error) {
      console.error('Error fetching competition data:', error)
      setError('Failed to load competition analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const generateAnalyticsData = (comp: Competition, entries: CompetitionEntry[]): AnalyticsData => {
    const totalParticipants = entries.length
    const uniqueDisciplines = new Set(entries.map(e => e.competition_disciplines_id)).size
    
    const medalDistribution = {
      gold: comp.total_gold || 0,
      silver: comp.total_silver || 0,
      bronze: comp.total_bronze || 0
    }

    // Group by member to calculate individual performance
    const memberPerformance = new Map<string, number>()
    entries.forEach(entry => {
      if (entry.members) {
        const memberName = `${entry.members.first_name} ${entry.members.last_name}`
        memberPerformance.set(memberName, (memberPerformance.get(memberName) || 0) + 1)
      }
    })

    const topPerformers = Array.from(memberPerformance.entries())
      .map(([member, medals]) => ({ member, medals }))
      .sort((a, b) => b.medals - a.medals)
      .slice(0, 5)

    // Discipline breakdown
    const disciplineMap = new Map<string, { participants: number, medals: number }>()
    entries.forEach(entry => {
      if (entry.competition_disciplines) {
        const discipline = entry.competition_disciplines.name
        const current = disciplineMap.get(discipline) || { participants: 0, medals: 0 }
        disciplineMap.set(discipline, {
          participants: current.participants + 1,
          medals: current.medals + 1
        })
      }
    })

    const disciplineBreakdown = Array.from(disciplineMap.entries())
      .map(([discipline, data]) => ({
        discipline,
        participants: data.participants,
        medals: data.medals
      }))

    // Mock performance trends (in a real app, this would come from historical data)
    const performanceTrends = [
      { period: 'Q1 2023', medals: 12 },
      { period: 'Q2 2023', medals: 18 },
      { period: 'Q3 2023', medals: 15 },
      { period: 'Q4 2023', medals: 22 }
    ]

    return {
      totalParticipants,
      totalDisciplines: uniqueDisciplines,
      medalDistribution,
      topPerformers,
      disciplineBreakdown,
      performanceTrends
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateRange = (startDate: string | null, endDate: string | null, isSingleDay: boolean | null) => {
    if (!startDate) return 'N/A'
    
    if (isSingleDay || !endDate) {
      return formatDate(startDate)
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
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

  if (error || !competition) {
    return (
      <div className="min-h-screen bg-black relative">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Competition Not Found</h1>
            <p className="text-gray-400 mb-6">{error || 'The competition you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={() => router.push('/competitions')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
            >
              Back to Competitions
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative">
      <AnimatedBackground />
      
      {/* Sidebar */}
      <div className="relative z-10">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="ml-64 relative z-10">
        {/* Header */}
        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/competitions')}
                className="flex items-center text-gray-400 hover:text-white transition-colors duration-200 mb-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Competitions
              </button>
              <h1 className="text-3xl font-bold text-white mb-2">{competition.Name}</h1>
              <div className="flex items-center space-x-6 text-gray-400">
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
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-green-900/20 border border-green-500/30 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400 font-medium">Live Analytics</span>
                </div>
                <div className="relative w-16 h-4">
                  <svg className="w-full h-full" viewBox="0 0 64 16">
                    <path
                      d="M2,14 L6,12 L10,13 L14,10 L18,11 L22,8 L26,9 L30,7 L34,8 L38,6 L42,7 L46,4 L50,5 L54,3 L58,4 L62,2"
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
                    <circle cx="62" cy="2" r="1.5" fill="#10b981" className="animate-ping" />
                  </svg>
                </div>
              </div>
              <ProfileDropdown user={user} isLoggingOut={false} onLogout={handleLogout} />
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="p-6">
          {analyticsData && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Participants</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.totalParticipants}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Disciplines</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.totalDisciplines}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Overall Rank</p>
                      <p className="text-2xl font-bold text-white">
                        {competition.overall_rank ? `#${competition.overall_rank}` : 'N/A'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Medals</p>
                      <p className="text-2xl font-bold text-white">
                        {(analyticsData.medalDistribution.gold + analyticsData.medalDistribution.silver + analyticsData.medalDistribution.bronze)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medal Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Medal Distribution</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                        <span className="text-white">Gold</span>
                      </div>
                      <span className="text-2xl font-bold text-yellow-400">{analyticsData.medalDistribution.gold}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                        <span className="text-white">Silver</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-300">{analyticsData.medalDistribution.silver}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
                        <span className="text-white">Bronze</span>
                      </div>
                      <span className="text-2xl font-bold text-orange-400">{analyticsData.medalDistribution.bronze}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Top Performers</h3>
                  <div className="space-y-3">
                    {analyticsData.topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-gray-600 text-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-white">{performer.member}</span>
                        </div>
                        <span className="text-gray-400">{performer.medals} entries</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Discipline Breakdown */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Discipline Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-gray-400 py-3">Discipline</th>
                        <th className="text-left text-gray-400 py-3">Participants</th>
                        <th className="text-left text-gray-400 py-3">Total Entries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.disciplineBreakdown.map((discipline, index) => (
                        <tr key={index} className="border-b border-white/5">
                          <td className="py-3 text-white">{discipline.discipline}</td>
                          <td className="py-3 text-gray-400">{discipline.participants}</td>
                          <td className="py-3 text-gray-400">{discipline.medals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Performance Trends */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Performance Trends</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {analyticsData.performanceTrends.map((trend, index) => {
                    const maxMedals = Math.max(...analyticsData.performanceTrends.map(t => t.medals))
                    const height = (trend.medals / maxMedals) * 100
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div
                          className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg w-full min-h-[20px] transition-all duration-500 ease-out"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="mt-2 text-center">
                          <p className="text-xs text-gray-400">{trend.period}</p>
                          <p className="text-sm font-medium text-white">{trend.medals}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="relative z-10">
        <MobileBottomNav />
      </div>
    </div>
  )
}
