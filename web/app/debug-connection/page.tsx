'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DebugConnectionPage() {
  const [results, setResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testConnection = async () => {
    setIsLoading(true)
    setResults([])
    
    try {
      addResult('Starting connection tests...')
      
      // Test 1: Check environment variables
      addResult(`SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}`)
      addResult(`SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}`)
      
      // Test 2: Check Supabase client
      addResult(`Supabase client created: ${supabase ? 'Yes' : 'No'}`)
      
      // Test 3: Test basic connection
      addResult('Testing basic connection...')
      const { data, error } = await supabase
        .from('members')
        .select('count')
        .limit(1)
      
      if (error) {
        addResult(`Connection failed: ${error.message}`)
        addResult(`Error code: ${error.code}`)
        addResult(`Error details: ${JSON.stringify(error)}`)
      } else {
        addResult('Connection successful!')
        addResult(`Data: ${JSON.stringify(data)}`)
      }
      
      // Test 4: Test authentication
      addResult('Testing authentication...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        addResult(`Auth error: ${authError.message}`)
      } else {
        addResult(`User: ${user ? 'Logged in' : 'Not logged in'}`)
      }
      
    } catch (error) {
      addResult(`Unexpected error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Debug</h1>
      
      <button
        onClick={testConnection}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg mb-4"
      >
        {isLoading ? 'Testing...' : 'Test Connection'}
      </button>
      
      <div className="space-y-2 max-h-96 overflow-y-auto bg-gray-900 p-4 rounded">
        {results.map((result, index) => (
          <div key={index} className="font-mono text-sm text-green-400">
            {result}
          </div>
        ))}
      </div>
    </div>
  )
}
