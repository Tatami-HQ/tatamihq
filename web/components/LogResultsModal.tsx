'use client'

import { useState } from 'react'
import type { Competition } from '../app/competitions/page'

interface LogResultsModalProps {
  competition: Competition | null
  onClose: () => void
  onLogResults: (competitionId: number, resultsData: {
    overall_rank: number | null
    total_gold: number | null
    total_silver: number | null
    total_bronze: number | null
  }) => Promise<void>
}

export default function LogResultsModal({ competition, onClose, onLogResults }: LogResultsModalProps) {
  const [formData, setFormData] = useState({
    overall_rank: competition?.overall_rank || null,
    total_gold: competition?.total_gold || null,
    total_silver: competition?.total_silver || null,
    total_bronze: competition?.total_bronze || null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!competition) return

    setIsSubmitting(true)
    setError('')

    try {
      await onLogResults(competition.competitions_id, formData)
      onClose()
    } catch (error) {
      console.error('Error logging results:', error)
      setError('Failed to log results. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const resetResults = () => {
    setFormData({
      overall_rank: null,
      total_gold: null,
      total_silver: null,
      total_bronze: null
    })
  }

  if (!competition) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-white/10 w-full max-w-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Log Competition Results
              </h2>
              <p className="text-sm text-gray-400">
                Record results for: <span className="text-white font-medium">{competition.Name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Competition Info */}
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center space-x-4">
              {competition.competition_profile_picture && (
                <img
                  src={competition.competition_profile_picture}
                  alt={competition.Name || 'Competition'}
                  className="w-16 h-16 rounded-lg object-cover border border-white/20"
                />
              )}
              <div className="flex-1">
                <h3 className="text-white font-semibold">{competition.Name}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-1">
                  {competition.date_start && (
                    <span>📅 {new Date(competition.date_start).toLocaleDateString()}</span>
                  )}
                  {competition.location && (
                    <span>📍 {competition.location}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Competition Results</h3>
              <button
                type="button"
                onClick={resetResults}
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Reset All
              </button>
            </div>

            {/* Overall Rank Widget */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Overall Rank</h4>
                    <p className="text-sm text-gray-400">Final position in the competition</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleChange('overall_rank', formData.overall_rank ? formData.overall_rank - 1 : null)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
                    disabled={!formData.overall_rank || formData.overall_rank <= 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    value={formData.overall_rank || ''}
                    onChange={(e) => handleChange('overall_rank', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rank"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('overall_rank', (formData.overall_rank || 0) + 1)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Medal Count Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gold Medals */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Gold Medals</h4>
                      <p className="text-sm text-gray-400">1st place finishes</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleChange('total_gold', formData.total_gold ? formData.total_gold - 1 : null)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
                    disabled={!formData.total_gold || formData.total_gold <= 0}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    value={formData.total_gold || ''}
                    onChange={(e) => handleChange('total_gold', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('total_gold', (formData.total_gold || 0) + 1)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Silver Medals */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Silver Medals</h4>
                      <p className="text-sm text-gray-400">2nd place finishes</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleChange('total_silver', formData.total_silver ? formData.total_silver - 1 : null)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
                    disabled={!formData.total_silver || formData.total_silver <= 0}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    value={formData.total_silver || ''}
                    onChange={(e) => handleChange('total_silver', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('total_silver', (formData.total_silver || 0) + 1)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Bronze Medals */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Bronze Medals</h4>
                      <p className="text-sm text-gray-400">3rd place finishes</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleChange('total_bronze', formData.total_bronze ? formData.total_bronze - 1 : null)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
                    disabled={!formData.total_bronze || formData.total_bronze <= 0}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    value={formData.total_bronze || ''}
                    onChange={(e) => handleChange('total_bronze', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('total_bronze', (formData.total_bronze || 0) + 1)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging Results...
                </>
              ) : (
                'Log Results'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
