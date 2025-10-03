'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      }, {
        // Remember me functionality - persist session if checked
        shouldCreateUser: false,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('[Login:handleSubmit] Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Blue Sparkles Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Larger prominent sparkles with floating movement */}
        <div 
          className="absolute w-2 h-2 bg-blue-400/60 rounded-full shadow-lg shadow-blue-400/30"
          style={{
            top: '20%',
            left: '15%',
            animation: 'float 6s ease-in-out infinite, pulse 2s ease-in-out infinite',
            animationDelay: '0s'
          }}
        ></div>
        <div 
          className="absolute w-1.5 h-1.5 bg-blue-300/70 rounded-full shadow-lg shadow-blue-300/40"
          style={{
            top: '30%',
            right: '20%',
            animation: 'float 8s ease-in-out infinite, pulse 2.5s ease-in-out infinite',
            animationDelay: '1s'
          }}
        ></div>
        <div 
          className="absolute w-3 h-3 bg-blue-500/50 rounded-full shadow-lg shadow-blue-500/25"
          style={{
            top: '45%',
            left: '25%',
            animation: 'float 7s ease-in-out infinite, pulse 3s ease-in-out infinite',
            animationDelay: '2s'
          }}
        ></div>
        <div 
          className="absolute w-1 h-1 bg-blue-400/80 rounded-full shadow-lg shadow-blue-400/50"
          style={{
            top: '60%',
            right: '30%',
            animation: 'float 9s ease-in-out infinite, pulse 1.8s ease-in-out infinite',
            animationDelay: '3s'
          }}
        ></div>
        <div 
          className="absolute w-2.5 h-2.5 bg-blue-600/40 rounded-full shadow-lg shadow-blue-600/30"
          style={{
            top: '75%',
            left: '40%',
            animation: 'float 5s ease-in-out infinite, pulse 2.2s ease-in-out infinite',
            animationDelay: '4s'
          }}
        ></div>
        
        {/* Medium sparkles with different movement patterns */}
        <div 
          className="absolute w-1 h-1 bg-blue-300/60 rounded-full shadow-md shadow-blue-300/30"
          style={{
            top: '10%',
            right: '40%',
            animation: 'float 10s ease-in-out infinite, pulse 2.8s ease-in-out infinite',
            animationDelay: '0.5s'
          }}
        ></div>
        <div 
          className="absolute w-1.5 h-1.5 bg-blue-400/70 rounded-full shadow-md shadow-blue-400/40"
          style={{
            top: '35%',
            left: '60%',
            animation: 'float 6.5s ease-in-out infinite, pulse 2.1s ease-in-out infinite',
            animationDelay: '1.5s'
          }}
        ></div>
        <div 
          className="absolute w-1 h-1 bg-blue-500/60 rounded-full shadow-md shadow-blue-500/35"
          style={{
            top: '55%',
            right: '15%',
            animation: 'float 8.5s ease-in-out infinite, pulse 3.2s ease-in-out infinite',
            animationDelay: '2.5s'
          }}
        ></div>
        <div 
          className="absolute w-2 h-2 bg-blue-300/50 rounded-full shadow-md shadow-blue-300/25"
          style={{
            top: '80%',
            left: '20%',
            animation: 'float 7.5s ease-in-out infinite, pulse 2.6s ease-in-out infinite',
            animationDelay: '3.5s'
          }}
        ></div>
        
        {/* Smaller quick sparkles */}
        <div 
          className="absolute w-0.5 h-0.5 bg-blue-400/80 rounded-full"
          style={{
            top: '15%',
            left: '70%',
            animation: 'float 4s ease-in-out infinite, pulse 1.5s ease-in-out infinite',
            animationDelay: '0.8s'
          }}
        ></div>
        <div 
          className="absolute w-0.5 h-0.5 bg-blue-300/70 rounded-full"
          style={{
            top: '40%',
            right: '50%',
            animation: 'float 5.5s ease-in-out infinite, pulse 1.9s ease-in-out infinite',
            animationDelay: '1.8s'
          }}
        ></div>
        <div 
          className="absolute w-0.5 h-0.5 bg-blue-500/75 rounded-full"
          style={{
            top: '65%',
            left: '75%',
            animation: 'float 3.5s ease-in-out infinite, pulse 1.7s ease-in-out infinite',
            animationDelay: '2.8s'
          }}
        ></div>
        <div 
          className="absolute w-0.5 h-0.5 bg-blue-400/65 rounded-full"
          style={{
            top: '85%',
            right: '25%',
            animation: 'float 6s ease-in-out infinite, pulse 2.3s ease-in-out infinite',
            animationDelay: '3.8s'
          }}
        ></div>
        
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-900/5 to-blue-800/10"></div>
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-10px) translateX(5px);
          }
          50% {
            transform: translateY(-5px) translateX(-3px);
          }
          75% {
            transform: translateY(-15px) translateX(8px);
          }
        }
      `}</style>
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <Logo size="md" className="mb-6 scale-110" />
          <p className="text-lg font-medium text-white">
            Change the game
          </p>
        </div>
        <form className="relative space-y-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl overflow-hidden" onSubmit={handleSubmit}>
          {/* Top right shine effect */}
          <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-blue-400/20 via-blue-300/10 to-transparent rounded-full blur-sm"></div>
          <div className="absolute -top-1 -right-1 w-12 h-12 bg-gradient-to-br from-white/30 via-blue-200/20 to-transparent rounded-full blur-sm animate-pulse"></div>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-4 py-3 border border-white/20 placeholder-gray-400 text-white bg-white/10 backdrop-blur-sm rounded-t-lg hover:bg-white/20 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 focus:z-10 sm:text-sm transition-all duration-200"
                placeholder="Email address"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-4 py-3 border border-white/20 placeholder-gray-400 text-white bg-white/10 backdrop-blur-sm rounded-b-lg hover:bg-white/20 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 focus:z-10 sm:text-sm transition-all duration-200"
                placeholder="Password"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/20 rounded bg-white/10 backdrop-blur-sm"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                Remember me
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 backdrop-blur-sm border border-red-500/20 p-4">
              <div className="text-sm text-red-200">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-blue-500 text-sm font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600 hover:border-blue-400 hover:shadow-blue-500/30 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

        </form>
        
        {/* Sign up link outside the form box */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <button
              type="button"
              className="font-medium text-blue-400 hover:text-blue-200 hover:drop-shadow-lg transition-all duration-200"
              onClick={() => {
                // TODO: Implement signup functionality
                console.log('[Login:signup] Signup clicked - functionality coming soon')
              }}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

