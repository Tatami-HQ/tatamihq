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

export default function MartialArtProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [martialArt, setMartialArt] = useState<MartialArt | null>(null)
  const [classes, setClasses] = useState<MartialArtClass[]>([])
  const [isLoadingMartialArt, setIsLoadingMartialArt] = useState(false)
  const [isLoadingClasses, setIsLoadingClasses] = useState(false)
  const [showAddClass, setShowAddClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [isAddingClass, setIsAddingClass] = useState(false)
  const [editingClass, setEditingClass] = useState<MartialArtClass | null>(null)
  const [editClassName, setEditClassName] = useState('')
  const [isUpdatingClass, setIsUpdatingClass] = useState(false)
  const [isDeletingClass, setIsDeletingClass] = useState<number | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const martialArtId = params.id as string

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('[MartialArtProfile:getUser] Error fetching user:', error)
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
    if (user && martialArtId) {
      fetchMartialArt()
      fetchClasses()
    }
  }, [user, martialArtId])

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

  const fetchClasses = async () => {
    try {
      setIsLoadingClasses(true)
      const { data, error } = await supabase
        .from('martial_art_classes')
        .select('*')
        .eq('martial_art_id', martialArtId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching classes:', error)
        return
      }

      setClasses(data || [])
    } catch (error) {
      console.error('Unexpected error fetching classes:', error)
    } finally {
      setIsLoadingClasses(false)
    }
  }

  const handleAddClass = async () => {
    if (!newClassName.trim()) return

    try {
      setIsAddingClass(true)
      const { data, error } = await supabase
        .from('martial_art_classes')
        .insert([{ 
          martial_art_id: parseInt(martialArtId),
          name: newClassName.trim() 
        }])
        .select()

      if (error) {
        console.error('Error adding class:', error)
        return
      }

      if (data && data[0]) {
        setClasses(prev => [...prev, data[0]])
        setNewClassName('')
        setShowAddClass(false)
      }
    } catch (error) {
      console.error('Unexpected error adding class:', error)
    } finally {
      setIsAddingClass(false)
    }
  }

  const handleUpdateClass = async (id: number) => {
    if (!editClassName.trim()) return

    try {
      setIsUpdatingClass(true)
      const { data, error } = await supabase
        .from('martial_art_classes')
        .update({ name: editClassName.trim() })
        .eq('martial_art_classes_id', id)
        .select()

      if (error) {
        console.error('Error updating class:', error)
        return
      }

      if (data && data[0]) {
        setClasses(prev => prev.map(cls => 
          cls.martial_art_classes_id === id ? data[0] : cls
        ))
        setEditingClass(null)
        setEditClassName('')
      }
    } catch (error) {
      console.error('Unexpected error updating class:', error)
    } finally {
      setIsUpdatingClass(false)
    }
  }

  const handleDeleteClass = async (id: number) => {
    try {
      setIsDeletingClass(id)
      const { error } = await supabase
        .from('martial_art_classes')
        .delete()
        .eq('martial_art_classes_id', id)

      if (error) {
        console.error('Error deleting class:', error)
        return
      }

      setClasses(prev => prev.filter(cls => cls.martial_art_classes_id !== id))
    } catch (error) {
      console.error('Unexpected error deleting class:', error)
    } finally {
      setIsDeletingClass(null)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[MartialArtProfile:handleLogout] Logout error:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('[MartialArtProfile:handleLogout] Unexpected error:', error)
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
            onClick={() => router.push('/settings')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Back to Settings
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
              onClick={() => router.push('/settings')}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {isLoadingMartialArt ? 'Loading...' : martialArt?.name || 'Martial Art'}
              </h1>
              <p className="text-sm text-gray-400">Manage classes and training programs</p>
            </div>
          </div>
          <ProfileDropdown 
            user={user} 
            isLoggingOut={isLoggingOut} 
            onLogout={handleLogout} 
          />
        </header>

        {/* Martial Art Profile Content */}
        <main 
          className="flex-1 p-4 sm:p-8 overflow-y-auto sm:pb-8"
          style={{
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {/* Martial Art Info Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mr-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {martialArt?.name || 'Loading...'}
                </h2>
                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Added {martialArt ? new Date(martialArt.created_at).toLocaleDateString() : '...'}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    {classes.length} class{classes.length !== 1 ? 'es' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Classes Management */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Classes</h3>
                  <p className="text-sm text-gray-400">Manage training classes and programs</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddClass(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Class
              </button>
            </div>

            {/* Add Class Form */}
            {showAddClass && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Add New Class</h4>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Enter class name (e.g., Beginner Karate, Advanced Taekwondo)"
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddClass()}
                  />
                  <button
                    onClick={handleAddClass}
                    disabled={isAddingClass || !newClassName.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    {isAddingClass ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Add'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddClass(false)
                      setNewClassName('')
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Classes List */}
            <div className="space-y-3">
              {isLoadingClasses ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">No classes added yet</p>
                  <p className="text-gray-500 text-xs mt-1">Click "Add Class" to get started</p>
                </div>
              ) : (
                classes.map((cls) => (
                  <div key={cls.martial_art_classes_id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-200 cursor-pointer group" onClick={() => {
                    console.log('Navigating to class:', cls.martial_art_classes_id, 'for martial art:', martialArtId)
                    router.push(`/martial-arts/${martialArtId}/classes/${cls.martial_art_classes_id}`)
                  }}>
                        {editingClass?.martial_art_classes_id === cls.martial_art_classes_id ? (
                          <div className="flex-1 flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editClassName}
                          onChange={(e) => setEditClassName(e.target.value)}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => e.key === 'Enter' && handleUpdateClass(cls.martial_art_classes_id)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateClass(cls.martial_art_classes_id)}
                          disabled={isUpdatingClass || !editClassName.trim()}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          {isUpdatingClass ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingClass(null)
                            setEditClassName('')
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                        ) : (
                          <>
                            <div className="flex items-center flex-1">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-white font-medium group-hover:text-blue-400 transition-colors duration-200">{cls.name}</div>
                                <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                                  Added {new Date(cls.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingClass(cls)
                              setEditClassName(cls.name || '')
                            }}
                            className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                            title="Edit class"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClass(cls.martial_art_classes_id)
                            }}
                            disabled={isDeletingClass === cls.martial_art_classes_id}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 disabled:opacity-50"
                            title="Delete class"
                          >
                            {isDeletingClass === cls.martial_art_classes_id ? (
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
