'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { handleAuthError } from '@/lib/authUtils'

export default function Home() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait a bit for Supabase to initialize
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[Home:checkAuth] Session error:', error)
          // Handle auth errors gracefully
          const wasHandled = await handleAuthError(error)
          if (wasHandled) {
            router.push('/login')
            return
          }
        }
        
        if (session && session.user) {
          console.log('[Home:checkAuth] Valid session found, redirecting to dashboard')
          router.push('/dashboard')
        } else {
          console.log('[Home:checkAuth] No session found, redirecting to login')
          router.push('/login')
        }
      } catch (error) {
        console.error('[Home:checkAuth] Auth check error:', error)
        // Handle any unexpected errors
        const wasHandled = await handleAuthError(error)
        if (!wasHandled) {
          // If error wasn't handled by auth utils, clear any potential corrupted session
          try {
            await supabase.auth.signOut()
          } catch (signOutError) {
            console.error('[Home:checkAuth] Error during sign out:', signOutError)
          }
        }
        router.push('/login')
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-gray-400 text-sm">Initializing...</p>
      </div>
    </div>
  )
}
