'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Competition } from '../app/competitions/page'

interface AddCompetitionModalProps {
  onClose: () => void
  onAddCompetition: (competitionData: Omit<Competition, 'competitions_id' | 'created_at'>) => Promise<void>
  editingCompetition?: Competition | null
  onDeleteCompetition?: (competitionId: number) => Promise<void>
}

export default function AddCompetitionModal({ onClose, onAddCompetition, editingCompetition, onDeleteCompetition }: AddCompetitionModalProps) {
  const isEditing = !!editingCompetition
  const [activeTab, setActiveTab] = useState<'details' | 'entries' | 'staff'>('details')
  const [isEditMode, setIsEditMode] = useState(!editingCompetition) // Default to view mode for editing, edit mode for adding
  const [formData, setFormData] = useState({
    Name: editingCompetition?.Name || '',
    date_start: editingCompetition?.date_start || '',
    date_end: editingCompetition?.date_end || '',
    singular_day_event: editingCompetition?.singular_day_event ?? true,
    location: editingCompetition?.location || '',
    competition_profile_picture: editingCompetition?.competition_profile_picture || '',
    competition_downloads: editingCompetition?.competition_downloads || ''
  })
  const [entries, setEntries] = useState<Array<{id: string, name: string, category: string}>>([])
  const [staff, setStaff] = useState<Array<{id: string, name: string, role: string}>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(editingCompetition?.competition_profile_picture || null)
  
  // Bulk entry state
  const [competitionDisciplines, setCompetitionDisciplines] = useState<Array<{id: number, name: string, team_event: boolean}>>([])
  const [members, setMembers] = useState<Array<{id: number, name: string, email: string}>>([])
  const [selectedDisciplines, setSelectedDisciplines] = useState<Set<number>>(new Set())
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set())
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [disciplineSearchQuery, setDisciplineSearchQuery] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [fightUpSelections, setFightUpSelections] = useState<Set<string>>(new Set()) // Format: "memberId-disciplineId"

  // Fetch disciplines and members when entries tab is active
  useEffect(() => {
    if (activeTab === 'entries') {
      fetchData()
    }
  }, [activeTab])

  const fetchData = async () => {
    setIsLoadingData(true)
    try {
      // Fetch competition disciplines
      const { data: disciplinesData, error: disciplinesError } = await supabase
        .from('competition_disciplines')
        .select('competition_disciplines_id, name, team_event')
        .order('name')

      if (disciplinesError) throw disciplinesError

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('members_id, first_name, last_name, email_address')
        .order('first_name')

      if (membersError) throw membersError

      setCompetitionDisciplines(
        disciplinesData?.map(d => ({
          id: d.competition_disciplines_id,
          name: d.name || 'Unnamed Discipline',
          team_event: d.team_event || false
        })) || []
      )

      setMembers(
        membersData?.map(m => ({
          id: m.members_id,
          name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unnamed Member',
          email: m.email_address || ''
        })) || []
      )

      // Fetch existing entries if editing a competition
      if (editingCompetition) {
        const { data: entriesData, error: entriesError } = await supabase
          .from('competition_entries')
          .select(`
            competition_entries_id,
            competition_disciplines_id,
            members_id,
            competition_disciplines!inner(name),
            members!inner(first_name, last_name)
          `)
          .eq('competitions_id', editingCompetition.competitions_id)

        if (entriesError) throw entriesError

        const existingEntries = entriesData?.map(entry => ({
          id: `existing-${entry.competition_entries_id}`,
          name: `${(entry.members as any)?.first_name || ''} ${(entry.members as any)?.last_name || ''}`.trim() || 'Unnamed Member',
          category: (entry.competition_disciplines as any)?.name || 'Unnamed Discipline'
        })) || []

        setEntries(existingEntries)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleDisciplineToggle = (disciplineId: number) => {
    const newSelected = new Set(selectedDisciplines)
    if (newSelected.has(disciplineId)) {
      newSelected.delete(disciplineId)
    } else {
      newSelected.add(disciplineId)
    }
    setSelectedDisciplines(newSelected)
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

  const handleSelectAllDisciplines = () => {
    const allFilteredDisciplinesSelected = filteredDisciplines.every(d => selectedDisciplines.has(d.id))
    if (allFilteredDisciplinesSelected) {
      // Remove all filtered disciplines from selection
      const newSelected = new Set(selectedDisciplines)
      filteredDisciplines.forEach(d => newSelected.delete(d.id))
      setSelectedDisciplines(newSelected)
    } else {
      // Add all filtered disciplines to selection
      const newSelected = new Set(selectedDisciplines)
      filteredDisciplines.forEach(d => newSelected.add(d.id))
      setSelectedDisciplines(newSelected)
    }
  }

  const handleSelectAllMembers = () => {
    const allFilteredMembersSelected = filteredMembers.every(m => selectedMembers.has(m.id))
    if (allFilteredMembersSelected) {
      // Remove all filtered members from selection
      const newSelected = new Set(selectedMembers)
      filteredMembers.forEach(m => newSelected.delete(m.id))
      setSelectedMembers(newSelected)
    } else {
      // Add all filtered members to selection
      const newSelected = new Set(selectedMembers)
      filteredMembers.forEach(m => newSelected.add(m.id))
      setSelectedMembers(newSelected)
    }
  }

  const handleBulkEntry = async () => {
    if (selectedDisciplines.size === 0 || selectedMembers.size === 0) {
      alert('Please select at least one discipline and one member')
      return
    }

    if (!editingCompetition) {
      alert('Cannot add entries to a new competition. Please save the competition first.')
      return
    }

    try {
      // Create entries for all combinations to save to database
      const entriesToSave: Array<{
        competitions_id: number
        competition_disciplines_id: number | null
        members_id: number
        competition_coaches_id: number | null
      }> = []
      
      // Add regular entries (member × discipline combinations)
      selectedDisciplines.forEach(disciplineId => {
        selectedMembers.forEach(memberId => {
          entriesToSave.push({
            competitions_id: editingCompetition.competitions_id,
            competition_disciplines_id: disciplineId,
            members_id: memberId,
            competition_coaches_id: null // TODO: Add coach selection if needed
          })
        })
      })

      // Add fight up entries
      fightUpSelections.forEach(combinationKey => {
        const [memberId, disciplineId] = combinationKey.split('-').map(Number)
        entriesToSave.push({
          competitions_id: editingCompetition.competitions_id,
          competition_disciplines_id: disciplineId,
          members_id: memberId,
          competition_coaches_id: null // TODO: Add coach selection if needed
        })
      })

      // Save to database
      const { data, error } = await supabase
        .from('competition_entries')
        .insert(entriesToSave)
        .select()

      if (error) {
        console.error('Error saving competition entries:', error)
        alert('Failed to save entries. Please try again.')
        return
      }

      // Create display entries for the UI
      const newEntries: Array<{id: string, name: string, category: string}> = []
      
      // Add regular entries
      selectedDisciplines.forEach(disciplineId => {
        const discipline = competitionDisciplines.find(d => d.id === disciplineId)
        selectedMembers.forEach(memberId => {
          const member = members.find(m => m.id === memberId)
          if (discipline && member) {
            newEntries.push({
              id: `${disciplineId}-${memberId}-${Date.now()}`,
              name: member.name,
              category: discipline.name
            })
          }
        })
      })

      // Add fight up entries
      fightUpSelections.forEach(combinationKey => {
        const [memberId, disciplineId] = combinationKey.split('-').map(Number)
        const discipline = competitionDisciplines.find(d => d.id === disciplineId)
        const member = members.find(m => m.id === memberId)
        if (discipline && member) {
          newEntries.push({
            id: `fightup-${disciplineId}-${memberId}-${Date.now()}`,
            name: `${member.name} (Fight Up)`,
            category: discipline.name
          })
        }
      })

      setEntries(prev => [...prev, ...newEntries])
      setSelectedDisciplines(new Set())
      setSelectedMembers(new Set())
      setFightUpSelections(new Set())
      
      // Clear search queries
      setDisciplineSearchQuery('')
      setMemberSearchQuery('')
      
      alert(`Successfully added ${entriesToSave.length} entries to the competition!`)
    } catch (error) {
      console.error('Unexpected error saving entries:', error)
      alert('An unexpected error occurred. Please try again.')
    }
  }

  // Filter disciplines and members based on search queries
  const filteredDisciplines = competitionDisciplines.filter(discipline =>
    discipline.name.toLowerCase().includes(disciplineSearchQuery.toLowerCase())
  )

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  )

  // Check if member is already entered in a discipline (excluding fight up selections)
  const isMemberAlreadyInDiscipline = (memberId: number, disciplineId: number) => {
    // Check existing entries
    const existingEntry = entries.some(entry => {
      // Extract member and discipline info from existing entries
      // This is a simplified check - in a real implementation you'd want to track this more precisely
      return entry.name && entry.category
    })
    
    // Check if this combination is already selected (excluding fight up)
    const combinationKey = `${memberId}-${disciplineId}`
    return selectedMembers.has(memberId) && selectedDisciplines.has(disciplineId) && !fightUpSelections.has(combinationKey)
  }

  // Handle fight up selection
  const handleFightUpToggle = (memberId: number, disciplineId: number) => {
    const combinationKey = `${memberId}-${disciplineId}`
    const newFightUpSelections = new Set(fightUpSelections)
    
    if (newFightUpSelections.has(combinationKey)) {
      newFightUpSelections.delete(combinationKey)
    } else {
      newFightUpSelections.add(combinationKey)
    }
    
    setFightUpSelections(newFightUpSelections)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.Name.trim()) {
        setError('Competition name is required')
        setIsSubmitting(false)
        return
      }

      if (!formData.date_start) {
        setError('Competition start date is required')
        setIsSubmitting(false)
        return
      }

      // Convert form data to proper types
      let competitionData = {
        Name: formData.Name.trim(),
        date_start: formData.date_start,
        date_end: formData.date_end || null,
        singular_day_event: formData.singular_day_event,
        location: formData.location.trim() || null,
        clubs_id: null,
        martial_art_id: null,
        organisations_id: null,
        competition_profile_picture: formData.competition_profile_picture || null,
        competition_downloads: formData.competition_downloads.trim() || null,
        overall_rank: null,
        total_gold: null,
        total_silver: null,
        total_bronze: null
      }

      // If there's a new image, convert it to data URL
      if (profileImage) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string
          competitionData.competition_profile_picture = dataUrl
          await onAddCompetition(competitionData)
        }
        reader.readAsDataURL(profileImage)
      } else {
        await onAddCompetition(competitionData)
      }
    } catch (error) {
      console.error('[AddCompetitionModal:handleSubmit] Error adding competition:', error)
      setError('Failed to add competition. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { 
        ...prev, 
        [field]: value 
      }
      
      // Clear end date if singular day event is checked
      if (field === 'singular_day_event' && value === true) {
        newData.date_end = ''
      }
      
      return newData
    })
    if (error) setError('') // Clear error when user starts typing
  }

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
  }

  const removeImage = () => {
    setProfileImage(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, competition_profile_picture: '' }))
  }

  // Entry management functions
  const addEntry = () => {
    const newEntry = {
      id: Date.now().toString(),
      name: '',
      category: ''
    }
    setEntries(prev => [...prev, newEntry])
  }

  const updateEntry = (id: string, field: 'name' | 'category', value: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ))
  }

  const removeEntry = async (id: string) => {
    // If it's an existing entry, remove it from the database
    if (id.startsWith('existing-') && editingCompetition) {
      const entryId = parseInt(id.replace('existing-', ''))
      try {
        const { error } = await supabase
          .from('competition_entries')
          .delete()
          .eq('competition_entries_id', entryId)

        if (error) {
          console.error('Error removing entry from database:', error)
          alert('Failed to remove entry. Please try again.')
          return
        }
      } catch (error) {
        console.error('Unexpected error removing entry:', error)
        alert('An unexpected error occurred. Please try again.')
        return
      }
    }

    setEntries(prev => prev.filter(entry => entry.id !== id))
  }

  // Staff management functions
  const addStaff = () => {
    const newStaff = {
      id: Date.now().toString(),
      name: '',
      role: ''
    }
    setStaff(prev => [...prev, newStaff])
  }

  const updateStaff = (id: string, field: 'name' | 'role', value: string) => {
    setStaff(prev => prev.map(member => 
      member.id === id ? { ...member, [field]: value } : member
    ))
  }

  const removeStaff = (id: string) => {
    setStaff(prev => prev.filter(member => member.id !== id))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? 'Competition Details' : 'Add New Competition'}
            </h2>
            <div className="flex items-center space-x-3">
              {/* Live Analytics Line Graph - Small in navbar */}
              {isEditing && (
                <div className="flex items-center space-x-2 bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-1">
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
                </div>
              )}
              {isEditing && !isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200"
                >
                  Edit Details
                </button>
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
          
          {/* Tabs */}
          <div className="flex space-x-1 mt-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === 'details'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('entries')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === 'entries'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Entries
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === 'staff'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Staff
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Large Profile Picture with Competition Name Overlay */}
              <div className="relative bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                {/* Large Background Image with Dimmed Overlay */}
                {imagePreview && (
                  <div className="absolute inset-0 z-0">
                    <img
                      src={imagePreview}
                      alt="Competition background"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50"></div>
                  </div>
                )}
                
                {/* Fallback gradient background */}
                {!imagePreview && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-600/30"></div>
                )}

                {/* Content Overlay */}
                <div className="relative z-10 p-6 h-48 flex flex-col justify-between">
                  <div>
                    <label htmlFor="Name" className="block text-sm font-medium text-gray-300 mb-2">
                      Competition Name *
                    </label>
                    <input
                      type="text"
                      id="Name"
                      value={formData.Name}
                      onChange={(e) => handleChange('Name', e.target.value)}
                      className={`w-full border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isEditMode ? 'bg-black/30 backdrop-blur-sm' : 'bg-white/5 cursor-not-allowed'
                      }`}
                      placeholder="Enter competition name"
                      required
                      disabled={!isEditMode}
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="cursor-pointer bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-medium hover:bg-black/40 transition-colors duration-200">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {imagePreview ? 'Change Image' : 'Upload Image'}
                    </label>
                    
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="bg-red-600/80 hover:bg-red-600 backdrop-blur-sm border border-red-400/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Date Fields */}
              <div className="space-y-4">
                {/* Start and End Date Fields Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label htmlFor="date_start" className="block text-sm font-medium text-gray-300 mb-2">
                      Start Date *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="date_start"
                        name="date_start"
                        value={formData.date_start}
                        onChange={(e) => handleChange('date_start', e.target.value)}
                        className={`w-full border border-white/20 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditMode ? 'bg-white/10 cursor-pointer' : 'bg-white/5 cursor-not-allowed'
                        }`}
                        placeholder="YYYY-MM-DD"
                        required
                        autoComplete="off"
                        inputMode="none"
                        readOnly={!isEditMode}
                        disabled={!isEditMode}
                        data-lpignore="true"
                        data-form-type="other"
                        onFocus={(e) => {
                          if (isEditMode) {
                            e.stopPropagation()
                            e.target.type = 'date'
                            e.target.showPicker?.()
                          }
                        }}
                        onBlur={(e) => {
                          e.stopPropagation()
                          e.target.type = 'text'
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      />
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            if (input) {
                              input.type = 'date'
                              input.focus()
                              input.showPicker?.()
                            }
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* End Date - Only show if not singular day */}
                  {!formData.singular_day_event && (
                    <div>
                      <label htmlFor="date_end" className="block text-sm font-medium text-gray-300 mb-2">
                        End Date
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="date_end"
                          name="date_end"
                          value={formData.date_end}
                          onChange={(e) => handleChange('date_end', e.target.value)}
                          className={`w-full border border-white/20 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isEditMode ? 'bg-white/10 cursor-pointer' : 'bg-white/5 cursor-not-allowed'
                          }`}
                          placeholder="YYYY-MM-DD"
                          autoComplete="off"
                          inputMode="none"
                          readOnly={!isEditMode}
                          disabled={!isEditMode}
                          data-lpignore="true"
                          data-form-type="other"
                          onFocus={(e) => {
                            if (isEditMode) {
                              e.stopPropagation()
                              e.target.type = 'date'
                              if (formData.date_start) {
                                e.target.min = formData.date_start
                              }
                              e.target.showPicker?.()
                            }
                          }}
                          onBlur={(e) => {
                            e.stopPropagation()
                            e.target.type = 'text'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        />
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement
                              if (input) {
                                input.type = 'date'
                                if (formData.date_start) {
                                  input.min = formData.date_start
                                }
                                input.focus()
                                input.showPicker?.()
                              }
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Singular Day Event Toggle - Below End Date */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="singular_day_event"
                    name="singular_day_event"
                    checked={!!formData.singular_day_event}
                    onChange={(e) => handleChange('singular_day_event', e.target.checked)}
                    className={`w-4 h-4 text-blue-600 border-white/20 rounded focus:ring-blue-500 focus:ring-2 ${
                      isEditMode ? 'bg-white/10' : 'bg-white/5 cursor-not-allowed'
                    }`}
                    autoComplete="off"
                    disabled={!isEditMode}
                  />
                  <label htmlFor="singular_day_event" className="text-sm font-medium text-gray-300 cursor-pointer">
                    Single day event
                  </label>
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className={`w-full border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isEditMode ? 'bg-white/10' : 'bg-white/5 cursor-not-allowed'
                  }`}
                  placeholder="Enter competition location"
                  autoComplete="off"
                  disabled={!isEditMode}
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>

              {/* Competition Downloads */}
              <div>
                <label htmlFor="competition_downloads" className="block text-sm font-medium text-gray-300 mb-2">
                  Competition Downloads URL
                </label>
                <input
                  type="url"
                  id="competition_downloads"
                  value={formData.competition_downloads}
                  onChange={(e) => handleChange('competition_downloads', e.target.value)}
                  className={`w-full border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isEditMode ? 'bg-white/10' : 'bg-white/5 cursor-not-allowed'
                  }`}
                  placeholder="https://example.com/draws-schedule"
                  autoComplete="off"
                  disabled={!isEditMode}
                  data-lpignore="true"
                  data-form-type="other"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Link to draws, schedules, or other competition documents
                </p>
              </div>
            </div>
          )}

          {/* Entries Tab */}
          {activeTab === 'entries' && (
            <div className="space-y-6">
              {/* Bulk Entry Section */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">Bulk Entry System</h3>
                
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-400">Loading disciplines and members...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Discipline Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-md font-medium text-white">Select Disciplines (Multiple Allowed)</h4>
                          {selectedDisciplines.size > 0 && (
                            <p className="text-xs text-blue-400 mt-1">
                              {selectedDisciplines.size} discipline{selectedDisciplines.size !== 1 ? 's' : ''} selected
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search disciplines..."
                              value={disciplineSearchQuery}
                              onChange={(e) => setDisciplineSearchQuery(e.target.value)}
                              className="w-48 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 pl-9 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <button
                            type="button"
                            onClick={handleSelectAllDisciplines}
                            className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200"
                          >
                            {filteredDisciplines.every(d => selectedDisciplines.has(d.id)) ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredDisciplines.map((discipline) => (
                          <label
                            key={discipline.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                              selectedDisciplines.has(discipline.id)
                                ? 'bg-blue-600/20 border-blue-500/50'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDisciplines.has(discipline.id)}
                              onChange={() => handleDisciplineToggle(discipline.id)}
                              className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <span className="text-white text-sm font-medium">{discipline.name}</span>
                              {discipline.team_event && (
                                <span className="text-xs text-blue-400 ml-2">(Team Event)</span>
                              )}
                            </div>
                          </label>
                        ))}
                        
                        {filteredDisciplines.length === 0 && disciplineSearchQuery && (
                          <div className="text-center py-4 text-gray-400">
                            <p>No disciplines found matching "{disciplineSearchQuery}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Member Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-md font-medium text-white">Select Members (Multiple Allowed)</h4>
                          {selectedMembers.size > 0 && (
                            <p className="text-xs text-green-400 mt-1">
                              {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search members..."
                              value={memberSearchQuery}
                              onChange={(e) => setMemberSearchQuery(e.target.value)}
                              className="w-48 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 pl-9 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            />
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <button
                            type="button"
                            onClick={handleSelectAllMembers}
                            className="text-green-400 hover:text-green-300 text-sm transition-colors duration-200"
                          >
                            {filteredMembers.every(m => selectedMembers.has(m.id)) ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredMembers.map((member) => {
                            // Check if this member has any duplicates with selected disciplines
                            const hasDuplicates = selectedDisciplines.size > 0 && 
                              Array.from(selectedDisciplines).some(disciplineId => 
                                isMemberAlreadyInDiscipline(member.id, disciplineId)
                              )
                            
                            return (
                              <div key={member.id} className="space-y-2">
                                {/* Main member card */}
                                <label
                                  className={`block p-3 rounded-lg border transition-colors duration-200 ${
                                    selectedMembers.has(member.id)
                                      ? 'bg-green-600/20 border-green-500/50'
                                      : hasDuplicates
                                      ? 'bg-red-900/20 border-red-500/30 opacity-60 cursor-not-allowed'
                                      : 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedMembers.has(member.id)}
                                      onChange={() => handleMemberToggle(member.id)}
                                      disabled={hasDuplicates && !selectedMembers.has(member.id)}
                                      className="w-4 h-4 text-green-600 bg-white/10 border-white/20 rounded focus:ring-green-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-white text-sm font-medium block truncate">{member.name}</span>
                                      {member.email && (
                                        <span className="text-xs text-gray-400 block truncate">{member.email}</span>
                                      )}
                                    </div>
                                  </div>
                                  {hasDuplicates && !selectedMembers.has(member.id) && (
                                    <div className="mt-2">
                                      <span className="text-xs text-red-400">Already entered in selected discipline(s)</span>
                                    </div>
                                  )}
                                </label>
                                
                                {/* Fight up buttons for each selected discipline where member is already selected */}
                                {selectedMembers.has(member.id) && selectedDisciplines.size > 0 && (
                                  <div className="space-y-1">
                                    {Array.from(selectedDisciplines).map(disciplineId => {
                                      const discipline = competitionDisciplines.find(d => d.id === disciplineId)
                                      const combinationKey = `${member.id}-${disciplineId}`
                                      const isFightUpSelected = fightUpSelections.has(combinationKey)
                                      
                                      if (!discipline) return null
                                      
                                      return (
                                        <button
                                          key={disciplineId}
                                          type="button"
                                          onClick={() => handleFightUpToggle(member.id, disciplineId)}
                                          className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                                            isFightUpSelected
                                              ? 'bg-orange-600/80 text-white border border-orange-400/30'
                                              : 'bg-gray-600/80 text-gray-300 border border-gray-500/30 hover:bg-gray-500/80'
                                          }`}
                                        >
                                          {isFightUpSelected ? '✓' : '+'} Fight Up: {discipline.name}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        
                        {filteredMembers.length === 0 && memberSearchQuery && (
                          <div className="text-center py-4 text-gray-400">
                            <p>No members found matching "{memberSearchQuery}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bulk Entry Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="text-sm text-gray-400">
                        {selectedDisciplines.size} discipline{selectedDisciplines.size !== 1 ? 's' : ''} × {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} + {fightUpSelections.size} fight up{fightUpSelections.size !== 1 ? 's' : ''} = {selectedDisciplines.size * selectedMembers.size + fightUpSelections.size} entries
                      </div>
                      <div className="flex items-center space-x-3">
                        {!editingCompetition && (
                          <span className="text-xs text-yellow-400">
                            Save competition first to add entries
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleBulkEntry}
                          disabled={selectedDisciplines.size === 0 || selectedMembers.size === 0 || !editingCompetition}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          Add {selectedDisciplines.size * selectedMembers.size} Entries
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Entry Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Current Entries</h3>
                  <button
                    type="button"
                    onClick={addEntry}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
                  >
                    Add Individual Entry
                  </button>
                </div>
                
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Entry Name
                          </label>
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter entry name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Category
                          </label>
                          <input
                            type="text"
                            value={entry.category}
                            onChange={(e) => updateEntry(entry.id, 'category', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter category"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="mt-3 text-red-400 hover:text-red-300 text-sm transition-colors duration-200"
                      >
                        Remove Entry
                      </button>
                    </div>
                  ))}
                  
                  {entries.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p>No entries added yet. Use bulk entry above or add individual entries.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Competition Staff</h3>
                <button
                  type="button"
                  onClick={addStaff}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
                >
                  Add Staff
                </button>
              </div>
              
              <div className="space-y-3">
                {staff.map((member) => (
                  <div key={member.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateStaff(member.id, 'name', e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter staff member name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Role
                        </label>
                        <select
                          value={member.role}
                          onChange={(e) => updateStaff(member.id, 'role', e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="" className="bg-gray-800">Select role</option>
                          <option value="Coach" className="bg-gray-800">Coach</option>
                          <option value="Referee" className="bg-gray-800">Referee</option>
                          <option value="Judge" className="bg-gray-800">Judge</option>
                          <option value="Organizer" className="bg-gray-800">Organizer</option>
                          <option value="Medic" className="bg-gray-800">Medic</option>
                          <option value="Volunteer" className="bg-gray-800">Volunteer</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStaff(member.id)}
                      className="mt-3 text-red-400 hover:text-red-300 text-sm transition-colors duration-200"
                    >
                      Remove Staff
                    </button>
                  </div>
                ))}
                
                {staff.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p>No staff added yet. Click "Add Staff" to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
            {/* Delete Button - Only show when editing */}
            {isEditing && editingCompetition && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this competition? This action cannot be undone.')) {
                    if (onDeleteCompetition && editingCompetition) {
                      try {
                        await onDeleteCompetition(editingCompetition.competitions_id)
                        onClose()
                      } catch (error) {
                        console.error('Error deleting competition:', error)
                      }
                    }
                  }
                }}
                className="text-red-400 hover:text-red-300 text-sm transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
            
            {/* Right side buttons */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditing ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  isEditing ? 'Update Competition' : 'Add Competition'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
