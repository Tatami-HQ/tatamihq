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
  
  // Form state for new belt
  const [newBeltForm, setNewBeltForm] = useState({
    martial_art_id: '',
    martial_art_classes_id: '',
    belt_system_id: '',
    awarded_date: ''
  })
  
  const [isLoadingBelts, setIsLoadingBelts] = useState(false)
  const [isSavingBelt, setIsSavingBelt] = useState(false)

  // Load martial arts data when component mounts
  useEffect(() => {
    if (member) {
      loadMartialArtsData()
      loadMemberBelts()
    }
  }, [member])

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
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
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
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
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
          <nav className="flex space-x-8 px-6">
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
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2 ${
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
        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                
                {/* Profile Picture Upload */}
                <div className="mb-6">
                  <span className="text-sm text-gray-400 mb-3 block">Profile Picture:</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                        />
                      ) : member.profile_picture_url ? (
                        <img
                          src={member.profile_picture_url}
                          alt={`${member.first_name} ${member.last_name}`}
                          className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-2xl">
                          {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          Choose Image
                        </label>
                        {(imagePreview || member.profile_picture_url) && (
                          <button
                            type="button"
                            onClick={removeImage}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Remove
                          </button>
                        )}
                        {imagePreview && (
                          <button
                            type="button"
                            onClick={handleSave}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Save Image
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Upload a profile picture (JPG, PNG, GIF - Max 5MB)
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">First Name:</span>
                    <input
                      type="text"
                      value={editForm.first_name || member.first_name || ''}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      onBlur={(e) => handleFieldBlur('first_name', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Last Name:</span>
                    <input
                      type="text"
                      value={editForm.last_name || member.last_name || ''}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                      onBlur={(e) => handleFieldBlur('last_name', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Email:</span>
                    <input
                      type="email"
                      value={editForm.email_address || member.email_address || ''}
                      onChange={(e) => handleFieldChange('email_address', e.target.value)}
                      onBlur={(e) => handleFieldBlur('email_address', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Phone:</span>
                    <input
                      type="tel"
                      value={editForm.phone || member.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Date of Birth:</span>
                    <input
                      type="date"
                      value={editForm.date_of_birth || member.date_of_birth || ''}
                      onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                      onBlur={(e) => handleFieldBlur('date_of_birth', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Gender:</span>
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

              {/* Membership Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Membership Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Status:</span>
                    <select
                      value={editForm.status || member.status || 'Active'}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      onBlur={(e) => handleFieldBlur('status', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Join Date:</span>
                    <input
                      type="date"
                      value={editForm.join_date || member.join_date || ''}
                      onChange={(e) => handleFieldChange('join_date', e.target.value)}
                      onBlur={(e) => handleFieldBlur('join_date', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Membership Type:</span>
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
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Address</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Address:</span>
                    <input
                      type="text"
                      value={editForm.address || member.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      onBlur={(e) => handleFieldBlur('address', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">City:</span>
                    <input
                      type="text"
                      value={editForm.city || member.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      onBlur={(e) => handleFieldBlur('city', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Postcode:</span>
                    <input
                      type="text"
                      value={editForm.postcode || member.postcode || ''}
                      onChange={(e) => handleFieldChange('postcode', e.target.value)}
                      onBlur={(e) => handleFieldBlur('postcode', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Emergency Contact</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Name:</span>
                    <input
                      type="text"
                      value={editForm.emergency_contact_name || member.emergency_contact_name || ''}
                      onChange={(e) => handleFieldChange('emergency_contact_name', e.target.value)}
                      onBlur={(e) => handleFieldBlur('emergency_contact_name', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Phone:</span>
                    <input
                      type="tel"
                      value={editForm.emergency_contact_phone || member.emergency_contact_phone || ''}
                      onChange={(e) => handleFieldChange('emergency_contact_phone', e.target.value)}
                      onBlur={(e) => handleFieldBlur('emergency_contact_phone', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Medical Information</h3>
                <div>
                  <textarea
                    value={editForm.medical_info || member.medical_info || ''}
                    onChange={(e) => handleFieldChange('medical_info', e.target.value)}
                    onBlur={(e) => handleFieldBlur('medical_info', e.target.value)}
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Any medical conditions, allergies, or important health information..."
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Notes</h3>
                <div>
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
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22v-4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 18h8" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Competition History</h3>
                <p className="text-gray-400">No competitions recorded yet</p>
                <p className="text-sm text-gray-500 mt-2">This section will be populated over time</p>
              </div>
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
                        type="date"
                        value={newBeltForm.awarded_date}
                        onChange={(e) => setNewBeltForm(prev => ({ ...prev, awarded_date: e.target.value }))}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={handleAddBelt}
                      disabled={isSavingBelt || !newBeltForm.martial_art_id || !newBeltForm.belt_system_id || !newBeltForm.awarded_date}
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
        </div>
      </div>
    </div>
  )
}