'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function UpdateMembersPage() {
  const [isUpdating, setIsUpdating] = useState(true)
  const [result, setResult] = useState('')
  const router = useRouter()

  useEffect(() => {
    updateAllMembers()
  }, [])

  const updateAllMembers = async () => {
    setIsUpdating(true)
    setResult('')

    try {
      console.log('🔄 Updating all members to Active status and Monthly membership...')
      
      // Update all members to Active status and Monthly membership type
      const { data, error } = await supabase
        .from('members')
        .update({ 
          status: 'Active',
          membership_type: 'Monthly'
        })
        .neq('members_id', 0) // This will update all records

      if (error) {
        console.error('❌ Error updating members:', error)
        setResult(`❌ Error: ${error.message}`)
        return
      }

      console.log('✅ Successfully updated all members!')
      setResult('✅ Successfully updated all members! All members now have Active status and Monthly membership.')
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push('/members')
      }, 3000)
      
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      setResult(`❌ Unexpected error: ${error}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Update All Members
        </h1>
        
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-blue-400 font-medium mb-2">Updating all members:</h3>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>• All members status → Active</li>
              <li>• All members membership type → Monthly</li>
            </ul>
          </div>

          <div className="text-center">
            {isUpdating ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-blue-400">Updating Members...</p>
              </div>
            ) : (
              <div className="text-green-400">
                ✅ Update Complete!
              </div>
            )}
          </div>

          {result && (
            <div className={`p-4 rounded-lg ${
              result.includes('❌') 
                ? 'bg-red-900/20 border border-red-500/30 text-red-400' 
                : 'bg-green-900/20 border border-green-500/30 text-green-400'
            }`}>
              {result}
            </div>
          )}

          {!isUpdating && (
            <button
              onClick={() => router.push('/members')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              View Updated Members
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
