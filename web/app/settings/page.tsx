'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

interface CompetitionDiscipline {
  competition_disciplines_id: number
  created_at: string
  martial_art_id: number
  name: string
  team_event: boolean | null
}

interface Club {
  clubs_id: number
  created_at: string
  city: string | null
  country: string | null
  name: string | null
}

interface Location {
  location_id: number
  created_at: string
  clubs_id: number | null
  name: string | null
  address: string | null
  city: string | null
  postcode: string | null
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'martial-arts' | 'competitions' | 'club-info'>('general')
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    privacy: {
      profileVisibility: 'public',
      dataSharing: false
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC'
    },
    account: {
      twoFactor: false,
      sessionTimeout: 30
    }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  
  // Martial Arts state
  const [martialArts, setMartialArts] = useState<MartialArt[]>([])
  const [isLoadingMartialArts, setIsLoadingMartialArts] = useState(false)
  const [showAddMartialArt, setShowAddMartialArt] = useState(false)
  const [newMartialArtName, setNewMartialArtName] = useState('')
  const [isAddingMartialArt, setIsAddingMartialArt] = useState(false)
  const [editingMartialArt, setEditingMartialArt] = useState<MartialArt | null>(null)
  const [editMartialArtName, setEditMartialArtName] = useState('')
  const [isUpdatingMartialArt, setIsUpdatingMartialArt] = useState(false)
  const [isDeletingMartialArt, setIsDeletingMartialArt] = useState<number | null>(null)
  
  // Competition Disciplines state
  const [competitionDisciplines, setCompetitionDisciplines] = useState<CompetitionDiscipline[]>([])
  const [isLoadingCompetitionDisciplines, setIsLoadingCompetitionDisciplines] = useState(false)
  const [showAddCompetitionDiscipline, setShowAddCompetitionDiscipline] = useState(false)
  const [newCompetitionDiscipline, setNewCompetitionDiscipline] = useState({
    name: '',
    martial_art_id: null as number | null,
    team_event: false
  })
  const [isAddingCompetitionDiscipline, setIsAddingCompetitionDiscipline] = useState(false)
  const [editingCompetitionDiscipline, setEditingCompetitionDiscipline] = useState<CompetitionDiscipline | null>(null)
  const [editCompetitionDiscipline, setEditCompetitionDiscipline] = useState({
    name: '',
    martial_art_id: null as number | null,
    team_event: false
  })
  const [isUpdatingCompetitionDiscipline, setIsUpdatingCompetitionDiscipline] = useState(false)
  const [isDeletingCompetitionDiscipline, setIsDeletingCompetitionDiscipline] = useState<number | null>(null)
  
  // Club Info state
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoadingClubs, setIsLoadingClubs] = useState(false)
  const [showAddClub, setShowAddClub] = useState(false)
  const [newClub, setNewClub] = useState({
    name: '',
    city: '',
    country: ''
  })
  const [isAddingClub, setIsAddingClub] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [editClub, setEditClub] = useState({
    name: '',
    city: '',
    country: ''
  })
  const [isUpdatingClub, setIsUpdatingClub] = useState(false)
  const [isDeletingClub, setIsDeletingClub] = useState<number | null>(null)

  // Locations state
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null)
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    city: '',
    postcode: ''
  })
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [editLocation, setEditLocation] = useState({
    name: '',
    address: '',
    city: '',
    postcode: ''
  })
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)
  const [isDeletingLocation, setIsDeletingLocation] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('[Settings:getUser] Error fetching user:', error)
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

  // Load martial arts when martial arts tab is active
  useEffect(() => {
    if (activeTab === 'martial-arts' && user) {
      fetchMartialArts()
    }
  }, [activeTab, user])

  // Load competition disciplines when competitions tab is active
  useEffect(() => {
    if (activeTab === 'competitions' && user) {
      fetchMartialArts()
      fetchCompetitionDisciplines()
    }
  }, [activeTab, user])

  // Load club info when club-info tab is active
  useEffect(() => {
    if (activeTab === 'club-info' && user) {
      fetchClubs()
      fetchLocations()
    }
  }, [activeTab, user])

  const fetchMartialArts = async () => {
    try {
      setIsLoadingMartialArts(true)
      const { data, error } = await supabase
        .from('martial_art')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching martial arts:', error)
        return
      }

      setMartialArts(data || [])
    } catch (error) {
      console.error('Unexpected error fetching martial arts:', error)
    } finally {
      setIsLoadingMartialArts(false)
    }
  }

  const handleAddMartialArt = async () => {
    if (!newMartialArtName.trim()) return

    try {
      setIsAddingMartialArt(true)
      const { data, error } = await supabase
        .from('martial_art')
        .insert([{ name: newMartialArtName.trim() }])
        .select()

      if (error) {
        console.error('Error adding martial art:', error)
        return
      }

      if (data && data[0]) {
        setMartialArts(prev => [...prev, data[0]])
        setNewMartialArtName('')
        setShowAddMartialArt(false)
      }
    } catch (error) {
      console.error('Unexpected error adding martial art:', error)
    } finally {
      setIsAddingMartialArt(false)
    }
  }

  const handleUpdateMartialArt = async (id: number) => {
    if (!editMartialArtName.trim()) return

    try {
      setIsUpdatingMartialArt(true)
      const { data, error } = await supabase
        .from('martial_art')
        .update({ name: editMartialArtName.trim() })
        .eq('martial_art_id', id)
        .select()

      if (error) {
        console.error('Error updating martial art:', error)
        return
      }

      if (data && data[0]) {
        setMartialArts(prev => prev.map(art => 
          art.martial_art_id === id ? data[0] : art
        ))
        setEditingMartialArt(null)
        setEditMartialArtName('')
      }
    } catch (error) {
      console.error('Unexpected error updating martial art:', error)
    } finally {
      setIsUpdatingMartialArt(false)
    }
  }

  const handleDeleteMartialArt = async (id: number) => {
    try {
      setIsDeletingMartialArt(id)
      const { error } = await supabase
        .from('martial_art')
        .delete()
        .eq('martial_art_id', id)

      if (error) {
        console.error('Error deleting martial art:', error)
        return
      }

      setMartialArts(prev => prev.filter(art => art.martial_art_id !== id))
    } catch (error) {
      console.error('Unexpected error deleting martial art:', error)
    } finally {
      setIsDeletingMartialArt(null)
    }
  }

  const fetchCompetitionDisciplines = async () => {
    try {
      setIsLoadingCompetitionDisciplines(true)
      // First try a simple select to see if the table exists
      const { data, error } = await supabase
        .from('competition_disciplines')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching competition disciplines:', error)
        console.error('Full error details:', JSON.stringify(error, null, 2))
        return
      }

      console.log('Competition disciplines data:', data)
      setCompetitionDisciplines(data || [])
    } catch (error) {
      console.error('Unexpected error fetching competition disciplines:', error)
    } finally {
      setIsLoadingCompetitionDisciplines(false)
    }
  }

  const handleAddCompetitionDiscipline = async () => {
    if (!newCompetitionDiscipline.name.trim()) return
    if (!newCompetitionDiscipline.martial_art_id) return

    try {
      setIsAddingCompetitionDiscipline(true)
      const { data, error } = await supabase
        .from('competition_disciplines')
        .insert([{
          name: newCompetitionDiscipline.name.trim(),
          martial_art_id: newCompetitionDiscipline.martial_art_id,
          team_event: newCompetitionDiscipline.team_event
        }])
        .select()

      if (error) {
        console.error('Error adding competition discipline:', error)
        console.error('Full error details:', JSON.stringify(error, null, 2))
        return
      }

      if (data && data[0]) {
        setCompetitionDisciplines(prev => [...prev, data[0]])
        setNewCompetitionDiscipline({ name: '', martial_art_id: null, team_event: false })
        setShowAddCompetitionDiscipline(false)
      }
    } catch (error) {
      console.error('Unexpected error adding competition discipline:', error)
    } finally {
      setIsAddingCompetitionDiscipline(false)
    }
  }

  const handleUpdateCompetitionDiscipline = async (id: number) => {
    if (!editCompetitionDiscipline.name.trim()) return
    if (!editCompetitionDiscipline.martial_art_id) return

    try {
      setIsUpdatingCompetitionDiscipline(true)
      const { data, error } = await supabase
        .from('competition_disciplines')
        .update({
          name: editCompetitionDiscipline.name.trim(),
          martial_art_id: editCompetitionDiscipline.martial_art_id,
          team_event: editCompetitionDiscipline.team_event
        })
        .eq('competition_disciplines_id', id)
        .select()

      if (error) {
        console.error('Error updating competition discipline:', error)
        return
      }

      if (data && data[0]) {
        setCompetitionDisciplines(prev => prev.map(discipline => 
          discipline.competition_disciplines_id === id ? data[0] : discipline
        ))
        setEditingCompetitionDiscipline(null)
        setEditCompetitionDiscipline({ name: '', martial_art_id: null, team_event: false })
      }
    } catch (error) {
      console.error('Unexpected error updating competition discipline:', error)
    } finally {
      setIsUpdatingCompetitionDiscipline(false)
    }
  }

  const handleDeleteCompetitionDiscipline = async (id: number) => {
    try {
      setIsDeletingCompetitionDiscipline(id)
      const { error } = await supabase
        .from('competition_disciplines')
        .delete()
        .eq('competition_disciplines_id', id)

      if (error) {
        console.error('Error deleting competition discipline:', error)
        return
      }

      setCompetitionDisciplines(prev => prev.filter(discipline => discipline.competition_disciplines_id !== id))
    } catch (error) {
      console.error('Unexpected error deleting competition discipline:', error)
    } finally {
      setIsDeletingCompetitionDiscipline(null)
    }
  }

  // Club management functions
  const fetchClubs = async () => {
    try {
      setIsLoadingClubs(true)
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching clubs:', error)
        return
      }

      setClubs(data || [])
    } catch (error) {
      console.error('Unexpected error fetching clubs:', error)
    } finally {
      setIsLoadingClubs(false)
    }
  }

  const handleAddClub = async () => {
    if (!newClub.name.trim()) return

    try {
      setIsAddingClub(true)
      const { data, error } = await supabase
        .from('clubs')
        .insert([{
          name: newClub.name.trim(),
          city: newClub.city.trim() || null,
          country: newClub.country.trim() || null
        }])
        .select()

      if (error) {
        console.error('Error adding club:', error)
        return
      }

      if (data && data[0]) {
        setClubs(prev => [...prev, data[0]])
        setNewClub({ name: '', city: '', country: '' })
        setShowAddClub(false)
      }
    } catch (error) {
      console.error('Unexpected error adding club:', error)
    } finally {
      setIsAddingClub(false)
    }
  }

  const handleUpdateClub = async (id: number) => {
    if (!editClub.name.trim()) return

    try {
      setIsUpdatingClub(true)
      const { data, error } = await supabase
        .from('clubs')
        .update({
          name: editClub.name.trim(),
          city: editClub.city.trim() || null,
          country: editClub.country.trim() || null
        })
        .eq('clubs_id', id)
        .select()

      if (error) {
        console.error('Error updating club:', error)
        return
      }

      if (data && data[0]) {
        setClubs(prev => prev.map(club => 
          club.clubs_id === id ? data[0] : club
        ))
        setEditingClub(null)
        setEditClub({ name: '', city: '', country: '' })
      }
    } catch (error) {
      console.error('Unexpected error updating club:', error)
    } finally {
      setIsUpdatingClub(false)
    }
  }

  const handleDeleteClub = async (id: number) => {
    try {
      setIsDeletingClub(id)
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('clubs_id', id)

      if (error) {
        console.error('Error deleting club:', error)
        return
      }

      setClubs(prev => prev.filter(club => club.clubs_id !== id))
      // Also remove locations for this club
      setLocations(prev => prev.filter(location => location.clubs_id !== id))
    } catch (error) {
      console.error('Unexpected error deleting club:', error)
    } finally {
      setIsDeletingClub(null)
    }
  }

  // Location management functions
  const fetchLocations = async () => {
    try {
      setIsLoadingLocations(true)
      const { data, error } = await supabase
        .from('location')
        .select(`
          *,
          club:clubs_id(name)
        `)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching locations:', error)
        return
      }

      setLocations(data || [])
    } catch (error) {
      console.error('Unexpected error fetching locations:', error)
    } finally {
      setIsLoadingLocations(false)
    }
  }

  const handleAddLocation = async () => {
    if (!newLocation.name.trim() || !selectedClubId) return

    try {
      setIsAddingLocation(true)
      const { data, error } = await supabase
        .from('location')
        .insert([{
          name: newLocation.name.trim(),
          address: newLocation.address.trim() || null,
          city: newLocation.city.trim() || null,
          postcode: newLocation.postcode.trim() || null,
          clubs_id: selectedClubId
        }])
        .select()

      if (error) {
        console.error('Error adding location:', error)
        return
      }

      if (data && data[0]) {
        setLocations(prev => [...prev, data[0]])
        setNewLocation({ name: '', address: '', city: '', postcode: '' })
        setSelectedClubId(null)
        setShowAddLocation(false)
      }
    } catch (error) {
      console.error('Unexpected error adding location:', error)
    } finally {
      setIsAddingLocation(false)
    }
  }

  const handleUpdateLocation = async (id: number) => {
    if (!editLocation.name.trim()) return

    try {
      setIsUpdatingLocation(true)
      const { data, error } = await supabase
        .from('location')
        .update({
          name: editLocation.name.trim(),
          address: editLocation.address.trim() || null,
          city: editLocation.city.trim() || null,
          postcode: editLocation.postcode.trim() || null
        })
        .eq('location_id', id)
        .select()

      if (error) {
        console.error('Error updating location:', error)
        return
      }

      if (data && data[0]) {
        setLocations(prev => prev.map(location => 
          location.location_id === id ? data[0] : location
        ))
        setEditingLocation(null)
        setEditLocation({ name: '', address: '', city: '', postcode: '' })
      }
    } catch (error) {
      console.error('Unexpected error updating location:', error)
    } finally {
      setIsUpdatingLocation(false)
    }
  }

  const handleDeleteLocation = async (id: number) => {
    try {
      setIsDeletingLocation(id)
      const { error } = await supabase
        .from('location')
        .delete()
        .eq('location_id', id)

      if (error) {
        console.error('Error deleting location:', error)
        return
      }

      setLocations(prev => prev.filter(location => location.location_id !== id))
    } catch (error) {
      console.error('Unexpected error deleting location:', error)
    } finally {
      setIsDeletingLocation(null)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[Settings:handleLogout] Logout error:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('[Settings:handleLogout] Unexpected error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      // Simulate API call - in a real app, you'd save to your backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveMessage('Error saving settings. Please try again.')
    } finally {
      setIsSaving(false)
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
            <h1 className="text-xl font-semibold text-white">Settings</h1>
          </div>
          <ProfileDropdown 
            user={user} 
            isLoggingOut={isLoggingOut} 
            onLogout={handleLogout} 
          />
        </header>

        {/* Settings Content */}
        <main 
          className="flex-1 p-4 sm:p-8 overflow-y-auto sm:pb-8"
          style={{
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'general'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                General Settings
              </button>
              <button
                onClick={() => setActiveTab('martial-arts')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'martial-arts'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Martial Arts
              </button>
              <button
                onClick={() => setActiveTab('competitions')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'competitions'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Competitions
              </button>
              <button
                onClick={() => setActiveTab('club-info')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'club-info'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Club Info
              </button>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`mb-6 p-4 rounded-lg border ${
              saveMessage.includes('success') 
                ? 'bg-green-900/20 border-green-500/30 text-green-400' 
                : 'bg-red-900/20 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{saveMessage}</span>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'general' && (
            <div className="space-y-6">
            {/* Notifications Settings */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 5.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Notifications</h2>
                  <p className="text-sm text-gray-400">Manage your notification preferences</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-white font-medium">Email Notifications</div>
                      <div className="text-sm text-gray-400">Receive updates via email</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 5.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" />
                    </svg>
                    <div>
                      <div className="text-white font-medium">Push Notifications</div>
                      <div className="text-sm text-gray-400">Receive push notifications on your device</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.push}
                      onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-white font-medium">SMS Notifications</div>
                      <div className="text-sm text-gray-400">Receive text message updates</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms}
                      onChange={(e) => handleSettingChange('notifications', 'sms', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Privacy & Security</h2>
                  <p className="text-sm text-gray-400">Control your privacy and security settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <label className="block text-white font-medium mb-2">Profile Visibility</label>
                  <select
                    value={settings.privacy.profileVisibility}
                    onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="public" className="bg-gray-800">Public</option>
                    <option value="private" className="bg-gray-800">Private</option>
                    <option value="friends" className="bg-gray-800">Friends Only</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <div className="text-white font-medium">Data Sharing</div>
                      <div className="text-sm text-gray-400">Allow data sharing for analytics</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.privacy.dataSharing}
                      onChange={(e) => handleSettingChange('privacy', 'dataSharing', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Preferences Settings */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Preferences</h2>
                  <p className="text-sm text-gray-400">Customize your experience</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <label className="block text-white font-medium mb-2">Theme</label>
                  <select
                    value={settings.preferences.theme}
                    onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="dark" className="bg-gray-800">Dark</option>
                    <option value="light" className="bg-gray-800">Light</option>
                    <option value="auto" className="bg-gray-800">Auto</option>
                  </select>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <label className="block text-white font-medium mb-2">Language</label>
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en" className="bg-gray-800">English</option>
                    <option value="es" className="bg-gray-800">Spanish</option>
                    <option value="fr" className="bg-gray-800">French</option>
                    <option value="de" className="bg-gray-800">German</option>
                  </select>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <label className="block text-white font-medium mb-2">Timezone</label>
                  <select
                    value={settings.preferences.timezone}
                    onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="UTC" className="bg-gray-800">UTC</option>
                    <option value="EST" className="bg-gray-800">Eastern Time</option>
                    <option value="PST" className="bg-gray-800">Pacific Time</option>
                    <option value="GMT" className="bg-gray-800">Greenwich Mean Time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Account</h2>
                  <p className="text-sm text-gray-400">Manage your account settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <div className="text-white font-medium">Two-Factor Authentication</div>
                      <div className="text-sm text-gray-400">Add an extra layer of security</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.account.twoFactor}
                      onChange={(e) => handleSettingChange('account', 'twoFactor', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <label className="block text-white font-medium mb-2">Session Timeout (minutes)</label>
                  <select
                    value={settings.account.sessionTimeout}
                    onChange={(e) => handleSettingChange('account', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={15} className="bg-gray-800">15 minutes</option>
                    <option value={30} className="bg-gray-800">30 minutes</option>
                    <option value={60} className="bg-gray-800">1 hour</option>
                    <option value={120} className="bg-gray-800">2 hours</option>
                    <option value={480} className="bg-gray-800">8 hours</option>
                  </select>
                </div>
              </div>
            </div>

              {/* Save Button */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Martial Arts Tab */}
          {activeTab === 'martial-arts' && (
            <div className="space-y-6">
              {/* Martial Arts Management */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Martial Arts</h2>
                      <p className="text-sm text-gray-400">Manage the martial arts you teach</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddMartialArt(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Martial Art
                  </button>
                </div>

                {/* Add Martial Art Form */}
                {showAddMartialArt && (
                  <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Add New Martial Art</h3>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newMartialArtName}
                        onChange={(e) => setNewMartialArtName(e.target.value)}
                        placeholder="Enter martial art name (e.g., Karate, Taekwondo, Judo)"
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddMartialArt()}
                      />
                      <button
                        onClick={handleAddMartialArt}
                        disabled={isAddingMartialArt || !newMartialArtName.trim()}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                      >
                        {isAddingMartialArt ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Add'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddMartialArt(false)
                          setNewMartialArtName('')
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Martial Arts List */}
                <div className="space-y-3">
                  {isLoadingMartialArts ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : martialArts.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm">No martial arts added yet</p>
                      <p className="text-gray-500 text-xs mt-1">Click "Add Martial Art" to get started</p>
                    </div>
                  ) : (
                    martialArts.map((art) => (
                      <div key={art.martial_art_id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-200 cursor-pointer group" onClick={() => {
                        console.log('Navigating to martial art:', art.martial_art_id)
                        router.push(`/martial-arts/${art.martial_art_id}`)
                      }}>
                        {editingMartialArt?.martial_art_id === art.martial_art_id ? (
                          <div className="flex-1 flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editMartialArtName}
                              onChange={(e) => setEditMartialArtName(e.target.value)}
                              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              onKeyPress={(e) => e.key === 'Enter' && handleUpdateMartialArt(art.martial_art_id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateMartialArt(art.martial_art_id)}
                              disabled={isUpdatingMartialArt || !editMartialArtName.trim()}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            >
                              {isUpdatingMartialArt ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                'Save'
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingMartialArt(null)
                                setEditMartialArtName('')
                              }}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center flex-1">
                              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-white font-medium group-hover:text-blue-400 transition-colors duration-200">{art.name}</div>
                                <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                                  Added {new Date(art.created_at).toLocaleDateString()}
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
                                  setEditingMartialArt(art)
                                  setEditMartialArtName(art.name || '')
                                }}
                                className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                                title="Edit martial art"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteMartialArt(art.martial_art_id)
                                }}
                                disabled={isDeletingMartialArt === art.martial_art_id}
                                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 disabled:opacity-50"
                                title="Delete martial art"
                              >
                                {isDeletingMartialArt === art.martial_art_id ? (
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
            </div>
          )}

          {/* Competitions Tab */}
          {activeTab === 'competitions' && (
            <div className="space-y-6">
              {/* Competition Disciplines Management */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Competition Disciplines</h2>
                      <p className="text-sm text-gray-400">Manage competition disciplines and categories</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddCompetitionDiscipline(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Discipline
                  </button>
                </div>

                {/* Add Competition Discipline Form */}
                {showAddCompetitionDiscipline && (
                  <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Add New Competition Discipline</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Discipline Name *
                        </label>
                        <input
                          type="text"
                          value={newCompetitionDiscipline.name}
                          onChange={(e) => setNewCompetitionDiscipline(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter discipline name (e.g., Kata, Kumite, Sparring)"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Martial Art *
                        </label>
                        <select
                          value={newCompetitionDiscipline.martial_art_id || ''}
                          onChange={(e) => setNewCompetitionDiscipline(prev => ({ ...prev, martial_art_id: e.target.value ? parseInt(e.target.value) : null }))}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="" className="bg-gray-800">Select martial art</option>
                          {martialArts.map((art) => (
                            <option key={art.martial_art_id} value={art.martial_art_id} className="bg-gray-800">
                              {art.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="team_event"
                          checked={newCompetitionDiscipline.team_event}
                          onChange={(e) => setNewCompetitionDiscipline(prev => ({ ...prev, team_event: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <label htmlFor="team_event" className="text-sm font-medium text-gray-300">
                          Team Event
                        </label>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAddCompetitionDiscipline}
                        disabled={isAddingCompetitionDiscipline || !newCompetitionDiscipline.name.trim() || !newCompetitionDiscipline.martial_art_id}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                      >
                        {isAddingCompetitionDiscipline ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Add Discipline'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCompetitionDiscipline(false)
                          setNewCompetitionDiscipline({ name: '', martial_art_id: null, team_event: false })
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Competition Disciplines List */}
                <div className="space-y-3">
                  {isLoadingCompetitionDisciplines ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : competitionDisciplines.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm">No competition disciplines added yet</p>
                      <p className="text-gray-500 text-xs mt-1">Click "Add Discipline" to get started</p>
                    </div>
                  ) : (
                    competitionDisciplines.map((discipline) => (
                      <div key={discipline.competition_disciplines_id} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-200">
                        {editingCompetitionDiscipline?.competition_disciplines_id === discipline.competition_disciplines_id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Discipline Name *
                                </label>
                                <input
                                  type="text"
                                  value={editCompetitionDiscipline.name}
                                  onChange={(e) => setEditCompetitionDiscipline(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Martial Art *
                                </label>
                                <select
                                  value={editCompetitionDiscipline.martial_art_id || ''}
                                  onChange={(e) => setEditCompetitionDiscipline(prev => ({ ...prev, martial_art_id: e.target.value ? parseInt(e.target.value) : null }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="" className="bg-gray-800">Select martial art</option>
                                  {martialArts.map((art) => (
                                    <option key={art.martial_art_id} value={art.martial_art_id} className="bg-gray-800">
                                      {art.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="mb-4">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id="edit_team_event"
                                  checked={editCompetitionDiscipline.team_event}
                                  onChange={(e) => setEditCompetitionDiscipline(prev => ({ ...prev, team_event: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <label htmlFor="edit_team_event" className="text-sm font-medium text-gray-300">
                                  Team Event
                                </label>
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleUpdateCompetitionDiscipline(discipline.competition_disciplines_id)}
                                disabled={isUpdatingCompetitionDiscipline || !editCompetitionDiscipline.name.trim() || !editCompetitionDiscipline.martial_art_id}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                              >
                                {isUpdatingCompetitionDiscipline ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  'Save'
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCompetitionDiscipline(null)
                                  setEditCompetitionDiscipline({ name: '', martial_art_id: null, team_event: false })
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-white font-medium">{discipline.name}</div>
                                <div className="text-xs text-gray-400">
                                  {discipline.team_event && `Team Event`}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Added {new Date(discipline.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingCompetitionDiscipline(discipline)
                                  setEditCompetitionDiscipline({
                                    name: discipline.name || '',
                                    martial_art_id: discipline.martial_art_id,
                                    team_event: discipline.team_event || false
                                  })
                                }}
                                className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                                title="Edit discipline"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteCompetitionDiscipline(discipline.competition_disciplines_id)}
                                disabled={isDeletingCompetitionDiscipline === discipline.competition_disciplines_id}
                                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 disabled:opacity-50"
                                title="Delete discipline"
                              >
                                {isDeletingCompetitionDiscipline === discipline.competition_disciplines_id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Club Info Tab */}
          {activeTab === 'club-info' && (
            <div className="space-y-6">
              {/* Club Management */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Club Information</h2>
                      <p className="text-sm text-gray-400">Manage your club details and information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddClub(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Club
                  </button>
                </div>

                {/* Add Club Form */}
                {showAddClub && (
                  <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Add New Club</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Club Name *
                        </label>
                        <input
                          type="text"
                          value={newClub.name}
                          onChange={(e) => setNewClub(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter club name"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={newClub.city}
                          onChange={(e) => setNewClub(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Enter city"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          value={newClub.country}
                          onChange={(e) => setNewClub(prev => ({ ...prev, country: e.target.value }))}
                          placeholder="Enter country"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAddClub}
                        disabled={isAddingClub || !newClub.name.trim()}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                      >
                        {isAddingClub ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Add Club'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddClub(false)
                          setNewClub({ name: '', city: '', country: '' })
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Clubs List */}
                <div className="space-y-3">
                  {isLoadingClubs ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : clubs.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm">No clubs added yet</p>
                      <p className="text-gray-500 text-xs mt-1">Click "Add Club" to get started</p>
                    </div>
                  ) : (
                    clubs.map((club) => (
                      <div key={club.clubs_id} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-200">
                        {editingClub?.clubs_id === club.clubs_id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Club Name *
                                </label>
                                <input
                                  type="text"
                                  value={editClub.name}
                                  onChange={(e) => setEditClub(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  City
                                </label>
                                <input
                                  type="text"
                                  value={editClub.city}
                                  onChange={(e) => setEditClub(prev => ({ ...prev, city: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Country
                                </label>
                                <input
                                  type="text"
                                  value={editClub.country}
                                  onChange={(e) => setEditClub(prev => ({ ...prev, country: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleUpdateClub(club.clubs_id)}
                                disabled={isUpdatingClub || !editClub.name.trim()}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                              >
                                {isUpdatingClub ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  'Save'
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingClub(null)
                                  setEditClub({ name: '', city: '', country: '' })
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-white font-medium">{club.name}</div>
                                <div className="text-xs text-gray-400">
                                  {club.city && `City: ${club.city}`}
                                  {club.country && ` • Country: ${club.country}`}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Added {new Date(club.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingClub(club)
                                  setEditClub({
                                    name: club.name || '',
                                    city: club.city || '',
                                    country: club.country || ''
                                  })
                                }}
                                className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                                title="Edit club"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteClub(club.clubs_id)}
                                disabled={isDeletingClub === club.clubs_id}
                                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 disabled:opacity-50"
                                title="Delete club"
                              >
                                {isDeletingClub === club.clubs_id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Locations Management */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Club Locations</h2>
                      <p className="text-sm text-gray-400">Manage multiple locations for your clubs</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddLocation(true)}
                    disabled={clubs.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Location
                  </button>
                </div>

                {/* Add Location Form */}
                {showAddLocation && (
                  <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Add New Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Club *
                        </label>
                        <select
                          value={selectedClubId || ''}
                          onChange={(e) => setSelectedClubId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="" className="bg-gray-800">Select a club</option>
                          {clubs.map((club) => (
                            <option key={club.clubs_id} value={club.clubs_id} className="bg-gray-800">
                              {club.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Location Name *
                        </label>
                        <input
                          type="text"
                          value={newLocation.name}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter location name"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          value={newLocation.address}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Enter address"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={newLocation.city}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Enter city"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Postcode
                        </label>
                        <input
                          type="text"
                          value={newLocation.postcode}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, postcode: e.target.value }))}
                          placeholder="Enter postcode"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAddLocation}
                        disabled={isAddingLocation || !newLocation.name.trim() || !selectedClubId}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                      >
                        {isAddingLocation ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Add Location'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddLocation(false)
                          setNewLocation({ name: '', address: '', city: '', postcode: '' })
                          setSelectedClubId(null)
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Locations List */}
                <div className="space-y-3">
                  {isLoadingLocations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : locations.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm">No locations added yet</p>
                      <p className="text-gray-500 text-xs mt-1">Add a club first, then click "Add Location"</p>
                    </div>
                  ) : (
                    locations.map((location) => (
                      <div key={location.location_id} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-200">
                        {editingLocation?.location_id === location.location_id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Location Name *
                                </label>
                                <input
                                  type="text"
                                  value={editLocation.name}
                                  onChange={(e) => setEditLocation(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Address
                                </label>
                                <input
                                  type="text"
                                  value={editLocation.address}
                                  onChange={(e) => setEditLocation(prev => ({ ...prev, address: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  City
                                </label>
                                <input
                                  type="text"
                                  value={editLocation.city}
                                  onChange={(e) => setEditLocation(prev => ({ ...prev, city: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Postcode
                                </label>
                                <input
                                  type="text"
                                  value={editLocation.postcode}
                                  onChange={(e) => setEditLocation(prev => ({ ...prev, postcode: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleUpdateLocation(location.location_id)}
                                disabled={isUpdatingLocation || !editLocation.name.trim()}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                              >
                                {isUpdatingLocation ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  'Save'
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingLocation(null)
                                  setEditLocation({ name: '', address: '', city: '', postcode: '' })
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-white font-medium">{location.name}</div>
                                <div className="text-xs text-gray-400">
                                  {location.address && `Address: ${location.address}`}
                                  {location.city && ` • City: ${location.city}`}
                                  {location.postcode && ` • Postcode: ${location.postcode}`}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Added {new Date(location.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingLocation(location)
                                  setEditLocation({
                                    name: location.name || '',
                                    address: location.address || '',
                                    city: location.city || '',
                                    postcode: location.postcode || ''
                                  })
                                }}
                                className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                                title="Edit location"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteLocation(location.location_id)}
                                disabled={isDeletingLocation === location.location_id}
                                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 disabled:opacity-50"
                                title="Delete location"
                              >
                                {isDeletingLocation === location.location_id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="relative z-10">
        <MobileBottomNav />
      </div>
    </div>
  )
}
