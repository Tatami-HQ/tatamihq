'use client'

import { useState, useEffect } from 'react'

interface Competition {
  competitions_id: number
  clubs_id: number | null
  martial_art_id: number | null
  Name: string | null
  date_start: string | null
  location: string | null
  overall_rank: number | null
  total_gold: number | null
  total_silver: number | null
  total_bronze: number | null
  created_at: string
  organisations_id: number | null
  date_end: string | null
  singular_day_event: boolean | null
  competition_profile_picture: string | null
  competition_downloads: string | null
}

interface CompetitionsMapProps {
  competitions: Competition[]
  selectedCompetition: Competition | null
  onCompetitionSelect: (competition: Competition) => void
}

interface MapPin {
  id: number
  name: string
  location: string
  x: number
  y: number
  isUpcoming: boolean
  hasResults: boolean
  competition: Competition
}

export default function CompetitionsMap({ competitions, selectedCompetition, onCompetitionSelect }: CompetitionsMapProps) {
  const [pins, setPins] = useState<MapPin[]>([])
  const [hoveredPin, setHoveredPin] = useState<number | null>(null)

  useEffect(() => {
    // Generate mock coordinates for competitions based on their locations
    const generatePins = () => {
      const mockLocations = [
        { location: 'London', x: 25, y: 35 },
        { location: 'New York', x: 15, y: 30 },
        { location: 'Tokyo', x: 75, y: 40 },
        { location: 'Paris', x: 22, y: 38 },
        { location: 'Sydney', x: 78, y: 65 },
        { location: 'Berlin', x: 23, y: 37 },
        { location: 'Dubai', x: 45, y: 45 },
        { location: 'Singapore', x: 68, y: 55 },
        { location: 'Los Angeles', x: 8, y: 35 },
        { location: 'Toronto', x: 12, y: 28 },
        { location: 'Melbourne', x: 75, y: 70 },
        { location: 'Barcelona', x: 20, y: 42 },
        { location: 'Amsterdam', x: 21, y: 34 },
        { location: 'Madrid', x: 18, y: 43 },
        { location: 'Rome', x: 24, y: 44 },
        { location: 'Vienna', x: 25, y: 38 },
        { location: 'Prague', x: 24, y: 36 },
        { location: 'Stockholm', x: 26, y: 28 },
        { location: 'Copenhagen', x: 25, y: 31 },
        { location: 'Zurich', x: 23, y: 39 }
      ]

      const generatedPins = competitions.map((competition, index) => {
        const today = new Date()
        const startDate = competition.date_start ? new Date(competition.date_start) : null
        const isUpcoming = startDate ? startDate > today : false
        const hasResults = !!(competition.total_gold || competition.total_silver || competition.total_bronze || competition.overall_rank)
        
        // Find matching location or use a default
        const locationData = mockLocations.find(loc => 
          competition.location?.toLowerCase().includes(loc.location.toLowerCase())
        ) || mockLocations[index % mockLocations.length]

        return {
          id: competition.competitions_id,
          name: competition.Name || 'Unnamed Competition',
          location: competition.location || locationData.location,
          x: locationData.x + (Math.random() - 0.5) * 4, // Add some randomness
          y: locationData.y + (Math.random() - 0.5) * 4,
          isUpcoming,
          hasResults,
          competition
        }
      })

      setPins(generatedPins)
    }

    generatePins()
  }, [competitions])

  const getPinColor = (pin: MapPin) => {
    if (selectedCompetition?.competitions_id === pin.id) return '#3b82f6' // Blue for selected
    if (pin.hasResults) return '#10b981' // Green for completed with results
    if (pin.isUpcoming) return '#f59e0b' // Yellow for upcoming
    return '#6b7280' // Gray for past without results
  }

  const getPinSize = (pin: MapPin) => {
    if (selectedCompetition?.competitions_id === pin.id) return 16
    if (hoveredPin === pin.id) return 14
    return 12
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="relative w-full h-96 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl border border-white/10 overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* World Map Outline */}
          <g stroke="#4a5568" strokeWidth="0.5" fill="none">
            {/* Simplified world map shapes */}
            <path d="M5,25 Q15,20 25,25 Q35,30 45,25 Q55,20 65,25 Q75,30 85,25 Q95,20 100,25 L100,35 Q95,40 85,35 Q75,30 65,35 Q55,40 45,35 Q35,30 25,35 Q15,40 5,35 Z" />
            <path d="M10,40 Q20,35 30,40 Q40,45 50,40 Q60,35 70,40 Q80,45 90,40 Q95,45 100,40 L100,50 Q95,55 85,50 Q75,45 65,50 Q55,55 45,50 Q35,45 25,50 Q15,55 5,50 Z" />
            <path d="M5,55 Q15,50 25,55 Q35,60 45,55 Q55,50 65,55 Q75,60 85,55 Q95,50 100,55 L100,65 Q95,70 85,65 Q75,60 65,65 Q55,70 45,65 Q35,60 25,65 Q15,70 5,65 Z" />
            <path d="M5,70 Q15,65 25,70 Q35,75 45,70 Q55,65 65,70 Q75,75 85,70 Q95,65 100,70 L100,80 Q95,85 85,80 Q75,75 65,80 Q55,85 45,80 Q35,75 25,80 Q15,85 5,80 Z" />
          </g>
          
          {/* Country highlights for competitions */}
          {pins.map((pin) => {
            const highlightRadius = 8
            return (
              <circle
                key={`highlight-${pin.id}`}
                cx={pin.x}
                cy={pin.y}
                r={highlightRadius}
                fill={getPinColor(pin)}
                opacity={0.2}
                className="animate-pulse"
              />
            )
          })}
        </svg>
      </div>

      {/* Competition Pins */}
      <div className="relative z-10 w-full h-full">
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200"
            style={{
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              zIndex: selectedCompetition?.competitions_id === pin.id ? 20 : 10
            }}
            onMouseEnter={() => setHoveredPin(pin.id)}
            onMouseLeave={() => setHoveredPin(null)}
            onClick={() => onCompetitionSelect(pin.competition)}
          >
            {/* Pin */}
            <div
              className="relative transition-all duration-200"
              style={{
                width: getPinSize(pin),
                height: getPinSize(pin)
              }}
            >
              {/* Pin Shadow */}
              <div
                className="absolute inset-0 rounded-full blur-sm opacity-50"
                style={{
                  backgroundColor: getPinColor(pin),
                  transform: 'translate(1px, 1px)'
                }}
              />
              
              {/* Pin Body */}
              <div
                className="relative rounded-full border-2 border-white shadow-lg"
                style={{
                  backgroundColor: getPinColor(pin),
                  width: getPinSize(pin),
                  height: getPinSize(pin)
                }}
              >
                {/* Pin Center Dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="rounded-full"
                    style={{
                      width: getPinSize(pin) * 0.4,
                      height: getPinSize(pin) * 0.4,
                      backgroundColor: 'white'
                    }}
                  />
                </div>
                
                {/* Status Indicator */}
                {pin.hasResults && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white animate-pulse" />
                )}
                {pin.isUpcoming && !pin.hasResults && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white animate-pulse" />
                )}
              </div>
            </div>

            {/* Tooltip */}
            {(hoveredPin === pin.id || selectedCompetition?.competitions_id === pin.id) && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl text-white text-sm whitespace-nowrap z-30">
                <div className="font-medium">{pin.name}</div>
                <div className="text-gray-300 text-xs">{pin.location}</div>
                <div className="text-gray-400 text-xs">
                  {formatDate(pin.competition.date_start)}
                  {pin.competition.date_end && !pin.competition.singular_day_event && 
                    ` - ${formatDate(pin.competition.date_end)}`
                  }
                </div>
                {pin.hasResults && (
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400">Live Analytics</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-white text-xs">
        <div className="font-medium mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Completed with Results</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Upcoming</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Past without Results</span>
          </div>
        </div>
      </div>

      {/* Competition Stats */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-white text-xs">
        <div className="font-medium mb-2">Competition Stats</div>
        <div className="space-y-1">
          <div>Total: {competitions.length}</div>
          <div>Upcoming: {competitions.filter(c => {
            const today = new Date()
            const startDate = c.date_start ? new Date(c.date_start) : null
            return startDate ? startDate > today : false
          }).length}</div>
          <div>With Results: {competitions.filter(c => 
            !!(c.total_gold || c.total_silver || c.total_bronze || c.overall_rank)
          ).length}</div>
        </div>
      </div>
    </div>
  )
}
