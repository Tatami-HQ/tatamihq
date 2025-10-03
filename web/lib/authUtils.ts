import { supabase } from './supabaseClient'

export const handleAuthError = async (error: any): Promise<boolean> => {
  console.error('[AuthUtils] Handling auth error:', error)
  
  // Check if it's a refresh token error
  if (error?.message?.includes('Refresh Token') || 
      error?.message?.includes('Invalid Refresh Token') ||
      error?.message?.includes('refresh_token_not_found')) {
    
    console.warn('[AuthUtils] Refresh token error detected, clearing session')
    
    try {
      await supabase.auth.signOut()
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
      localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
    }
  } catch (error) {
    console.error('[AuthUtils] Error clearing auth session:', error)
  }
}
