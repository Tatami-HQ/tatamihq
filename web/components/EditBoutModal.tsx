'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { handleAuthError } from '@/lib/authUtils'

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

interface Coach {
  members_id: number
  competition_coaches_id: number
  first_name: string | null
  last_name: string | null
  profile_picture_url: string | null
}

interface EditBoutModalProps {
  bout: CompetitionBout | null
  competitor: CompetitionEntry | null
  onClose: () => void
  onSave: (updatedBout: CompetitionBout, updatedResult?: CompetitionResult) => void
}

export default function EditBoutModal({ bout, competitor, onClose, onSave }: EditBoutModalProps) {
  const [formData, setFormData] = useState({
    round: '',
    opponent_name: '',
    opponent_club: '',
    score_for: '',
    score_against: '',
    result: 'Win' as 'Win' | 'Loss',
    medal: null as 'Gold' | 'Silver' | 'Bronze' | null,
    round_reached: '',
    coach_id: null as number | null
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existingResult, setExistingResult] = useState<CompetitionResult | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(false)

  useEffect(() => {
    if (bout && competitor) {
      // Initialize form with existing bout data
      setFormData({
        round: bout.round || '',
        opponent_name: bout.opponent_name || '',
        opponent_club: bout.opponent_club || '',
        score_for: bout.score_for?.toString() || '',
        score_against: bout.score_against?.toString() || '',
        result: bout.result || 'Win',
        medal: null,
        round_reached: '',
        coach_id: competitor.competition_coaches_id
      })
      
      // Fetch existing result and coaches
      fetchExistingResult()
      fetchCoaches()
    }
  }, [bout, competitor])

  const fetchExistingResult = async () => {
    if (!bout?.competition_entries_id) return
    
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select('*')
        .eq('competition_entries_id', bout.competition_entries_id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('[EditBoutModal:fetchExistingResult] Error:', error)
      } else if (data) {
        setExistingResult(data)
        setFormData(prev => ({
          ...prev,
          medal: data.medal,
          round_reached: data.round_reached || ''
        }))
      }
    } catch (error) {
      console.error('[EditBoutModal:fetchExistingResult] Unexpected error:', error)
    }
  }

  const fetchCoaches = async () => {
    if (!competitor?.competitions_id) return
    
    setIsLoadingCoaches(true)
    try {
      // Fetch competition coaches for this specific competition
      const { data: competitionCoachesData, error: competitionCoachesError } = await supabase
        .from('competition_coaches')
        .select('*')
        .eq('competitions_id', competitor.competitions_id)

      if (competitionCoachesError) throw competitionCoachesError

      // Convert competition coaches to Coach interface
      const competitionCoaches: Coach[] = (competitionCoachesData || []).map(coach => {
        // Parse the name field to get first and last name
        const nameParts = (coach.name || 'Coach User').split(' ')
        
        return {
          members_id: coach.members_id || 0,
          competition_coaches_id: coach.competition_coaches_id,
          first_name: nameParts[0] || 'Coach',
          last_name: nameParts.slice(1).join(' ') || 'User',
          profile_picture_url: null
        }
      })

      setCoaches(competitionCoaches)
      console.log('[EditBoutModal:fetchCoaches] Fetched coaches:', competitionCoaches)
    } catch (error) {
      console.error('[EditBoutModal:fetchCoaches] Error:', error)
      setError('Failed to load coaches. Please try again.')
    } finally {
      setIsLoadingCoaches(false)
    }
  }

  // Prevent background scrolling when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const handleInputChange = (field: string, value: string | 'Win' | 'Loss' | 'Gold' | 'Silver' | 'Bronze' | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!bout || !competitor) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!formData.round.trim()) {
        setError('Round is required')
        return
      }
      if (!formData.opponent_name.trim()) {
        setError('Opponent name is required')
        return
      }
      if (!formData.score_for || !formData.score_against) {
        setError('Both scores are required')
        return
      }

      // Update bout record
      const updatedBout: CompetitionBout = {
        ...bout,
        round: formData.round.trim(),
        opponent_name: formData.opponent_name.trim(),
        opponent_club: formData.opponent_club.trim() || null,
        score_for: parseInt(formData.score_for) || 0,
        score_against: parseInt(formData.score_against) || 0,
        result: formData.result
      }

      const { error: boutError } = await supabase
        .from('competition_bouts')
        .update({
          round: updatedBout.round,
          opponent_name: updatedBout.opponent_name,
          opponent_club: updatedBout.opponent_club,
          score_for: updatedBout.score_for,
          score_against: updatedBout.score_against,
          result: updatedBout.result
        })
        .eq('competition_bouts_id', bout.competition_bouts_id)

      if (boutError) throw boutError

      // Update competition entry with new coach if changed
      if (formData.coach_id !== competitor.competition_coaches_id) {
        const { error: entryError } = await supabase
          .from('competition_entries')
          .update({ competition_coaches_id: formData.coach_id })
          .eq('competition_entries_id', competitor.competition_entries_id)

        if (entryError) throw entryError
      }

      // Handle medal/result updates
      let updatedResult: CompetitionResult | undefined = undefined

      if (formData.medal) {
        const resultData = {
          competition_entries_id: competitor.competition_entries_id,
          medal: formData.medal,
          round_reached: formData.round_reached || getRoundReachedForMedal(formData.medal)
        }

        if (existingResult) {
          // Update existing result
          const { error: resultError } = await supabase
            .from('competition_results')
            .update(resultData)
            .eq('competition_results_id', existingResult.competition_results_id)

          if (resultError) throw resultError

          updatedResult = { ...existingResult, ...resultData }
        } else {
          // Create new result
          const { data: newResult, error: resultError } = await supabase
            .from('competition_results')
            .insert([resultData])
            .select()
            .single()

          if (resultError) throw resultError
          updatedResult = newResult
        }
      } else if (existingResult) {
        // Remove existing medal result
        const { error: resultError } = await supabase
          .from('competition_results')
          .delete()
          .eq('competition_results_id', existingResult.competition_results_id)

        if (resultError) throw resultError
      }

      setSuccess('Bout updated successfully! ✅')
      
      // Call onSave callback after a short delay
      setTimeout(() => {
        onSave(updatedBout, updatedResult)
      }, 1500)

    } catch (error) {
      console.error('[EditBoutModal:handleSave] Error:', error)
      
      // Check if it's an auth error
      const sessionCleared = await handleAuthError(error)
      if (sessionCleared) {
        setError('Session expired. Please log in again.')
      } else {
        setError(`Failed to update bout: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const getRoundReachedForMedal = (medal: 'Gold' | 'Silver' | 'Bronze') => {
    switch (medal) {
      case 'Gold': return 'Final'
      case 'Silver': return 'Final'
      case 'Bronze': return 'Semi Final'
      default: return ''
    }
  }

  const handleMedalChange = (medal: 'Gold' | 'Silver' | 'Bronze' | null) => {
    setFormData(prev => ({
      ...prev,
      medal,
      round_reached: medal ? getRoundReachedForMedal(medal) : ''
    }))
  }

  if (!bout || !competitor) return null

  const member = competitor.member

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 sm:bg-black/50 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      <div className="bg-gray-900 w-full h-full sm:rounded-lg sm:max-h-[90vh] sm:max-w-2xl sm:w-full sm:h-auto border border-white/10 overflow-y-auto overflow-x-hidden pt-12 pb-8 sm:pt-0 sm:pb-0" style={{ touchAction: 'pan-y', overscrollBehavior: 'contain', paddingBottom: 'env(safe-area-inset-bottom, 1.5rem)' }}>
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-lg font-semibold text-white truncate">
                Edit Bout Result
              </h2>
              <p className="text-sm text-gray-400 truncate">
                {member?.first_name} {member?.last_name}
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

            {/* Competitor Info */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
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
                  <h4 className="text-white font-medium text-lg">
                    {member?.first_name} {member?.last_name}
                  </h4>
                  <p className="text-sm text-gray-400">Competitor</p>
                </div>
              </div>
            </div>

            {/* Coach Selection */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
              <h4 className="text-white font-medium mb-3">Coach</h4>
              {isLoadingCoaches ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-gray-400 text-sm">Loading coaches...</span>
                </div>
              ) : coaches.length === 0 ? (
                <p className="text-gray-400 text-sm">No coaches available for this competition</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coaches.map((coach) => (
                    <button
                      key={coach.competition_coaches_id}
                      onClick={() => handleInputChange('coach_id', coach.competition_coaches_id)}
                      className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                        formData.coach_id === coach.competition_coaches_id
                          ? 'bg-blue-600/20 border-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {coach.first_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-white font-medium text-sm truncate">
                            {coach.first_name} {coach.last_name}
                          </h5>
                        </div>
                        {formData.coach_id === coach.competition_coaches_id && (
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Round */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Round
                </label>
                <input
                  type="text"
                  value={formData.round}
                  onChange={(e) => handleInputChange('round', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1st Round, Semi Final, Final"
                />
              </div>

              {/* Opponent Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Opponent Name
                  </label>
                  <input
                    type="text"
                    value={formData.opponent_name}
                    onChange={(e) => handleInputChange('opponent_name', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Opponent's name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Opponent Club
                  </label>
                  <input
                    type="text"
                    value={formData.opponent_club}
                    onChange={(e) => handleInputChange('opponent_club', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Opponent's club"
                  />
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Our Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.score_for}
                    onChange={(e) => handleInputChange('score_for', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Opponent Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.score_against}
                    onChange={(e) => handleInputChange('score_against', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Result */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Result
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleInputChange('result', 'Win')}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      formData.result === 'Win'
                        ? 'bg-green-600/20 border-green-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🟢</div>
                      <div className="text-green-400 font-semibold">Win</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleInputChange('result', 'Loss')}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      formData.result === 'Loss'
                        ? 'bg-red-600/20 border-red-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🔴</div>
                      <div className="text-red-400 font-semibold">Loss</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Medal */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Medal Awarded (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleMedalChange('Gold')}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      formData.medal === 'Gold'
                        ? 'bg-yellow-600/20 border-yellow-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🥇</div>
                      <div className="text-yellow-400 font-semibold">Gold</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleMedalChange('Silver')}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      formData.medal === 'Silver'
                        ? 'bg-gray-600/20 border-gray-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🥈</div>
                      <div className="text-gray-300 font-semibold">Silver</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleMedalChange('Bronze')}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      formData.medal === 'Bronze'
                        ? 'bg-orange-600/20 border-orange-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🥉</div>
                      <div className="text-orange-400 font-semibold">Bronze</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleMedalChange(null)}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      formData.medal === null
                        ? 'bg-gray-600/20 border-gray-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">❌</div>
                      <div className="text-gray-300 font-semibold">No Medal</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 min-h-[44px] flex items-center justify-center"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center min-h-[44px] shadow-lg"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
