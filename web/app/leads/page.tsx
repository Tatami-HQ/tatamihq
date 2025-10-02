'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'
import LeadCard from '@/components/LeadCard'
import AddLeadModal from '@/components/AddLeadModal'
import AddMemberModal from '@/components/AddMemberModal'
import type { Member } from '../members/page'

export interface Lead {
  leads_id: number
  created_at: string
  updated_at: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  status: 'new' | 'contacted' | 'booked' | 'attended_trial' | 'converted' | 'lost'
  email: string | null
}

const PIPELINE_STAGES = [
  { key: 'new', label: 'New Lead', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { key: 'booked', label: 'Booked for Trial', color: 'bg-orange-500' },
  { key: 'attended_trial', label: 'Attended Trial', color: 'bg-green-500' }
] as const

export default function LeadsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [error, setError] = useState('')
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('[Leads:getUser] Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (user) {
      fetchLeads()
    }
  }, [user])

  const fetchLeads = async () => {
    try {
      setIsLoadingLeads(true)
      setError('')
      
      console.log('[Leads:fetchLeads] Fetching leads from Supabase...')
      
      const { data, error } = await supabase
        .from('leads')
        .select('leads_id, created_at, updated_at, first_name, last_name, phone, status, email')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Leads:fetchLeads] Supabase error:', error)
        setError(`Failed to load leads: ${error.message}`)
        return
      }

      console.log('[Leads:fetchLeads] Fetched leads:', data)
      setLeads(data || [])
    } catch (error) {
      console.error('[Leads:fetchLeads] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoadingLeads(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[Leads:handleLogout] Logout error:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('[Leads:handleLogout] Unexpected error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleAddLead = async (leadData: Omit<Lead, 'leads_id' | 'created_at'>) => {
    try {
      console.log('Adding lead with data:', leadData)
      
      if (!user) {
        setError('You must be logged in to add leads')
        return
      }

      console.log('Attempting to insert lead data:', leadData)
      
      const { data: insertResult, error: insertError } = await supabase
        .from('leads')
        .insert([leadData])
        .select('leads_id, created_at, updated_at, first_name, last_name, phone, status, email')
      
      if (insertError) {
        console.error('Insert failed:', insertError)
        console.error('Error details:', JSON.stringify(insertError, null, 2))
        setError(`Failed to add lead: ${insertError.message}`)
        return
      }
      
      if (insertResult && insertResult[0]) {
        console.log('SUCCESS! Lead added:', insertResult[0])
        setLeads(prev => [insertResult[0], ...prev])
        setShowAddLeadModal(false)
        setError('')
      } else {
        console.error('No data returned from insert')
        setError('No data returned from insert')
      }
    } catch (error) {
      console.error('Unexpected error in handleAddLead:', error)
      setError(`Unexpected error: ${error}`)
    }
  }

  const handleUpdateLead = async (id: number, leadData: Partial<Lead>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('leads_id', id)
        .select('leads_id, created_at, updated_at, first_name, last_name, phone, status, email')

      if (error) {
        console.error('[Leads:handleUpdateLead] Error updating lead:', error)
        setError('Failed to update lead. Please try again.')
        return
      }

      if (data && data[0]) {
        setLeads(prev => prev.map(lead => 
          lead.leads_id === id ? { ...lead, ...data[0] } : lead
        ))
        setError('')
      }
    } catch (error) {
      console.error('[Leads:handleUpdateLead] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleDeleteLead = async (id: number) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('leads_id', id)

      if (error) {
        console.error('[Leads:handleDeleteLead] Error deleting lead:', error)
        setError('Failed to delete lead. Please try again.')
        return
      }

      setLeads(prev => prev.filter(lead => lead.leads_id !== id))
      setError('')
    } catch (error) {
      console.error('[Leads:handleDeleteLead] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleConvertToMember = (lead: Lead) => {
    setSelectedLead(lead)
    setShowAddMemberModal(true)
  }

  const handleAddMemberFromLead = async (memberData: Omit<Member, 'members_id' | 'created_at' | 'updated_at'>) => {
    try {
      // Add the member
      const { data: insertResult, error: insertError } = await supabase
        .from('members')
        .insert([memberData])
        .select()
      
      if (insertError) {
        console.error('Insert member failed:', insertError)
        setError(`Failed to add member: ${insertError.message}`)
        return
      }

      if (insertResult && insertResult[0]) {
        // Delete the lead after successful conversion
        await handleDeleteLead(selectedLead!.leads_id)
        setShowAddMemberModal(false)
        setSelectedLead(null)
        setError('')
        alert('Lead successfully converted to member!')
      }
    } catch (error) {
      console.error('Unexpected error in handleAddMemberFromLead:', error)
      setError(`Unexpected error: ${error}`)
    }
  }

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: Lead['status']) => {
    e.preventDefault()
    
    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null)
      return
    }

    try {
      await handleUpdateLead(draggedLead.leads_id, { status: newStatus })
    } catch (error) {
      console.error('Error updating lead status:', error)
    } finally {
      setDraggedLead(null)
    }
  }

  const getLeadsByStatus = (status: Lead['status']) => {
    return leads.filter(lead => lead.status === status)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex overflow-x-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Header */}
        <header className="bg-black border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Leads Pipeline</h1>
              <p className="text-gray-400 text-sm mt-1">Manage your martial arts leads through the pipeline</p>
            </div>
            <ProfileDropdown 
              user={user} 
              isLoggingOut={isLoggingOut} 
              onLogout={handleLogout} 
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                {isLoadingLeads ? 'Loading...' : `${leads.length} total leads`}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Lead
              </button>
            </div>
          </div>

          {/* Drag Instruction */}
          <div className="mb-4 flex items-center justify-center text-gray-400 text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <span>Drag lead cards between stages to update their status</span>
          </div>

          {/* Pipeline Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = getLeadsByStatus(stage.key as Lead['status'])
              
              return (
                <div
                  key={stage.key}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 min-h-[700px] max-h-[80vh] overflow-y-auto"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.key as Lead['status'])}
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                      <h3 className="text-lg font-semibold text-white">{stage.label}</h3>
                    </div>
                    <span className="bg-white/10 text-white text-xs px-2 py-1 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Stage Content */}
                  <div className="space-y-3">
                    {isLoadingLeads ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    ) : stageLeads.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-sm">No leads in this stage</p>
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <LeadCard
                          key={lead.leads_id}
                          lead={lead}
                          onUpdateLead={handleUpdateLead}
                          onDeleteLead={handleDeleteLead}
                          onConvertToMember={handleConvertToMember}
                          onDragStart={(e) => handleDragStart(e, lead)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <AddLeadModal
          onClose={() => setShowAddLeadModal(false)}
          onAddLead={handleAddLead}
        />
      )}

      {/* Add Member Modal (for conversion) */}
      {showAddMemberModal && selectedLead && (
        <AddMemberModal
          onClose={() => {
            setShowAddMemberModal(false)
            setSelectedLead(null)
          }}
          onAddMember={handleAddMemberFromLead}
          prefillData={{
            first_name: selectedLead.first_name || '',
            last_name: selectedLead.last_name || '',
            phone: selectedLead.phone || '',
            email_address: selectedLead.email || '', // Use lead's email if available
          }}
        />
      )}
    </div>
  )
}
