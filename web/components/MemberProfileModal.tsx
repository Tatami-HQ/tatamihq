'use client'

import { useState, useEffect } from 'react'
import type { Member } from '../app/members/page'
import { supabase } from '../lib/supabaseClient'

interface MartialArt {
  martial_art_id: number
  created_at: string
  name: string | null
}

interface MartialArtClass {
  martial_art_classes_id: number
  created_at: string
  martial_art_id: number | null
  name: string | null
}

interface BeltSystem {
  belt_system_id: number
  created_at: string
  martial_art_id: number | null
  martial_art_classes_id: number | null
  belt_name: string | null
  belt_order: number | null
  colour_hex: string | null
  updated_at: string | null
}

interface MemberBelt {
  member_belts_id: number
  created_at: string
  members_id: number | null
  martial_art_id: number | null
  belt_system_id: number | null
  awarded_date: string | null
  martial_art_name?: string
  class_name?: string
  belt_name?: string
  colour_hex?: string
}

interface Competition {
  competitions_id: number
  Name: string | null
  date_start: string | null
  date_end: string | null
  location: string | null
  competition_profile_picture: string | null
}

interface CompetitionEntry {
  competition_entries_id: number
  competitions_id: number | null
  competition_disciplines_id: number | null
  members_id: number | null
  competition_coaches_id: number | null
  created_at: string
  competition?: Competition
  discipline?: CompetitionDiscipline
}

interface CompetitionDiscipline {
  competition_disciplines_id: number
  name: string | null
  team_event: boolean | null
}

interface CompetitionBout {
  competition_bouts_id: number
  competition_entries_id: number | null
  competition_teams_id: number | null
  opponent_name: string | null
  opponent_club: string | null
  score_for: number | null
  score_against: number | null
  result: string | null
  is_final: boolean | null
  round: string | null
  notes: string | null
  created_at: string
}

interface CompetitionResult {
  competition_results_id: number
  competition_entries_id: number | null
  medal: string | null
  round_reached: string | null
  created_at: string
}

interface CompetitionTeam {
  competition_teams_id: number
  team_name: string | null
  result: string | null
  medal: string | null
  competition_disciplines_id: number | null
  competition?: Competition
  discipline?: CompetitionDiscipline
}

interface MemberProfileModalProps {
  member: Member | null
  onClose: () => void
  onUpdateMember: (id: number, memberData: Partial<Member>) => Promise<void>
  onDeleteMember: (id: number) => Promise<void>
}

export default function MemberProfileModal({ 
  member, 
  onClose, 
  onUpdateMember, 
  onDeleteMember 
}: MemberProfileModalProps) {
  const [editForm, setEditForm] = useState<Partial<Member>>({})
  const [isDeleting, setIsDeleting] = useState(false)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'qualifications' | 'competition' | 'grading'>('details')
  
  // Martial arts data
  const [martialArts, setMartialArts] = useState<MartialArt[]>([])
  const [classes, setClasses] = useState<MartialArtClass[]>([])
  const [belts, setBelts] = useState<BeltSystem[]>([])
  const [memberBelts, setMemberBelts] = useState<MemberBelt[]>([])
  
  // Competition data
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([])
  const [competitionBouts, setCompetitionBouts] = useState<CompetitionBout[]>([])
  const [competitionResults, setCompetitionResults] = useState<CompetitionResult[]>([])
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([])
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(false)
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedMartialArt, setSelectedMartialArt] = useState<string>('all')
  const [selectedOrganisation, setSelectedOrganisation] = useState<string>('all')
  const [selectedCompetitionType, setSelectedCompetitionType] = useState<string>('all')
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false)
  
  // Form state for new belt
  const [newBeltForm, setNewBeltForm] = useState({
    martial_art_id: '',
    martial_art_classes_id: '',
    belt_system_id: '',
    awarded_date: ''
  })
  
  const [isLoadingBelts, setIsLoadingBelts] = useState(false)
  const [isSavingBelt, setIsSavingBelt] = useState(false)
  const [showImageOptions, setShowImageOptions] = useState(false)

  // Helper function to validate date format
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateString)) return false
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  // Load martial arts data when component mounts
  useEffect(() => {
    if (member) {
      loadMartialArtsData()
      loadMemberBelts()
    }
  }, [member])

  // Load competition data when competition tab is selected
  useEffect(() => {
    if (member && activeTab === 'competition') {
      fetchCompetitionData()
    }
  }, [member, activeTab])

  const loadMartialArtsData = async () => {
    try {
      const [martialArtsRes, classesRes, beltsRes] = await Promise.all([
        supabase.from('martial_art').select('*').order('name'),
        supabase.from('martial_art_classes').select('*').order('name'),
        supabase.from('belt_system').select('*').order('belt_order')
      ])

      if (martialArtsRes.data) setMartialArts(martialArtsRes.data)
      if (classesRes.data) setClasses(classesRes.data)
      if (beltsRes.data) setBelts(beltsRes.data)
    } catch (error) {
      console.error('Error loading martial arts data:', error)
    }
  }

  const loadMemberBelts = async () => {
    if (!member) return
    
    setIsLoadingBelts(true)
    try {
      const { data, error } = await supabase
        .from('member_belts')
        .select(`
          *,
          martial_art:martial_art_id(name),
          belt_system:belt_system_id(belt_name, colour_hex, martial_art_classes_id)
        `)
        .eq('members_id', member.members_id)
        .order('awarded_date', { ascending: false })

      if (error) throw error

      // Get class names separately for each belt
      const formattedBelts = await Promise.all(
        (data || []).map(async (belt) => {
          let className = null
          if (belt.belt_system?.martial_art_classes_id) {
            const { data: classData } = await supabase
              .from('martial_art_classes')
              .select('name')
              .eq('martial_art_classes_id', belt.belt_system.martial_art_classes_id)
              .single()
            className = classData?.name
          }

          return {
            ...belt,
            martial_art_name: belt.martial_art?.name,
            belt_name: belt.belt_system?.belt_name,
            colour_hex: belt.belt_system?.colour_hex,
            class_name: className
          }
        })
      )

      setMemberBelts(formattedBelts)
    } catch (error) {
      console.error('Error loading member belts:', error)
    } finally {
      setIsLoadingBelts(false)
    }
  }

  const fetchCompetitionData = async () => {
    if (!member?.members_id) return

    setIsLoadingCompetitions(true)
    try {
      // Fetch competition entries
      const { data: entries, error: entriesError } = await supabase
        .from('competition_entries')
        .select(`
          *,
          competitions:competitions_id (
            competitions_id,
            Name,
            date_start,
            date_end,
            location,
            competition_profile_picture
          ),
          competition_disciplines:competition_disciplines_id (
            competition_disciplines_id,
            name,
            team_event
          )
        `)
        .eq('members_id', member.members_id)

      if (entriesError) {
        console.error('Error fetching competition entries:', entriesError)
      } else {
        setCompetitionEntries(entries || [])
      }

      // Fetch competition bouts for this member's entries
      if (entries && entries.length > 0) {
        const entryIds = entries.map(e => e.competition_entries_id).filter((id): id is number => id !== null)
        
        const { data: bouts, error: boutsError } = await supabase
          .from('competition_bouts')
          .select('*')
          .in('competition_entries_id', entryIds)

        if (boutsError) {
          console.error('Error fetching competition bouts:', boutsError)
        } else {
          setCompetitionBouts(bouts || [])
        }

        // Fetch competition results
        const { data: results, error: resultsError } = await supabase
          .from('competition_results')
          .select('*')
          .in('competition_entries_id', entryIds)

        if (resultsError) {
          console.error('Error fetching competition results:', resultsError)
        } else {
          setCompetitionResults(results || [])
        }
      }

      // Fetch team competitions where this member participated
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('competition_team_members')
        .select(`
          *,
          competition_teams:competition_teams_id (
            *,
            competitions:competitions_id (
              competitions_id,
              Name,
              date_start,
              date_end,
              location,
              competition_profile_picture
            ),
            competition_disciplines:competition_disciplines_id (
              competition_disciplines_id,
              name,
              team_event
            )
          )
        `)
        .eq('member_id', member.members_id)

      if (teamMembersError) {
        console.error('Error fetching team memberships:', teamMembersError)
      } else {
        // Extract team data and flatten the structure
        const teamData = teamMembers?.map(tm => tm.competition_teams).filter(Boolean) || []
        setCompetitionTeams(teamData)
        
        // Also fetch team bouts for these teams
        if (teamData.length > 0) {
          const teamIds = teamData.map(t => t.competition_teams_id).filter((id): id is number => id !== null)
          
          const { data: teamBouts, error: teamBoutsError } = await supabase
            .from('competition_bouts')
            .select('*')
            .in('competition_teams_id', teamIds)

          if (teamBoutsError) {
            console.error('Error fetching team bouts:', teamBoutsError)
          } else {
            // Add team bouts to the existing bouts array
            setCompetitionBouts(prevBouts => [...prevBouts, ...(teamBouts || [])])
          }
        }
      }

    } catch (error) {
      console.error('Error fetching competition data:', error)
    } finally {
      setIsLoadingCompetitions(false)
    }
  }

  // Filter functions
  const getFilteredData = () => {
    let filteredEntries = [...competitionEntries]
    let filteredBouts = [...competitionBouts]
    let filteredResults = [...competitionResults]
    let filteredTeams = [...competitionTeams]

    // Year filter
    if (selectedYear !== 'all') {
      filteredEntries = filteredEntries.filter(entry => {
        const year = new Date(entry.competition?.date_start || '').getFullYear().toString()
        return year === selectedYear
      })
      
      filteredTeams = filteredTeams.filter(team => {
        const year = new Date(team.competition?.date_start || '').getFullYear().toString()
        return year === selectedYear
      })
    }

    // Martial Art filter (based on discipline)
    if (selectedMartialArt !== 'all') {
      filteredEntries = filteredEntries.filter(entry => 
        entry.discipline?.name === selectedMartialArt
      )
      
      filteredTeams = filteredTeams.filter(team => 
        team.discipline?.name === selectedMartialArt
      )
    }

    // Competition Type filter (individual vs team)
    if (selectedCompetitionType !== 'all') {
      if (selectedCompetitionType === 'individual') {
        filteredEntries = filteredEntries.filter(entry => !entry.discipline?.team_event)
        filteredTeams = [] // Exclude team competitions
      } else if (selectedCompetitionType === 'team') {
        filteredEntries = filteredEntries.filter(entry => entry.discipline?.team_event)
        // Keep filteredTeams as is for team competitions
      }
    }

    // Update filtered bouts and results based on filtered entries and teams
    const filteredEntryIds = filteredEntries.map(e => e.competition_entries_id).filter((id): id is number => id !== null)
    const filteredTeamIds = filteredTeams.map(t => t.competition_teams_id).filter((id): id is number => id !== null)
    
    filteredBouts = filteredBouts.filter(bout => 
      (bout.competition_entries_id !== null && filteredEntryIds.includes(bout.competition_entries_id)) ||
      (bout.competition_teams_id !== null && filteredTeamIds.includes(bout.competition_teams_id))
    )
    
    filteredResults = filteredResults.filter(result => 
      result.competition_entries_id !== null && filteredEntryIds.includes(result.competition_entries_id)
    )

    return { filteredEntries, filteredBouts, filteredResults, filteredTeams }
  }

  // Analytics calculation functions
  const getCompetitionStats = () => {
    const { filteredEntries, filteredBouts, filteredResults, filteredTeams } = getFilteredData()
    
    // Total competitions = individual entries + team entries
    const totalCompetitions = filteredEntries.length + filteredTeams.length
    const totalBouts = filteredBouts.length
    const wins = filteredBouts.filter(bout => bout.result === 'Win').length
    const losses = filteredBouts.filter(bout => bout.result === 'Loss').length
    const winRate = totalBouts > 0 ? Math.round((wins / totalBouts) * 100) : 0

    // Count medals from both individual results and team results
    const individualMedals = {
      gold: filteredResults.filter(r => r.medal === 'Gold').length,
      silver: filteredResults.filter(r => r.medal === 'Silver').length,
      bronze: filteredResults.filter(r => r.medal === 'Bronze').length
    }

    const teamMedals = {
      gold: filteredTeams.filter(t => t.medal === 'Gold').length,
      silver: filteredTeams.filter(t => t.medal === 'Silver').length,
      bronze: filteredTeams.filter(t => t.medal === 'Bronze').length
    }

    const medals = {
      gold: individualMedals.gold + teamMedals.gold,
      silver: individualMedals.silver + teamMedals.silver,
      bronze: individualMedals.bronze + teamMedals.bronze
    }

    const totalMedals = medals.gold + medals.silver + medals.bronze

    // Calculate points scored vs conceded
    const totalPointsFor = filteredBouts.reduce((sum, bout) => sum + (bout.score_for || 0), 0)
    const totalPointsAgainst = filteredBouts.reduce((sum, bout) => sum + (bout.score_against || 0), 0)

    return {
      totalCompetitions,
      totalBouts,
      wins,
      losses,
      winRate,
      medals,
      totalMedals,
      totalPointsFor,
      totalPointsAgainst,
      pointsDifference: totalPointsFor - totalPointsAgainst
    }
  }

  const getDisciplineStats = () => {
    const disciplineMap = new Map<string, {
      name: string,
      competitions: number,
      bouts: number,
      wins: number,
      losses: number,
      medals: { gold: number, silver: number, bronze: number }
    }>()

    // Add individual competition entries
    competitionEntries.forEach(entry => {
      const disciplineName = entry.discipline?.name || 'Unknown'
      if (!disciplineMap.has(disciplineName)) {
        disciplineMap.set(disciplineName, {
          name: disciplineName,
          competitions: 0,
          bouts: 0,
          wins: 0,
          losses: 0,
          medals: { gold: 0, silver: 0, bronze: 0 }
        })
      }
      disciplineMap.get(disciplineName)!.competitions++
    })

    // Add team competition entries
    competitionTeams.forEach(team => {
      const disciplineName = team.discipline?.name || 'Unknown'
      if (!disciplineMap.has(disciplineName)) {
        disciplineMap.set(disciplineName, {
          name: disciplineName,
          competitions: 0,
          bouts: 0,
          wins: 0,
          losses: 0,
          medals: { gold: 0, silver: 0, bronze: 0 }
        })
      }
      disciplineMap.get(disciplineName)!.competitions++
    })

    // Process individual bouts
    competitionBouts.forEach(bout => {
      let disciplineName = 'Unknown'
      
      // Check if it's an individual bout
      if (bout.competition_entries_id) {
      const entry = competitionEntries.find(e => e.competition_entries_id === bout.competition_entries_id)
      if (entry) {
          disciplineName = entry.discipline?.name || 'Unknown'
        }
      }
      // Check if it's a team bout
      else if (bout.competition_teams_id) {
        const team = competitionTeams.find(t => t.competition_teams_id === bout.competition_teams_id)
        if (team) {
          disciplineName = team.discipline?.name || 'Unknown'
        }
      }

        const disciplineStats = disciplineMap.get(disciplineName)
        if (disciplineStats) {
          disciplineStats.bouts++
          if (bout.result === 'Win') disciplineStats.wins++
          if (bout.result === 'Loss') disciplineStats.losses++
      }
    })

    // Process individual results
    competitionResults.forEach(result => {
      const entry = competitionEntries.find(e => e.competition_entries_id === result.competition_entries_id)
      if (entry && result.medal) {
        const disciplineName = entry.discipline?.name || 'Unknown'
        const disciplineStats = disciplineMap.get(disciplineName)
        if (disciplineStats) {
          if (result.medal === 'Gold') disciplineStats.medals.gold++
          if (result.medal === 'Silver') disciplineStats.medals.silver++
          if (result.medal === 'Bronze') disciplineStats.medals.bronze++
        }
      }
    })

    // Process team results (medals from team competitions)
    competitionTeams.forEach(team => {
      if (team.medal) {
        const disciplineName = team.discipline?.name || 'Unknown'
        const disciplineStats = disciplineMap.get(disciplineName)
        if (disciplineStats) {
          if (team.medal === 'Gold') disciplineStats.medals.gold++
          if (team.medal === 'Silver') disciplineStats.medals.silver++
          if (team.medal === 'Bronze') disciplineStats.medals.bronze++
        }
      }
    })

    return Array.from(disciplineMap.values()).sort((a, b) => b.competitions - a.competitions)
  }

  const getRecentCompetitions = () => {
    // Combine individual and team competitions
    const allCompetitions = [
      ...competitionEntries.map(entry => ({
        ...entry,
        type: 'individual' as const,
        competition_date: entry.competition?.date_start
      })),
      ...competitionTeams.map(team => ({
        ...team,
        type: 'team' as const,
        competition_date: team.competition?.date_start,
        // Add team-specific fields for compatibility
        competition_entries_id: null,
        competition_disciplines_id: team.competition_disciplines_id
      }))
    ]
    
    return allCompetitions
      .sort((a, b) => new Date(b.competition_date || '').getTime() - new Date(a.competition_date || '').getTime())
      .slice(0, 5)
  }

  const getYearComparison = (year: number) => {
    const yearEntries = competitionEntries.filter(entry => {
      const entryYear = entry.competition?.date_start ? new Date(entry.competition.date_start).getFullYear() : null
      return entryYear === year
    })
    
    const yearBouts = competitionBouts.filter(bout => {
      const entry = competitionEntries.find(e => e.competition_entries_id === bout.competition_entries_id)
      const entryYear = entry?.competition?.date_start ? new Date(entry.competition.date_start).getFullYear() : null
      return entryYear === year
    })
    
    const wins = yearBouts.filter(bout => bout.result === 'Win').length
    const winRate = yearBouts.length > 0 ? Math.round((wins / yearBouts.length) * 100) : 0
    
    return {
      competitions: yearEntries.length,
      bouts: yearBouts.length,
      wins,
      winRate
    }
  }

  const calculateCurrentStreak = () => {
    const sortedBouts = competitionBouts
      .filter(bout => bout.result === 'Win' || bout.result === 'Loss')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    if (sortedBouts.length === 0) return 0
    
    let streak = 0
    const firstResult = sortedBouts[0].result
    
    for (const bout of sortedBouts) {
      if (bout.result === firstResult) {
        streak++
      } else {
        break
      }
    }
    
    return firstResult === 'Win' ? streak : -streak
  }

  const calculateLongestStreak = () => {
    const sortedBouts = competitionBouts
      .filter(bout => bout.result === 'Win' || bout.result === 'Loss')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    if (sortedBouts.length === 0) return 0
    
    let currentStreak = 1
    let longestWinStreak = 0
    let longestLossStreak = 0
    let currentResult = sortedBouts[0].result
    
    for (let i = 1; i < sortedBouts.length; i++) {
      if (sortedBouts[i].result === currentResult) {
        currentStreak++
      } else {
        if (currentResult === 'Win') {
          longestWinStreak = Math.max(longestWinStreak, currentStreak)
        } else {
          longestLossStreak = Math.max(longestLossStreak, currentStreak)
        }
        currentStreak = 1
        currentResult = sortedBouts[i].result
      }
    }
    
    // Check final streak
    if (currentResult === 'Win') {
      longestWinStreak = Math.max(longestWinStreak, currentStreak)
    } else {
      longestLossStreak = Math.max(longestLossStreak, currentStreak)
    }
    
    return Math.max(longestWinStreak, longestLossStreak)
  }

  const getRecentBouts = () => {
    return competitionBouts
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
  }

  const getYearOnYearPerformance = () => {
    const { filteredBouts } = getFilteredData()
    const yearMap = new Map<string, { bouts: number, wins: number, medals: number }>()
    
    filteredBouts.forEach(bout => {
      const entry = competitionEntries.find(e => e.competition_entries_id === bout.competition_entries_id)
      if (entry?.competition?.date_start) {
        const year = new Date(entry.competition.date_start).getFullYear().toString()
        if (!yearMap.has(year)) {
          yearMap.set(year, { bouts: 0, wins: 0, medals: 0 })
        }
        const yearData = yearMap.get(year)!
        yearData.bouts++
        if (bout.result === 'Win') yearData.wins++
      }
    })

    // Add medal data
    competitionResults.forEach(result => {
      const entry = competitionEntries.find(e => e.competition_entries_id === result.competition_entries_id)
      if (entry?.competition?.date_start && result.medal) {
        const year = new Date(entry.competition.date_start).getFullYear().toString()
        const yearData = yearMap.get(year)
        if (yearData) yearData.medals++
      }
    })

    return Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        winRate: data.bouts > 0 ? Math.round((data.wins / data.bouts) * 100) : 0,
        bouts: data.bouts,
        medals: data.medals
      }))
      .sort((a, b) => a.year.localeCompare(b.year))
  }

  const getMedalsByYear = () => {
    const yearMap = new Map<string, { gold: number, silver: number, bronze: number }>()
    
    competitionResults.forEach(result => {
      const entry = competitionEntries.find(e => e.competition_entries_id === result.competition_entries_id)
      if (entry?.competition?.date_start && result.medal) {
        const year = new Date(entry.competition.date_start).getFullYear().toString()
        if (!yearMap.has(year)) {
          yearMap.set(year, { gold: 0, silver: 0, bronze: 0 })
        }
        const yearData = yearMap.get(year)!
        if (result.medal === 'Gold') yearData.gold++
        if (result.medal === 'Silver') yearData.silver++
        if (result.medal === 'Bronze') yearData.bronze++
      }
    })

    return Array.from(yearMap.entries())
      .map(([year, medals]) => ({ year, ...medals }))
      .sort((a, b) => a.year.localeCompare(b.year))
  }

  const getPerformanceByRound = () => {
    const { filteredBouts } = getFilteredData()
    const roundMap = new Map<string, { bouts: number, wins: number }>()
    
    filteredBouts.forEach(bout => {
      const round = bout.round || 'Unknown'
      if (!roundMap.has(round)) {
        roundMap.set(round, { bouts: 0, wins: 0 })
      }
      const roundData = roundMap.get(round)!
      roundData.bouts++
      if (bout.result === 'Win') roundData.wins++
    })

    return Array.from(roundMap.entries())
      .map(([round, data]) => ({
        round,
        winRate: data.bouts > 0 ? Math.round((data.wins / data.bouts) * 100) : 0,
        bouts: data.bouts
      }))
      .sort((a, b) => b.winRate - a.winRate)
  }

  const getAvailableYears = () => {
    const years = new Set<string>()
    competitionEntries.forEach(entry => {
      if (entry.competition?.date_start) {
        const year = new Date(entry.competition.date_start).getFullYear().toString()
        years.add(year)
      }
    })
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }

  const getAvailableMartialArts = () => {
    const arts = new Set<string>()
    competitionEntries.forEach(entry => {
      if (entry.discipline?.name) {
        arts.add(entry.discipline.name)
      }
    })
    return Array.from(arts).sort()
  }

  const handleMartialArtChange = (martialArtId: string) => {
    setNewBeltForm(prev => ({
      ...prev,
      martial_art_id: martialArtId,
      martial_art_classes_id: '',
      belt_system_id: ''
    }))
  }

  const handleClassChange = (classId: string) => {
    setNewBeltForm(prev => ({
      ...prev,
      martial_art_classes_id: classId,
      belt_system_id: ''
    }))
  }

  const handleBeltChange = (beltId: string) => {
    setNewBeltForm(prev => ({
      ...prev,
      belt_system_id: beltId
    }))
  }

  const handleAddBelt = async () => {
    if (!member || !newBeltForm.martial_art_id || !newBeltForm.belt_system_id || !newBeltForm.awarded_date) {
      alert('Please fill in all required fields')
      return
    }

    if (!isValidDate(newBeltForm.awarded_date)) {
      alert('Please enter a valid date in YYYY-MM-DD format')
      return
    }

    setIsSavingBelt(true)
    try {
      const { error } = await supabase
        .from('member_belts')
        .insert({
          members_id: member.members_id,
          martial_art_id: parseInt(newBeltForm.martial_art_id),
          belt_system_id: parseInt(newBeltForm.belt_system_id),
          awarded_date: newBeltForm.awarded_date
        })

      if (error) throw error

      // Reset form
      setNewBeltForm({
        martial_art_id: '',
        martial_art_classes_id: '',
        belt_system_id: '',
        awarded_date: ''
      })

      // Reload member belts
      await loadMemberBelts()
    } catch (error) {
      console.error('Error adding member belt:', error)
      alert('Error adding belt. Please try again.')
    } finally {
      setIsSavingBelt(false)
    }
  }

  const handleDeleteBelt = async (beltId: number) => {
    if (!confirm('Are you sure you want to delete this belt record?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('member_belts')
        .delete()
        .eq('member_belts_id', beltId)

      if (error) throw error

      // Reload member belts
      await loadMemberBelts()
    } catch (error) {
      console.error('Error deleting member belt:', error)
      alert('Error deleting belt. Please try again.')
    }
  }

  // Filter classes and belts based on selections
  const filteredClasses = classes.filter(classItem => 
    !newBeltForm.martial_art_id || classItem.martial_art_id === parseInt(newBeltForm.martial_art_id)
  )

  const filteredBelts = belts.filter(belt => {
    if (!newBeltForm.martial_art_id) return false
    if (newBeltForm.martial_art_classes_id) {
      return belt.martial_art_id === parseInt(newBeltForm.martial_art_id) && 
             belt.martial_art_classes_id === parseInt(newBeltForm.martial_art_classes_id)
    }
    return belt.martial_art_id === parseInt(newBeltForm.martial_art_id)
  })

  if (!member) return null

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      
      setProfileImage(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
    setShowImageOptions(false)
  }

  const handleTakePicture = () => {
    // Create a file input for camera
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Use back camera on mobile
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setProfileImage(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
    setShowImageOptions(false)
  }

  const handleViewImage = () => {
    if (imagePreview || member.profile_picture_url) {
      // Open image in new tab/window
      window.open(imagePreview || member.profile_picture_url || '', '_blank')
    }
    setShowImageOptions(false)
  }

  const removeImage = () => {
    setProfileImage(null)
    setImagePreview(null)
    setEditForm(prev => ({ ...prev, profile_picture_url: null }))
  }

  const autoSave = async (field: string, value: string | null) => {
    if (isSaving) return
    
    setIsSaving(true)
    try {
      await onUpdateMember(member.members_id, { [field]: value } as Partial<Member>)
    } catch (error) {
      console.error('Error auto-saving field:', field, error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFieldChange = (field: string, value: string | null) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleFieldBlur = (field: string, value: string | null) => {
    // Auto-save when user clicks out of field
    if (value !== member[field as keyof Member]) {
      autoSave(field, value)
    }
  }

  const handleSave = async () => {
    try {
      const updatedForm = { ...editForm }
      
      // If there's a new image, we need to upload it first
      if (profileImage) {
        // For now, we'll create a data URL and store it
        // In a real app, you'd upload to a service like Cloudinary, AWS S3, etc.
        const reader = new FileReader()
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string
          updatedForm.profile_picture_url = dataUrl
          await onUpdateMember(member.members_id, updatedForm)
          setEditForm({})
          setProfileImage(null)
          setImagePreview(null)
        }
        reader.readAsDataURL(profileImage)
      } else {
        await onUpdateMember(member.members_id, updatedForm)
        setEditForm({})
        setProfileImage(null)
        setImagePreview(null)
      }
    } catch (error) {
      console.error('Error updating member:', error)
    }
  }

  const handleCancel = () => {
    setEditForm({})
    setProfileImage(null)
    setImagePreview(null)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await onDeleteMember(member.members_id)
      onClose()
    } catch (error) {
      console.error('Error deleting member:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-0 animate-in fade-in duration-200">
      <div className="bg-gray-900 rounded-none shadow-xl w-full h-full flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {member.profile_picture_url ? (
                <img
                  src={member.profile_picture_url}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                  {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {member.first_name} {member.last_name}
              </h2>
              <p className="text-sm text-gray-400">Member Profile</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Status:</span>
            <button
                onClick={() => {
                  const newStatus = (editForm.status || member.status) === 'Active' ? 'Inactive' : 'Active'
                  handleFieldChange('status', newStatus)
                  handleFieldBlur('status', newStatus)
                }}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  (editForm.status || member.status) === 'Active' ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    (editForm.status || member.status) === 'Active' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
            </button>
              <span className={`text-sm font-medium ${
                (editForm.status || member.status) === 'Active' ? 'text-green-400' : 'text-gray-400'
              }`}>
                {(editForm.status || member.status) === 'Active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            {isSaving && (
              <div className="flex items-center text-blue-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                Saving...
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-white/10">
          <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
            {[
              { 
                id: 'details', 
                label: 'Details',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )
              },
              { 
                id: 'qualifications', 
                label: 'Qualifications',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                )
              },
              { 
                id: 'competition', 
                label: 'Competition',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22v-4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 18h8" />
                  </svg>
                )
              },
              { 
                id: 'grading', 
                label: 'Grading',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22v-4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 18h8" />
                  </svg>
                )
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'details' | 'qualifications' | 'competition' | 'grading')}
                className={`py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Profile Picture - Centered and Clickable */}
              <div className="mb-8 flex flex-col items-center">
                <div className="relative">
                  <button
                    onClick={() => setShowImageOptions(true)}
                    className="group relative cursor-pointer transition-transform duration-200 hover:scale-105"
                  >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-lg"
                        />
                      ) : member.profile_picture_url ? (
                        <img
                          src={member.profile_picture_url}
                          alt={`${member.first_name} ${member.last_name}`}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-lg"
                        />
                      ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-3xl shadow-lg">
                          {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* Action buttons for new image */}
                  {imagePreview && (
                    <div className="mt-3 flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Tap to change profile picture
                </p>
              </div>

              {/* Image Options Modal */}
              {showImageOptions && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-900 rounded-lg shadow-xl max-w-sm w-full p-6">
                    <h3 className="text-lg font-medium text-white mb-4 text-center">Profile Picture Options</h3>
                    <div className="space-y-3">
                      {(imagePreview || member.profile_picture_url) && (
                        <button
                          onClick={handleViewImage}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View Current Picture</span>
                        </button>
                      )}
                      
                      <label className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Upload from Gallery</span>
                        </label>
                      
                          <button
                        onClick={handleTakePicture}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Take Picture</span>
                          </button>
                      
                          <button
                        onClick={() => setShowImageOptions(false)}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                          >
                        Cancel
                          </button>
                    </div>
                  </div>
                </div>
              )}
                
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">First Name *</span>
                    <input
                      type="text"
                      value={editForm.first_name || member.first_name || ''}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      onBlur={(e) => handleFieldBlur('first_name', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Last Name *</span>
                    <input
                      type="text"
                      value={editForm.last_name || member.last_name || ''}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                      onBlur={(e) => handleFieldBlur('last_name', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Date of Birth</span>
                    <input
                      type="text"
                      value={editForm.date_of_birth || member.date_of_birth || ''}
                      onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                      onBlur={(e) => handleFieldBlur('date_of_birth', e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Gender</span>
                    <select
                      value={editForm.gender || member.gender || ''}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      onBlur={(e) => handleFieldBlur('gender', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Email *</span>
                    <input
                      type="email"
                      value={editForm.email_address || member.email_address || ''}
                      onChange={(e) => handleFieldChange('email_address', e.target.value)}
                      onBlur={(e) => handleFieldBlur('email_address', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Phone</span>
                    <input
                      type="tel"
                      value={editForm.phone || member.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Membership Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Membership Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Membership Type</span>
                    <select
                      value={editForm.membership_type || member.membership_type || ''}
                      onChange={(e) => handleFieldChange('membership_type', e.target.value)}
                      onBlur={(e) => handleFieldBlur('membership_type', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select membership type</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annual">Annual</option>
                      <option value="Family">Family</option>
                      <option value="Student">Student</option>
                      <option value="Senior">Senior</option>
                      <option value="Trial">Trial</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Join Date</span>
                    <input
                      type="text"
                      value={editForm.join_date || member.join_date || ''}
                      onChange={(e) => handleFieldChange('join_date', e.target.value)}
                      onBlur={(e) => handleFieldBlur('join_date', e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Address</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-400">Address</span>
                    <input
                      type="text"
                      value={editForm.address || member.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      onBlur={(e) => handleFieldBlur('address', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <span className="text-sm text-gray-400">City</span>
                    <input
                      type="text"
                      value={editForm.city || member.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      onBlur={(e) => handleFieldBlur('city', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="City"
                    />
                  </div>
                  <div>
                      <span className="text-sm text-gray-400">Postcode</span>
                    <input
                      type="text"
                      value={editForm.postcode || member.postcode || ''}
                      onChange={(e) => handleFieldChange('postcode', e.target.value)}
                      onBlur={(e) => handleFieldBlur('postcode', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Postcode"
                    />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Name</span>
                    <input
                      type="text"
                      value={editForm.emergency_contact_name || member.emergency_contact_name || ''}
                      onChange={(e) => handleFieldChange('emergency_contact_name', e.target.value)}
                      onBlur={(e) => handleFieldBlur('emergency_contact_name', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Phone</span>
                    <input
                      type="tel"
                      value={editForm.emergency_contact_phone || member.emergency_contact_phone || ''}
                      onChange={(e) => handleFieldChange('emergency_contact_phone', e.target.value)}
                      onBlur={(e) => handleFieldBlur('emergency_contact_phone', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Emergency contact phone"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Info & Notes */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Additional Information</h3>
                <div className="space-y-4">
                <div>
                    <span className="text-sm text-gray-400 mb-2 block">Medical Information</span>
                  <textarea
                    value={editForm.medical_info || member.medical_info || ''}
                    onChange={(e) => handleFieldChange('medical_info', e.target.value)}
                    onBlur={(e) => handleFieldBlur('medical_info', e.target.value)}
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Any medical conditions, allergies, or important health information..."
                  />
                </div>
                <div>
                    <span className="text-sm text-gray-400 mb-2 block">Notes</span>
                  <textarea
                    value={editForm.notes || member.notes || ''}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    onBlur={(e) => handleFieldBlur('notes', e.target.value)}
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Any additional notes about this member..."
                  />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qualifications' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Qualifications</h3>
                <p className="text-gray-400">No qualifications recorded yet</p>
                <p className="text-sm text-gray-500 mt-2">This section will be populated over time</p>
              </div>
            </div>
          )}

          {activeTab === 'competition' && (
            <div className="space-y-6">
              {isLoadingCompetitions ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400">Loading competition analytics...</p>
                </div>
              ) : competitionEntries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Competition Analytics</h3>
                  <p className="text-gray-400">No competitions recorded yet</p>
                  <p className="text-sm text-gray-500 mt-2">This comprehensive analytics dashboard will be populated over time</p>
                </div>
              ) : (
                <>
                  {/* Header Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                          Competition Analytics
                        </h2>
                        <p className="text-gray-400">{member?.first_name} {member?.last_name}&apos;s Performance Dashboard</p>
                        <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{getCompetitionStats().totalCompetitions}</div>
                        <div className="text-sm text-gray-400">Total Events</div>
                      </div>
                    </div>
                  </div>

                  {/* 1. Overview Metrics */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      Overview Metrics
                    </h3>
                    
                  {(() => {
                    const stats = getCompetitionStats()
                      const totalScored = competitionBouts.reduce((sum, bout) => sum + (bout.score_for || 0), 0)
                      const totalConceded = competitionBouts.reduce((sum, bout) => sum + (bout.score_against || 0), 0)
                      const avgScoreDiff = competitionBouts.length > 0 ? Math.round((totalScored - totalConceded) / competitionBouts.length) : 0
                      const currentStreak = calculateCurrentStreak()
                      const longestStreak = calculateLongestStreak()
                      const uniqueDisciplines = new Set(competitionEntries.map(e => e.discipline?.name)).size
                      const uniqueOrganisations = new Set(competitionEntries.map(e => e.competition?.location)).size
                      
                    return (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Competitions */}
                          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-lg border border-blue-500/20 rounded-2xl p-6 hover:border-blue-400/40 transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                        </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-white">{stats.totalCompetitions}</div>
                                <div className="text-xs text-blue-400">Competitions</div>
                        </div>
                        </div>
                            <div className="text-sm text-gray-400">
                              {uniqueDisciplines} disciplines • {uniqueOrganisations} venues
                            </div>
                          </div>

                          {/* Medals */}
                          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 backdrop-blur-lg border border-yellow-500/20 rounded-2xl p-6 hover:border-yellow-400/40 transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
                                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-white">{stats.medals.gold + stats.medals.silver + stats.medals.bronze}</div>
                                <div className="text-xs text-yellow-400">Medals</div>
                              </div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-yellow-400">🥇{stats.medals.gold}</span>
                              <span className="text-gray-300">🥈{stats.medals.silver}</span>
                              <span className="text-orange-400">🥉{stats.medals.bronze}</span>
                            </div>
                          </div>

                          {/* Win Rate */}
                          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-lg border border-green-500/20 rounded-2xl p-6 hover:border-green-400/40 transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-white">{stats.winRate}%</div>
                                <div className="text-xs text-green-400">Win Rate</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-400">
                              {stats.wins}W - {stats.losses}L • {stats.totalBouts} total bouts
                            </div>
                          </div>

                          {/* Points & Streaks */}
                          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-lg border border-purple-500/20 rounded-2xl p-6 hover:border-purple-400/40 transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-white">{avgScoreDiff > 0 ? '+' : ''}{avgScoreDiff}</div>
                                <div className="text-xs text-purple-400">Avg Diff</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-400">
                              Current: {currentStreak} • Best: {longestStreak}
                            </div>
                        </div>
                      </div>
                    )
                  })()}
                  </div>

                  {/* 2. Year-on-Year Performance */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      Year-on-Year Performance
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Win Rate Trend */}
                      <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-lg border border-green-500/20 rounded-2xl p-6 hover:border-green-400/40 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-white">Win Rate Trend</h4>
                          <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm">
                            <option>Last 3 years</option>
                            <option>Last 2 years</option>
                            <option>This year</option>
                          </select>
                        </div>
                  {(() => {
                          const currentYear = new Date().getFullYear()
                          const yearData = []
                          for (let year = currentYear - 2; year <= currentYear; year++) {
                            const yearStats = getYearComparison(year)
                            if (yearStats.bouts > 0) {
                              yearData.push({ year, winRate: yearStats.winRate, bouts: yearStats.bouts, competitions: yearStats.competitions })
                            }
                          }
                          
                    return (
                            <div className="space-y-4">
                              <div className="flex items-end justify-between h-32">
                                {yearData.map((data, index) => (
                                  <div key={data.year} className="flex flex-col items-center flex-1">
                                    <div 
                                      className="bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg w-8 mb-2 transition-all duration-500 hover:from-green-400 hover:to-green-300 shadow-lg hover:shadow-green-500/25"
                                      style={{ height: `${Math.max(20, (data.winRate / 100) * 80)}px` }}
                                    ></div>
                                    <div className="text-xs text-gray-400">{data.year}</div>
                                    <div className="text-xs text-green-400 font-medium">{data.winRate}%</div>
                                    <div className="text-xs text-gray-500">{data.bouts} bouts</div>
                          </div>
                                ))}
                          </div>
                              <div className="text-center bg-white/5 rounded-lg p-3">
                                <div className="text-sm text-gray-400">Average: {yearData.length > 0 ? Math.round(yearData.reduce((sum, d) => sum + d.winRate, 0) / yearData.length) : 0}% win rate</div>
                        </div>
                      </div>
                    )
                  })()}
                      </div>

                      {/* Points Analysis */}
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-lg border border-blue-500/20 rounded-2xl p-6 hover:border-blue-400/40 transition-all duration-300">
                        <h4 className="text-lg font-semibold text-white mb-4">Points Analysis</h4>
                  {(() => {
                          const totalScored = competitionBouts.reduce((sum, bout) => sum + (bout.score_for || 0), 0)
                          const totalConceded = competitionBouts.reduce((sum, bout) => sum + (bout.score_against || 0), 0)
                          const avgScored = competitionBouts.length > 0 ? Math.round(totalScored / competitionBouts.length) : 0
                          const avgConceded = competitionBouts.length > 0 ? Math.round(totalConceded / competitionBouts.length) : 0
                          const netPoints = totalScored - totalConceded
                          
                          return (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-center bg-white/5 rounded-lg p-4">
                                  <div className="text-2xl font-bold text-green-400">{avgScored}</div>
                                  <div className="text-sm text-gray-400">Avg Points For</div>
                                </div>
                                <div className="text-center bg-white/5 rounded-lg p-4">
                                  <div className="text-2xl font-bold text-red-400">{avgConceded}</div>
                                  <div className="text-sm text-gray-400">Avg Points Against</div>
                                </div>
                              </div>
                              
                        <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Total Points For</span>
                                  <span className="text-green-400 font-medium">{totalScored}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-3">
                                  <div 
                                    className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-500 shadow-lg"
                                    style={{ width: `${Math.min(100, totalScored > 0 ? (totalScored / (totalScored + totalConceded)) * 100 : 0)}%` }}
                                  ></div>
                              </div>
                                
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Total Points Against</span>
                                  <span className="text-red-400 font-medium">{totalConceded}</span>
                              </div>
                                <div className="w-full bg-gray-700 rounded-full h-3">
                                  <div 
                                    className="bg-gradient-to-r from-red-500 to-red-400 h-3 rounded-full transition-all duration-500 shadow-lg"
                                    style={{ width: `${Math.min(100, totalConceded > 0 ? (totalConceded / (totalScored + totalConceded)) * 100 : 0)}%` }}
                                  ></div>
                            </div>
                                
                                <div className="text-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3 border border-blue-500/30">
                                  <div className="text-lg font-bold text-white">{netPoints > 0 ? '+' : ''}{netPoints}</div>
                                  <div className="text-sm text-blue-400">Net Point Difference</div>
                                </div>
                        </div>
                      </div>
                    )
                  })()}
                      </div>
                    </div>
                  </div>

                  {/* 3. Medal Breakdown */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                  </div>
                      Medal Breakdown
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Medal Collection */}
                      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 backdrop-blur-lg border border-yellow-500/20 rounded-2xl p-6 hover:border-yellow-400/40 transition-all duration-300">
                        <h4 className="text-lg font-semibold text-white mb-4">Medal Collection</h4>
                        {(() => {
                          const stats = getCompetitionStats()
                          const totalMedals = stats.medals.gold + stats.medals.silver + stats.medals.bronze
                          const medalEfficiency = competitionEntries.length > 0 ? Math.round((totalMedals / competitionEntries.length) * 100) : 0
                          
                          return (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="text-center bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                                  <div className="text-2xl mb-1">🥇</div>
                                  <div className="text-xl font-bold text-yellow-400">{stats.medals.gold}</div>
                                  <div className="text-xs text-gray-400">Gold</div>
                                  </div>
                                <div className="text-center bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                                  <div className="text-2xl mb-1">🥈</div>
                                  <div className="text-xl font-bold text-gray-300">{stats.medals.silver}</div>
                                  <div className="text-xs text-gray-400">Silver</div>
                                </div>
                                <div className="text-center bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                                  <div className="text-2xl mb-1">🥉</div>
                                  <div className="text-xl font-bold text-orange-400">{stats.medals.bronze}</div>
                                  <div className="text-xs text-gray-400">Bronze</div>
                              </div>
                                </div>
                              <div className="text-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
                                <div className="text-lg font-bold text-white">{totalMedals} Total Medals</div>
                                <div className="text-sm text-yellow-400">Medal efficiency: {medalEfficiency}%</div>
                                </div>
                              </div>
                          )
                        })()}
                            </div>

                      {/* Medals by Year */}
                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-lg border border-purple-500/20 rounded-2xl p-6 hover:border-purple-400/40 transition-all duration-300">
                        <h4 className="text-lg font-semibold text-white mb-4">Medals by Year</h4>
                        {(() => {
                          const currentYear = new Date().getFullYear()
                          const yearMedals = []
                          
                          for (let year = currentYear - 2; year <= currentYear; year++) {
                            const yearEntries = competitionEntries.filter(entry => {
                              const entryYear = entry.competition?.date_start ? new Date(entry.competition.date_start).getFullYear() : null
                              return entryYear === year
                            })
                            
                            const yearResults = competitionResults.filter(result => {
                              const entry = competitionEntries.find(e => e.competition_entries_id === result.competition_entries_id)
                              const entryYear = entry?.competition?.date_start ? new Date(entry.competition.date_start).getFullYear() : null
                              return entryYear === year
                            })
                            
                            const medals = {
                              gold: yearResults.filter(r => r.medal === 'Gold').length,
                              silver: yearResults.filter(r => r.medal === 'Silver').length,
                              bronze: yearResults.filter(r => r.medal === 'Bronze').length
                            }
                            
                            const total = medals.gold + medals.silver + medals.bronze
                            if (total > 0) {
                              yearMedals.push({ year, medals, total })
                            }
                          }
                          
                          return (
                            <div className="space-y-3">
                              {yearMedals.length > 0 ? yearMedals.map((data, index) => (
                                <div key={data.year} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="font-medium text-white">{data.year}</div>
                                    <div className="text-sm text-purple-400">{data.total} medals</div>
                        </div>
                                  <div className="flex space-x-2">
                                    {data.medals.gold > 0 && <span className="text-yellow-400">🥇{data.medals.gold}</span>}
                                    {data.medals.silver > 0 && <span className="text-gray-300">🥈{data.medals.silver}</span>}
                                    {data.medals.bronze > 0 && <span className="text-orange-400">🥉{data.medals.bronze}</span>}
                                  </div>
                                </div>
                              )) : (
                                <div className="text-center text-gray-400 py-4">
                                  <div className="text-sm">No medal data available</div>
                                </div>
                              )}
                      </div>
                    )
                  })()}
                      </div>

                      {/* Best Performance */}
                      <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-lg border border-green-500/20 rounded-2xl p-6 hover:border-green-400/40 transition-all duration-300">
                        <h4 className="text-lg font-semibold text-white mb-4">Best Performance</h4>
                  {(() => {
                          const stats = getCompetitionStats()
                          const bestMedal = stats.medals.gold >= stats.medals.silver && stats.medals.gold >= stats.medals.bronze ? 'Gold' :
                                           stats.medals.silver >= stats.medals.bronze ? 'Silver' : 'Bronze'
                          const mostMedals = Math.max(stats.medals.gold, stats.medals.silver, stats.medals.bronze)
                          
                            return (
                            <div className="space-y-4">
                              <div className="text-center bg-white/5 rounded-lg p-4">
                                <div className="text-3xl mb-2">
                                  {bestMedal === 'Gold' ? '🥇' : bestMedal === 'Silver' ? '🥈' : '🥉'}
                                  </div>
                                <div className="text-lg font-bold text-white">{mostMedals} {bestMedal}</div>
                                <div className="text-sm text-gray-400">Most common medal</div>
                                  </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Gold Rate</span>
                                  <span className="text-yellow-400">{stats.medals.gold > 0 ? Math.round((stats.medals.gold / (stats.medals.gold + stats.medals.silver + stats.medals.bronze)) * 100) : 0}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Silver Rate</span>
                                  <span className="text-gray-300">{stats.medals.silver > 0 ? Math.round((stats.medals.silver / (stats.medals.gold + stats.medals.silver + stats.medals.bronze)) * 100) : 0}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Bronze Rate</span>
                                  <span className="text-orange-400">{stats.medals.bronze > 0 ? Math.round((stats.medals.bronze / (stats.medals.gold + stats.medals.silver + stats.medals.bronze)) * 100) : 0}%</span>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Team Performance & Advanced Analytics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Team Performance */}
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                      <h3 className="text-lg font-semibold text-white mb-4">Team Performance</h3>
                      {competitionTeams.length > 0 ? (
                        <div className="space-y-4">
                          {competitionTeams.map((team, index) => {
                            const teamBouts = competitionBouts.filter(b => b.competition_teams_id === team.competition_teams_id)
                            const teamWins = teamBouts.filter(b => b.result === 'Win').length
                            const teamWinRate = teamBouts.length > 0 ? Math.round((teamWins / teamBouts.length) * 100) : 0
                            
                            return (
                              <div key={index} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-white">{team.team_name}</div>
                                    <div className="text-sm text-gray-400">{teamBouts.length} team bouts</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${
                                      teamWinRate >= 70 ? 'text-green-400' : 
                                      teamWinRate >= 50 ? 'text-yellow-400' : 
                                      'text-red-400'
                                    }`}>
                                      {teamWinRate}%
                                  </div>
                                    <div className="text-xs text-gray-400">Win Rate</div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <p className="text-sm">No team competitions recorded</p>
                          <p className="text-xs opacity-75 mt-1">Team performance data will appear here</p>
                        </div>
                      )}
                    </div>

                    {/* Medal Breakdown */}
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                      <h3 className="text-lg font-semibold text-white mb-4">Medal Collection</h3>
                  {(() => {
                        const stats = getCompetitionStats()
                        const totalMedals = stats.medals.gold + stats.medals.silver + stats.medals.bronze
                        
                            return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center bg-white/5 rounded-xl p-4">
                                <div className="text-3xl mb-2">🥇</div>
                                <div className="text-2xl font-bold text-yellow-400">{stats.medals.gold}</div>
                                <div className="text-xs text-gray-400">Gold</div>
                                  </div>
                              <div className="text-center bg-white/5 rounded-xl p-4">
                                <div className="text-3xl mb-2">🥈</div>
                                <div className="text-2xl font-bold text-gray-300">{stats.medals.silver}</div>
                                <div className="text-xs text-gray-400">Silver</div>
                                  </div>
                              <div className="text-center bg-white/5 rounded-xl p-4">
                                <div className="text-3xl mb-2">🥉</div>
                                <div className="text-2xl font-bold text-orange-400">{stats.medals.bronze}</div>
                                <div className="text-xs text-gray-400">Bronze</div>
                                </div>
                                  </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-white">{totalMedals} Total Medals</div>
                              <div className="text-sm text-gray-400">Medal efficiency: {competitionEntries.length > 0 ? Math.round((totalMedals / competitionEntries.length) * 100) : 0}%</div>
                        </div>
                      </div>
                    )
                  })()}
                    </div>
                  </div>

                  {/* Performance Insights & Notes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Performance Insights */}
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                      <h3 className="text-lg font-semibold text-white mb-4">Performance Insights</h3>
                      {(() => {
                        const stats = getCompetitionStats()
                        const disciplineStats = getDisciplineStats()
                        const bestDiscipline = disciplineStats[0]
                        
                        return (
                          <div className="space-y-4">
                            <div className="bg-white/5 rounded-xl p-4">
                              <div className="text-sm text-gray-400 mb-1">Best Discipline</div>
                              <div className="text-lg font-bold text-white">{bestDiscipline?.name || 'N/A'}</div>
                              <div className="text-sm text-blue-400">
                                {bestDiscipline ? Math.round((bestDiscipline.wins / Math.max(1, bestDiscipline.bouts)) * 100) : 0}% win rate
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4">
                              <div className="text-sm text-gray-400 mb-1">Recent Form</div>
                              <div className="text-lg font-bold text-white">
                                {stats.winRate >= 70 ? 'Excellent' : 
                                 stats.winRate >= 50 ? 'Good' : 'Needs Improvement'}
                              </div>
                              <div className="text-sm text-gray-400">{stats.winRate}% overall win rate</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4">
                              <div className="text-sm text-gray-400 mb-1">Competition Frequency</div>
                              <div className="text-lg font-bold text-white">{stats.totalCompetitions}</div>
                              <div className="text-sm text-gray-400">total competitions entered</div>
                        </div>
                      </div>
                    )
                  })()}
                    </div>

                    {/* Performance Notes */}
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                      <h3 className="text-lg font-semibold text-white mb-4">Performance Notes</h3>
                      <textarea
                        placeholder="Add observations about this athlete's performance, strengths, areas for improvement..."
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-32 text-sm"
                      />
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-xs text-gray-500">
                          Last updated: {new Date().toLocaleDateString()}
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save Notes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'grading' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add New Belt Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Add New Belt</h3>
                  
                  <div className="space-y-4">
                    {/* Martial Art Selection */}
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Martial Art *</label>
                      <select
                        value={newBeltForm.martial_art_id}
                        onChange={(e) => handleMartialArtChange(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select martial art</option>
                        {martialArts.map((art) => (
                          <option key={art.martial_art_id} value={art.martial_art_id}>
                            {art.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Class Selection */}
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Class (Optional)</label>
                      <select
                        value={newBeltForm.martial_art_classes_id}
                        onChange={(e) => handleClassChange(e.target.value)}
                        disabled={!newBeltForm.martial_art_id}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select class (optional)</option>
                        {filteredClasses.map((classItem) => (
                          <option key={classItem.martial_art_classes_id} value={classItem.martial_art_classes_id}>
                            {classItem.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Belt Selection */}
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Belt *</label>
                      <select
                        value={newBeltForm.belt_system_id}
                        onChange={(e) => handleBeltChange(e.target.value)}
                        disabled={!newBeltForm.martial_art_id}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select belt</option>
                        {filteredBelts.map((belt) => (
                          <option key={belt.belt_system_id} value={belt.belt_system_id}>
                            {belt.belt_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Awarded Date */}
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Awarded Date *</label>
                      <input
                        type="text"
                        value={newBeltForm.awarded_date}
                        onChange={(e) => setNewBeltForm(prev => ({ ...prev, awarded_date: e.target.value }))}
                        placeholder="YYYY-MM-DD"
                        className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base ${
                          newBeltForm.awarded_date && !isValidDate(newBeltForm.awarded_date) 
                            ? 'border-red-500' 
                            : 'border-white/20'
                        }`}
                      />
                      {newBeltForm.awarded_date && !isValidDate(newBeltForm.awarded_date) && (
                        <p className="text-red-400 text-xs mt-1">Please use YYYY-MM-DD format</p>
                      )}
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={handleAddBelt}
                      disabled={isSavingBelt || !newBeltForm.martial_art_id || !newBeltForm.belt_system_id || !newBeltForm.awarded_date || !isValidDate(newBeltForm.awarded_date)}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {isSavingBelt ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add Belt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Current Belts Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Current Belts</h3>
                  
                  {isLoadingBelts ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                  ) : memberBelts.length === 0 ? (
                    <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-400">No belts recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memberBelts.map((belt) => (
                        <div key={belt.member_belts_id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {belt.colour_hex && (
                                <div 
                                  className="w-4 h-4 rounded-full border border-white/20"
                                  style={{ backgroundColor: belt.colour_hex }}
                                ></div>
                              )}
                              <div>
                                <h4 className="text-white font-medium">{belt.belt_name}</h4>
                                <p className="text-sm text-gray-400">
                                  {belt.martial_art_name}
                                  {belt.class_name && ` • ${belt.class_name}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Awarded: {belt.awarded_date ? new Date(belt.awarded_date).toLocaleDateString() : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteBelt(belt.member_belts_id)}
                              className="text-red-400 hover:text-red-300 transition-colors duration-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delete Button - Bottom Right of Content */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Member</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}