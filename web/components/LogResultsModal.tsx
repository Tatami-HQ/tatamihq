'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { handleAuthError } from '@/lib/authUtils'
import type { Competition } from '../app/competitions/page'

interface Member {
  members_id: number
  first_name: string | null
  last_name: string | null
  profile_picture_url: string | null
}

interface CompetitionEntry {
  competition_entries_id: number
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

interface Coach {
  members_id: number
  competition_coaches_id: number
  first_name: string | null
  last_name: string | null
  profile_picture_url: string | null
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

interface BoutData {
  opponent_name: string
  opponent_club: string
  score_for: string
  score_against: string
  result: 'Win' | 'Loss'
  is_final: boolean
  medal: 'Gold' | 'Silver' | 'Bronze' | null
  notes: string
  competition_teams_id: number | null
}

interface LogResultsModalProps {
  competition: Competition | null
  onClose: () => void
  onLogResults: (competitionId: number, resultsData: {
    overall_rank: number | null
    total_gold: number | null
    total_silver: number | null
    total_bronze: number | null
  }) => Promise<void>
  onViewAllResults?: (competitionId: number) => void
}

type LogStep = 'select_discipline' | 'select_competitor' | 'team_name' | 'select_coach' | 'step_in_coach' | 'win_loss' | 'scores' | 'win_final' | 'loss_medal' | 'confirm_result' | 'select_team_member'

export default function LogResultsModal({ competition, onClose, onLogResults, onViewAllResults }: LogResultsModalProps) {
  const [currentStep, setCurrentStep] = useState<LogStep>('select_discipline')
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([])
  const [competitionDisciplines, setCompetitionDisciplines] = useState<CompetitionDiscipline[]>([])
  const [existingBouts, setExistingBouts] = useState<CompetitionBout[]>([])
  const [existingResults, setExistingResults] = useState<CompetitionResult[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [currentUser, setCurrentUser] = useState<Coach | null>(null)
  const [stepInSearchQuery, setStepInSearchQuery] = useState('')
  const [members, setMembers] = useState<Array<{id: number, name: string, email: string, type: 'member' | 'profile', profile_picture_url: string | null}>>([])
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([])
  const [teamMembers, setTeamMembers] = useState<CompetitionTeamMember[]>([])
  
  // Form data
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitionEntry | null>(null)
  const [selectedCompetitors, setSelectedCompetitors] = useState<CompetitionEntry[]>([])
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState<CompetitionDiscipline | null>(null)
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<CompetitionTeamMember[]>([])
  const [teamName, setTeamName] = useState('')
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0)
  const [loggedTeamMembers, setLoggedTeamMembers] = useState<CompetitionEntry[]>([])
  const [boutData, setBoutData] = useState({
    opponent_name: '',
    opponent_club: '',
    score_for: '',
    score_against: '',
    result: 'Win' as 'Win' | 'Loss',
    is_final: false,
    medal: null as 'Gold' | 'Silver' | 'Bronze' | null,
    notes: '',
    competition_teams_id: null as number | null
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingCoach, setIsSavingCoach] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (competition) {
      fetchData()
    }
  }, [competition])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    // Store original overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
    
    // Cleanup: restore original overflow when modal closes
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const fetchData = async () => {
    if (!competition) return

    setIsLoading(true)
    try {
      // Get current user with better error handling
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('[LogResultsModal:fetchData] Auth error:', userError)
        // Handle auth errors gracefully
        const sessionCleared = await handleAuthError(userError)
        if (sessionCleared) {
          setError('Session expired. Please log in again.')
          return
        }
      }
      
      if (user) {
        const { data: currentUserData, error: memberError } = await supabase
          .from('members')
          .select('members_id, first_name, last_name, profile_picture_url')
          .eq('auth_user_id', user.id)
          .single()
        
        if (memberError) {
          console.warn('[LogResultsModal:fetchData] Member lookup failed:', memberError)
        } else {
          const currentUserCoach: Coach = {
            ...currentUserData,
            competition_coaches_id: 0 // Will be determined when checking if they're already a coach
          }
          setCurrentUser(currentUserCoach)
          setSelectedCoach(currentUserCoach) // Default to current user
        }
      }

      // Fetch competition entries with member data
      const { data: entriesData, error: entriesError } = await supabase
        .from('competition_entries')
        .select(`
          *,
          member:members!inner(members_id, first_name, last_name, profile_picture_url)
        `)
        .eq('competitions_id', competition.competitions_id)

      if (entriesError) throw entriesError

      // Fetch competition disciplines that are actually used in this competition
      // We get them through the competition entries since disciplines are linked via entries
      const { data: disciplinesData, error: disciplinesError } = await supabase
        .from('competition_disciplines')
        .select(`
          competition_disciplines_id,
          name,
          martial_art_id,
          team_event,
          competition_entries!inner(competitions_id)
        `)
        .eq('competition_entries.competitions_id', competition.competitions_id)

      if (disciplinesError) throw disciplinesError

      // Fetch competition coaches for this specific competition
      const { data: competitionCoachesData, error: competitionCoachesError } = await supabase
        .from('competition_coaches')
        .select('*')
        .eq('competitions_id', competition.competitions_id)

      console.log('[LogResultsModal:fetchData] Fetching competition coaches for competition:', {
        competitionId: competition.competitions_id,
        competitionName: competition.Name,
        coachesFound: competitionCoachesData?.length || 0,
        coachesData: competitionCoachesData,
        error: competitionCoachesError
      })

      // Convert competition coaches to Coach interface
      const competitionCoaches: Coach[] = (competitionCoachesData || []).map(coach => {
        // Parse the name field to get first and last name
        const nameParts = (coach.name || 'Coach User').split(' ')
        
        return {
          members_id: coach.members_id || 0, // Use members_id from competition_coaches table
          competition_coaches_id: coach.competition_coaches_id,
          first_name: nameParts[0] || 'Coach',
          last_name: nameParts.slice(1).join(' ') || 'User',
          profile_picture_url: null // Will be fetched separately if needed
        }
      })

      // Also fetch members as potential jump-in coaches, but exclude those already assigned
      const assignedMemberIds = competitionCoaches.map(c => c.members_id).filter(id => id > 0)
      
      let membersData: Array<{
        members_id: number
        first_name: string
        last_name: string
        profile_picture_url: string | null
      }> = []
      if (assignedMemberIds.length > 0) {
        const { data, error: membersError } = await supabase
          .from('members')
          .select('members_id, first_name, last_name, profile_picture_url')
          .not('members_id', 'in', `(${assignedMemberIds.join(',')})`)
          .order('first_name')

        if (membersError) throw membersError
        membersData = data || []
      } else {
        // If no assigned coaches, fetch all members
        const { data, error: membersError } = await supabase
          .from('members')
          .select('members_id, first_name, last_name, profile_picture_url')
          .order('first_name')

        if (membersError) throw membersError
        membersData = data || []
      }

      // Use only competition coaches as the main coach list
      const uniqueCoaches = [...competitionCoaches]

      // Set members for step-in coach selection (only members since we only support members_id)
      const stepInOptions = membersData.map(member => ({
        id: member.members_id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unnamed Member',
        email: '', // Members don't have email in this context
        type: 'member' as const,
        profile_picture_url: member.profile_picture_url
      }))

      setMembers(stepInOptions)

      console.log('[LogResultsModal:fetchData] Coach deduplication results:', {
        competitionId: competition.competitions_id,
        assignedCoaches: competitionCoaches.length,
        assignedMemberIds,
        availableMembersForStepIn: membersData.length,
        finalCoachesList: uniqueCoaches.map(c => ({ 
          id: c.members_id, 
          name: `${c.first_name} ${c.last_name}`,
          isAssigned: c.competition_coaches_id > 0
        })),
        stepInOptions: stepInOptions.map(m => ({ id: m.id, name: m.name }))
      })

      // Fetch existing bouts for this competition
      const { data: boutsData, error: boutsError } = await supabase
        .from('competition_bouts')
        .select('*')
        .in('competition_entries_id', entriesData?.map(e => e.competition_entries_id) || [])

      if (boutsError) throw boutsError

      // Fetch existing results for this competition
      const { data: resultsData, error: resultsError } = await supabase
        .from('competition_results')
        .select('*')
        .in('competition_entries_id', entriesData?.map(e => e.competition_entries_id) || [])

      if (resultsError) throw resultsError

      // Fetch competition teams for this competition
      const { data: teamsData, error: teamsError } = await supabase
        .from('competition_teams')
        .select('*')
        .eq('competitions_id', competition.competitions_id)

      if (teamsError) throw teamsError

      // Fetch team members for all teams
      const teamIds = teamsData?.map(t => t.competition_teams_id).filter((id): id is number => id !== null) || []
      let teamMembersData: Array<{
        competition_team_members_id: number
        competition_teams_id: number
        members_id: number
        member: {
          members_id: number
          first_name: string
          last_name: string
          profile_picture_url: string | null
        }
      }> = []
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

      setCompetitionEntries(entriesData || [])
      setCompetitionDisciplines(disciplinesData || [])
      setCoaches(uniqueCoaches)
      setExistingBouts(boutsData || [])
      setExistingResults(resultsData || [])
      setCompetitionTeams(teamsData || [])
      setTeamMembers(teamMembersData || [])

      console.log('[LogResultsModal:fetchData] Coach data summary:', {
        competitionCoachesCount: competitionCoaches.length,
        availableMembersCount: membersData.length,
        totalCoaches: uniqueCoaches.length,
        currentUser: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Not found',
        competitionCoaches: competitionCoaches.map(c => ({ 
          id: c.members_id, 
          name: `${c.first_name} ${c.last_name}`,
          profile_picture_url: c.profile_picture_url 
        })),
        competitionId: competition.competitions_id,
        allCompetitionCoachesRaw: competitionCoachesData,
        stepInOptionsCount: stepInOptions.length
      })
    } catch (error) {
      console.error('[LogResultsModal:fetchData] Error:', error)
      
      // Check if it's an auth error
      const sessionCleared = await handleAuthError(error)
      if (sessionCleared) {
        setError('Session expired. Please log in again.')
      } else {
        setError('Failed to load competition data. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getCompetitorWins = (competitionEntriesId: number) => {
    return existingBouts.filter(bout => 
      bout.competition_entries_id === competitionEntriesId && bout.result === 'Win'
    ).length
  }

  const getCompetitorLosses = (competitionEntriesId: number) => {
    return existingBouts.filter(bout => 
      bout.competition_entries_id === competitionEntriesId && bout.result === 'Loss'
    ).length
  }

  const getTotalBouts = (competitionEntriesId: number) => {
    return existingBouts.filter(bout => 
      bout.competition_entries_id === competitionEntriesId
    ).length
  }

  // Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (num: number) => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) {
      return 'st'
    }
    if (j === 2 && k !== 12) {
      return 'nd'
    }
    if (j === 3 && k !== 13) {
      return 'rd'
    }
    return 'th'
  }

  const getCompetitorStatus = (competitionEntriesId: number) => {
    const competitorResults = existingResults.find(result => 
      result.competition_entries_id === competitionEntriesId
    )
    
    const totalBouts = getTotalBouts(competitionEntriesId)
    const wins = getCompetitorWins(competitionEntriesId)
    const losses = getCompetitorLosses(competitionEntriesId)
    
    // If they have a medal result, show that
    if (competitorResults?.medal) {
      switch (competitorResults.medal) {
        case 'Gold': return { status: 'Gold Medal', round: 'Final', isComplete: true }
        case 'Silver': return { status: 'Silver Medal', round: 'Final', isComplete: true }
        case 'Bronze': return { status: 'Bronze Medal', round: 'Semi Final', isComplete: true }
      }
    }
    
    // If they have losses but no medal, they're eliminated
    if (losses > 0 && !competitorResults?.medal) {
      return { status: `Lost ${totalBouts + losses}${getOrdinalSuffix(totalBouts + losses)} Round`, round: `${totalBouts + losses}${getOrdinalSuffix(totalBouts + losses)} Round`, isComplete: true }
    }
    
    // If they have wins but no medal yet, they're still competing
    if (totalBouts > 0) {
      return { status: `Won ${totalBouts}${getOrdinalSuffix(totalBouts)} Round${totalBouts > 1 ? 's' : ''}`, round: `${totalBouts + 1}${getOrdinalSuffix(totalBouts + 1)} Round`, isComplete: false }
    }
    
    // If no bouts yet, they haven't started
    return { status: 'Not Started', round: '1st Round', isComplete: false }
  }

  const getNextRound = (competitionEntriesId: number) => {
    const status = getCompetitorStatus(competitionEntriesId)
    if (status.isComplete) {
      return status.round
    }
    
    // If they're still competing, show the next numbered round
    const totalBouts = getTotalBouts(competitionEntriesId)
    return `${totalBouts + 1}${getOrdinalSuffix(totalBouts + 1)} Round`
  }

  const handleDisciplineSelect = (discipline: CompetitionDiscipline) => {
    setSelectedDiscipline(discipline)
    setCurrentStep('select_competitor')
  }

  const handleCompetitorSelect = (entry: CompetitionEntry) => {
    // Check if this is a team event
    if (selectedDiscipline?.team_event) {
      // For team events, add to selected competitors instead of setting single competitor
      const isAlreadySelected = selectedCompetitors.some(c => c.competition_entries_id === entry.competition_entries_id)
      if (!isAlreadySelected && selectedCompetitors.length < 6) {
        setSelectedCompetitors([...selectedCompetitors, entry])
      }
    } else {
      setSelectedCompetitor(entry)
      setCurrentStep('select_coach')
    }
  }

  const handleCompetitorsComplete = () => {
    if (selectedCompetitors.length >= 2) {
      // Generate a default team name based on selected competitors
      const memberNames = selectedCompetitors.map(c => c.member?.first_name).filter(Boolean).slice(0, 2)
      setTeamName(memberNames.length > 0 ? `${memberNames.join(' & ')} Team` : 'Team')
      setCurrentStep('team_name')
    }
  }

  const handleTeamMembersSelect = (members: CompetitionTeamMember[]) => {
    setSelectedTeamMembers(members)
    // Generate a default team name based on selected members
    const memberNames = members.map(m => m.member?.first_name).filter(Boolean).slice(0, 2)
    setTeamName(memberNames.length > 0 ? `${memberNames.join(' & ')} Team` : 'Team')
    setCurrentMemberIndex(0)
    setCurrentStep('select_coach')
  }

  const handleTeamNameSubmit = (name: string) => {
    setTeamName(name)
    setCurrentMemberIndex(0)
    setLoggedTeamMembers([]) // Reset logged members
    setCurrentStep('select_coach')
  }

  const handleNextMember = () => {
    if (currentMemberIndex < selectedCompetitors.length - 1) {
      setCurrentMemberIndex(currentMemberIndex + 1)
      setSelectedCompetitor(selectedCompetitors[currentMemberIndex + 1])
      // Reset bout data for next member
      setBoutData({
        opponent_name: '',
        opponent_club: '',
        score_for: '',
        score_against: '',
        result: 'Win',
        is_final: false,
        medal: null,
        notes: '',
        competition_teams_id: null
      })
      // Skip coach selection for subsequent members - use the same coach
      setCurrentStep('win_loss')
    }
    // Note: No else clause - the last member will be handled in handleScoresNext
  }

  const handleTeamMemberSelect = (member: CompetitionEntry) => {
    setSelectedCompetitor(member)
    setCurrentStep('win_loss')
  }

  const handleNoMoreMembers = () => {
    // Clear selected competitor to indicate this is team-level results
    setSelectedCompetitor(null)
    // Reset bout data for team results
    setBoutData({
      opponent_name: '',
      opponent_club: '',
      score_for: '',
      score_against: '',
      result: 'Win',
      is_final: false,
      medal: null,
      notes: '',
      competition_teams_id: null
    })
    // Move to team-level results - start with team win/loss
    setCurrentStep('win_loss')
  }

  const handleTeamResultSubmit = (teamResult: string, teamMedal: string | null) => {
    // This will be handled in the submit function
    setCurrentStep('confirm_result')
  }

  const handleCoachSelect = async (coach: Coach) => {
    if (!competition) return

    setIsSavingCoach(true)
    setError('')

    try {
      // Check if this coach is already assigned to the competition
      // Competition coaches are those that are already in the coaches array (from competition_coaches table)
      const isCompetitionCoach = coaches.some(c => 
        c.competition_coaches_id > 0 && c.members_id === coach.members_id
      )
      
      if (!isCompetitionCoach) {
        // This is a member being selected as a step-in coach, save to competition_coaches table
        const insertData = {
          competitions_id: competition.competitions_id,
          members_id: coach.members_id,
          name: `${coach.first_name} ${coach.last_name}`.trim()
        }
        
        console.log('[LogResultsModal:handleCoachSelect] Inserting step-in coach:', insertData)
        
        const { error: insertError } = await supabase
          .from('competition_coaches')
          .insert([insertData])

        if (insertError) {
          console.error('[LogResultsModal:handleCoachSelect] Error saving step-in coach:', {
            error: insertError,
            insertData: insertData
          })
          setError(`Failed to save step-in coach: ${insertError?.message || 'Unknown error'}`)
          return
        }

        // Refresh the coaches list to include the new step-in coach
        await fetchData()
      }

      setSelectedCoach(coach)
      if (selectedDiscipline?.team_event) {
        setCurrentStep('select_team_member')
      } else {
        setCurrentStep('win_loss')
      }
    } catch (error) {
      console.error('[LogResultsModal:handleCoachSelect] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSavingCoach(false)
    }
  }

  const handleStepInCoach = () => {
    setCurrentStep('step_in_coach')
  }

  const handleStepInCoachSelect = async (person: {id: number, name: string, email: string, type: 'member' | 'profile', profile_picture_url: string | null}) => {
    if (!competition) return

    setIsSavingCoach(true)
    setError('')

    try {
      // Save step-in coach to competition_coaches table
      const { error: insertError } = await supabase
        .from('competition_coaches')
        .insert([{
          competitions_id: competition.competitions_id,
          members_id: person.id, // Only support members for now
          name: person.name
        }])

      if (insertError) {
        console.error('[LogResultsModal:handleStepInCoachSelect] Error saving step-in coach:', {
          error: insertError,
          insertData: {
            competitions_id: competition.competitions_id,
            members_id: person.id,
            name: person.name
          }
        })
        setError(`Failed to save step-in coach: ${insertError.message || 'Unknown error'}`)
        return
      }

      // Convert person to Coach interface for consistency
      const coach: Coach = {
        members_id: person.id,
        competition_coaches_id: 0, // Will be assigned when added to competition
        first_name: person.name.split(' ')[0] || '',
        last_name: person.name.split(' ').slice(1).join(' ') || '',
        profile_picture_url: person.profile_picture_url
      }
      setSelectedCoach(coach)
      setCurrentStep('win_loss')
      
      // Refresh the coaches list to include the new step-in coach
      await fetchData()
    } catch (error) {
      console.error('[LogResultsModal:handleStepInCoachSelect] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSavingCoach(false)
    }
  }

  const handleWinLossSelect = (result: 'Win' | 'Loss') => {
    setBoutData({...boutData, result})
    
    // For team events, we need to collect individual results first
    if (selectedDiscipline?.team_event) {
      setCurrentStep('scores')
    } else {
      setCurrentStep('scores')
    }
  }

  const handleScoresNext = () => {
    if (boutData.score_for && boutData.score_against) {
      if (selectedDiscipline?.team_event) {
        // Check if this is a team-level result (no selected competitor means it's team results)
        if (!selectedCompetitor) {
          // This is team-level scores, proceed to final/medal questions
          if (boutData.result === 'Win') {
            setCurrentStep('win_final')
          } else {
            setCurrentStep('loss_medal')
          }
        } else {
          // This is individual member bout, submit and go back to team member selection
          handleSubmitBout()
          if (selectedCompetitor) {
            setLoggedTeamMembers([...loggedTeamMembers, selectedCompetitor])
          }
          // Go back to team member selection
          setCurrentStep('select_team_member')
        }
      } else {
        if (boutData.result === 'Win') {
          setCurrentStep('win_final')
        } else {
          setCurrentStep('loss_medal')
        }
      }
    }
  }

  const handleWinFinalSelect = (isFinal: boolean) => {
    setBoutData({...boutData, is_final: isFinal})
    if (isFinal) {
      setBoutData(prev => ({...prev, medal: 'Gold'}))
    }
    setCurrentStep('confirm_result')
  }

  const handleLossMedalSelect = (medal: 'Gold' | 'Silver' | 'Bronze' | null) => {
    setBoutData({...boutData, medal})
    setCurrentStep('confirm_result')
  }

  const handleBackStep = () => {
    switch (currentStep) {
      case 'select_competitor':
        setCurrentStep('select_discipline')
        break
      case 'team_name':
        setCurrentStep('select_competitor')
        break
      case 'select_team_member':
        setCurrentStep('select_coach')
        break
      case 'select_coach':
        if (selectedDiscipline?.team_event) {
          // For team events, coach is only selected once
          setCurrentStep('team_name')
        } else {
          setCurrentStep('select_competitor')
        }
        break
      case 'step_in_coach':
        setCurrentStep('select_coach')
        break
      case 'win_loss':
        if (selectedDiscipline?.team_event) {
          // For team events, check if this is team results or individual member
          if (!selectedCompetitor) {
            // This is team results, go back to team member selection
            setCurrentStep('select_team_member')
          } else {
            // This is individual member, go back to team member selection
            setCurrentStep('select_team_member')
          }
        } else {
          setCurrentStep('select_coach')
        }
        break
      case 'scores':
        setCurrentStep('win_loss')
        break
      case 'win_final':
        if (selectedDiscipline?.team_event && !selectedCompetitor) {
          // This is team-level win_final, go back to team scores
          setCurrentStep('scores')
        } else {
          setCurrentStep('scores')
        }
        break
      case 'loss_medal':
        if (selectedDiscipline?.team_event && !selectedCompetitor) {
          // This is team-level loss_medal, go back to team scores
          setCurrentStep('scores')
        } else {
          setCurrentStep('scores')
        }
        break
      case 'confirm_result':
        if (selectedDiscipline?.team_event && !selectedCompetitor) {
          // This is team-level confirm_result, go back based on team result
          if (boutData.result === 'Win') {
            setCurrentStep('win_final')
          } else {
            setCurrentStep('loss_medal')
          }
        } else if (selectedDiscipline?.team_event) {
          // This is individual member, go back to team member selection
          setCurrentStep('select_team_member')
        } else if (boutData.result === 'Win') {
          setCurrentStep('win_final')
        } else {
          setCurrentStep('loss_medal')
        }
        break
    }
  }

  const handleSubmitBout = async () => {
    // For team results, selectedCompetitor can be null
    const isTeamResult = selectedDiscipline?.team_event && !selectedCompetitor
    if ((!isTeamResult && !selectedCompetitor) || !competition || !selectedCoach) {
      console.error('[LogResultsModal:handleSubmitBout] Missing required data:', {
        selectedCompetitor: !!selectedCompetitor,
        competition: !!competition,
        selectedCoach: !!selectedCoach,
        isTeamResult: isTeamResult
      })
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      console.log('[LogResultsModal:handleSubmitBout] Starting submission with data:', {
        selectedCompetitor: selectedCompetitor?.competition_entries_id,
        selectedCoach: selectedCoach.members_id,
        boutData: boutData,
        competition: competition.competitions_id
      })

      // Validate required fields (only for individual bouts, not team results)
      if (!isTeamResult && !selectedCompetitor?.competition_entries_id) {
        throw new Error('Competitor entry ID is missing')
      }
      if (!competition.clubs_id) {
        throw new Error('Competition club ID is missing')
      }
      if (!boutData.result) {
        throw new Error('Bout result is missing')
      }

      const nextRound = isTeamResult ? 'Team Round 1' : getNextRound(selectedCompetitor?.competition_entries_id || 0)
      
      // Get the competition_coaches_id for the selected coach
      let competitionCoachId = null
      
      if (selectedCoach) {
        // If the coach has a competition_coaches_id, use it directly
        if (selectedCoach.competition_coaches_id > 0) {
          competitionCoachId = selectedCoach.competition_coaches_id
          console.log('[LogResultsModal:handleSubmitBout] Using existing competition_coaches_id:', competitionCoachId)
        } else {
          // Find the coach in the competition_coaches table (for step-in coaches)
          const { data: existingCoach, error: coachError } = await supabase
            .from('competition_coaches')
            .select('competition_coaches_id')
            .eq('competitions_id', competition.competitions_id)
            .eq('members_id', selectedCoach.members_id)
            .single()

          if (!coachError && existingCoach) {
            competitionCoachId = existingCoach.competition_coaches_id
            console.log('[LogResultsModal:handleSubmitBout] Found step-in coach competition_coaches_id:', competitionCoachId)
          } else {
            console.warn('[LogResultsModal:handleSubmitBout] Coach not found in competition_coaches:', {
              coachId: selectedCoach.members_id,
              competitionId: competition.competitions_id,
              error: coachError
            })
            // Continue without competitionCoachId - it might be optional
          }
        }
      }
      
      // For team results, create team record if it doesn't exist
      let teamId = boutData.competition_teams_id
      if (isTeamResult && !teamId) {
        const teamInsertData = {
          competitions_id: competition.competitions_id,
          competition_disciplines_id: selectedDiscipline.competition_disciplines_id,
          clubs_id: competition.clubs_id,
          location_id: null,
          team_name: teamName,
          competition_coaches_id: competitionCoachId,
          result: boutData.result,
          medal: boutData.medal
        }
        
        console.log('[LogResultsModal:handleSubmitBout] Creating team record:', teamInsertData)
        
        const { data: teamResult, error: teamError } = await supabase
          .from('competition_teams')
          .insert([teamInsertData])
          .select()
        
        if (teamError) {
          console.error('[LogResultsModal:handleSubmitBout] Team creation error:', teamError)
          throw teamError
        }
        
        teamId = teamResult?.[0]?.competition_teams_id
        console.log('[LogResultsModal:handleSubmitBout] Team created with ID:', teamId)
      }

      // Insert bout record
      const boutInsertData = {
        competition_entries_id: isTeamResult ? null : selectedCompetitor?.competition_entries_id,
        clubs_id: competition.clubs_id,
        location_id: null, // Can be set later if needed
        round: nextRound, // Use numbered rounds, Final/Semi Final determined by medal colors
        opponent_name: boutData.opponent_name.trim() || 'Unknown Opponent',
        opponent_club: boutData.opponent_club.trim() || null,
        score_for: parseInt(boutData.score_for) || 0,
        score_against: parseInt(boutData.score_against) || 0,
        result: boutData.result,
        competition_teams_id: teamId // Use the team ID (created or existing)
      }

      console.log('[LogResultsModal:handleSubmitBout] Inserting bout with data:', boutInsertData)

      const { data: insertResult, error: boutError } = await supabase
        .from('competition_bouts')
        .insert([boutInsertData])
        .select()

      console.log('[LogResultsModal:handleSubmitBout] Insert result:', { insertResult, boutError })

      if (boutError) {
        console.error('[LogResultsModal:handleSubmitBout] Bout insertion error:', boutError)
        throw boutError
      }

      console.log('[LogResultsModal:handleSubmitBout] Bout inserted successfully')

      // Handle medal logic based on new flow
      if (boutData.medal) {
        let roundReached = 'Unknown'
        
        if (boutData.medal === 'Gold') {
          roundReached = 'Final'
        } else if (boutData.medal === 'Silver') {
          roundReached = 'Final'
        } else if (boutData.medal === 'Bronze') {
          roundReached = 'Semi Final'
        }

        if (isTeamResult) {
          // For team results, insert medals for all team members
          const teamMemberMedals = selectedCompetitors.map(competitor => ({
            competition_entries_id: competitor.competition_entries_id,
            medal: boutData.medal,
            round_reached: roundReached
          }))

          console.log('[LogResultsModal:handleSubmitBout] Inserting team member medals:', teamMemberMedals)

          const { error: medalError } = await supabase
            .from('competition_results')
            .insert(teamMemberMedals)

          if (medalError) {
            console.error('[LogResultsModal:handleSubmitBout] Team medal insertion error:', medalError)
            throw medalError
          }
        } else {
          // Insert individual competitor medal result
          const medalInsertData = {
            competition_entries_id: selectedCompetitor?.competition_entries_id,
            medal: boutData.medal,
            round_reached: roundReached
          }

          console.log('[LogResultsModal:handleSubmitBout] Inserting medal with data:', medalInsertData)

          const { error: medalError } = await supabase
            .from('competition_results')
            .insert([medalInsertData])

          if (medalError) {
            console.error('[LogResultsModal:handleSubmitBout] Medal insertion error:', medalError)
            throw medalError
          }
        }

        console.log('[LogResultsModal:handleSubmitBout] Medal inserted successfully')

        // For team events, also update the team's medal record
        if (selectedDiscipline?.team_event && teamId) {
          const teamUpdateData = {
            medal: boutData.medal,
            result: boutData.medal // Store the medal as the result for the team
          }

          console.log('[LogResultsModal:handleSubmitBout] Updating team medal with data:', teamUpdateData)

          const { error: teamError } = await supabase
            .from('competition_teams')
            .update(teamUpdateData)
            .eq('competition_teams_id', teamId)

          if (teamError) {
            console.error('[LogResultsModal:handleSubmitBout] Team medal update error:', teamError)
            throw teamError
          }

          console.log('[LogResultsModal:handleSubmitBout] Team medal updated successfully')
        }
      }

      // Show success message only for individual events or team results
      if (!selectedDiscipline?.team_event || isTeamResult) {
        setSuccess('Result logged successfully! ✅')
        
        // Reset form and refresh data
        setTimeout(() => {
          resetForm()
          fetchData()
        }, 1500)
      }

    } catch (error) {
      console.error('[LogResultsModal:handleSubmitBout] Error:', error)
      
      // Provide more specific error messages based on the error type
      if (error && typeof error === 'object' && 'message' in error) {
        setError(`Failed to log result: ${error.message}`)
      } else if (error && typeof error === 'object' && 'details' in error) {
        setError(`Failed to log result: ${error.details}`)
      } else {
        setError('Failed to log result. Please check the console for more details.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCurrentStep('select_discipline')
    setSelectedCompetitor(null)
    setSelectedCompetitors([])
    setSelectedCoach(currentUser) // Reset to current user
    setSelectedDiscipline(null)
    setSelectedTeamMembers([])
    setTeamName('')
    setCurrentMemberIndex(0)
    setLoggedTeamMembers([])
    setStepInSearchQuery('')
    setBoutData({
      opponent_name: '',
      opponent_club: '',
      score_for: '',
      score_against: '',
      result: 'Win',
      is_final: false,
      medal: null,
      notes: '',
      competition_teams_id: null
    })
    setError('')
    setSuccess('')
  }

  const handleLogNextBout = () => {
    resetForm()
  }

  if (!competition) return null

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 rounded-lg border border-white/10 p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-white">Loading competition data...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 sm:bg-black/50 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      <div className="bg-gray-900 w-full h-full sm:rounded-lg sm:max-h-[90vh] sm:max-w-4xl sm:w-full sm:h-auto border border-white/10 overflow-y-auto overflow-x-hidden pt-12 pb-8 sm:pt-0 sm:pb-0" style={{ touchAction: 'pan-y', overscrollBehavior: 'contain', paddingBottom: 'env(safe-area-inset-bottom, 1.5rem)' }}>
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-lg font-semibold text-white truncate">
                Log Bout Result
              </h2>
              <p className="text-sm text-gray-400 truncate">
                {competition.Name} - Step {getStepNumber(currentStep)} of {selectedDiscipline?.team_event ? 10 : 6}
                {selectedDiscipline?.team_event && selectedCompetitors.length > 0 && (
                  <span className="block text-xs text-blue-400 mt-1">
                    {selectedCompetitor 
                      ? `Individual Member: ${selectedCompetitor.member?.first_name}`
                      : `Team Results: ${teamName}`
                    }
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {onViewAllResults && competition && (
                <button
                  onClick={() => onViewAllResults(competition.competitions_id)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-all duration-200 flex items-center space-x-1 sm:space-x-2"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="hidden sm:inline">All Results</span>
                  <span className="sm:hidden">Results</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors duration-200 flex-shrink-0 ml-2"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 sm:px-6 py-2 border-b border-white/10">
          <div className="flex items-center justify-center space-x-1 sm:space-x-2">
            {(selectedDiscipline?.team_event 
              ? ['select_discipline', 'select_competitor', 'team_name', 'select_coach', 'select_team_member', 'win_loss', 'scores', 'win_final', 'loss_medal', 'confirm_result']
              : ['select_discipline', 'select_competitor', 'select_coach', 'win_loss', 'scores', 'confirm_result']
            ).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  currentStep === step 
                    ? 'bg-blue-600 text-white' 
                    : getStepNumber(currentStep) > index + 1
                    ? 'bg-green-600 text-white'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  {getStepNumber(currentStep) > index + 1 ? '✓' : index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-3 sm:w-6 h-0.5 ${
                    getStepNumber(currentStep) > index + 1 ? 'bg-green-600' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {/* Error/Success Messages */}
          {error && (
              <div className="mb-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

            {success && (
              <div className="mb-4 bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-400 text-sm">{success}</span>
                </div>
              </div>
            )}

            {/* Step Content */}
            {currentStep === 'select_discipline' && (
              <SelectDisciplineStep
                disciplines={competitionDisciplines}
                onSelect={handleDisciplineSelect}
              />
            )}

            {currentStep === 'select_competitor' && (
              <SelectCompetitorStep
                competitors={competitionEntries}
                selectedDiscipline={selectedDiscipline}
                selectedCompetitors={selectedCompetitors}
                onSelect={handleCompetitorSelect}
                onComplete={handleCompetitorsComplete}
                getCompetitorWins={getCompetitorWins}
                getCompetitorLosses={getCompetitorLosses}
                getTotalBouts={getTotalBouts}
                getCompetitorStatus={getCompetitorStatus}
                onBack={handleBackStep}
              />
            )}


            {currentStep === 'team_name' && (
              <TeamNameStep
                selectedCompetitors={selectedCompetitors}
                teamName={teamName}
                onSubmit={handleTeamNameSubmit}
                onBack={handleBackStep}
              />
            )}

            {currentStep === 'select_coach' && (
              <SelectCoachStep
                coaches={coaches}
                currentUser={currentUser}
                selectedCoach={selectedCoach}
                onSelect={handleCoachSelect}
                onBack={handleBackStep}
                onStepInCoach={handleStepInCoach}
                isSavingCoach={isSavingCoach}
              />
            )}

            {currentStep === 'step_in_coach' && (
              <StepInCoachStep
                members={members}
                searchQuery={stepInSearchQuery}
                setSearchQuery={setStepInSearchQuery}
                onSelect={handleStepInCoachSelect}
                onBack={handleBackStep}
                isSavingCoach={isSavingCoach}
                competitionCoachIds={coaches.map(c => c.members_id)}
              />
            )}

            {currentStep === 'win_loss' && (
              <WinLossStep
                competitor={selectedCompetitor}
                coach={selectedCoach}
                onSelect={handleWinLossSelect}
                onBack={handleBackStep}
                isTeamEvent={selectedDiscipline?.team_event || false}
                teamName={teamName}
                isTeamResult={(selectedDiscipline?.team_event || false) && !selectedCompetitor}
              />
            )}

            {currentStep === 'scores' && (
              <ScoresStep
                competitor={selectedCompetitor}
                boutData={boutData}
                setBoutData={setBoutData}
                onNext={handleScoresNext}
                onBack={handleBackStep}
                isTeamEvent={selectedDiscipline?.team_event || false}
                teamName={teamName}
                isTeamResult={(selectedDiscipline?.team_event || false) && !selectedCompetitor}
              />
            )}

            {currentStep === 'win_final' && (
              <WinFinalStep
                competitor={selectedCompetitor}
                boutData={boutData}
                onSelect={handleWinFinalSelect}
                onBack={handleBackStep}
              />
            )}

            {currentStep === 'loss_medal' && (
              <LossMedalStep
                competitor={selectedCompetitor}
                boutData={boutData}
                onSelect={handleLossMedalSelect}
                onBack={handleBackStep}
              />
            )}


            {currentStep === 'select_team_member' && (
              <SelectTeamMemberStep
                competitors={selectedCompetitors}
                loggedMembers={loggedTeamMembers}
                teamName={teamName}
                onSelect={handleTeamMemberSelect}
                onNoMoreMembers={handleNoMoreMembers}
                onBack={handleBackStep}
              />
            )}

            {currentStep === 'confirm_result' && (
              <ConfirmResultStep
                competitor={selectedCompetitor}
                coach={selectedCoach}
                discipline={selectedDiscipline}
                boutData={boutData}
                onSubmit={handleSubmitBout}
                onBack={handleBackStep}
                onLogNext={handleLogNextBout}
                isSubmitting={isSubmitting}
                getNextRound={getNextRound}
                isTeamEvent={selectedDiscipline?.team_event || false}
                teamName={teamName}
                selectedMembers={selectedCompetitors.map(c => ({ 
                  competition_team_members_id: 0, // Placeholder - not used in display
                  created_at: new Date().toISOString(),
                  competition_teams_id: null,
                  member_id: c.member?.members_id || null,
                  member: c.member 
                }))}
                currentMemberIndex={currentMemberIndex}
                onNextMember={handleNextMember}
              />
            )}
                </div>
              </div>
            </div>
          </div>
  )
}

// Helper function
function getStepNumber(step: LogStep): number {
  const steps = ['select_discipline', 'select_competitor', 'team_name', 'select_coach', 'select_team_member', 'win_loss', 'scores', 'win_final', 'loss_medal', 'confirm_result']
  return steps.indexOf(step) + 1
}

// Step Components
function SelectCompetitorStep({ 
  competitors, 
  selectedDiscipline,
  selectedCompetitors = [],
  onSelect, 
  onComplete,
  getCompetitorWins, 
  getCompetitorLosses, 
  getTotalBouts,
  getCompetitorStatus,
  onBack
}: {
  competitors: CompetitionEntry[]
  selectedDiscipline: CompetitionDiscipline | null
  selectedCompetitors?: CompetitionEntry[]
  onSelect: (competitor: CompetitionEntry) => void
  onComplete?: () => void
  getCompetitorWins: (id: number) => number
  getCompetitorLosses: (id: number) => number
  getTotalBouts: (id: number) => number
  getCompetitorStatus: (id: number) => { status: string, round: string, isComplete: boolean }
  onBack: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter competitors by the selected discipline
  const filteredCompetitors = competitors.filter(entry => {
    const member = entry.member
    if (!member || !selectedDiscipline) return false
    
    // Filter by discipline (only show competitors in the selected discipline)
    const disciplineMatch = entry.competition_disciplines_id === selectedDiscipline.competition_disciplines_id
    
    // Filter by name
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase()
    const nameMatch = !searchQuery || fullName.includes(searchQuery.toLowerCase())
    
    return disciplineMatch && nameMatch
  })

  return (
    <div className="space-y-4">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          {selectedDiscipline?.team_event ? 'Select Team Members' : 'Select Competitor'}
        </h3>
        <p className="text-sm sm:text-base text-gray-400">
          {selectedDiscipline?.team_event 
            ? `Choose 2-6 competitors for ${selectedDiscipline.name} team`
            : `Choose which competitor to log a result for in ${selectedDiscipline?.name}`
          }
        </p>
        {selectedDiscipline?.team_event && selectedCompetitors.length > 0 && (
          <p className="text-sm text-blue-400 mt-2">
            {selectedCompetitors.length} selected (2-6 required)
          </p>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search competitors..."
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

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {filteredCompetitors.map((entry) => {
          const member = entry.member
          if (!member) return null

          const wins = getCompetitorWins(entry.competition_entries_id)
          const losses = getCompetitorLosses(entry.competition_entries_id)
          const competitorStatus = getCompetitorStatus(entry.competition_entries_id)
          const isEliminated = competitorStatus.isComplete
          const hasMedal = competitorStatus.status.includes('Medal')

          const isSelected = selectedCompetitors.some(c => c.competition_entries_id === entry.competition_entries_id)
          const canSelect = selectedDiscipline?.team_event ? !isSelected && selectedCompetitors.length < 6 : true

          return (
            <button
              key={entry.competition_entries_id}
              onClick={() => !isEliminated && canSelect && onSelect(entry)}
              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all duration-200 text-left relative ${
                isEliminated
                  ? `opacity-60 cursor-not-allowed ${
                      hasMedal 
                        ? `bg-gradient-to-br ${
                            competitorStatus.status === 'Gold Medal' 
                              ? 'from-yellow-900/30 to-yellow-700/20 border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
                              : competitorStatus.status === 'Silver Medal'
                              ? 'from-gray-800/30 to-gray-600/20 border-gray-400/50 shadow-lg shadow-gray-400/20'
                              : 'from-orange-900/30 to-orange-700/20 border-orange-500/50 shadow-lg shadow-orange-500/20'
                          }`
                        : 'bg-red-900/20 border-red-500/30'
                    }`
                  : !canSelect
                  ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10'
                  : isSelected
                  ? 'bg-blue-600/20 border-blue-500/50 cursor-pointer'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30 cursor-pointer'
              }`}
              disabled={isEliminated}
            >
              {/* Medal glow overlay for medal winners */}
              {isEliminated && hasMedal && (
                <div className="absolute inset-0 rounded-lg sm:rounded-xl pointer-events-none">
                  <div className={`absolute inset-0 rounded-lg sm:rounded-xl ${
                    competitorStatus.status === 'Gold Medal' 
                      ? 'bg-gradient-to-br from-yellow-400/10 to-transparent shadow-inner shadow-yellow-400/30' 
                      : competitorStatus.status === 'Silver Medal'
                      ? 'bg-gradient-to-br from-gray-400/10 to-transparent shadow-inner shadow-gray-400/30'
                      : 'bg-gradient-to-br from-orange-400/10 to-transparent shadow-inner shadow-orange-400/30'
                  }`}></div>
                </div>
              )}
              
              {/* Disabled overlay for eliminated competitors */}
              {isEliminated && !hasMedal && (
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-red-900/10 pointer-events-none"></div>
              )}
              
              {/* Medal/Completion indicator */}
              {isEliminated && (
                <div className="absolute top-2 right-2 z-10">
                  {hasMedal ? (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      competitorStatus.status === 'Gold Medal' 
                        ? 'bg-yellow-500 text-yellow-900' 
                        : competitorStatus.status === 'Silver Medal'
                        ? 'bg-gray-400 text-gray-900'
                        : 'bg-orange-500 text-orange-900'
                    }`}>
                      {competitorStatus.status === 'Gold Medal' ? '🥇' :
                       competitorStatus.status === 'Silver Medal' ? '🥈' : '🥉'}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-red-600/80 text-white text-xs flex items-center justify-center font-bold">
                      ✕
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex flex-col space-y-2 mb-3">
                <div className="flex items-center space-x-2">
                  {member.profile_picture_url ? (
                    <img
                      src={member.profile_picture_url}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-white/20 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {member.first_name?.[0]?.toUpperCase() || 'M'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm truncate">
                      {member.first_name} {member.last_name}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {wins}W - {losses}L
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  competitorStatus.status.includes('Lost') 
                    ? 'bg-red-600/20 text-red-400'
                    : competitorStatus.status === 'Not Started'
                    ? 'bg-gray-600/20 text-gray-400'
                    : competitorStatus.status.includes('Medal')
                    ? 'bg-yellow-600/20 text-yellow-400'
                    : 'bg-green-600/20 text-green-400'
                }`}>
                  {competitorStatus.status}
                </span>
                {competitorStatus.isComplete && (
                  <span className="text-xs text-gray-400 hidden sm:inline">{competitorStatus.round}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {competitors.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No competitors registered for this competition yet.</p>
        </div>
      )}
      
      {competitors.length > 0 && filteredCompetitors.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No competitors found matching &quot;{searchQuery}&quot;.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Team Selection Continue Button */}
      {selectedDiscipline?.team_event && selectedCompetitors.length >= 2 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-lg"
          >
            Continue with Team ({selectedCompetitors.length} members)
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

// Select Discipline Step
function SelectDisciplineStep({ 
  disciplines, 
  onSelect
}: {
  disciplines: CompetitionDiscipline[]
  onSelect: (discipline: CompetitionDiscipline) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Select Discipline</h3>
        <p className="text-sm sm:text-base text-gray-400">Choose which discipline to log results for</p>
      </div>

      {/* Discipline Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {disciplines.map((discipline) => (
          <button
            key={discipline.competition_disciplines_id}
            onClick={() => onSelect(discipline)}
            className="p-4 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-200 text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
                {discipline.name?.[0]?.toUpperCase() || 'D'}
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm">
                  {discipline.name || 'Unnamed Discipline'}
                </h4>
                {discipline.team_event && (
                  <p className="text-xs text-blue-400">Team Event</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {disciplines.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No disciplines available for this competition.</p>
        </div>
      )}
    </div>
  )
}

// Select Coach Step
function SelectCoachStep({ 
  coaches, 
  currentUser, 
  selectedCoach, 
  onSelect, 
  onBack,
  onStepInCoach,
  isSavingCoach
}: {
  coaches: Coach[]
  currentUser: Coach | null
  selectedCoach: Coach | null
  onSelect: (coach: Coach) => void
  onBack: () => void
  onStepInCoach: () => void
  isSavingCoach: boolean
}) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // The coaches array contains only competition coaches from the competition_coaches table
  // Add current user if they're not already in the list
  const competitionCoaches = currentUser && !coaches.find(c => c.members_id === currentUser.members_id) 
    ? [currentUser, ...coaches] 
    : coaches

  console.log('[SelectCoachStep] Competition coaches available:', {
    count: competitionCoaches.length,
    coaches: competitionCoaches.map(c => ({ id: c.members_id, name: `${c.first_name} ${c.last_name}` }))
  })

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Select Coach</h3>
        <p className="text-sm sm:text-base text-gray-400">Choose which coach is logging this result</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search coaches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Competition Coaches Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-blue-400 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Competition Coaches ({competitionCoaches.length})
        </h4>
        
        {competitionCoaches.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {competitionCoaches
              .filter(coach => 
                !searchQuery || 
                `${coach.first_name} ${coach.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((coach, index) => (
              <button
                key={`coach-${coach.members_id}-${index}`}
                onClick={() => {
                  console.log('[SelectCoachStep] Coach selected:', coach)
                  onSelect(coach)
                }}
                disabled={isSavingCoach}
                className={`p-4 rounded-xl border transition-all duration-200 text-center ${
                  selectedCoach?.members_id === coach.members_id && 
                  selectedCoach?.competition_coaches_id === coach.competition_coaches_id
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30'
                } ${isSavingCoach ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {coach.first_name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div className="text-center">
                    <h4 className="text-white font-medium text-sm leading-tight">
                      {coach.first_name} {coach.last_name}
                    </h4>
                    {coach.members_id === currentUser?.members_id && (
                      <p className="text-xs text-green-400">You</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No competition coaches assigned yet.</p>
            <p className="text-sm mt-1">Use &quot;Select from Members &amp; Profiles&quot; below to add coaches.</p>
          </div>
        )}
      </div>

      {/* Step-in Coach Button */}
      <div className="border-t border-white/10 pt-6">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-4">Need to select someone else?</p>
          <button
            onClick={onStepInCoach}
            disabled={isSavingCoach}
            className={`px-6 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 hover:border-green-500/50 rounded-xl transition-all duration-200 flex items-center space-x-2 mx-auto ${
              isSavingCoach ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSavingCoach ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
            <span className="text-green-400 font-medium">
              {isSavingCoach ? 'Saving...' : 'Select from Members & Profiles'}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

// Step-in Coach Step
function StepInCoachStep({ 
  members, 
  searchQuery, 
  setSearchQuery, 
  onSelect, 
  onBack,
  isSavingCoach,
  competitionCoachIds
}: {
  members: Array<{id: number, name: string, email: string, type: 'member' | 'profile', profile_picture_url: string | null}>
  searchQuery: string
  setSearchQuery: (query: string) => void
  onSelect: (person: {id: number, name: string, email: string, type: 'member' | 'profile', profile_picture_url: string | null}) => void
  onBack: () => void
  isSavingCoach: boolean
  competitionCoachIds: number[]
}) {
  // Filter out coaches who are already assigned to the competition
  const availableMembers = members.filter(person => 
    !competitionCoachIds.includes(person.id)
  )
  
  const filteredMembers = availableMembers.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Step-in Coach</h3>
        <p className="text-sm sm:text-base text-gray-400">Select a member or profile to step in as coach</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search members and profiles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Members and Profiles Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {filteredMembers.map((person) => (
          <button
            key={`${person.type}-${person.id}`}
            onClick={() => onSelect(person)}
            disabled={isSavingCoach}
            className={`p-3 sm:p-4 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 hover:border-green-500/30 transition-all duration-200 text-left ${
              isSavingCoach ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              {person.profile_picture_url ? (
                <img
                  src={person.profile_picture_url}
                  alt={person.name}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs ${
                  person.type === 'member' 
                    ? 'bg-gradient-to-br from-green-500 to-teal-600' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
              <div className="text-center">
                <h4 className="text-white font-medium text-xs sm:text-sm leading-tight">
                  {person.name}
                </h4>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    person.type === 'member' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {person.type === 'member' ? 'M' : 'P'}
                  </span>
                </div>
                {person.email && (
                  <p className="text-xs text-gray-400 truncate mt-1">{person.email}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No members or profiles found matching &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

// Win/Loss Step
function WinLossStep({ 
  competitor, 
  coach, 
  onSelect, 
  onBack,
  isTeamEvent = false,
  teamName = '',
  isTeamResult = false
}: {
  competitor: CompetitionEntry | null
  coach: Coach | null
  onSelect: (result: 'Win' | 'Loss') => void
  onBack: () => void
  isTeamEvent?: boolean
  teamName?: string
  isTeamResult?: boolean
}) {
  const member = competitor?.member

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          {isTeamResult ? 'Team Result' : 'Result'}
        </h3>
        <p className="text-sm sm:text-base text-gray-400">
          {isTeamResult 
            ? `Did team ${teamName} win or lose?`
            : isTeamEvent
            ? `Did ${member?.first_name} win or lose?`
            : 'Did the competitor win or lose?'
          }
        </p>
        {isTeamEvent && !isTeamResult && (
          <p className="text-xs text-blue-400 mt-1">
            Individual bout result
          </p>
        )}
      </div>

      {/* Competitor & Coach Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isTeamResult ? (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            ) : member?.profile_picture_url ? (
              <img
                src={member.profile_picture_url}
                alt={`${member.first_name} ${member.last_name}`}
                className="w-10 h-10 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {member?.first_name?.[0]?.toUpperCase() || 'M'}
              </div>
            )}
            <div>
              <h4 className="text-white font-medium">
                {isTeamResult ? teamName : `${member?.first_name} ${member?.last_name}`}
              </h4>
              <p className="text-sm text-gray-400">
                {isTeamResult ? 'Team' : 'Competitor'}
              </p>
            </div>
          </div>
          
          {coach && !isTeamResult && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Coach:</span>
              <span className="text-sm text-white">{coach.first_name} {coach.last_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Win/Loss Selection */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('Win')}
          className="p-6 bg-green-600/20 border border-green-500/50 hover:bg-green-600/30 rounded-xl transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🟢</div>
            <div className="text-green-400 font-semibold text-lg">Win</div>
          </div>
        </button>
        
        <button
          onClick={() => onSelect('Loss')}
          className="p-6 bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 rounded-xl transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🔴</div>
            <div className="text-red-400 font-semibold text-lg">Loss</div>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

// Scores Step
function ScoresStep({ 
  competitor, 
  boutData, 
  setBoutData, 
  onNext, 
  onBack,
  isTeamEvent = false,
  teamName = '',
  isTeamResult = false
}: {
  competitor: CompetitionEntry | null
  boutData: BoutData
  setBoutData: (data: BoutData) => void
  onNext: () => void
  onBack: () => void
  isTeamEvent?: boolean
  teamName?: string
  isTeamResult?: boolean
}) {
  const member = competitor?.member

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          {isTeamResult ? 'Team Bout Scores' : 'Bout Scores'}
        </h3>
        <p className="text-sm sm:text-base text-gray-400">
          {isTeamResult 
            ? `Enter the bout scores for team ${teamName}`
            : isTeamEvent
            ? `Enter the bout scores for ${member?.first_name}`
            : 'Enter the bout scores'
          }
        </p>
        {isTeamEvent && !isTeamResult && (
          <p className="text-xs text-blue-400 mt-1">
            Individual bout scores
          </p>
        )}
      </div>

      {/* Competitor Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center space-x-3">
          {member?.profile_picture_url ? (
            <img
              src={member.profile_picture_url}
              alt={`${member.first_name} ${member.last_name}`}
              className="w-10 h-10 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {member?.first_name?.[0]?.toUpperCase() || 'M'}
            </div>
          )}
          <div>
            <h4 className="text-white font-medium">
              {member?.first_name} {member?.last_name}
            </h4>
            <p className="text-sm text-gray-400">Result: {boutData.result}</p>
          </div>
        </div>
      </div>

      {/* Score Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white/5 rounded-xl p-4 sm:p-5 border border-white/10 space-y-4 sm:space-y-5">
          <h4 className="text-white font-semibold text-center text-base sm:text-lg">Our Score</h4>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={boutData.score_for}
            onChange={(e) => setBoutData({...boutData, score_for: e.target.value})}
            className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-4 sm:py-5 text-white text-center text-2xl sm:text-3xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="0"
            min="0"
            autoFocus
          />
          
          {/* Notes under our score */}
          <div className="mt-4 sm:mt-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">
              Notes (Optional)
            </label>
            <textarea
              value={boutData.notes}
              onChange={(e) => setBoutData({...boutData, notes: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 sm:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              placeholder="Any additional notes about the bout..."
              rows={2}
            />
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 sm:p-5 border border-white/10 space-y-4 sm:space-y-5">
          <h4 className="text-white font-semibold text-center text-base sm:text-lg">Opponent Score</h4>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={boutData.score_against}
            onChange={(e) => setBoutData({...boutData, score_against: e.target.value})}
            className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-4 sm:py-5 text-white text-center text-2xl sm:text-3xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="0"
            min="0"
          />
          
          {/* Opponent details under opponent score */}
          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Opponent Name
              </label>
              <input
                type="text"
                value={boutData.opponent_name}
                onChange={(e) => setBoutData({...boutData, opponent_name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 sm:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Opponent's name..."
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Opponent Club
              </label>
              <input
                type="text"
                value={boutData.opponent_club}
                onChange={(e) => setBoutData({...boutData, opponent_club: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 sm:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Opponent's club..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 min-h-[44px] flex items-center justify-center"
        >
          ← Back
        </button>
        
        <button
          onClick={onNext}
          disabled={!boutData.score_for || !boutData.score_against}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors duration-200 min-h-[44px] flex items-center justify-center shadow-lg"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// Win Final Step
function WinFinalStep({ 
  competitor, 
  boutData, 
  onSelect, 
  onBack 
}: {
  competitor: CompetitionEntry | null
  boutData: BoutData
  onSelect: (isFinal: boolean) => void
  onBack: () => void
}) {
  const member = competitor?.member

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Was it the Final?</h3>
        <p className="text-sm sm:text-base text-gray-400">Did this win take place in the final?</p>
      </div>

      {/* Competitor Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center space-x-3">
          {member?.profile_picture_url ? (
            <img
              src={member.profile_picture_url}
              alt={`${member.first_name} ${member.last_name}`}
              className="w-10 h-10 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {member?.first_name?.[0]?.toUpperCase() || 'M'}
            </div>
          )}
          <div>
            <h4 className="text-white font-medium">
              {member?.first_name} {member?.last_name}
            </h4>
            <p className="text-sm text-gray-400">Score: {boutData.score_for} - {boutData.score_against}</p>
          </div>
        </div>
      </div>

      {/* Final Selection */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect(true)}
          className="p-6 bg-yellow-600/20 border border-yellow-500/50 hover:bg-yellow-600/30 rounded-xl transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🥇</div>
            <div className="text-yellow-400 font-semibold text-lg">Yes - Final</div>
            <div className="text-xs text-yellow-300 mt-1">Gold Medal</div>
          </div>
        </button>
        
        <button
          onClick={() => onSelect(false)}
          className="p-6 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/30 rounded-xl transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">➡️</div>
            <div className="text-blue-400 font-semibold text-lg">No - Next Round</div>
            <div className="text-xs text-blue-300 mt-1">Progress Forward</div>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

// Loss Medal Step
function LossMedalStep({ 
  competitor, 
  boutData, 
  onSelect, 
  onBack 
}: {
  competitor: CompetitionEntry | null
  boutData: BoutData
  onSelect: (medal: 'Gold' | 'Silver' | 'Bronze' | null) => void
  onBack: () => void
}) {
  const member = competitor?.member

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Did it result in a medal?</h3>
        <p className="text-sm sm:text-base text-gray-400">What medal was awarded for this loss?</p>
      </div>

      {/* Competitor Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center space-x-3">
          {member?.profile_picture_url ? (
            <img
              src={member.profile_picture_url}
              alt={`${member.first_name} ${member.last_name}`}
              className="w-10 h-10 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {member?.first_name?.[0]?.toUpperCase() || 'M'}
            </div>
          )}
          <div>
            <h4 className="text-white font-medium">
              {member?.first_name} {member?.last_name}
            </h4>
            <p className="text-sm text-gray-400">Score: {boutData.score_for} - {boutData.score_against}</p>
          </div>
        </div>
      </div>

      {/* Medal Selection */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('Silver')}
          className="p-4 bg-gray-600/20 border border-gray-500/50 hover:bg-gray-600/30 rounded-xl transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">🥈</div>
            <div className="text-gray-300 font-semibold">Silver</div>
            <div className="text-xs text-gray-400 mt-1">Final Loss</div>
          </div>
        </button>
        
        <button
          onClick={() => onSelect('Bronze')}
          className="p-4 bg-orange-600/20 border border-orange-500/50 hover:bg-orange-600/30 rounded-xl transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">🥉</div>
            <div className="text-orange-400 font-semibold">Bronze</div>
            <div className="text-xs text-orange-300 mt-1">Semi Final Loss</div>
          </div>
        </button>
        
        <button
          onClick={() => onSelect(null)}
          className="col-span-2 p-4 bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 rounded-xl transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">❌</div>
            <div className="text-red-400 font-semibold">No Medal</div>
            <div className="text-xs text-red-300 mt-1">Eliminated</div>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}


function ConfirmResultStep({ 
  competitor, 
  coach,
  discipline, 
  boutData, 
  onSubmit, 
  onBack, 
  onLogNext, 
  isSubmitting, 
  getNextRound,
  isTeamEvent = false,
  teamName = '',
  selectedMembers = [],
  currentMemberIndex = 0,
  onNextMember
}: {
  competitor: CompetitionEntry | null
  coach: Coach | null
  discipline: CompetitionDiscipline | null
  boutData: BoutData
  onSubmit: () => void
  onBack: () => void
  onLogNext: () => void
  isSubmitting: boolean
  getNextRound: (id: number) => string
  isTeamEvent?: boolean
  teamName?: string
  selectedMembers?: CompetitionTeamMember[]
  currentMemberIndex?: number
  onNextMember?: () => void
}) {
  const member = competitor?.member
  const nextRound = competitor ? getNextRound(competitor.competition_entries_id) : null

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          {isTeamEvent ? 'Confirm Team Result' : 'Confirm Result'}
        </h3>
        <p className="text-sm sm:text-base text-gray-400">
          {isTeamEvent 
            ? `Review the bout details for ${selectedMembers[currentMemberIndex]?.member?.first_name} ${selectedMembers[currentMemberIndex]?.member?.last_name} in team ${teamName}`
            : 'Review and submit the bout result'
          }
        </p>
        {isTeamEvent && (
          <p className="text-xs text-blue-400 mt-1">
            Member {currentMemberIndex + 1} of {selectedMembers.length}
          </p>
        )}
      </div>

      {/* Bout Summary & Medal/Round Info - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bout Summary */}
        <div className="bg-white/5 rounded-xl p-4 md:p-6 border border-white/10 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              {member?.profile_picture_url ? (
                <img
                  src={member.profile_picture_url}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="w-8 h-8 md:w-12 md:h-12 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs md:text-sm">
                  {member?.first_name?.[0]?.toUpperCase() || 'M'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-medium text-sm md:text-base truncate">
                  {member?.first_name} {member?.last_name}
                </h4>
                <p className="text-xs md:text-sm text-gray-400 truncate">{discipline?.name}</p>
                {coach && (
                  <p className="text-xs text-gray-500 truncate">Coach: {coach.first_name} {coach.last_name}</p>
                )}
              </div>
            </div>
            <div className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium flex-shrink-0 ${
              boutData.result === 'Win' 
                ? 'bg-green-600/20 text-green-400'
                : 'bg-red-600/20 text-red-400'
            }`}>
              {boutData.result === 'Win' ? '🟢 Win' : '🔴 Loss'}
            </div>
          </div>

          <div className="border-t border-white/10 pt-3 md:pt-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-center">
              <div>
                <p className="text-xs md:text-sm text-gray-400 mb-1">Our Score</p>
                <p className="text-xl md:text-2xl font-bold text-white">{boutData.score_for}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-400 mb-1">Opponent Score</p>
                <p className="text-xl md:text-2xl font-bold text-white">{boutData.score_against}</p>
              </div>
            </div>
          </div>

          {boutData.notes && (
            <div className="border-t border-white/10 pt-3 md:pt-4">
              <p className="text-xs md:text-sm text-gray-400 mb-1 md:mb-2">Notes</p>
              <p className="text-xs md:text-sm text-white break-words">{boutData.notes}</p>
            </div>
          )}
        </div>

        {/* Medal/Round Info */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h4 className="text-white font-medium mb-3 text-sm md:text-base">Round & Medal Information</h4>
          <div className="space-y-2 text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Round:</span>
              <span className="text-white font-medium">{boutData.is_final ? 'Final' : nextRound}</span>
            </div>
            {boutData.medal && (
              <div className="flex justify-between">
                <span className="text-gray-400">Medal Awarded:</span>
                <span className={`font-medium ${
                  boutData.medal === 'Gold' ? 'text-yellow-400' :
                  boutData.medal === 'Silver' ? 'text-gray-300' :
                  'text-orange-400'
                }`}>
                  {boutData.medal === 'Gold' ? '🥇 Gold' :
                   boutData.medal === 'Silver' ? '🥈 Silver' :
                   '🥉 Bronze'}
                </span>
              </div>
            )}
            {!boutData.medal && boutData.result === 'Loss' && (
              <div className="flex justify-between">
                <span className="text-gray-400">Result:</span>
                <span className="text-red-400 font-medium">Eliminated</span>
              </div>
            )}
            {!boutData.medal && boutData.result === 'Win' && !boutData.is_final && (
              <div className="flex justify-between">
                <span className="text-gray-400">Result:</span>
                <span className="text-blue-400 font-medium">Advanced to {nextRound}</span>
              </div>
            )}
          </div>
        </div>
      </div>

          {/* Action Buttons - Optimized for iOS Safari */}
      <div className="flex items-center justify-between pt-4 pb-2 sm:pb-0">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 min-h-[44px] flex items-center justify-center"
        >
          ← Back
        </button>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
            {!isTeamEvent && (
              <button
                onClick={onLogNext}
                disabled={isSubmitting}
                className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 min-h-[44px] flex items-center justify-center"
              >
                Log Next Bout
              </button>
            )}
            
            {isTeamEvent && currentMemberIndex < selectedMembers.length - 1 && (
              <button
                onClick={onNextMember}
                disabled={isSubmitting}
                className="px-4 py-3 text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors duration-200 disabled:opacity-50 min-h-[44px] flex items-center justify-center"
              >
                Next Member →
              </button>
            )}
            
            <button
            onClick={onSubmit}
              disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center min-h-[44px] shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isTeamEvent ? 'Saving Team...' : 'Saving...'}
                </>
              ) : (
              isTeamEvent && currentMemberIndex < selectedMembers.length - 1 
                ? 'Save & Continue' 
                : isTeamEvent 
                  ? 'Save Team Result'
                  : 'Save Result'
              )}
            </button>
          </div>
      </div>
    </div>
  )
}

// Select Team Members Step
function SelectTeamMembersStep({ 
  teams, 
  teamMembers, 
  selectedDiscipline,
  selectedMembers,
  onSelect, 
  onBack
}: {
  teams: CompetitionTeam[]
  teamMembers: CompetitionTeamMember[]
  selectedDiscipline: CompetitionDiscipline | null
  selectedMembers: CompetitionTeamMember[]
  onSelect: (members: CompetitionTeamMember[]) => void
  onBack: () => void
}) {
  // Filter teams for the selected discipline
  const teamsForDiscipline = teams.filter(team => 
    team.competition_disciplines_id === selectedDiscipline?.competition_disciplines_id
  )

  // Get team members for each team
  const getTeamMembers = (teamId: number) => {
    return teamMembers.filter(member => member.competition_teams_id === teamId)
  }

  const handleMemberToggle = (member: CompetitionTeamMember) => {
    const isSelected = selectedMembers.some(m => m.competition_team_members_id === member.competition_team_members_id)
    if (isSelected) {
      onSelect(selectedMembers.filter(m => m.competition_team_members_id !== member.competition_team_members_id))
    } else {
      onSelect([...selectedMembers, member])
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Select Team Members</h3>
        <p className="text-sm sm:text-base text-gray-400">
          Choose multiple team members to log results for in {selectedDiscipline?.name}
        </p>
        {selectedMembers.length > 0 && (
          <p className="text-sm text-blue-400 mt-2">
            {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {teamsForDiscipline.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No teams registered for this discipline yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {teamsForDiscipline.map((team) => {
            const members = getTeamMembers(team.competition_teams_id)
            
            return (
              <div key={team.competition_teams_id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {team.team_name || `Team ${team.competition_teams_id}`}
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((member) => {
                    const memberData = member.member
                    if (!memberData) return null

                    const isSelected = selectedMembers.some(m => m.competition_team_members_id === member.competition_team_members_id)

                    return (
                      <button
                        key={member.competition_team_members_id}
                        onClick={() => handleMemberToggle(member)}
                        className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                          isSelected 
                            ? 'bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {memberData.profile_picture_url ? (
                            <img
                              src={memberData.profile_picture_url}
                              alt={`${memberData.first_name} ${memberData.last_name}`}
                              className="w-8 h-8 rounded-full object-cover border border-white/20"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                              {memberData.first_name?.[0]?.toUpperCase() || 'M'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="text-white font-medium text-sm truncate">
                              {memberData.first_name} {memberData.last_name}
                            </h5>
                            <p className="text-xs text-gray-400">Team Member</p>
                          </div>
                          {isSelected ? (
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-gray-400 rounded-full"></div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
        {selectedMembers.length > 0 && (
          <button
            onClick={() => onSelect(selectedMembers)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            Continue ({selectedMembers.length} selected)
          </button>
        )}
      </div>
    </div>
  )
}

// Team Name Step
function TeamNameStep({
  selectedCompetitors,
  teamName,
  onSubmit,
  onBack
}: {
  selectedCompetitors: CompetitionEntry[]
  teamName: string
  onSubmit: (name: string) => void
  onBack: () => void
}) {
  const [name, setName] = useState(teamName)

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Team Name</h3>
        <p className="text-sm sm:text-base text-gray-400">
          Enter a name for your team with {selectedCompetitors.length} member{selectedCompetitors.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Selected Members Preview */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 className="text-white font-medium mb-3">Team Members:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {selectedCompetitors.map((competitor) => {
            const memberData = competitor.member
            if (!memberData) return null

            return (
              <div key={competitor.competition_entries_id} className="flex items-center space-x-2">
                {memberData.profile_picture_url ? (
                  <img
                    src={memberData.profile_picture_url}
                    alt={`${memberData.first_name} ${memberData.last_name}`}
                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {memberData.first_name?.[0]?.toUpperCase() || 'M'}
                  </div>
                )}
                <span className="text-sm text-white">
                  {memberData.first_name} {memberData.last_name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team Name Input */}
      <div className="space-y-4">
        <div>
          <label htmlFor="teamName" className="block text-sm font-medium text-white mb-2">
            Team Name
          </label>
          <input
            id="teamName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter team name..."
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={50}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors duration-200"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// Team Result Step
function TeamResultStep({
  teamName,
  selectedMembers,
  currentMemberIndex,
  onSubmit,
  onBack
}: {
  teamName: string
  selectedMembers: CompetitionTeamMember[]
  currentMemberIndex: number
  onSubmit: (result: string, medal: string | null) => void
  onBack: () => void
}) {
  const [teamResult, setTeamResult] = useState('')
  const [teamMedal, setTeamMedal] = useState<string | null>(null)

  const handleSubmit = () => {
    if (teamResult) {
      onSubmit(teamResult, teamMedal)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Team Result</h3>
        <p className="text-sm sm:text-base text-gray-400">
          Set the overall result for <span className="text-blue-400 font-medium">{teamName}</span>
        </p>
      </div>

      {/* Team Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 className="text-white font-medium mb-3">Team: {teamName}</h4>
        <p className="text-sm text-gray-400">
          {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} competed
        </p>
      </div>

      {/* Team Result Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-3">Team Result</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTeamResult('Win')}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                teamResult === 'Win'
                  ? 'bg-green-600/20 border-green-500/50 text-green-400'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🏆</div>
                <div className="font-medium">Win</div>
              </div>
            </button>
            <button
              onClick={() => setTeamResult('Loss')}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                teamResult === 'Loss'
                  ? 'bg-red-600/20 border-red-500/50 text-red-400'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">💪</div>
                <div className="font-medium">Loss</div>
              </div>
            </button>
          </div>
        </div>

        {/* Medal Selection */}
        {teamResult && (
          <div>
            <label className="block text-sm font-medium text-white mb-3">Medal Awarded</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTeamMedal('Gold')}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  teamMedal === 'Gold'
                    ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl mb-1">🥇</div>
                  <div className="text-xs font-medium">Gold</div>
                </div>
              </button>
              <button
                onClick={() => setTeamMedal('Silver')}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  teamMedal === 'Silver'
                    ? 'bg-gray-600/20 border-gray-500/50 text-gray-400'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl mb-1">🥈</div>
                  <div className="text-xs font-medium">Silver</div>
                </div>
              </button>
              <button
                onClick={() => setTeamMedal('Bronze')}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  teamMedal === 'Bronze'
                    ? 'bg-orange-600/20 border-orange-500/50 text-orange-400'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl mb-1">🥉</div>
                  <div className="text-xs font-medium">Bronze</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!teamResult}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors duration-200"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// Select Team Member Step
function SelectTeamMemberStep({
  competitors,
  loggedMembers,
  teamName,
  onSelect,
  onNoMoreMembers,
  onBack
}: {
  competitors: CompetitionEntry[]
  loggedMembers: CompetitionEntry[]
  teamName: string
  onSelect: (member: CompetitionEntry) => void
  onNoMoreMembers: () => void
  onBack: () => void
}) {
  // Filter out already logged members
  const availableMembers = competitors.filter(comp => 
    !loggedMembers.some(logged => logged.competition_entries_id === comp.competition_entries_id)
  )

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Select Team Member</h3>
        <p className="text-sm sm:text-base text-gray-400">
          Choose which team member to log a bout for in {teamName}
        </p>
        {loggedMembers.length > 0 && (
          <p className="text-sm text-blue-400 mt-2">
            {loggedMembers.length} member{loggedMembers.length !== 1 ? 's' : ''} already logged
          </p>
        )}
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {availableMembers.map((competitor) => {
          const member = competitor.member
          if (!member) return null

          return (
            <button
              key={competitor.competition_entries_id}
              onClick={() => onSelect(competitor)}
              className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/30 cursor-pointer transition-all duration-200 text-left"
            >
              <div className="flex items-center space-x-3">
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
                  <p className="text-sm text-gray-400 truncate">Team Member</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* No More Members Button */}
      {availableMembers.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onNoMoreMembers}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            No More Team Members to Log
          </button>
        </div>
      )}

      {/* Show message if all members are logged */}
      {availableMembers.length === 0 && loggedMembers.length > 0 && (
        <div className="text-center py-8">
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-green-400 font-medium mb-2">All Team Members Logged!</h4>
            <p className="text-sm text-gray-400 mb-4">
              You&apos;ve logged bouts for all {loggedMembers.length} team members.
            </p>
            <button
              onClick={onNoMoreMembers}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
            >
              Continue to Team Results
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}