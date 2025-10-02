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
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="lg" className="mb-8" />
          <h2 className="text-2xl font-semibold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Martial Arts Management System
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl" onSubmit={handleSubmit}>
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

          <div className="flex items-center justify-between">
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
                Remember me on this device
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
              className="group relative w-full flex justify-center py-3 px-4 border border-blue-500/30 text-sm font-medium rounded-lg text-white bg-blue-600/20 backdrop-blur-sm hover:bg-blue-600/50 hover:border-blue-400/80 hover:shadow-blue-500/25 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
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
        </form>
      </div>
    </div>
  )
}

