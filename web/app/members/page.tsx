'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'
import MembersTable from '../../components/MembersTable'
import AddMemberModal from '../../components/AddMemberModal'

export interface Member {
  members_id: number
  created_at: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  email_address: string
  phone: string | null
  gender: 'Male' | 'Female' | null
  profile_picture_url: string | null
  address: string | null
  city: string | null
  postcode: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_info: string | null
  membership_type: string | null
  join_date: string | null
  status: 'Active' | 'Inactive'
  notes: string | null
  updated_at: string | null
}

export default function MembersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  // Search function - searches across the entire member record as one string
  const searchMembers = (query: string) => {
    if (!query.trim()) {
      setFilteredMembers(members)
      return
    }

    const searchTerm = query.toLowerCase().trim()
    
    const filtered = members.filter(member => {
      // Create one big searchable string from all member data
      const fullMemberString = [
        member.first_name,
        member.last_name,
        member.email_address,
        member.phone,
        member.address,
        member.city,
        member.postcode,
        member.emergency_contact_name,
        member.emergency_contact_phone,
        member.medical_info,
        member.membership_type,
        member.notes,
        member.status,
        member.date_of_birth,
        member.gender
      ]
      .filter(Boolean) // Remove null/undefined values
      .join(' ') // Join all fields with spaces
      .toLowerCase()

      // Search in the combined string
      return fullMemberString.includes(searchTerm)
    })

    setFilteredMembers(filtered)
  }

  // Update filtered members when search query changes
  useEffect(() => {
    if (members.length > 0) {
      searchMembers(searchQuery)
    }
  }, [searchQuery, members])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('[Members:getUser] Error fetching user:', error)
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
      fetchMembers()
    }
  }, [user])

  const fetchMembers = async () => {
    try {
      setIsLoadingMembers(true)
      setError('')
      
      console.log('[Members:fetchMembers] Fetching members from Supabase...')
      
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Members:fetchMembers] Supabase error:', error)
        setError(`Failed to load members: ${error.message}`)
        return
      }

      console.log('[Members:fetchMembers] Fetched members:', data)
      setMembers(data || [])
      setFilteredMembers(data || [])
    } catch (error) {
      console.error('[Members:fetchMembers] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[Members:handleLogout] Logout error:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('[Members:handleLogout] Unexpected error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const addTestMember = async () => {
    try {
      console.log('=== ADDING TEST MEMBER ===')
      
      const testMemberData = {
        first_name: 'Test',
        last_name: 'Member',
        email_address: 'test.member@example.com',
        join_date: new Date().toISOString().split('T')[0],
        status: 'Active'
      }
      
      console.log('Test member data:', testMemberData)
      
      const { data, error } = await supabase
        .from('members')
        .insert([testMemberData])
        .select()
      
      if (error) {
        console.error('Test member insert failed:', error)
        setError(`Test member failed: ${error.message}`)
        return
      }
      
      if (data && data[0]) {
        console.log('SUCCESS! Test member added:', data[0])
        setMembers(prev => [data[0], ...prev])
        setFilteredMembers(prev => [data[0], ...prev])
        setError('')
        alert('Test member added successfully! Check your Supabase database.')
      } else {
        console.error('No data returned from test insert')
        setError('No data returned from test insert')
      }
    } catch (error) {
      console.error('Unexpected error adding test member:', error)
      setError(`Test member error: ${error}`)
    }
  }

  const handleAddMember = async (memberData: Omit<Member, 'members_id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding member with data:', memberData)
      
      if (!user) {
        setError('You must be logged in to add members')
        return
      }

      const { data: insertResult, error: insertError } = await supabase
        .from('members')
        .insert([memberData])
        .select()
      
      if (insertError) {
        console.error('Insert failed:', insertError)
        setError(`Failed to add member: ${insertError.message}`)
        return
      }
      
      if (insertResult && insertResult[0]) {
        console.log('SUCCESS! Member added:', insertResult[0])
        setMembers(prev => [insertResult[0], ...prev])
        setFilteredMembers(prev => [insertResult[0], ...prev])
        setShowAddModal(false)
        setError('')
      } else {
        console.error('No data returned from insert')
        setError('No data returned from insert')
      }
    } catch (error) {
      console.error('Unexpected error in handleAddMember:', error)
      setError(`Unexpected error: ${error}`)
    }
  }

  const handleUpdateMember = async (id: number, memberData: Partial<Member>) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .update(memberData)
        .eq('members_id', id)
        .select()

      if (error) {
        console.error('[Members:handleUpdateMember] Error updating member:', error)
        setError('Failed to update member. Please try again.')
        return
      }

      if (data && data[0]) {
        setMembers(prev => prev.map(member => 
          member.members_id === id ? { ...member, ...data[0] } : member
        ))
        setFilteredMembers(prev => prev.map(member => 
          member.members_id === id ? { ...member, ...data[0] } : member
        ))
        setError('')
      }
    } catch (error) {
      console.error('[Members:handleUpdateMember] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleDeleteMember = async (id: number) => {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('members_id', id)

      if (error) {
        console.error('[Members:handleDeleteMember] Error deleting member:', error)
        setError('Failed to delete member. Please try again.')
        return
      }

      setMembers(prev => prev.filter(member => member.members_id !== id))
      setFilteredMembers(prev => prev.filter(member => member.members_id !== id))
      setError('')
    } catch (error) {
      console.error('[Members:handleDeleteMember] Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    }
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
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-black border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Members</h1>
              <p className="text-gray-400 text-sm mt-1">Manage your martial arts club members</p>
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
                {isLoadingMembers ? 'Loading...' : `${filteredMembers.length} of ${members.length} member${members.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={addTestMember}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Add Test Member
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Member
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search anything about a member - name, email, phone, address, emergency contact, medical info, notes, etc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-400">
                {filteredMembers.length === 0 ? 'No members found matching your search.' : `Found ${filteredMembers.length} member${filteredMembers.length !== 1 ? 's' : ''} matching "${searchQuery}"`}
              </div>
            )}
          </div>

          {/* Members Table */}
          <MembersTable
            members={filteredMembers}
            isLoading={isLoadingMembers}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
          />
        </main>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onAddMember={handleAddMember}
        />
      )}
    </div>
  )
}
