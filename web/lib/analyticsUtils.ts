'use client'

import { supabase } from './supabaseClient'

export interface ClubAnalytics {
  // Medal Statistics
  totalMedals: number
  goldMedals: number
  silverMedals: number
  bronzeMedals: number
  
  // Competition Statistics
  totalBouts: number
  totalWins: number
  totalLosses: number
  winRate: number
  
  // Efficiency Metrics
  medalEfficiency: number // Medals ÷ Entries
  yearOnYearTrend: number // 2024 → 2025 improvement %
  
  // Geographic & Participation
  competitionsAttended: number
  uniqueLocations: string[]
  totalCompetitors: number
  
  // Top Performers
  topPerformer: {
    name: string
    memberId: number
    medals: number
    winRate: number
  }
  mostImproved: {
    name: string
    memberId: number
    improvement: number
  }
  bestTeamPairing: {
    members: string[]
    winRate: number
    bouts: number
  }
  
  // Competition Level Breakdown
  competitionLevels: {
    club: number
    national: number
    international: number
  }
}

export interface CompetitorAnalytics {
  memberId: number
  memberName: string
  
  // Basic Stats
  totalMedals: number
  goldMedals: number
  silverMedals: number
  bronzeMedals: number
  totalBouts: number
  totalWins: number
  totalLosses: number
  winRate: number
  
  // Performance Metrics
  averageRoundReached: string
  currentStreak: {
    type: 'win' | 'loss'
    count: number
  }
  
  // Discipline Breakdown
  disciplineBreakdown: {
    discipline: string
    bouts: number
    wins: number
    winRate: number
    medals: number
  }[]
  
  // Performance Over Time
  performanceOverTime: {
    date: string
    competition: string
    result: 'win' | 'loss'
    medal?: string
    round?: string
  }[]
  
  // Team Events
  teamEventResults: {
    teamName: string
    bouts: number
    wins: number
    winRate: number
    medals: number
  }[]
  
  // Bout History
  boutHistory: {
    date: string
    competition: string
    opponent: string
    opponentClub: string
    result: 'win' | 'loss'
    score: string
    round: string
    coach?: string
  }[]
  
  // Coach Performance
  coachPerformance: {
    coachName: string
    bouts: number
    wins: number
    winRate: number
  }[]
}

export class AnalyticsService {
  // Helper function to detect wins comprehensively
  private static isWin(result: any): boolean {
    const resultStr = result?.toString().toLowerCase().trim()
    return resultStr === 'win' || resultStr === 'w' || resultStr === 'victory' || resultStr === 'victorious' || 
           resultStr === 'won' || resultStr === '1' || resultStr === 'true' || resultStr === 'yes' ||
           resultStr === 'success' || resultStr === 'successful' || resultStr === 'pass' || resultStr === 'passed'
  }

  // Helper function to detect losses comprehensively
  private static isLoss(result: any): boolean {
    const resultStr = result?.toString().toLowerCase().trim()
    return resultStr === 'loss' || resultStr === 'l' || resultStr === 'defeat' || resultStr === 'defeated' || 
           resultStr === 'lost' || resultStr === '0' || resultStr === 'false' || resultStr === 'no' ||
           resultStr === 'fail' || resultStr === 'failed' || resultStr === 'unsuccessful'
  }
  static async getClubAnalytics(): Promise<ClubAnalytics> {
    try {
      // Fetch all competition data
      const [competitionsResult, entriesResult, boutsResult, resultsResult, teamsResult] = await Promise.all([
        supabase.from('competitions').select('*'),
        supabase.from('competition_entries').select('*'),
        supabase.from('competition_bouts').select('*'),
        supabase.from('competition_results').select('*'),
        supabase.from('competition_teams').select('*')
      ])

      const competitions = competitionsResult.data || []
      const entries = entriesResult.data || []
      const bouts = boutsResult.data || []
      const results = resultsResult.data || []
      const teams = teamsResult.data || []

      // Calculate medal statistics
      const goldMedals = results.filter(r => r.medal === 'Gold' || r.medal === 'gold').length
      const silverMedals = results.filter(r => r.medal === 'Silver' || r.medal === 'silver').length
      const bronzeMedals = results.filter(r => r.medal === 'Bronze' || r.medal === 'bronze').length
      const totalMedals = goldMedals + silverMedals + bronzeMedals

      // Calculate bout statistics
      // Total bouts = count of all rows in competition_bouts
      const totalBouts = bouts.length
      
      // Wins = count where result = 'Win' (comprehensive detection)
      const totalWins = bouts.filter(b => this.isWin(b.result)).length
      
      const totalLosses = totalBouts - totalWins
      const winRate = totalBouts > 0 ? (totalWins / totalBouts) * 100 : 0

      // Calculate efficiency metrics
      // MedalEfficiency = (TotalMedals / TotalEntries) * 100
      const totalEntries = entries.length
      const medalEfficiency = totalEntries > 0 ? (totalMedals / totalEntries) * 100 : 0

      // Calculate year-on-year trend (simplified - compare last 2 years)
      const currentYear = new Date().getFullYear()
      const lastYear = currentYear - 1
      
      const currentYearBouts = bouts.filter((b: any) => {
        const boutDate = new Date(b.created_at)
        return boutDate.getFullYear() === currentYear
      })
      const lastYearBouts = bouts.filter((b: any) => {
        const boutDate = new Date(b.created_at)
        return boutDate.getFullYear() === lastYear
      })

      const currentYearWinRate = currentYearBouts.length > 0 ? 
        (currentYearBouts.filter(b => b.result === 'Win' || b.result === 'win').length / currentYearBouts.length) * 100 : 0
      const lastYearWinRate = lastYearBouts.length > 0 ? 
        (lastYearBouts.filter(b => b.result === 'Win' || b.result === 'win').length / lastYearBouts.length) * 100 : 0

      const yearOnYearTrend = lastYearWinRate > 0 ? 
        ((currentYearWinRate - lastYearWinRate) / lastYearWinRate) * 100 : 0

      // Geographic data
      const uniqueLocations = [...new Set(competitions.map(c => c.location).filter(Boolean))]
      
      // Competitions attended = Count distinct competitions_id from competition_entries
      const competitionsAttended = new Set(entries.map(e => e.competitions_id)).size

      // Total competitors
      const totalCompetitors = new Set(entries.map(e => e.members_id)).size

      // Top performer calculation using medal points system
      // Gold = 3, Silver = 2, Bronze = 1
      const memberStats = new Map()
      
      // Calculate medal points for each member
      results.forEach(result => {
        const entry = entries.find(e => e.competition_entries_id === result.competition_entries_id)
        if (!entry?.members_id) return

        const memberId = entry.members_id
        
        if (!memberStats.has(memberId)) {
          memberStats.set(memberId, {
            memberId,
            medalPoints: 0,
            goldMedals: 0,
            silverMedals: 0,
            bronzeMedals: 0,
            totalMedals: 0,
            bouts: 0,
            wins: 0
          })
        }

        const stats = memberStats.get(memberId)
        
        // Award points based on medal type
        if (result.medal === 'Gold' || result.medal === 'gold') {
          stats.medalPoints += 3
          stats.goldMedals++
        } else if (result.medal === 'Silver' || result.medal === 'silver') {
          stats.medalPoints += 2
          stats.silverMedals++
        } else if (result.medal === 'Bronze' || result.medal === 'bronze') {
          stats.medalPoints += 1
          stats.bronzeMedals++
        }
        
        stats.totalMedals++
      })

      // Add bout statistics for each member
      entries.forEach(entry => {
        const memberId = entry.members_id
        if (!memberId) return

        if (!memberStats.has(memberId)) {
          memberStats.set(memberId, {
            memberId,
            medalPoints: 0,
            goldMedals: 0,
            silverMedals: 0,
            bronzeMedals: 0,
            totalMedals: 0,
            bouts: 0,
            wins: 0
          })
        }

        const memberBouts = bouts.filter(b => b.competition_entries_id === entry.competition_entries_id)
        const memberWins = memberBouts.filter(b => b.result === 'Win' || b.result === 'win').length

        const stats = memberStats.get(memberId)
        stats.bouts += memberBouts.length
        stats.wins += memberWins
      })

      // Find top performer by medal points
      let topPerformer = { name: 'N/A', memberId: 0, medals: 0, winRate: 0 }
      if (memberStats.size > 0) {
        const topMember = Array.from(memberStats.values())
          .sort((a, b) => b.medalPoints - a.medalPoints || b.winRate - a.winRate)[0]
        
        // Get member name
        const memberResult = await supabase
          .from('members')
          .select('first_name, last_name')
          .eq('members_id', topMember.memberId)
          .single()

        if (memberResult.data) {
          topPerformer = {
            name: `${memberResult.data.first_name} ${memberResult.data.last_name}`,
            memberId: topMember.memberId,
            medals: topMember.medalPoints, // Using medal points instead of total medal count
            winRate: topMember.bouts > 0 ? (topMember.wins / topMember.bouts) * 100 : 0
          }
        }
      }

      // Competition level breakdown by organisations_id
      const competitionLevels = await this.getCompetitionLevelBreakdown(competitions)

      return {
        totalMedals,
        goldMedals,
        silverMedals,
        bronzeMedals,
        totalBouts,
        totalWins,
        totalLosses,
        winRate: Math.round(winRate * 10) / 10,
        medalEfficiency: Math.round(medalEfficiency * 10) / 10,
        yearOnYearTrend: Math.round(yearOnYearTrend * 10) / 10,
        competitionsAttended,
        uniqueLocations,
        totalCompetitors,
        topPerformer,
        mostImproved: await this.getMostImprovedCompetitor(competitions, entries, results, bouts),
        bestTeamPairing: await this.getBestTeamPairing(teams, bouts),
        competitionLevels
      }
    } catch (error) {
      console.error('Error fetching club analytics:', error)
      throw error
    }
  }

  static async getCompetitorAnalytics(memberId: number): Promise<CompetitorAnalytics> {
    try {
      // Fetch member data
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('first_name, last_name')
        .eq('members_id', memberId)
        .single()

      if (memberError) throw memberError

      // Fetch competition entries for this member
      const { data: entries } = await supabase
        .from('competition_entries')
        .select('*')
        .eq('members_id', memberId)

      const entryIds = entries?.map(e => e.competition_entries_id) || []

      // Fetch bouts for this member
      const { data: bouts } = await supabase
        .from('competition_bouts')
        .select('*')
        .in('competition_entries_id', entryIds)

      // Fetch results for this member
      const { data: results } = await supabase
        .from('competition_results')
        .select('*')
        .in('competition_entries_id', entryIds)

      // Fetch team events for this member
      const { data: teamBouts } = await supabase
        .from('competition_bouts')
        .select('*, competition_teams(*)')
        .in('competition_entries_id', entryIds)
        .not('competition_teams_id', 'is', null)

      // Calculate basic stats
      // Total bouts = count from competition_bouts where members_id = current_member_id
      const totalBouts = bouts?.length || 0
      
      // Wins = count where result = 'Win'
      const totalWins = bouts?.filter(b => 
        b.result === 'Win' || b.result === 'win' || b.result === 'Victory' || b.result === 'victory'
      ).length || 0
      
      const totalLosses = totalBouts - totalWins
      const winRate = totalBouts > 0 ? (totalWins / totalBouts) * 100 : 0

      // Medal stats - Count medals in competition_results where competition_entries.members_id = current_member_id
      const goldMedals = results?.filter(r => r.medal === 'Gold' || r.medal === 'gold').length || 0
      const silverMedals = results?.filter(r => r.medal === 'Silver' || r.medal === 'silver').length || 0
      const bronzeMedals = results?.filter(r => r.medal === 'Bronze' || r.medal === 'bronze').length || 0
      const totalMedals = goldMedals + silverMedals + bronzeMedals

      // Calculate current streak
      const sortedBouts = (bouts || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      let currentStreak = { type: 'win' as 'win' | 'loss', count: 0 }
      if (sortedBouts.length > 0) {
        const lastResult = sortedBouts[0].result
        const isWin = lastResult === 'Win' || lastResult === 'win' || lastResult === 'Victory' || lastResult === 'victory'
        currentStreak.type = isWin ? 'win' : 'loss'
        
        for (const bout of sortedBouts) {
          const boutIsWin = bout.result === 'Win' || bout.result === 'win' || bout.result === 'Victory' || bout.result === 'victory'
          if ((isWin && boutIsWin) || (!isWin && !boutIsWin)) {
            currentStreak.count++
          } else {
            break
          }
        }
      }

      // Performance over time - Join entries → competitions to include competition name and date
      const performanceOverTime = []
      
      for (const bout of bouts || []) {
        const entry = entries?.find(e => e.competition_entries_id === bout.competition_entries_id)
        if (!entry) continue

        // Get competition details
        const { data: competition } = await supabase
          .from('competitions')
          .select('Name, date_start')
          .eq('competitions_id', entry.competitions_id)
          .single()

        performanceOverTime.push({
          date: competition?.date_start || bout.created_at,
          competition: competition?.Name || 'Unknown Competition',
          result: (bout.result === 'Win' || bout.result === 'win') ? 'win' as const : 'loss' as const,
          medal: bout.medal || undefined,
          round: bout.round || undefined
        })
      }

      performanceOverTime.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Discipline breakdown (simplified)
      const disciplineBreakdown = [{
        discipline: 'Sparring',
        bouts: totalBouts,
        wins: totalWins,
        winRate: winRate,
        medals: totalMedals
      }]

      // Team event results
      const teamEventResults = teamBouts?.map(teamBout => ({
        teamName: teamBout.competition_teams?.team_name || 'Unknown Team',
        bouts: 1,
        wins: (teamBout.result === 'Win' || teamBout.result === 'win') ? 1 : 0,
        winRate: (teamBout.result === 'Win' || teamBout.result === 'win') ? 100 : 0,
        medals: teamBout.medal ? 1 : 0
      })) || []

      // Bout history - Join entries → competitions to include competition name and date
      const boutHistory = []
      
      for (const bout of bouts || []) {
        const entry = entries?.find(e => e.competition_entries_id === bout.competition_entries_id)
        if (!entry) continue

        // Get competition details
        const { data: competition } = await supabase
          .from('competitions')
          .select('Name, date_start')
          .eq('competitions_id', entry.competitions_id)
          .single()

        // Get coach name
        let coachName = undefined
        if (entry.competition_coaches_id) {
          const { data: coach } = await supabase
            .from('competition_coaches')
            .select('name')
            .eq('competition_coaches_id', entry.competition_coaches_id)
            .single()
          coachName = coach?.name
        }

        boutHistory.push({
          date: competition?.date_start || bout.created_at,
          competition: competition?.Name || 'Unknown Competition',
          opponent: bout.opponent_name || 'Unknown',
          opponentClub: bout.opponent_club || 'Unknown',
          result: (bout.result === 'Win' || bout.result === 'win') ? 'win' as const : 'loss' as const,
          score: `${bout.score_for || 0}-${bout.score_against || 0}`,
          round: bout.round || 'Unknown',
          coach: coachName
        })
      }

      boutHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Coach performance - Calculate win rate when coached by each coach
      const coachPerformance = []
      const coachStats = new Map()

      // Group bouts by coach
      entries?.forEach(entry => {
        if (!entry.competition_coaches_id) return

        const coachId = entry.competition_coaches_id
        const memberBouts = bouts?.filter(b => b.competition_entries_id === entry.competition_entries_id) || []

        if (!coachStats.has(coachId)) {
          coachStats.set(coachId, { coachId, bouts: 0, wins: 0 })
        }

        const stats = coachStats.get(coachId)
        stats.bouts += memberBouts.length
        stats.wins += memberBouts.filter(b => b.result === 'Win' || b.result === 'win').length
      })

      // Get coach names and calculate win rates
      for (const [coachId, stats] of coachStats) {
        const { data: coach } = await supabase
          .from('competition_coaches')
          .select('name')
          .eq('competition_coaches_id', coachId)
          .single()

        const winRate = stats.bouts > 0 ? (stats.wins / stats.bouts) * 100 : 0

        coachPerformance.push({
          coachName: coach?.name || 'Unknown Coach',
          bouts: stats.bouts,
          wins: stats.wins,
          winRate: Math.round(winRate * 10) / 10
        })
      }

      // Sort by win rate
      coachPerformance.sort((a, b) => b.winRate - a.winRate)

      return {
        memberId,
        memberName: `${member.first_name} ${member.last_name}`,
        totalMedals,
        goldMedals,
        silverMedals,
        bronzeMedals,
        totalBouts,
        totalWins,
        totalLosses,
        winRate: Math.round(winRate * 10) / 10,
        averageRoundReached: 'Semi-Final', // TODO: Calculate based on actual data
        currentStreak,
        disciplineBreakdown,
        performanceOverTime,
        teamEventResults,
        boutHistory,
        coachPerformance
      }
    } catch (error) {
      console.error('Error fetching competitor analytics:', error)
      throw error
    }
  }

  // Helper method to calculate win rate by coach
  static async getWinRateByCoach(coachId?: number): Promise<{ coachId: number; coachName: string; bouts: number; wins: number; winRate: number }[]> {
    try {
      let query = supabase
        .from('competition_bouts')
        .select('*, competition_entries(competition_coaches_id)')
      
      if (coachId) {
        // Get entries for specific coach
        const { data: entries } = await supabase
          .from('competition_entries')
          .select('competition_entries_id')
          .eq('competition_coaches_id', coachId)
        
        const entryIds = entries?.map(e => e.competition_entries_id) || []
        query = query.in('competition_entries_id', entryIds)
      }

      const { data: bouts } = await query

      // Group by coach
      const coachStats = new Map()
      
      bouts?.forEach(bout => {
        const coachId = bout.competition_entries?.competition_coaches_id
        if (!coachId) return

        if (!coachStats.has(coachId)) {
          coachStats.set(coachId, { coachId, bouts: 0, wins: 0 })
        }

        const stats = coachStats.get(coachId)
        stats.bouts++
        if (bout.result === 'Win' || bout.result === 'win' || bout.result === 'Victory' || bout.result === 'victory') {
          stats.wins++
        }
      })

      // Calculate win rates and get coach names
      const results = []
      for (const [coachId, stats] of coachStats) {
        const winRate = stats.bouts > 0 ? (stats.wins / stats.bouts) * 100 : 0
        
        // Get coach name
        const { data: coach } = await supabase
          .from('competition_coaches')
          .select('name')
          .eq('competition_coaches_id', coachId)
          .single()

        results.push({
          coachId,
          coachName: coach?.name || 'Unknown Coach',
          bouts: stats.bouts,
          wins: stats.wins,
          winRate: Math.round(winRate * 10) / 10
        })
      }

      return results.sort((a, b) => b.winRate - a.winRate)
    } catch (error) {
      console.error('Error calculating win rate by coach:', error)
      return []
    }
  }

  // Helper method to calculate win rate by member
  static async getWinRateByMember(memberId?: number): Promise<{ memberId: number; memberName: string; bouts: number; wins: number; winRate: number }[]> {
    try {
      let query = supabase
        .from('competition_bouts')
        .select('*, competition_entries(members_id)')
      
      if (memberId) {
        // Get entries for specific member
        const { data: entries } = await supabase
          .from('competition_entries')
          .select('competition_entries_id')
          .eq('members_id', memberId)
        
        const entryIds = entries?.map(e => e.competition_entries_id) || []
        query = query.in('competition_entries_id', entryIds)
      }

      const { data: bouts } = await query

      // Group by member
      const memberStats = new Map()
      
      bouts?.forEach(bout => {
        const memberId = bout.competition_entries?.members_id
        if (!memberId) return

        if (!memberStats.has(memberId)) {
          memberStats.set(memberId, { memberId, bouts: 0, wins: 0 })
        }

        const stats = memberStats.get(memberId)
        stats.bouts++
        if (bout.result === 'Win' || bout.result === 'win' || bout.result === 'Victory' || bout.result === 'victory') {
          stats.wins++
        }
      })

      // Calculate win rates and get member names
      const results = []
      for (const [memberId, stats] of memberStats) {
        const winRate = stats.bouts > 0 ? (stats.wins / stats.bouts) * 100 : 0
        
        // Get member name
        const { data: member } = await supabase
          .from('members')
          .select('first_name, last_name')
          .eq('members_id', memberId)
          .single()

        results.push({
          memberId,
          memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown Member',
          bouts: stats.bouts,
          wins: stats.wins,
          winRate: Math.round(winRate * 10) / 10
        })
      }

      return results.sort((a, b) => b.winRate - a.winRate)
    } catch (error) {
      console.error('Error calculating win rate by member:', error)
      return []
    }
  }

  // Helper method to get most improved competitor
  private static async getMostImprovedCompetitor(
    competitions: any[], 
    entries: any[], 
    results: any[], 
    bouts: any[]
  ): Promise<{ name: string; memberId: number; improvement: number }> {
    try {
      // Sort competitions by date
      const sortedCompetitions = competitions
        .filter(c => c.date_start)
        .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())

      if (sortedCompetitions.length < 6) {
        return { name: 'N/A', memberId: 0, improvement: 0 }
      }

      // Get last 3 and previous 3 competitions
      const last3Competitions = sortedCompetitions.slice(-3)
      const previous3Competitions = sortedCompetitions.slice(-6, -3)

      const last3CompIds = last3Competitions.map(c => c.competitions_id)
      const previous3CompIds = previous3Competitions.map(c => c.competitions_id)

      // Calculate member performance for each period
      const memberImprovements = new Map()

      // Get entries for both periods
      const last3Entries = entries.filter(e => last3CompIds.includes(e.competitions_id))
      const previous3Entries = entries.filter(e => previous3CompIds.includes(e.competitions_id))

      // Calculate win rates for last 3 competitions
      const last3Stats = new Map()
      last3Entries.forEach(entry => {
        const memberId = entry.members_id
        if (!memberId) return

        const memberBouts = bouts.filter(b => 
          b.competition_entries_id === entry.competition_entries_id && 
          last3CompIds.includes(b.competitions_id)
        )

        if (!last3Stats.has(memberId)) {
          last3Stats.set(memberId, { bouts: 0, wins: 0 })
        }

        const stats = last3Stats.get(memberId)
        stats.bouts += memberBouts.length
        stats.wins += memberBouts.filter(b => b.result === 'Win' || b.result === 'win').length
      })

      // Calculate win rates for previous 3 competitions
      const previous3Stats = new Map()
      previous3Entries.forEach(entry => {
        const memberId = entry.members_id
        if (!memberId) return

        const memberBouts = bouts.filter(b => 
          b.competition_entries_id === entry.competition_entries_id && 
          previous3CompIds.includes(b.competitions_id)
        )

        if (!previous3Stats.has(memberId)) {
          previous3Stats.set(memberId, { bouts: 0, wins: 0 })
        }

        const stats = previous3Stats.get(memberId)
        stats.bouts += memberBouts.length
        stats.wins += memberBouts.filter(b => b.result === 'Win' || b.result === 'win').length
      })

      // Calculate improvement for members who competed in both periods
      for (const [memberId, lastStats] of last3Stats) {
        const previousStats = previous3Stats.get(memberId)
        if (!previousStats || lastStats.bouts === 0 || previousStats.bouts === 0) continue

        const lastWinRate = (lastStats.wins / lastStats.bouts) * 100
        const previousWinRate = (previousStats.wins / previousStats.bouts) * 100
        const improvement = lastWinRate - previousWinRate

        memberImprovements.set(memberId, {
          memberId,
          improvement,
          lastWinRate,
          previousWinRate
        })
      }

      // Find most improved
      if (memberImprovements.size === 0) {
        return { name: 'N/A', memberId: 0, improvement: 0 }
      }

      const mostImproved = Array.from(memberImprovements.values())
        .sort((a, b) => b.improvement - a.improvement)[0]

      // Get member name
      const { data: member } = await supabase
        .from('members')
        .select('first_name, last_name')
        .eq('members_id', mostImproved.memberId)
        .single()

      return {
        name: member ? `${member.first_name} ${member.last_name}` : 'Unknown Member',
        memberId: mostImproved.memberId,
        improvement: Math.round(mostImproved.improvement * 10) / 10
      }
    } catch (error) {
      console.error('Error calculating most improved competitor:', error)
      return { name: 'N/A', memberId: 0, improvement: 0 }
    }
  }

  // Helper method to get best performing team pairing
  private static async getBestTeamPairing(teams: any[], bouts: any[]): Promise<{ members: string[]; winRate: number; bouts: number }> {
    try {
      // Group team bouts by team name
      const teamStats = new Map()

      bouts
        .filter(b => b.competition_teams_id !== null)
        .forEach(bout => {
          const team = teams.find(t => t.competition_teams_id === bout.competition_teams_id)
          if (!team?.team_name) return

          if (!teamStats.has(team.team_name)) {
            teamStats.set(team.team_name, {
              teamName: team.team_name,
              bouts: 0,
              wins: 0,
              members: new Set()
            })
          }

          const stats = teamStats.get(team.team_name)
          stats.bouts++
          if (bout.result === 'Win' || bout.result === 'win') {
            stats.wins++
          }

          // Note: We'd need competition_team_members table to get actual member names
          // For now, we'll use team name as placeholder
          stats.members.add(`Team Member`)
        })

      if (teamStats.size === 0) {
        return { members: ['N/A'], winRate: 0, bouts: 0 }
      }

      // Find best performing team
      const bestTeam = Array.from(teamStats.values())
        .sort((a, b) => {
          const aWinRate = a.bouts > 0 ? (a.wins / a.bouts) * 100 : 0
          const bWinRate = b.bouts > 0 ? (b.wins / b.bouts) * 100 : 0
          return bWinRate - aWinRate
        })[0]

      const winRate = bestTeam.bouts > 0 ? (bestTeam.wins / bestTeam.bouts) * 100 : 0

      return {
        members: Array.from(bestTeam.members),
        winRate: Math.round(winRate * 10) / 10,
        bouts: bestTeam.bouts
      }
    } catch (error) {
      console.error('Error calculating best team pairing:', error)
      return { members: ['N/A'], winRate: 0, bouts: 0 }
    }
  }

  // Method to get year-on-year trends
  static async getYearOnYearTrends(): Promise<{
    year: number;
    totalMedals: number;
    goldMedals: number;
    silverMedals: number;
    bronzeMedals: number;
    totalEntries: number;
    totalBouts: number;
    winRate: number;
  }[]> {
    try {
      // Fetch competitions with dates
      const { data: competitions } = await supabase
        .from('competitions')
        .select('competitions_id, date_start')
        .not('date_start', 'is', null)

      // Fetch entries, bouts, and results
      const [entriesResult, boutsResult, resultsResult] = await Promise.all([
        supabase.from('competition_entries').select('*'),
        supabase.from('competition_bouts').select('*'),
        supabase.from('competition_results').select('*')
      ])

      const entries = entriesResult.data || []
      const bouts = boutsResult.data || []
      const results = resultsResult.data || []

      // Group by year
      const yearStats = new Map()

      competitions?.forEach(competition => {
        const year = new Date(competition.date_start).getFullYear()
        
        if (!yearStats.has(year)) {
          yearStats.set(year, {
            year,
            totalMedals: 0,
            goldMedals: 0,
            silverMedals: 0,
            bronzeMedals: 0,
            totalEntries: 0,
            totalBouts: 0,
            wins: 0
          })
        }

        const stats = yearStats.get(year)

        // Count entries for this competition
        const competitionEntries = entries.filter(e => e.competitions_id === competition.competitions_id)
        stats.totalEntries += competitionEntries.length

        // Count bouts for this competition
        const competitionBouts = bouts.filter(b => b.competitions_id === competition.competitions_id)
        stats.totalBouts += competitionBouts.length
        stats.wins += competitionBouts.filter(b => b.result === 'Win' || b.result === 'win').length

        // Count results for this competition
        const competitionResults = results.filter(r => 
          competitionEntries.some(e => e.competition_entries_id === r.competition_entries_id)
        )

        competitionResults.forEach(result => {
          stats.totalMedals++
          if (result.medal === 'Gold' || result.medal === 'gold') {
            stats.goldMedals++
          } else if (result.medal === 'Silver' || result.medal === 'silver') {
            stats.silverMedals++
          } else if (result.medal === 'Bronze' || result.medal === 'bronze') {
            stats.bronzeMedals++
          }
        })
      })

      // Calculate win rates and return sorted by year
      return Array.from(yearStats.values())
        .map(stats => ({
          year: stats.year,
          totalMedals: stats.totalMedals,
          goldMedals: stats.goldMedals,
          silverMedals: stats.silverMedals,
          bronzeMedals: stats.bronzeMedals,
          totalEntries: stats.totalEntries,
          totalBouts: stats.totalBouts,
          winRate: stats.totalBouts > 0 ? Math.round((stats.wins / stats.totalBouts) * 100 * 10) / 10 : 0
        }))
        .sort((a, b) => a.year - b.year)
    } catch (error) {
      console.error('Error getting year-on-year trends:', error)
      return []
    }
  }

  // Helper method to get competition level breakdown by organisations_id
  private static async getCompetitionLevelBreakdown(competitions: any[]): Promise<{ club: number; national: number; international: number }> {
    try {
      // Get unique organisation IDs
      const organisationIds = [...new Set(competitions.map(c => c.organisations_id).filter(Boolean))]
      
      if (organisationIds.length === 0) {
        return { club: 0, national: 0, international: 0 }
      }

      // Fetch organisation data to determine levels
      const { data: organisations } = await supabase
        .from('organisations')
        .select('organisations_id, name, level')
        .in('organisations_id', organisationIds)

      // Create a map for quick lookup
      const orgMap = new Map()
      organisations?.forEach(org => {
        orgMap.set(org.organisations_id, org)
      })

      // Count competitions by level
      const levels = { club: 0, national: 0, international: 0 }
      
      competitions.forEach(competition => {
        const org = orgMap.get(competition.organisations_id)
        
        if (org?.level) {
          // Use explicit level field if available
          switch (org.level.toLowerCase()) {
            case 'club':
            case 'local':
              levels.club++
              break
            case 'national':
            case 'country':
              levels.national++
              break
            case 'international':
            case 'world':
            case 'global':
              levels.international++
              break
            default:
              levels.club++ // Default to club level
          }
        } else if (org?.name) {
          // Fallback: determine level by organisation name keywords
          const name = org.name.toLowerCase()
          if (name.includes('international') || name.includes('world') || name.includes('global')) {
            levels.international++
          } else if (name.includes('national') || name.includes('championship') || name.includes('federation')) {
            levels.national++
          } else {
            levels.club++
          }
        } else {
          // Default to club level if no organisation data
          levels.club++
        }
      })

      return levels
    } catch (error) {
      console.error('Error getting competition level breakdown:', error)
      // Fallback to simple location-based logic
      return {
        club: competitions.filter(c => 
          c.location?.toLowerCase().includes('club') || 
          c.location?.toLowerCase().includes('local')
        ).length,
        national: competitions.filter(c => 
          c.location?.toLowerCase().includes('national') ||
          c.location?.toLowerCase().includes('championship')
        ).length,
        international: competitions.filter(c => 
          c.location?.toLowerCase().includes('international') ||
          c.location?.toLowerCase().includes('world')
        ).length
      }
    }
  }

  static async getMedalsBreakdown(): Promise<{
    individualMedals: Array<{
      memberId: number
      memberName: string
      profilePicture: string | null
      goldMedals: number
      silverMedals: number
      bronzeMedals: number
      totalMedals: number
      competitions: Array<{
        competitionId: number
        competitionName: string
        date: string
        medal: string
        discipline: string
        category: string
      }>
    }>
    teamMedals: Array<{
      teamName: string
      goldMedals: number
      silverMedals: number
      bronzeMedals: number
      totalMedals: number
      competitions: Array<{
        competitionId: number
        competitionName: string
        date: string
        medal: string
        discipline: string
      }>
    }>
    totalStats: {
      totalGold: number
      totalSilver: number
      totalBronze: number
      totalMedals: number
      uniqueCompetitors: number
      uniqueTeams: number
    }
  }> {
    try {
      console.log('Fetching detailed medals breakdown...')
      
      // Fetch all results with member and competition details
      const { data: results, error: resultsError } = await supabase
        .from('competition_results')
        .select(`
          *,
          member:members(members_id, first_name, last_name, profile_picture_url),
          competition:competitions(competitions_id, Name, date_start)
        `)
        .not('medal', 'is', null)
        .in('medal', ['Gold', 'Silver', 'Bronze', 'gold', 'silver', 'bronze'])

      if (resultsError) {
        console.error('Error fetching results:', resultsError)
        return {
          individualMedals: [],
          teamMedals: [],
          totalStats: { totalGold: 0, totalSilver: 0, totalBronze: 0, totalMedals: 0, uniqueCompetitors: 0, uniqueTeams: 0 }
        }
      }

      // Fetch team results
      const { data: teamResults, error: teamError } = await supabase
        .from('competition_teams')
        .select(`
          *,
          competition:competitions(competitions_id, Name, date_start)
        `)
        .not('medal', 'is', null)
        .in('medal', ['Gold', 'Silver', 'Bronze', 'gold', 'silver', 'bronze'])

      if (teamError) {
        console.error('Error fetching team results:', teamError)
      }

      // Process individual medals
      const memberMedalMap = new Map<number, {
        memberId: number
        memberName: string
        profilePicture: string | null
        goldMedals: number
        silverMedals: number
        bronzeMedals: number
        totalMedals: number
        competitions: Array<any>
      }>()

      results?.forEach(result => {
        if (!result.member) return
        
        const memberId = result.member.members_id
        const memberName = `${result.member.first_name} ${result.member.last_name}`
        
        if (!memberMedalMap.has(memberId)) {
          memberMedalMap.set(memberId, {
            memberId,
            memberName,
            profilePicture: result.member.profile_picture_url,
            goldMedals: 0,
            silverMedals: 0,
            bronzeMedals: 0,
            totalMedals: 0,
            competitions: []
          })
        }

        const memberStats = memberMedalMap.get(memberId)!
        const medal = result.medal?.toLowerCase()
        
        if (medal === 'gold') {
          memberStats.goldMedals++
        } else if (medal === 'silver') {
          memberStats.silverMedals++
        } else if (medal === 'bronze') {
          memberStats.bronzeMedals++
        }
        
        memberStats.totalMedals++
        
        memberStats.competitions.push({
          competitionId: result.competition?.competitions_id,
          competitionName: result.competition?.Name || 'Unknown Competition',
          date: result.competition?.date_start || 'Unknown Date',
          medal: result.medal,
          discipline: result.discipline || 'Unknown',
          category: result.category || 'Unknown'
        })
      })

      // Process team medals
      const teamMedalMap = new Map<string, {
        teamName: string
        goldMedals: number
        silverMedals: number
        bronzeMedals: number
        totalMedals: number
        competitions: Array<any>
      }>()

      teamResults?.forEach(teamResult => {
        const teamName = teamResult.team_name || 'Unknown Team'
        
        if (!teamMedalMap.has(teamName)) {
          teamMedalMap.set(teamName, {
            teamName,
            goldMedals: 0,
            silverMedals: 0,
            bronzeMedals: 0,
            totalMedals: 0,
            competitions: []
          })
        }

        const teamStats = teamMedalMap.get(teamName)!
        const medal = teamResult.medal?.toLowerCase()
        
        if (medal === 'gold') {
          teamStats.goldMedals++
        } else if (medal === 'silver') {
          teamStats.silverMedals++
        } else if (medal === 'bronze') {
          teamStats.bronzeMedals++
        }
        
        teamStats.totalMedals++
        
        teamStats.competitions.push({
          competitionId: teamResult.competition?.competitions_id,
          competitionName: teamResult.competition?.Name || 'Unknown Competition',
          date: teamResult.competition?.date_start || 'Unknown Date',
          medal: teamResult.medal,
          discipline: teamResult.discipline || 'Unknown'
        })
      })

      // Calculate totals
      const individualMedals = Array.from(memberMedalMap.values())
        .sort((a, b) => b.totalMedals - a.totalMedals)
      
      const teamMedals = Array.from(teamMedalMap.values())
        .sort((a, b) => b.totalMedals - a.totalMedals)

      const totalStats = {
        totalGold: individualMedals.reduce((sum, m) => sum + m.goldMedals, 0) + teamMedals.reduce((sum, t) => sum + t.goldMedals, 0),
        totalSilver: individualMedals.reduce((sum, m) => sum + m.silverMedals, 0) + teamMedals.reduce((sum, t) => sum + t.silverMedals, 0),
        totalBronze: individualMedals.reduce((sum, m) => sum + m.bronzeMedals, 0) + teamMedals.reduce((sum, t) => sum + t.bronzeMedals, 0),
        totalMedals: individualMedals.reduce((sum, m) => sum + m.totalMedals, 0) + teamMedals.reduce((sum, t) => sum + t.totalMedals, 0),
        uniqueCompetitors: individualMedals.length,
        uniqueTeams: teamMedals.length
      }

      return {
        individualMedals,
        teamMedals,
        totalStats
      }
    } catch (error) {
      console.error('Error fetching medals breakdown:', error)
      return {
        individualMedals: [],
        teamMedals: [],
        totalStats: { totalGold: 0, totalSilver: 0, totalBronze: 0, totalMedals: 0, uniqueCompetitors: 0, uniqueTeams: 0 }
      }
    }
  }

  static async getAllCompetitors(): Promise<{
    competitors: Array<{
      memberId: number
      memberName: string
      profilePicture: string | null
      totalCompetitions: number
      totalBouts: number
      totalWins: number
      winRate: number
      totalMedals: number
      goldMedals: number
      silverMedals: number
      bronzeMedals: number
      firstCompetition: string
      lastCompetition: string
      competitions: Array<{
        competitionId: number
        competitionName: string
        date: string
        bouts: number
        wins: number
        medals: number
      }>
    }>
    totalStats: {
      totalCompetitors: number
      totalCompetitions: number
      totalBouts: number
      totalWins: number
      overallWinRate: number
      totalMedals: number
    }
  }> {
    try {
      console.log('Fetching all competitors...')
      
      // Get all unique members who have competed
      const { data: entries, error: entriesError } = await supabase
        .from('competition_entries')
        .select(`
          members_id,
          competitions_id,
          competition:competitions(competitions_id, Name, date_start)
        `)
        .not('members_id', 'is', null)

      if (entriesError) {
        console.error('Error fetching entries:', entriesError)
        return {
          competitors: [],
          totalStats: { totalCompetitors: 0, totalCompetitions: 0, totalBouts: 0, totalWins: 0, overallWinRate: 0, totalMedals: 0 }
        }
      }

      // Get member details for all competitors
      const memberIds = [...new Set(entries?.map(e => e.members_id) || [])]
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('members_id, first_name, last_name, profile_picture_url')
        .in('members_id', memberIds)

      if (membersError) {
        console.error('Error fetching members:', membersError)
        return {
          competitors: [],
          totalStats: { totalCompetitors: 0, totalCompetitions: 0, totalBouts: 0, totalWins: 0, overallWinRate: 0, totalMedals: 0 }
        }
      }

      // Get bout data for all members
      const { data: bouts, error: boutsError } = await supabase
        .from('competition_bouts')
        .select(`
          *,
          entry:competition_entries(members_id, competitions_id)
        `)
        .in('competition_entries_id', entries?.map((e: any) => e.competition_entries_id) || [])

      if (boutsError) {
        console.error('Error fetching bouts:', boutsError)
      }

      // Get results data for all members
      const { data: results, error: resultsError } = await supabase
        .from('competition_results')
        .select(`
          *,
          member:members(members_id, first_name, last_name),
          competition:competitions(competitions_id, Name, date_start)
        `)
        .in('members_id', memberIds)

      if (resultsError) {
        console.error('Error fetching results:', resultsError)
      }

      // Process data for each competitor
      const competitorMap = new Map<number, {
        memberId: number
        memberName: string
        profilePicture: string | null
        totalCompetitions: number
        totalBouts: number
        totalWins: number
        winRate: number
        totalMedals: number
        goldMedals: number
        silverMedals: number
        bronzeMedals: number
        firstCompetition: string
        lastCompetition: string
        competitions: Array<any>
      }>()

      // Initialize all competitors
      members?.forEach(member => {
        competitorMap.set(member.members_id, {
          memberId: member.members_id,
          memberName: `${member.first_name} ${member.last_name}`,
          profilePicture: member.profile_picture_url,
          totalCompetitions: 0,
          totalBouts: 0,
          totalWins: 0,
          winRate: 0,
          totalMedals: 0,
          goldMedals: 0,
          silverMedals: 0,
          bronzeMedals: 0,
          firstCompetition: '',
          lastCompetition: '',
          competitions: []
        })
      })

      // Process entries to get competition counts and dates
      entries?.forEach(entry => {
        const competitor = competitorMap.get(entry.members_id)
        if (!competitor) return

        competitor.totalCompetitions++
        
        const competitionDate = (entry.competition as any)?.date_start || ''
        if (!competitor.firstCompetition || competitionDate < competitor.firstCompetition) {
          competitor.firstCompetition = competitionDate
        }
        if (!competitor.lastCompetition || competitionDate > competitor.lastCompetition) {
          competitor.lastCompetition = competitionDate
        }

        // Find existing competition entry or create new one
        let compEntry = competitor.competitions.find(c => c.competitionId === entry.competitions_id)
        if (!compEntry) {
          compEntry = {
            competitionId: entry.competitions_id,
            competitionName: (entry.competition as any)?.Name || 'Unknown Competition',
            date: competitionDate,
            bouts: 0,
            wins: 0,
            medals: 0
          }
          competitor.competitions.push(compEntry)
        }
      })

      // Process bouts data
      bouts?.forEach(bout => {
        if (!bout.entry) return
        const competitor = competitorMap.get(bout.entry.members_id)
        if (!competitor) return

        competitor.totalBouts++
        if (this.isWin(bout.result)) {
          competitor.totalWins++
        }

        // Update competition-specific bout data
        const compEntry = competitor.competitions.find(c => c.competitionId === bout.entry.competitions_id)
        if (compEntry) {
          compEntry.bouts++
          if (this.isWin(bout.result)) {
            compEntry.wins++
          }
        }
      })

      // Process results data
      results?.forEach(result => {
        const competitor = competitorMap.get(result.members_id)
        if (!competitor) return

        const medal = result.medal?.toLowerCase()
        if (medal === 'gold' || medal === 'silver' || medal === 'bronze') {
          competitor.totalMedals++
          
          if (medal === 'gold') competitor.goldMedals++
          else if (medal === 'silver') competitor.silverMedals++
          else if (medal === 'bronze') competitor.bronzeMedals++

          // Update competition-specific medal data
          const compEntry = competitor.competitions.find(c => c.competitionId === result.competitions_id)
          if (compEntry) {
            compEntry.medals++
          }
        }
      })

      // Calculate win rates and sort competitions
      const competitors = Array.from(competitorMap.values()).map(competitor => {
        competitor.winRate = competitor.totalBouts > 0 ? 
          Math.round((competitor.totalWins / competitor.totalBouts) * 100 * 10) / 10 : 0
        
        // Sort competitions by date
        competitor.competitions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        return competitor
      })

      // Sort competitors by total medals (descending), then by win rate
      competitors.sort((a, b) => {
        if (b.totalMedals !== a.totalMedals) return b.totalMedals - a.totalMedals
        return b.winRate - a.winRate
      })

      // Calculate total stats
      const totalStats = {
        totalCompetitors: competitors.length,
        totalCompetitions: [...new Set(entries?.map(e => e.competitions_id) || [])].length,
        totalBouts: competitors.reduce((sum, c) => sum + c.totalBouts, 0),
        totalWins: competitors.reduce((sum, c) => sum + c.totalWins, 0),
        overallWinRate: competitors.reduce((sum, c) => sum + c.totalBouts, 0) > 0 ? 
          Math.round((competitors.reduce((sum, c) => sum + c.totalWins, 0) / competitors.reduce((sum, c) => sum + c.totalBouts, 0)) * 100 * 10) / 10 : 0,
        totalMedals: competitors.reduce((sum, c) => sum + c.totalMedals, 0)
      }

      return {
        competitors,
        totalStats
      }
    } catch (error) {
      console.error('Error fetching all competitors:', error)
      return {
        competitors: [],
        totalStats: { totalCompetitors: 0, totalCompetitions: 0, totalBouts: 0, totalWins: 0, overallWinRate: 0, totalMedals: 0 }
      }
    }
  }

  static async getWinRateAnalysis(): Promise<{
    individualBouts: Array<{
      boutId: number
      memberId: number
      memberName: string
      profilePicture: string | null
      competitionId: number
      competitionName: string
      date: string
      result: string
      opponent: string
      opponentClub: string
      score: string | null
      scoreFor: number | null
      scoreAgainst: number | null
      coach: string | null
      discipline: string | null
      disciplineDescription: string | null
      category: string | null
      round: string | null
      isWin: boolean
      isLoss: boolean
    }>
    teamBouts: Array<{
      boutId: number
      teamId: number
      teamName: string
      competitionId: number
      competitionName: string
      date: string
      result: string
      opponent: string
      opponentClub: string
      score: string | null
      scoreFor: number | null
      scoreAgainst: number | null
      coach: string | null
      discipline: string | null
      isWin: boolean
      isLoss: boolean
    }>
    summary: {
      totalBouts: number
      totalWins: number
      totalLosses: number
      overallWinRate: number
      individualBouts: number
      individualWins: number
      individualLosses: number
      individualWinRate: number
      teamBouts: number
      teamWins: number
      teamLosses: number
      teamWinRate: number
      uniqueCompetitors: number
      uniqueTeams: number
      uniqueCompetitions: number
    }
  }> {
    try {
      // Optimized single query with proper joins for discipline and score data
      const { data: bouts, error: boutsError } = await supabase
        .from('competition_bouts')
        .select(`
          competition_bouts_id,
          created_at,
          competition_entries_id,
          competition_teams_id,
          round,
          opponent_name,
          opponent_club,
          score_for,
          score_against,
          result,
          entry:competition_entries(
            members_id,
            competition_coaches_id,
            competition_disciplines_id,
            competition:competitions(competitions_id, Name, date_start),
            discipline:competition_disciplines(competition_disciplines_id, name, team_event)
          ),
          team:competition_teams(
            competition_teams_id,
            team_name,
            competition:competitions(competitions_id, Name, date_start)
          )
        `)
        .order('created_at', { ascending: false })

      if (boutsError) {
        console.error('Error fetching bouts:', boutsError)
        return {
          individualBouts: [],
          teamBouts: [],
          summary: {
            totalBouts: 0, totalWins: 0, totalLosses: 0, overallWinRate: 0,
            individualBouts: 0, individualWins: 0, individualLosses: 0, individualWinRate: 0,
            teamBouts: 0, teamWins: 0, teamLosses: 0, teamWinRate: 0,
            uniqueCompetitors: 0, uniqueTeams: 0, uniqueCompetitions: 0
          }
        }
      }

      if (!bouts || bouts.length === 0) {
        return {
          individualBouts: [],
          teamBouts: [],
          summary: {
            totalBouts: 0, totalWins: 0, totalLosses: 0, overallWinRate: 0,
            individualBouts: 0, individualWins: 0, individualLosses: 0, individualWinRate: 0,
            teamBouts: 0, teamWins: 0, teamLosses: 0, teamWinRate: 0,
            uniqueCompetitors: 0, uniqueTeams: 0, uniqueCompetitions: 0
          }
        }
      }

      // Get unique IDs for batch fetching related data
      const memberIds = [...new Set(bouts.filter(b => b.entry?.members_id).map(b => b.entry.members_id))]
      const coachIds = [...new Set(bouts.filter(b => b.entry?.competition_coaches_id).map(b => b.entry.competition_coaches_id))]

      // Parallel fetch for related data
      const [membersResult, coachesResult] = await Promise.allSettled([
        memberIds.length > 0 ? supabase
          .from('members')
          .select('members_id, first_name, last_name, profile_picture_url')
          .in('members_id', memberIds) : Promise.resolve({ data: [], error: null }),
        
        coachIds.length > 0 ? supabase
          .from('competition_coaches')
          .select('competition_coaches_id, first_name, last_name')
          .in('competition_coaches_id', coachIds) : Promise.resolve({ data: [], error: null })
      ])

      // Extract data from results
      const members = membersResult.status === 'fulfilled' ? membersResult.value.data || [] : []
      const coaches = coachesResult.status === 'fulfilled' ? coachesResult.value.data || [] : []

      // Create lookup maps
      const memberMap = new Map(members.map(m => [m.members_id, m]))
      const coachMap = new Map(coaches.map(c => [c.competition_coaches_id, c]))

      // Process bouts efficiently
      const individualBouts: any[] = []
      const teamBouts: any[] = []

      for (const bout of bouts) {
        const isWin = this.isWin(bout.result)
        const isLoss = this.isLoss(bout.result)
        
        if (bout.entry && bout.entry.members_id) {
          // Individual bout
          const member = memberMap.get(bout.entry.members_id)
          const coach = coachMap.get(bout.entry.competition_coaches_id)
          
          individualBouts.push({
            boutId: bout.competition_bouts_id,
            memberId: bout.entry.members_id,
            memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown Member',
            profilePicture: member?.profile_picture_url || null,
            competitionId: bout.entry.competition?.competitions_id,
            competitionName: bout.entry.competition?.Name || 'Unknown Competition',
            date: bout.entry.competition?.date_start || bout.created_at,
            result: bout.result || 'Unknown',
            opponent: bout.opponent_name || 'Unknown Opponent',
            opponentClub: bout.opponent_club || 'Unknown Club',
            score: null,
            scoreFor: bout.score_for,
            scoreAgainst: bout.score_against,
            coach: coach ? `${coach.first_name} ${coach.last_name}` : null,
            discipline: bout.entry.discipline?.name || 'Unknown Discipline',
            disciplineDescription: null,
            category: null,
            round: bout.round,
            isWin,
            isLoss
          })
        } else if (bout.competition_teams_id && bout.team) {
          // Team bout
          teamBouts.push({
            boutId: bout.competition_bouts_id,
            teamId: bout.competition_teams_id,
            teamName: bout.team.team_name || 'Unknown Team',
            competitionId: bout.team.competition?.competitions_id,
            competitionName: bout.team.competition?.Name || 'Unknown Competition',
            date: bout.team.competition?.date_start || bout.created_at,
            result: bout.result || 'Unknown',
            opponent: bout.opponent_name || 'Unknown Opponent',
            opponentClub: bout.opponent_club || 'Unknown Club',
            score: null,
            scoreFor: bout.score_for,
            scoreAgainst: bout.score_against,
            coach: null,
            discipline: 'Unknown Discipline',
            isWin,
            isLoss
          })
        }
      }

      // Calculate summary statistics efficiently
      const totalBouts = individualBouts.length + teamBouts.length
      const individualWins = individualBouts.filter(b => b.isWin).length
      const individualLosses = individualBouts.filter(b => b.isLoss).length
      const teamWins = teamBouts.filter(b => b.isWin).length
      const teamLosses = teamBouts.filter(b => b.isLoss).length
      const totalWins = individualWins + teamWins
      const totalLosses = individualLosses + teamLosses
      const overallWinRate = totalBouts > 0 ? Math.round((totalWins / totalBouts) * 100 * 10) / 10 : 0
      const individualWinRate = individualBouts.length > 0 ? Math.round((individualWins / individualBouts.length) * 100 * 10) / 10 : 0
      const teamWinRate = teamBouts.length > 0 ? Math.round((teamWins / teamBouts.length) * 100 * 10) / 10 : 0

      const uniqueCompetitors = new Set(individualBouts.map(b => b.memberId)).size
      const uniqueTeams = new Set(teamBouts.map(b => b.teamId)).size
      const uniqueCompetitions = new Set([...individualBouts.map(b => b.competitionId), ...teamBouts.map(b => b.competitionId)]).size

      return {
        individualBouts,
        teamBouts,
        summary: {
          totalBouts,
          totalWins,
          totalLosses,
          overallWinRate,
          individualBouts: individualBouts.length,
          individualWins,
          individualLosses,
          individualWinRate,
          teamBouts: teamBouts.length,
          teamWins,
          teamLosses,
          teamWinRate,
          uniqueCompetitors,
          uniqueTeams,
          uniqueCompetitions
        }
      }
    } catch (error) {
      console.error('Error fetching win rate analysis:', error)
      return {
        individualBouts: [],
        teamBouts: [],
        summary: {
          totalBouts: 0, totalWins: 0, totalLosses: 0, overallWinRate: 0,
          individualBouts: 0, individualWins: 0, individualLosses: 0, individualWinRate: 0,
          teamBouts: 0, teamWins: 0, teamLosses: 0, teamWinRate: 0,
          uniqueCompetitors: 0, uniqueTeams: 0, uniqueCompetitions: 0
        }
      }
    }
  }
}
