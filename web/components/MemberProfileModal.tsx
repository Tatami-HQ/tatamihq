'use client'

import { useState } from 'react'
import type { Member } from '../app/members/page'

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
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Member>>({})
  const [isDeleting, setIsDeleting] = useState(false)

  if (!member) return null

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({
      first_name: member.first_name,
      last_name: member.last_name,
      email_address: member.email_address,
      phone: member.phone,
      date_of_birth: member.date_of_birth,
      gender: member.gender,
      address: member.address,
      city: member.city,
      postcode: member.postcode,
      emergency_contact_name: member.emergency_contact_name,
      emergency_contact_phone: member.emergency_contact_phone,
      medical_info: member.medical_info,
      membership_type: member.membership_type,
      join_date: member.join_date,
      status: member.status,
      notes: member.notes
    })
  }

  const handleSave = async () => {
    try {
      await onUpdateMember(member.members_id, editForm)
      setIsEditing(false)
      setEditForm({})
    } catch (error) {
      console.error('Error updating member:', error)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({})
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateAge = (dob: string | null) => {
    if (!dob) return 'N/A'
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  const statusColors = {
    Active: 'bg-green-900/20 text-green-400 border-green-500/30',
    Inactive: 'bg-gray-900/20 text-gray-400 border-gray-500/30'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {member.first_name} {member.last_name}
              </h2>
              <p className="text-sm text-gray-400">Member Profile</p>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <>
                  <button
                    onClick={handleEdit}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </>
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
        </div>

        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email_address || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email_address: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Name:</span>
                    <p className="text-white">{member.first_name} {member.last_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Email:</span>
                    <p className="text-white">{member.email_address}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Phone:</span>
                    <p className="text-white">{member.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Age:</span>
                    <p className="text-white">{calculateAge(member.date_of_birth)} years old</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Gender:</span>
                    <p className="text-white">{member.gender || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Membership Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4">Membership Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ml-2 ${statusColors[member.status]}`}>
                      {member.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Join Date:</span>
                    <p className="text-white">{formatDate(member.join_date)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Membership Type:</span>
                    <p className="text-white">{member.membership_type || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              {(member.address || member.city || member.postcode) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Address</h3>
                  <div className="space-y-3">
                    {member.address && (
                      <div>
                        <span className="text-sm text-gray-400">Address:</span>
                        <p className="text-white">{member.address}</p>
                      </div>
                    )}
                    {member.city && (
                      <div>
                        <span className="text-sm text-gray-400">City:</span>
                        <p className="text-white">{member.city}</p>
                      </div>
                    )}
                    {member.postcode && (
                      <div>
                        <span className="text-sm text-gray-400">Postcode:</span>
                        <p className="text-white">{member.postcode}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {(member.emergency_contact_name || member.emergency_contact_phone) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Emergency Contact</h3>
                  <div className="space-y-3">
                    {member.emergency_contact_name && (
                      <div>
                        <span className="text-sm text-gray-400">Name:</span>
                        <p className="text-white">{member.emergency_contact_name}</p>
                      </div>
                    )}
                    {member.emergency_contact_phone && (
                      <div>
                        <span className="text-sm text-gray-400">Phone:</span>
                        <p className="text-white">{member.emergency_contact_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical Info */}
              {member.medical_info && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Medical Information</h3>
                  <p className="text-white text-sm bg-white/5 p-3 rounded-lg">{member.medical_info}</p>
                </div>
              )}

              {/* Notes */}
              {member.notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Notes</h3>
                  <p className="text-white text-sm bg-white/5 p-3 rounded-lg">{member.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
