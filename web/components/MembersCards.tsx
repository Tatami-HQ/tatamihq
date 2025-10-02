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

  const statusColors = {
    Active: 'bg-green-900/20 text-green-400 border-green-500/30',
    Inactive: 'bg-gray-900/20 text-gray-400 border-gray-500/30'
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[member.status]} flex-shrink-0`}>
                    {member.status}
                  </span>
                </div>
                
                {/* Email */}
                <p className="text-sm text-gray-400 truncate mb-3">{member.email_address}</p>
              </div>
            </div>

            {/* Member Info - Two Column Layout */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {member.phone && (
                <div className="flex items-center text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="truncate">{member.phone}</span>
                </div>
              )}
              
              {member.gender && (
                <div className="flex items-center text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="truncate">{member.gender}</span>
                </div>
              )}

              {member.date_of_birth && (
                <div className="flex items-center text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">Age {calculateAge(member.date_of_birth)}</span>
                </div>
              )}

              {member.membership_type && (
                <div className="flex items-center text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate">{member.membership_type}</span>
                </div>
              )}
            </div>

            {/* Address */}
            {(member.address || member.city) && (
              <div className="mb-4">
                <div className="flex items-start text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    {member.address && <div className="truncate">{member.address}</div>}
                    {member.city && <div className="truncate">{member.city}{member.postcode && `, ${member.postcode}`}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Join Date */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Joined {formatDate(member.join_date)}</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs">Click to view</span>
              </div>
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
