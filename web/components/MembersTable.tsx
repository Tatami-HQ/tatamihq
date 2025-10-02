'use client'

import { useState } from 'react'
import type { Member } from '../app/members/page'
import MemberProfileModal from './MemberProfileModal'

interface MembersTableProps {
  members: Member[]
  isLoading: boolean
  onUpdateMember: (id: number, memberData: Partial<Member>) => Promise<void>
  onDeleteMember: (id: number) => Promise<void>
}

type SortField = 'name' | 'email' | 'join_date' | 'status' | 'age'
type SortOrder = 'asc' | 'desc'

const statusColors = {
  Active: 'bg-green-900/20 text-green-400 border-green-500/30',
  Inactive: 'bg-gray-900/20 text-gray-400 border-gray-500/30'
}

export default function MembersTable({ 
  members, 
  isLoading, 
  onUpdateMember, 
  onDeleteMember 
}: MembersTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Member>>({})
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const handleEdit = (member: Member) => {
    setEditingId(member.members_id)
    setEditForm({
      first_name: member.first_name,
      last_name: member.last_name,
      email_address: member.email_address,
      phone: member.phone,
      status: member.status
    })
  }

  const handleSave = async () => {
    if (!editingId) return
    
    try {
      await onUpdateMember(editingId, editForm)
      setEditingId(null)
      setEditForm({})
    } catch (error) {
      console.error('[MembersTable:handleSave] Error saving member:', error)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      await onDeleteMember(id)
    } catch (error) {
      console.error('[MembersTable:handleDelete] Error deleting member:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  if (isLoading) {
    return (
      <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading members...</p>
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
        <div className="p-8 text-center">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">No members yet</h3>
          <p className="text-gray-400">Get started by adding your first member to the club.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-6 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-6 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-6 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-6 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-6 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                Join Date
              </th>
              <th className="px-6 py-6 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-6 text-right text-sm font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {members.map((member) => (
              <tr 
                key={member.members_id} 
                className="hover:bg-white/5 hover:shadow-md hover:shadow-blue-500/10 transition-all duration-200 cursor-pointer group"
                onClick={() => setSelectedMember(member)}
              >
                <td className="px-6 py-6 whitespace-nowrap">
                  {editingId === member.members_id ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={editForm.first_name || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-24"
                        placeholder="First name"
                      />
                      <input
                        type="text"
                        value={editForm.last_name || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-24"
                        placeholder="Last name"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      {/* Profile Picture */}
                      <div className="flex-shrink-0">
                        {member.profile_picture_url ? (
                          <img
                            src={member.profile_picture_url}
                            alt={`${member.first_name} ${member.last_name}`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                            onError={(e) => {
                              // Fallback to avatar if image fails to load
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg ${member.profile_picture_url ? 'hidden' : ''}`}>
                          {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                        </div>
                      </div>
                      
                      {/* Name */}
                      <div className="text-base font-medium text-white">
                        {member.first_name} {member.last_name}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-6 whitespace-nowrap">
                  {editingId === member.members_id ? (
                    <input
                      type="email"
                      value={editForm.email_address || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email_address: e.target.value }))}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-48"
                      placeholder="Email address"
                    />
                  ) : (
                    <div className="text-base text-gray-300">
                      {member.email_address}
                    </div>
                  )}
                </td>
                <td className="px-6 py-6 whitespace-nowrap">
                  {editingId === member.members_id ? (
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-32"
                      placeholder="Phone number"
                    />
                  ) : (
                    <div className="text-base text-gray-300">
                      {member.phone || 'N/A'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-6 whitespace-nowrap">
                  <div className="text-base text-gray-300">
                    {calculateAge(member.date_of_birth)} years old
                  </div>
                </td>
                <td className="px-6 py-6 whitespace-nowrap">
                  <div className="text-base text-gray-300">
                    {formatDate(member.join_date)}
                  </div>
                </td>
                <td className="px-6 py-6 whitespace-nowrap">
                  {editingId === member.members_id ? (
                    <select
                      value={editForm.status || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="Active" className="bg-gray-800">Active</option>
                      <option value="Inactive" className="bg-gray-800">Inactive</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColors[member.status]}`}>
                      {member.status}
                    </span>
                  )}
                </td>
                <td className="px-6 py-6 whitespace-nowrap text-right text-sm font-medium">
                  {editingId === member.members_id ? (
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={handleSave}
                        className="text-green-400 hover:text-green-300 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-300 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(member)
                        }}
                        className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                        title="Edit member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(member.members_id)
                        }}
                        disabled={deletingId === member.members_id}
                        className="text-red-400 hover:text-red-300 transition-colors duration-200 disabled:opacity-50"
                        title="Delete member"
                      >
                        {deletingId === member.members_id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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