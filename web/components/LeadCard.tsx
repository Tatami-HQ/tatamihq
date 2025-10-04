'use client'

import { useState } from 'react'
import type { Lead } from '../app/leads/page'

interface LeadCardProps {
  lead: Lead
  onUpdateLead: (id: number, leadData: Partial<Lead>) => Promise<void>
  onDeleteLead: (id: number) => Promise<void>
  onConvertToMember: (lead: Lead) => void
  onDragStart: (e: React.DragEvent) => void
}

export default function LeadCard({ 
  lead, 
  onUpdateLead, 
  onDeleteLead, 
  onConvertToMember,
  onDragStart 
}: LeadCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    phone: lead.phone || '',
    email: lead.email || ''
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSourceColor = (source: string | null) => {
    const colors = {
      'Website': 'bg-blue-900/20 text-blue-400 border-blue-500/30',
      'Referral': 'bg-green-900/20 text-green-400 border-green-500/30',
      'Walk-in': 'bg-purple-900/20 text-purple-400 border-purple-500/30',
      'Social Media': 'bg-pink-900/20 text-pink-400 border-pink-500/30',
      'Other': 'bg-gray-900/20 text-gray-400 border-gray-500/30'
    }
    return colors[source as keyof typeof colors] || colors['Other']
  }

  const handleSave = async () => {
    try {
      const today = new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
      await onUpdateLead(lead.leads_id, {
        ...editData,
        last_contacted: today
      } as Partial<Lead>)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating lead:', error)
    }
  }

  const handleCancel = () => {
    setEditData({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      phone: lead.phone || '',
      email: lead.email || ''
    })
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await onDeleteLead(lead.leads_id)
      } catch (error) {
        console.error('Error deleting lead:', error)
      }
    }
  }

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 cursor-move group"
      draggable
      onDragStart={onDragStart}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {lead.first_name?.[0]?.toUpperCase()}{lead.last_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors duration-200">
              {lead.first_name} {lead.last_name}
            </h4>
            <p className="text-xs text-gray-400">
              {formatDate(lead.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1"
            title="Edit lead"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-400 transition-colors duration-200 p-1"
            title="Delete lead"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card Content */}
      {isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={editData.first_name}
              onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="First name"
            />
            <input
              type="text"
              value={editData.last_name}
              onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Last name"
            />
          </div>
          
          <input
            type="tel"
            value={editData.phone}
            onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Phone number"
          />
          
          <input
            type="email"
            value={editData.email}
            onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Email address"
          />
          
          <select
            value={editData.source || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, source: e.target.value } as unknown as typeof editData))}
            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="" className="bg-gray-800">Select source</option>
            <option value="Website" className="bg-gray-800">Website</option>
            <option value="Referral" className="bg-gray-800">Referral</option>
            <option value="Walk-in" className="bg-gray-800">Walk-in</option>
            <option value="Social Media" className="bg-gray-800">Social Media</option>
            <option value="Other" className="bg-gray-800">Other</option>
          </select>
          
          <input
            type="text"
            value={editData.interested_in}
            onChange={(e) => setEditData(prev => ({ ...prev, interested_in: e.target.value }))}
            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Interested in"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={editData.last_contacted}
              onChange={(e) => setEditData(prev => ({ ...prev, last_contacted: e.target.value }))}
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="date"
              value={editData.next_follow_up}
              onChange={(e) => setEditData(prev => ({ ...prev, next_follow_up: e.target.value }))}
              className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors duration-200"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Phone */}
          {lead.phone && (
            <div className="flex items-center text-xs text-gray-300">
              <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="truncate">{lead.phone}</span>
            </div>
          )}

          {/* Email */}
          {lead.email && (
            <div className="flex items-center text-xs text-gray-300">
              <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{lead.email}</span>
            </div>
          )}

          {/* Source */}
          {lead.source && (
            <div className="flex items-center text-xs">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getSourceColor(lead.source)}`}>
                {lead.source}
              </span>
            </div>
          )}

          {/* Interested In */}
          {lead.interested_in && (
            <div className="flex items-center text-xs text-gray-300">
              <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">{lead.interested_in}</span>
            </div>
          )}

          {/* Last Contacted */}
          {lead.last_contacted && (
            <div className="flex items-center text-xs text-gray-300">
              <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="truncate">Last: {formatDate(lead.last_contacted)}</span>
            </div>
          )}

          {/* Next Follow Up */}
          {lead.next_follow_up && (
            <div className="flex items-center text-xs text-gray-300">
              <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">Next: {formatDate(lead.next_follow_up)}</span>
            </div>
          )}

          {/* Convert to Member Button (only for Attended Trial stage) */}
          {lead.status === 'attended_trial' && (
            <button
              onClick={() => onConvertToMember(lead)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-medium transition-colors duration-200 mt-3"
            >
              Convert to Member
            </button>
          )}

        </div>
      )}
    </div>
  )
}
