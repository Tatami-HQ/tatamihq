import { supabase } from './supabaseClient'

export const handleAuthError = async (error: any): Promise<boolean> => {
  console.error('[AuthUtils] Handling auth error:', error)
  
  // Check for various session-related errors
  const sessionErrors = [
    'Auth session missing',
    'Refresh Token',
    'Invalid Refresh Token',
    'refresh_token_not_found',
    'Session not found',
    'Invalid session',
    'Session expired',
    'Token expired',
    'JWT expired',
    'AuthApiError'
  ]
  
  const isSessionError = sessionErrors.some(errorType => 
    error?.message?.includes(errorType) || 
    error?.code?.includes('SESSION') ||
    error?.status === 401 ||
    error?.name === 'AuthApiError'
  )
  
  if (isSessionError) {
    console.warn('[AuthUtils] Session error detected, clearing session')
    
    try {
      await supabase.auth.signOut()
      
      // Clear localStorage as well
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      // Redirect to login page if in browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      return true // Indicates session was cleared
    } catch (signOutError) {
      console.error('[AuthUtils] Error during sign out:', signOutError)
      return true
    }
  }
  
  return false // No special handling needed
}

export const clearAuthSession = async (): Promise<void> => {
  try {
    await supabase.auth.signOut()
    // Clear any local storage that might contain auth data
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key)
        }
      })
    }
  } catch (error) {
    console.error('[AuthUtils] Error clearing auth session:', error)
  }
}

export const recoverSession = async (): Promise<boolean> => {
  try {
    console.log('[AuthUtils] Attempting session recovery...')
    
    // First, try to get the current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.warn('[AuthUtils] Session recovery failed:', error)
      await clearAuthSession()
      return false
    }
    
    if (session && session.user) {
      console.log('[AuthUtils] Session recovered successfully')
      return true
    }
    
    console.log('[AuthUtils] No valid session found')
    return false
  } catch (error) {
    console.error('[AuthUtils] Session recovery error:', error)
    await clearAuthSession()
    return false
  }
}
