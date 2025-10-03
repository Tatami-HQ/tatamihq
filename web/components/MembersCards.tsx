'use client'

import { useState } from 'react'
import type { Member } from '../app/members/page'
import MemberProfileModal from './MemberProfileModal'

interface MembersCardsProps {
  members: Member[]
  isLoading: boolean
  onUpdateMember: (id: number, memberData: Partial<Member>) => Promise<void>
  onDeleteMember: (id: number) => Promise<void>
}

export default function MembersCards({ 
  members, 
  isLoading, 
  onUpdateMember, 
  onDeleteMember 
}: MembersCardsProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isLicenseExpiringSoon = (expireDate: string | null) => {
    if (!expireDate) return false
    const today = new Date()
    const expiryDate = new Date(expireDate)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0 // Expires within 30 days
  }

  const isLicenseExpired = (expireDate: string | null) => {
    if (!expireDate) return false
    const today = new Date()
    const expiryDate = new Date(expireDate)
    return expiryDate < today
  }

  const statusColors = {
    Active: 'bg-green-900/20 text-green-400 border-green-500/30',
    Inactive: 'bg-gray-900/20 text-gray-400 border-gray-500/30'
  }

  const handleStatusToggle = async (member: Member) => {
    if (member.status === 'Active') {
      const confirmed = window.confirm('Are you sure you want to remove this member? They will be hidden from the active members list.')
      if (!confirmed) return
    }

    try {
      const newStatus = member.status === 'Active' ? 'Inactive' : 'Active'
      await onUpdateMember(member.members_id, { status: newStatus })
    } catch (error) {
      console.error('Error updating member status:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Loading members...</span>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No members found</h3>
        <p className="text-gray-400">Get started by adding your first member.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {members.map((member) => (
          <div
            key={member.members_id}
            className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer group"
            onClick={() => setSelectedMember(member)}
          >
            {/* Card Layout */}
            <div className="flex items-center space-x-4 mb-4">
              {/* Profile Picture - Left Side */}
              <div className="flex-shrink-0">
                {member.profile_picture_url ? (
                  <img
                    src={member.profile_picture_url}
                    alt={`${member.first_name} ${member.last_name}`}
                    className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                    onError={(e) => {
                      // Fallback to avatar if image fails to load
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-2xl ${member.profile_picture_url ? 'hidden' : ''}`}>
                  {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                </div>
              </div>
              
              {/* Content - Right Side */}
              <div className="flex-1 min-w-0">
                {/* Name and Status Row */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors duration-200 truncate">
                    {member.first_name} {member.last_name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusToggle(member)
                    }}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105 ${statusColors[member.status]} flex-shrink-0 cursor-pointer`}
                    title={`Click to ${member.status === 'Active' ? 'deactivate' : 'activate'} member`}
                  >
                    {member.status}
                  </button>
                </div>
                
                {/* Email */}
                <p className="text-sm text-gray-400 truncate mb-3">{member.email_address}</p>
              </div>
            </div>

            {/* Member Info - Clean Layout */}
            <div className="space-y-2 mb-4">
              {member.phone && (
                <div className="text-sm text-gray-300 truncate">
                  {member.phone}
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                {member.date_of_birth && (
                  <span className="text-gray-400">
                    Age {calculateAge(member.date_of_birth)}
                  </span>
                )}
                {member.membership_type && (
                  <span className="text-blue-400 font-medium">
                    {member.membership_type}
                  </span>
                )}
              </div>

              {/* License Expiry Warning */}
              {(isLicenseExpired(member.licence_expire_date) || isLicenseExpiringSoon(member.licence_expire_date)) && (
                <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
                  isLicenseExpired(member.licence_expire_date) 
                    ? 'bg-red-900/20 text-red-400 border border-red-500/30' 
                    : 'bg-orange-900/20 text-orange-400 border border-orange-500/30'
                }`}>
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {isLicenseExpired(member.licence_expire_date) ? 'License Expired' : 'License Expires Soon'}
                </div>
              )}
            </div>


          </div>
        ))}
      </div>

      {/* Member Profile Modal */}
      <MemberProfileModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onUpdateMember={onUpdateMember}
        onDeleteMember={onDeleteMember}
      />
    </div>
  )
}
