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

interface BoutData {
  opponent_name: string
  opponent_club: string
  score_for: string
  score_against: string
  result: 'Win' | 'Loss'
  is_final: boolean
  medal: 'Gold' | 'Silver' | 'Bronze' | null
  notes: string
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
}

type LogStep = 'select_discipline' | 'select_competitor' | 'select_coach' | 'step_in_coach' | 'win_loss' | 'scores' | 'win_final' | 'loss_medal' | 'confirm_result'

export default function LogResultsModal({ competition, onClose, onLogResults }: LogResultsModalProps) {
  const [currentStep, setCurrentStep] = useState<LogStep>('select_discipline')
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([])
  const [competitionDisciplines, setCompetitionDisciplines] = useState<CompetitionDiscipline[]>([])
  const [existingBouts, setExistingBouts] = useState<CompetitionBout[]>([])
  const [existingResults, setExistingResults] = useState<CompetitionResult[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [currentUser, setCurrentUser] = useState<Coach | null>(null)
  const [stepInSearchQuery, setStepInSearchQuery] = useState('')
  const [members, setMembers] = useState<Array<{id: number, name: string, email: string, type: 'member' | 'profile', profile_picture_url: string | null}>>([])
  
  // Form data
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitionEntry | null>(null)
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState<CompetitionDiscipline | null>(null)
  const [boutData, setBoutData] = useState({
    opponent_name: '',
    opponent_club: '',
    score_for: '',
    score_against: '',
    result: 'Win' as 'Win' | 'Loss',
    is_final: false,
    medal: null as 'Gold' | 'Silver' | 'Bronze' | null,
    notes: ''
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

      // Also fetch members as potential jump-in coaches
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('members_id, first_name, last_name, profile_picture_url')
        .order('first_name')

      if (membersError) throw membersError

      const memberCoaches: Coach[] = (membersData || []).map(member => ({
        members_id: member.members_id,
        competition_coaches_id: 0, // Will be assigned when added to competition
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        profile_picture_url: member.profile_picture_url || null
      }))

      // Note: Only fetching members for step-in coach selection since we only support members_id

      // const profileCoaches: Coach[] = (profilesData || []).map(profile => ({
      //   members_id: profile.profiles_id, // Using profiles_id as identifier
      //   first_name: profile.first_name || '',
      //   last_name: profile.last_name || '',
      //   profile_picture_url: profile.profile_picture_url
      // }))

      // Use only competition coaches as the main coach list
      const uniqueCoaches = [...competitionCoaches]

      // Set members for step-in coach selection (only members since we only support members_id)
      const stepInOptions = (membersData || []).map(member => ({
        id: member.members_id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unnamed Member',
        email: '', // Members don't have email in this context
        type: 'member' as const,
        profile_picture_url: member.profile_picture_url
      }))

      setMembers(stepInOptions)

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

      setCompetitionEntries(entriesData || [])
      setCompetitionDisciplines(disciplinesData || [])
      setCoaches(uniqueCoaches)
      setExistingBouts(boutsData || [])
      setExistingResults(resultsData || [])

      console.log('[LogResultsModal:fetchData] Coach data summary:', {
        competitionCoachesCount: competitionCoaches.length,
        memberCoachesCount: memberCoaches.length,
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
    setSelectedCompetitor(entry)
    setCurrentStep('select_coach')
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
      setCurrentStep('win_loss')
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
    setCurrentStep('scores')
  }

  const handleScoresNext = () => {
    if (boutData.score_for && boutData.score_against) {
      if (boutData.result === 'Win') {
        setCurrentStep('win_final')
      } else {
        setCurrentStep('loss_medal')
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
      case 'select_coach':
        setCurrentStep('select_competitor')
        break
      case 'step_in_coach':
        setCurrentStep('select_coach')
        break
      case 'win_loss':
        setCurrentStep('select_coach')
        break
      case 'scores':
        setCurrentStep('win_loss')
        break
      case 'win_final':
        setCurrentStep('scores')
        break
      case 'loss_medal':
        setCurrentStep('scores')
        break
      case 'confirm_result':
        if (boutData.result === 'Win') {
          setCurrentStep('win_final')
        } else {
          setCurrentStep('loss_medal')
        }
        break
    }
  }

  const handleSubmitBout = async () => {
    if (!selectedCompetitor || !competition || !selectedCoach) {
      console.error('[LogResultsModal:handleSubmitBout] Missing required data:', {
        selectedCompetitor: !!selectedCompetitor,
        competition: !!competition,
        selectedCoach: !!selectedCoach
      })
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      console.log('[LogResultsModal:handleSubmitBout] Starting submission with data:', {
        selectedCompetitor: selectedCompetitor.competition_entries_id,
        selectedCoach: selectedCoach.members_id,
        boutData: boutData,
        competition: competition.competitions_id
      })

      // Validate required fields
      if (!selectedCompetitor.competition_entries_id) {
        throw new Error('Competitor entry ID is missing')
      }
      if (!competition.clubs_id) {
        throw new Error('Competition club ID is missing')
      }
      if (!boutData.result) {
        throw new Error('Bout result is missing')
      }

      const nextRound = getNextRound(selectedCompetitor.competition_entries_id)
      
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
      
      // Insert bout record
      const boutInsertData = {
        competition_entries_id: selectedCompetitor.competition_entries_id,
        clubs_id: competition.clubs_id,
        location_id: null, // Can be set later if needed
        round: nextRound, // Use numbered rounds, Final/Semi Final determined by medal colors
        opponent_name: boutData.opponent_name.trim() || 'Unknown Opponent',
        opponent_club: boutData.opponent_club.trim() || null,
        score_for: parseInt(boutData.score_for) || 0,
        score_against: parseInt(boutData.score_against) || 0,
        result: boutData.result
        // Note: competition_coaches_id is not part of the competition_bouts table schema
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

        const medalInsertData = {
          competition_entries_id: selectedCompetitor.competition_entries_id,
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

        console.log('[LogResultsModal:handleSubmitBout] Medal inserted successfully')
      }

      setSuccess('Result logged successfully! ✅')
      
      // Reset form and refresh data
      setTimeout(() => {
        resetForm()
        fetchData()
      }, 1500)

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
    setSelectedCoach(currentUser) // Reset to current user
    setSelectedDiscipline(null)
    setStepInSearchQuery('')
    setBoutData({
      opponent_name: '',
      opponent_club: '',
      score_for: '',
      score_against: '',
      result: 'Win',
      is_final: false,
      medal: null,
      notes: ''
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
    <div className="fixed inset-0 bg-gray-900 z-50 sm:bg-black/50 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="bg-gray-900 w-full h-full sm:rounded-lg sm:max-h-[90vh] sm:max-w-4xl sm:w-full sm:h-auto border border-white/10 overflow-hidden pt-12 pb-6 sm:pt-0 sm:pb-0">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-lg font-semibold text-white truncate">
                Log Bout Result
              </h2>
              <p className="text-sm text-gray-400 truncate">
                {competition.Name} - Step {getStepNumber(currentStep)} of 6
              </p>
            </div>
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

        {/* Progress Bar */}
        <div className="px-4 sm:px-6 py-2 border-b border-white/10">
          <div className="flex items-center justify-center space-x-1 sm:space-x-2">
            {['select_discipline', 'select_competitor', 'select_coach', 'win_loss', 'scores', 'confirm_result'].map((step, index) => (
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
                onSelect={handleCompetitorSelect}
                getCompetitorWins={getCompetitorWins}
                getCompetitorLosses={getCompetitorLosses}
                getTotalBouts={getTotalBouts}
                getCompetitorStatus={getCompetitorStatus}
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
              />
            )}

            {currentStep === 'scores' && (
              <ScoresStep
                competitor={selectedCompetitor}
                boutData={boutData}
                setBoutData={setBoutData}
                onNext={handleScoresNext}
                onBack={handleBackStep}
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
  const steps = ['select_discipline', 'select_competitor', 'select_coach', 'win_loss', 'scores', 'win_final', 'loss_medal', 'confirm_result']
  return steps.indexOf(step) + 1
}

// Step Components
function SelectCompetitorStep({ 
  competitors, 
  selectedDiscipline,
  onSelect, 
  getCompetitorWins, 
  getCompetitorLosses, 
  getTotalBouts,
  getCompetitorStatus,
  onBack
}: {
  competitors: CompetitionEntry[]
  selectedDiscipline: CompetitionDiscipline | null
  onSelect: (competitor: CompetitionEntry) => void
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
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Select Competitor</h3>
        <p className="text-sm sm:text-base text-gray-400">
          Choose which competitor to log a result for in {selectedDiscipline?.name}
        </p>
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

          return (
            <button
              key={entry.competition_entries_id}
              onClick={() => !isEliminated && onSelect(entry)}
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
          <p>No competitors found matching "{searchQuery}".</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            Clear search
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
            <p className="text-sm mt-1">Use "Select from Members & Profiles" below to add coaches.</p>
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
          <p>No members or profiles found matching "{searchQuery}"</p>
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
  onBack 
}: {
  competitor: CompetitionEntry | null
  coach: Coach | null
  onSelect: (result: 'Win' | 'Loss') => void
  onBack: () => void
}) {
  const member = competitor?.member

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Result</h3>
        <p className="text-sm sm:text-base text-gray-400">Did the competitor win or lose?</p>
      </div>

      {/* Competitor & Coach Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
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
              <p className="text-sm text-gray-400">Competitor</p>
            </div>
          </div>
          
          {coach && (
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
  onBack 
}: {
  competitor: CompetitionEntry | null
  boutData: BoutData
  setBoutData: (data: BoutData) => void
  onNext: () => void
  onBack: () => void
}) {
  const member = competitor?.member

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Bout Scores</h3>
        <p className="text-sm sm:text-base text-gray-400">Enter the bout scores</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white/5 rounded-xl p-4 md:p-5 border border-white/10 space-y-4 md:space-y-5">
          <h4 className="text-white font-semibold text-center text-base md:text-lg">Our Score</h4>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={boutData.score_for}
            onChange={(e) => setBoutData({...boutData, score_for: e.target.value})}
            className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-4 md:py-5 text-white text-center text-2xl md:text-3xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="0"
            min="0"
            autoFocus
          />
          
          {/* Notes under our score */}
          <div className="mt-4 md:mt-6">
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2 md:mb-3">
              Notes (Optional)
            </label>
            <textarea
              value={boutData.notes}
              onChange={(e) => setBoutData({...boutData, notes: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              placeholder="Any additional notes about the bout..."
              rows={2}
            />
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 md:p-5 border border-white/10 space-y-4 md:space-y-5">
          <h4 className="text-white font-semibold text-center text-base md:text-lg">Opponent Score</h4>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={boutData.score_against}
            onChange={(e) => setBoutData({...boutData, score_against: e.target.value})}
            className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-4 md:py-5 text-white text-center text-2xl md:text-3xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="0"
            min="0"
          />
          
          {/* Opponent details under opponent score */}
          <div className="space-y-3 md:space-y-4 mt-4 md:mt-6">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                Opponent Name
              </label>
              <input
                type="text"
                value={boutData.opponent_name}
                onChange={(e) => setBoutData({...boutData, opponent_name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Opponent's name..."
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                Opponent Club
              </label>
              <input
                type="text"
                value={boutData.opponent_club}
                onChange={(e) => setBoutData({...boutData, opponent_club: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
        >
          ← Back
        </button>
        
        <button
          onClick={onNext}
          disabled={!boutData.score_for || !boutData.score_against}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
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
  getNextRound
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
}) {
  const member = competitor?.member
  const nextRound = competitor ? getNextRound(competitor.competition_entries_id) : null

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Confirm Result</h3>
        <p className="text-sm sm:text-base text-gray-400">Review and submit the bout result</p>
      </div>

      {/* Bout Summary */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {member?.profile_picture_url ? (
              <img
                src={member.profile_picture_url}
                alt={`${member.first_name} ${member.last_name}`}
                className="w-12 h-12 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {member?.first_name?.[0]?.toUpperCase() || 'M'}
              </div>
            )}
            <div>
              <h4 className="text-white font-medium">
                {member?.first_name} {member?.last_name}
              </h4>
              <p className="text-sm text-gray-400">{discipline?.name}</p>
              {coach && (
                <p className="text-xs text-gray-500">Coach: {coach.first_name} {coach.last_name}</p>
              )}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            boutData.result === 'Win' 
              ? 'bg-green-600/20 text-green-400'
              : 'bg-red-600/20 text-red-400'
          }`}>
            {boutData.result === 'Win' ? '🟢 Win' : '🔴 Loss'}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-400 mb-1">Our Score</p>
              <p className="text-2xl font-bold text-white">{boutData.score_for}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Opponent Score</p>
              <p className="text-2xl font-bold text-white">{boutData.score_against}</p>
            </div>
          </div>
        </div>

        {boutData.notes && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-sm text-gray-400 mb-2">Notes</p>
            <p className="text-white">{boutData.notes}</p>
          </div>
        )}
      </div>

      {/* Medal/Round Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 className="text-white font-medium mb-3">Round & Medal Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Round:</span>
            <span className="text-white">{boutData.is_final ? 'Final' : nextRound}</span>
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

          {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50"
        >
          ← Back
        </button>
        
        <div className="flex items-center space-x-3">
            <button
            onClick={onLogNext}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50"
          >
            Log Next Bout
            </button>
            
            <button
            onClick={onSubmit}
              disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
                </>
              ) : (
              'Save Result'
              )}
            </button>
          </div>
      </div>
    </div>
  )
}