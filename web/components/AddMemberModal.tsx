'use client'

import { useState } from 'react'
import type { Member } from '../app/members/page'

interface AddMemberModalProps {
  onClose: () => void
  onAddMember: (memberData: Omit<Member, 'members_id' | 'created_at' | 'updated_at'>) => Promise<void>
  prefillData?: {
    first_name?: string
    last_name?: string
    phone?: string
    email_address?: string
  }
}

const membershipTypes = [
  'Monthly',
  'Quarterly', 
  'Annual',
  'Family',
  'Student',
  'Senior',
  'Trial'
]

const statusOptions = [
  'Active',
  'Inactive'
]

export default function AddMemberModal({ onClose, onAddMember, prefillData }: AddMemberModalProps) {
  const [formData, setFormData] = useState({
    first_name: prefillData?.first_name || '',
    last_name: prefillData?.last_name || '',
    date_of_birth: '',
    email_address: prefillData?.email_address || '',
    phone: prefillData?.phone || '',
    gender: '' as 'Male' | 'Female' | null,
    profile_picture_url: '',
    address: '',
    city: '',
    postcode: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_info: '',
    membership_type: 'Monthly',
    join_date: new Date().toISOString().split('T')[0],
    status: 'Active' as 'Active' | 'Inactive',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== FORM SUBMIT TRIGGERED ===')
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      console.log('Form data:', formData)
      console.log('Email from form:', formData.email_address)
      
      // Validate required fields
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        console.log('Validation failed: Missing name')
        setError('First name and last name are required')
        setIsSubmitting(false)
        return
      }

      if (!formData.email_address.trim()) {
        console.log('Validation failed: Missing email')
        setError('Email address is required')
        setIsSubmitting(false)
        return
      }

      if (!formData.join_date) {
        console.log('Validation failed: Missing join date')
        setError('Join date is required')
        setIsSubmitting(false)
        return
      }

      // Convert empty strings to null for optional fields
      const memberData = {
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        email_address: formData.email_address.trim(),
        phone: formData.phone.trim() || null,
        gender: formData.gender || null,
        profile_picture_url: formData.profile_picture_url.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        postcode: formData.postcode.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        medical_info: formData.medical_info.trim() || null,
        membership_type: formData.membership_type || null,
        join_date: formData.join_date || null,
        status: formData.status,
        notes: formData.notes.trim() || null
      }

      // If there's a new image, convert it to data URL
      if (profileImage) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string
          memberData.profile_picture_url = dataUrl
          console.log('Calling onAddMember with:', memberData)
          await onAddMember(memberData)
          console.log('onAddMember completed successfully')
        }
        reader.readAsDataURL(profileImage)
      } else {
        console.log('Calling onAddMember with:', memberData)
        await onAddMember(memberData)
        console.log('onAddMember completed successfully')
      }
    } catch (error) {
      console.error('[AddMemberModal:handleSubmit] Error adding member:', error)
      setError('Failed to add member. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
  }

  const nextStep = () => {
    console.log('Moving to step:', currentStep + 1)
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    console.log('Form submit triggered on step:', currentStep)
    if (currentStep < totalSteps) {
      e.preventDefault()
      nextStep()
      return
    }
    handleSubmit(e)
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
      
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-2">
            First Name *
          </label>
          <input
            type="text"
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter first name"
            required
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter last name"
            required
          />
        </div>
      </div>

      {/* Date of Birth */}
      <div>
        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-300 mb-2">
          Date of Birth
        </label>
        <input
          type="date"
          id="date_of_birth"
          value={formData.date_of_birth}
          onChange={(e) => handleChange('date_of_birth', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Gender */}
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-2">
          Gender
        </label>
        <select
          id="gender"
          value={formData.gender || ''}
          onChange={(e) => handleChange('gender', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="" className="bg-gray-800">Select gender</option>
          <option value="Male" className="bg-gray-800">Male</option>
          <option value="Female" className="bg-gray-800">Female</option>
        </select>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email_address" className="block text-sm font-medium text-gray-300 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          id="email_address"
          value={formData.email_address}
          onChange={(e) => handleChange('email_address', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter email address"
          required
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter phone number"
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white mb-4">Address & Contact Information</h3>
      
      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
          Address
        </label>
        <textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter full address"
          rows={3}
        />
      </div>

      {/* City and Postcode */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
            City
          </label>
          <input
            type="text"
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter city"
          />
        </div>
        <div>
          <label htmlFor="postcode" className="block text-sm font-medium text-gray-300 mb-2">
            Postcode
          </label>
          <input
            type="text"
            id="postcode"
            value={formData.postcode}
            onChange={(e) => handleChange('postcode', e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter postcode"
          />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="border-t border-white/10 pt-4">
        <h4 className="text-md font-medium text-white mb-4">Emergency Contact</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-300 mb-2">
              Emergency Contact Name
            </label>
            <input
              type="text"
              id="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter emergency contact name"
            />
          </div>
          <div>
            <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-300 mb-2">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              id="emergency_contact_phone"
              value={formData.emergency_contact_phone}
              onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter emergency contact phone"
            />
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div>
        <label htmlFor="medical_info" className="block text-sm font-medium text-gray-300 mb-2">
          Medical Information
        </label>
        <textarea
          id="medical_info"
          value={formData.medical_info}
          onChange={(e) => handleChange('medical_info', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter any medical conditions or allergies"
          rows={3}
        />
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white mb-4">Membership Details</h3>
      
      {/* Membership Type */}
      <div>
        <label htmlFor="membership_type" className="block text-sm font-medium text-gray-300 mb-2">
          Membership Type
        </label>
        <select
          id="membership_type"
          value={formData.membership_type}
          onChange={(e) => handleChange('membership_type', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {membershipTypes.map((type) => (
            <option key={type} value={type} className="bg-gray-800">
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Join Date */}
      <div>
        <label htmlFor="join_date" className="block text-sm font-medium text-gray-300 mb-2">
          Join Date *
        </label>
        <input
          type="date"
          id="join_date"
          value={formData.join_date}
          onChange={(e) => handleChange('join_date', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
          Status
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status} className="bg-gray-800">
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Profile Picture Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Profile Picture
        </label>
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                  {formData.first_name?.[0]?.toUpperCase()}{formData.last_name?.[0]?.toUpperCase()}
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
                {imagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Upload a profile picture (JPG, PNG, GIF - Max 5MB)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter any additional notes"
          rows={3}
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Add New Member</h2>
              <p className="text-sm text-gray-400">Step {currentStep} of {totalSteps}</p>
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
          
          {/* Progress Bar */}
          <div className="mt-4 w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="p-6">
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

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
              >
                Cancel
              </button>
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding Member...
                    </>
                  ) : (
                    'Add Member'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}