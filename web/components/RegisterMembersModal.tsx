'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Competition } from '../app/competitions/page'

interface Member {
  members_id: number
  first_name: string | null
  last_name: string | null
  email_address: string | null
  profile_picture_url: string | null
}

interface CompetitionDiscipline {
  competition_disciplines_id: number
  name: string | null
  martial_art_id: number | null
  team_event: boolean | null
}

interface CompetitionEntry {
  competition_entries_id: number
  competitions_id: number | null
  competition_disciplines_id: number | null
  members_id: number | null
  competition_coaches_id: number | null
  created_at: string
}

interface RegisterMembersModalProps {
  competition: Competition | null
  onClose: () => void
  onRegisterMembers: (entries: Array<{
    competitions_id: number
    competition_disciplines_id: number | null
    members_id: number
    competition_coaches_id: number | null
  }>) => Promise<void>
}

export default function RegisterMembersModal({ competition, onClose, onRegisterMembers }: RegisterMembersModalProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [competitionDisciplines, setCompetitionDisciplines] = useState<CompetitionDiscipline[]>([])
  const [existingEntries, setExistingEntries] = useState<CompetitionEntry[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set())
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(null)
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (competition) {
      fetchData()
    }
  }, [competition])

  const fetchData = async () => {
    if (!competition) return

    setIsLoading(true)
    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('members_id, first_name, last_name, email_address, profile_picture_url')
        .order('first_name')

      if (membersError) throw membersError

      // Fetch competition disciplines
      const { data: disciplinesData, error: disciplinesError } = await supabase
        .from('competition_disciplines')
        .select('competition_disciplines_id, name, martial_art_id, team_event')

      if (disciplinesError) throw disciplinesError

      // Fetch existing entries for this competition
      const { data: entriesData, error: entriesError } = await supabase
        .from('competition_entries')
        .select('*')
        .eq('competitions_id', competition.competitions_id)

      if (entriesError) throw entriesError

      setMembers(membersData || [])
      setCompetitionDisciplines(disciplinesData || [])
      setExistingEntries(entriesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMemberToggle = (memberId: number) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.members_id)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!competition || selectedMembers.size === 0) return

    setIsSubmitting(true)
    setError('')

    try {
      const entries = Array.from(selectedMembers).map(memberId => ({
        competitions_id: competition.competitions_id,
        competition_disciplines_id: selectedDiscipline,
        members_id: memberId,
        competition_coaches_id: selectedCoach
      }))

      await onRegisterMembers(entries)
      onClose()
    } catch (error) {
      console.error('Error registering members:', error)
      setError('Failed to register members. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredMembers = members.filter(member => {
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase()
    const email = member.email_address?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  const isMemberAlreadyRegistered = (memberId: number) => {
    return existingEntries.some(entry => entry.members_id === memberId)
  }

  if (!competition) return null

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 rounded-lg border border-white/10 p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-white">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Register Members for Competition
              </h2>
              <p className="text-sm text-gray-400">
                Select members to register for: <span className="text-white font-medium">{competition.Name}</span>
              </p>
            </div>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Competition Info */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center space-x-4">
                  {competition.competition_profile_picture && (
                    <img
                      src={competition.competition_profile_picture}
                      alt={competition.Name || 'Competition'}
                      className="w-12 h-12 rounded-lg object-cover border border-white/20"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{competition.Name}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-1">
                      {competition.date_start && (
                        <span>📅 {new Date(competition.date_start).toLocaleDateString()}</span>
                      )}
                      {competition.location && (
                        <span>📍 {competition.location}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Competition Discipline */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Competition Discipline (Optional)
                  </label>
                  <select
                    value={selectedDiscipline || ''}
                    onChange={(e) => setSelectedDiscipline(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="" className="bg-gray-800">Select discipline (optional)</option>
                    {competitionDisciplines.map((discipline) => (
                      <option key={discipline.competition_disciplines_id} value={discipline.competition_disciplines_id} className="bg-gray-800">
                        {discipline.name} {discipline.team_event && '(Team Event)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coach Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Coach (Optional)
                  </label>
                  <select
                    value={selectedCoach || ''}
                    onChange={(e) => setSelectedCoach(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="" className="bg-gray-800">Select coach (optional)</option>
                    {/* TODO: Add coach selection when competition_coaches table is available */}
                  </select>
                </div>
              </div>

              {/* Member Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Select Members</h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">
                      {selectedMembers.size} of {filteredMembers.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200"
                    >
                      {selectedMembers.size === filteredMembers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div>
                  <input
                    type="text"
                    placeholder="Search members by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Member List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredMembers.map((member) => {
                    const isRegistered = isMemberAlreadyRegistered(member.members_id)
                    const isSelected = selectedMembers.has(member.members_id)
                    
                    return (
                      <div
                        key={member.members_id}
                        className={`p-4 rounded-lg border transition-colors duration-200 ${
                          isRegistered
                            ? 'bg-green-900/20 border-green-500/30'
                            : isSelected
                            ? 'bg-blue-900/20 border-blue-500/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleMemberToggle(member.members_id)}
                            disabled={isRegistered}
                            className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          
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
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">
                                {member.first_name} {member.last_name}
                              </span>
                              {isRegistered && (
                                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                  Already Registered
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{member.email_address}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {filteredMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p>No members found matching your search.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-white/10">
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting || selectedMembers.size === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registering...
                  </>
                ) : (
                  `Register ${selectedMembers.size} Member${selectedMembers.size !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
