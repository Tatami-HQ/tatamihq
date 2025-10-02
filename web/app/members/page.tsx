'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'
import MembersTable from '../../components/MembersTable'
import MembersCards from '../../components/MembersCards'
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
  licence_expire_date: string | null
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<'name' | 'email' | 'join_date' | 'status' | 'age'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all')
  const [membershipTypeFilter, setMembershipTypeFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all')
  const router = useRouter()

  // Filter and sort function
  const filterAndSortMembers = () => {
    let filtered = [...members]

    // Apply search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim()
      
      filtered = filtered.filter(member => {
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
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    // Apply membership type filter
    if (membershipTypeFilter !== 'all') {
      filtered = filtered.filter(member => member.membership_type === membershipTypeFilter)
    }

    // Apply gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(member => member.gender === genderFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
          bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
          break
        case 'email':
          aValue = (a.email_address || '').toLowerCase()
          bValue = (b.email_address || '').toLowerCase()
          break
        case 'join_date':
          aValue = new Date(a.join_date || '1900-01-01')
          bValue = new Date(b.join_date || '1900-01-01')
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'age':
          aValue = calculateAge(a.date_of_birth)
          bValue = calculateAge(b.date_of_birth)
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredMembers(filtered)
  }

  // Helper function to calculate age
  const calculateAge = (dob: string | null) => {
    if (!dob) return 0
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  // Update filtered members when filters or sort changes
  useEffect(() => {
    if (members.length > 0) {
      filterAndSortMembers()
    }
  }, [searchQuery, members, sortField, sortOrder, statusFilter, membershipTypeFilter, genderFilter])

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
              
              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  showFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters & Sort
              </button>
            </div>
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    viewMode === 'cards' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    viewMode === 'table' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                  </svg>
                </button>
              </div>
              
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

          {/* Filters and Sort Panel */}
          {showFilters && (
            <div className="mb-6 bg-white/5 rounded-lg border border-white/10 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sort Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as 'name' | 'email' | 'join_date' | 'status' | 'age')}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="name" className="bg-gray-800">Name</option>
                    <option value="email" className="bg-gray-800">Email</option>
                    <option value="join_date" className="bg-gray-800">Join Date</option>
                    <option value="status" className="bg-gray-800">Status</option>
                    <option value="age" className="bg-gray-800">Age</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="asc" className="bg-gray-800">Ascending</option>
                    <option value="desc" className="bg-gray-800">Descending</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Active' | 'Inactive')}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all" className="bg-gray-800">All Statuses</option>
                    <option value="Active" className="bg-gray-800">Active</option>
                    <option value="Inactive" className="bg-gray-800">Inactive</option>
                  </select>
                </div>

                {/* Membership Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Membership Type</label>
                  <select
                    value={membershipTypeFilter}
                    onChange={(e) => setMembershipTypeFilter(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all" className="bg-gray-800">All Types</option>
                    <option value="Monthly" className="bg-gray-800">Monthly</option>
                    <option value="Quarterly" className="bg-gray-800">Quarterly</option>
                    <option value="Annual" className="bg-gray-800">Annual</option>
                    <option value="Family" className="bg-gray-800">Family</option>
                    <option value="Student" className="bg-gray-800">Student</option>
                    <option value="Senior" className="bg-gray-800">Senior</option>
                    <option value="Trial" className="bg-gray-800">Trial</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setMembershipTypeFilter('all')
                    setGenderFilter('all')
                    setSortField('name')
                    setSortOrder('asc')
                  }}
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}

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

          {/* Members View */}
          {viewMode === 'table' ? (
            <MembersTable
              members={filteredMembers}
              isLoading={isLoadingMembers}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
            />
          ) : (
            <MembersCards
              members={filteredMembers}
              isLoading={isLoadingMembers}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
            />
          )}
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
