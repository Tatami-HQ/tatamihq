'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import ProfileDropdown from '@/components/ProfileDropdown'
import MobileBottomNav from '@/components/MobileBottomNav'
import AnimatedBackground from '@/components/AnimatedBackground'

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

export default function ClassProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [martialArt, setMartialArt] = useState<MartialArt | null>(null)
  const [martialArtClass, setMartialArtClass] = useState<MartialArtClass | null>(null)
  const [belts, setBelts] = useState<BeltSystem[]>([])
  const [isLoadingMartialArt, setIsLoadingMartialArt] = useState(false)
  const [isLoadingClass, setIsLoadingClass] = useState(false)
  const [isLoadingBelts, setIsLoadingBelts] = useState(false)
  const [showAddBelt, setShowAddBelt] = useState(false)
  const [newBeltName, setNewBeltName] = useState('')
  const [newBeltColor, setNewBeltColor] = useState('#000000')
  const [isAddingBelt, setIsAddingBelt] = useState(false)
  const [editingBelt, setEditingBelt] = useState<BeltSystem | null>(null)
  const [editBeltName, setEditBeltName] = useState('')
  const [editBeltColor, setEditBeltColor] = useState('#000000')
  const [isUpdatingBelt, setIsUpdatingBelt] = useState(false)
  const [isDeletingBelt, setIsDeletingBelt] = useState<number | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const martialArtId = params.id as string
  const classId = params.classId as string

  useEffect(() => {
    console.log('Class Profile - martialArtId:', martialArtId)
    console.log('Class Profile - classId:', classId)
    console.log('Class Profile - params:', params)
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('[ClassProfile:getUser] Error fetching user:', error)
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
    if (user && martialArtId && classId) {
      fetchMartialArt()
      fetchClass()
      fetchBelts()
    }
  }, [user, martialArtId, classId])

  const fetchMartialArt = async () => {
    try {
      setIsLoadingMartialArt(true)
      const { data, error } = await supabase
        .from('martial_art')
        .select('*')
        .eq('martial_art_id', martialArtId)
        .single()

      if (error) {
        console.error('Error fetching martial art:', error)
        setError('Martial art not found')
        return
      }

      setMartialArt(data)
    } catch (error) {
      console.error('Unexpected error fetching martial art:', error)
      setError('Failed to load martial art')
    } finally {
      setIsLoadingMartialArt(false)
    }
  }

  const fetchClass = async () => {
    try {
      setIsLoadingClass(true)
      const { data, error } = await supabase
        .from('martial_art_classes')
        .select('*')
        .eq('martial_art_classes_id', classId)
        .single()

      if (error) {
        console.error('Error fetching class:', error)
        setError('Class not found')
        return
      }

      setMartialArtClass(data)
    } catch (error) {
      console.error('Unexpected error fetching class:', error)
      setError('Failed to load class')
    } finally {
      setIsLoadingClass(false)
    }
  }

  const fetchBelts = async () => {
    try {
      setIsLoadingBelts(true)
      const { data, error } = await supabase
        .from('belt_system')
        .select('*')
        .eq('martial_art_classes_id', classId)
        .order('belt_order', { ascending: true })

      if (error) {
        console.error('Error fetching belts:', error)
        return
      }

      setBelts(data || [])
    } catch (error) {
      console.error('Unexpected error fetching belts:', error)
    } finally {
      setIsLoadingBelts(false)
    }
  }

  const handleAddBelt = async () => {
    if (!newBeltName.trim()) return

    try {
      setIsAddingBelt(true)
      
      // Get the next belt order
      const nextOrder = belts.length > 0 ? Math.max(...belts.map(b => b.belt_order || 0)) + 1 : 1
      
      const { data, error } = await supabase
        .from('belt_system')
        .insert([{ 
          martial_art_id: parseInt(martialArtId),
          martial_art_classes_id: parseInt(classId),
          belt_name: newBeltName.trim(),
          belt_order: nextOrder,
          colour_hex: newBeltColor
        }])
        .select()

      if (error) {
        console.error('Error adding belt:', error)
        return
      }

      if (data && data[0]) {
        setBelts(prev => [...prev, data[0]])
        setNewBeltName('')
        setNewBeltColor('#000000')
        setShowAddBelt(false)
      }
    } catch (error) {
      console.error('Unexpected error adding belt:', error)
    } finally {
      setIsAddingBelt(false)
    }
  }

  const handleUpdateBelt = async (id: number) => {
    if (!editBeltName.trim()) return

    try {
      setIsUpdatingBelt(true)
      const { data, error } = await supabase
        .from('belt_system')
        .update({ 
          belt_name: editBeltName.trim(),
          colour_hex: editBeltColor,
          updated_at: new Date().toISOString()
        })
        .eq('belt_system_id', id)
        .select()

      if (error) {
        console.error('Error updating belt:', error)
        return
      }

      if (data && data[0]) {
        setBelts(prev => prev.map(belt => 
          belt.belt_system_id === id ? data[0] : belt
        ))
        setEditingBelt(null)
        setEditBeltName('')
        setEditBeltColor('#000000')
      }
    } catch (error) {
      console.error('Unexpected error updating belt:', error)
    } finally {
      setIsUpdatingBelt(false)
    }
  }

  const handleDeleteBelt = async (id: number) => {
    try {
      setIsDeletingBelt(id)
      const { error } = await supabase
        .from('belt_system')
        .delete()
        .eq('belt_system_id', id)

      if (error) {
        console.error('Error deleting belt:', error)
        return
      }

      setBelts(prev => prev.filter(belt => belt.belt_system_id !== id))
    } catch (error) {
      console.error('Unexpected error deleting belt:', error)
    } finally {
      setIsDeletingBelt(null)
    }
  }

  const handleReorderBelts = async (beltId: number, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('belt_system')
        .update({ 
          belt_order: newOrder,
          updated_at: new Date().toISOString()
        })
        .eq('belt_system_id', beltId)

      if (error) {
        console.error('Error reordering belt:', error)
        return
      }

      // Update local state
      setBelts(prev => {
        const updatedBelts = [...prev]
        const beltIndex = updatedBelts.findIndex(b => b.belt_system_id === beltId)
        if (beltIndex !== -1) {
          updatedBelts[beltIndex].belt_order = newOrder
          // Sort by belt_order
          updatedBelts.sort((a, b) => (a.belt_order || 0) - (b.belt_order || 0))
        }
        return updatedBelts
      })
    } catch (error) {
      console.error('Unexpected error reordering belt:', error)
    }
  }

  const moveBeltUp = (beltId: number, currentOrder: number) => {
    if (currentOrder > 1) {
      handleReorderBelts(beltId, currentOrder - 1)
    }
  }

  const moveBeltDown = (beltId: number, currentOrder: number) => {
    if (currentOrder < belts.length) {
      handleReorderBelts(beltId, currentOrder + 1)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[ClassProfile:handleLogout] Logout error:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('[ClassProfile:handleLogout] Unexpected error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <AnimatedBackground />
        <div className="relative z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <AnimatedBackground />
        <div className="relative z-10 text-white">Redirecting to login...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <AnimatedBackground />
        <div className="relative z-10 text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push(`/martial-arts/${martialArtId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Back to Martial Art
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-black overflow-x-hidden relative">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden sm:block relative z-10">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-x-hidden relative z-10">
        {/* Header */}
        <header className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(`/martial-arts/${martialArtId}`)}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {isLoadingClass ? 'Loading...' : martialArtClass?.name || 'Class'}
              </h1>
              <p className="text-sm text-gray-400">
                {isLoadingMartialArt ? 'Loading...' : martialArt?.name || 'Martial Art'} • Belt System
              </p>
            </div>
          </div>
          <ProfileDropdown 
            user={user} 
            isLoggingOut={isLoggingOut} 
            onLogout={handleLogout} 
          />
        </header>

        {/* Class Profile Content */}
        <main 
          className="flex-1 p-4 sm:p-8 overflow-y-auto sm:pb-8"
          style={{
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {/* Class Info Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {martialArtClass?.name || 'Loading...'}
                </h2>
                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Added {martialArtClass ? new Date(martialArtClass.created_at).toLocaleDateString() : '...'}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    {belts.length} belt{belts.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Belt System Management */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Belt System</h3>
                  <p className="text-sm text-gray-400">Manage belt progression and colors</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBelt(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Belt
              </button>
            </div>

            {/* Add Belt Form */}
            {showAddBelt && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Add New Belt</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Belt Name</label>
                    <input
                      type="text"
                      value={newBeltName}
                      onChange={(e) => setNewBeltName(e.target.value)}
                      placeholder="Enter belt name (e.g., White Belt, Yellow Belt)"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddBelt()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Belt Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={newBeltColor}
                        onChange={(e) => setNewBeltColor(e.target.value)}
                        className="w-12 h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newBeltColor}
                        onChange={(e) => setNewBeltColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={handleAddBelt}
                    disabled={isAddingBelt || !newBeltName.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    {isAddingBelt ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Add Belt'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddBelt(false)
                      setNewBeltName('')
                      setNewBeltColor('#000000')
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Belts List */}
            <div className="space-y-3">
              {isLoadingBelts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : belts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">No belts added yet</p>
                  <p className="text-gray-500 text-xs mt-1">Click &quot;Add Belt&quot; to create the belt progression</p>
                </div>
              ) : (
                belts.map((belt, index) => (
                  <div key={belt.belt_system_id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-200">
                    {editingBelt?.belt_system_id === belt.belt_system_id ? (
                      <div className="flex-1 flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => moveBeltUp(belt.belt_system_id, belt.belt_order || 0)}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                            title="Move up"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveBeltDown(belt.belt_system_id, belt.belt_order || 0)}
                            disabled={index === belts.length - 1}
                            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                            title="Move down"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editBeltName}
                            onChange={(e) => setEditBeltName(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyPress={(e) => e.key === 'Enter' && handleUpdateBelt(belt.belt_system_id)}
                            autoFocus
                          />
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={editBeltColor}
                              onChange={(e) => setEditBeltColor(e.target.value)}
                              className="w-10 h-8 bg-white/10 border border-white/20 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={editBeltColor}
                              onChange={(e) => setEditBeltColor(e.target.value)}
                              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleUpdateBelt(belt.belt_system_id)}
                          disabled={isUpdatingBelt || !editBeltName.trim()}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          {isUpdatingBelt ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingBelt(null)
                            setEditBeltName('')
                            setEditBeltColor('#000000')
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center flex-1">
                          <div className="flex items-center space-x-2 mr-4">
                            <button
                              onClick={() => moveBeltUp(belt.belt_system_id, belt.belt_order || 0)}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                              title="Move up"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveBeltDown(belt.belt_system_id, belt.belt_order || 0)}
                              disabled={index === belts.length - 1}
                              className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                              title="Move down"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-8 h-8 rounded-lg border-2 border-white/20 flex items-center justify-center"
                              style={{ backgroundColor: belt.colour_hex || '#000000' }}
                            >
                              <span className="text-xs font-bold text-white mix-blend-difference">
                                {belt.belt_order}
                              </span>
                            </div>
                            <div>
                              <div className="text-white font-medium">{belt.belt_name}</div>
                              <div className="text-xs text-gray-400">
                                Order: {belt.belt_order} • {belt.colour_hex}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingBelt(belt)
                              setEditBeltName(belt.belt_name || '')
                              setEditBeltColor(belt.colour_hex || '#000000')
                            }}
                            className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                            title="Edit belt"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteBelt(belt.belt_system_id)}
                            disabled={isDeletingBelt === belt.belt_system_id}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 disabled:opacity-50"
                            title="Delete belt"
                          >
                            {isDeletingBelt === belt.belt_system_id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="relative z-10">
        <MobileBottomNav />
      </div>
    </div>
  )
}
