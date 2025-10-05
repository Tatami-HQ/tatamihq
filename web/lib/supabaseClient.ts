import { createClient } from '@supabase/supabase-js'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
  }
})

// Set up auth state change listener
supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
  console.log('[Supabase] Auth state change:', event, session?.user?.id || 'no user')
  
  if (event === 'SIGNED_OUT') {
    // Clear any cached data when signing out
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key)
        }
      })
    }
  }
})

