import { supabase } from './supabaseClient'

// Optimized Analytics Service using Supabase views and RPC functions
export class OptimizedAnalyticsService {
  
  // Get all club analytics in a single optimized call
  static async getClubAnalytics(): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_club_analytics')
      
      if (error) {
        console.error('Error fetching club analytics:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error in getClubAnalytics:', error)
      throw error
    }
  }

  // Get detailed win rate analysis in a single optimized call
  static async getWinRateAnalysis(): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_win_rate_analysis')
      
      if (error) {
        console.error('Error fetching win rate analysis:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error in getWinRateAnalysis:', error)
      throw error
    }
  }

  // Get all competitors with precomputed stats
  static async getAllCompetitors(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('view_competitor_summary')
        .select(`
          members_id,
          first_name,
          last_name,
          full_name,
          profile_picture_url,
          total_competitions,
          total_bouts,
          total_wins,
          total_losses,
          win_rate_percentage,
          total_gold,
          total_silver,
          total_bronze,
          total_medals,
          medal_points,
          first_competition_date,
          last_competition_date,
          average_round_reached
        `)
        .order('medal_points', { ascending: false })
        .limit(50) // Limit for performance

      if (error) {
        console.error('Error fetching competitors:', error)
        throw error
      }

      // Transform data to match expected format
      const competitors = data?.map(competitor => ({
        memberId: competitor.members_id,
        memberName: competitor.full_name,
        profilePicture: competitor.profile_picture_url,
        totalCompetitions: competitor.total_competitions,
        totalBouts: competitor.total_bouts,
        totalWins: competitor.total_wins,
        winRate: competitor.win_rate_percentage,
        totalMedals: competitor.total_medals,
        goldMedals: competitor.total_gold,
        silverMedals: competitor.total_silver,
        bronzeMedals: competitor.total_bronze,
        firstCompetition: competitor.first_competition_date,
        lastCompetition: competitor.last_competition_date
      })) || []

      // Calculate total stats
      const totalStats = {
        totalCompetitors: competitors.length,
        totalCompetitions: competitors.reduce((sum, c) => sum + c.totalCompetitions, 0),
        totalBouts: competitors.reduce((sum, c) => sum + c.totalBouts, 0),
        totalWins: competitors.reduce((sum, c) => sum + c.totalWins, 0),
        overallWinRate: competitors.length > 0 
          ? Math.round((competitors.reduce((sum, c) => sum + c.totalWins, 0) / competitors.reduce((sum, c) => sum + c.totalBouts, 0)) * 100 * 10) / 10
          : 0,
        totalMedals: competitors.reduce((sum, c) => sum + c.totalMedals, 0)
      }

      return {
        competitors,
        totalStats
      }
    } catch (error) {
      console.error('Error in getAllCompetitors:', error)
      throw error
    }
  }

  // Get competition summary data
  static async getCompetitionSummary(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('view_competition_summary')
        .select(`
          competitions_id,
          competition_name,
          date_start,
          date_end,
          location,
          total_medals,
          total_gold,
          total_silver,
          total_bronze,
          total_bouts,
          total_wins,
          total_losses,
          win_rate_percentage,
          total_entries,
          unique_competitors,
          medal_efficiency_percentage
        `)
        .order('date_start', { ascending: false })

      if (error) {
        console.error('Error fetching competition summary:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getCompetitionSummary:', error)
      throw error
    }
  }

  // Get disciplines for filtering
  static async getDisciplines(): Promise<Array<{id: number, name: string}>> {
    try {
      const { data, error } = await supabase
        .from('competition_disciplines')
        .select('competition_disciplines_id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching disciplines:', error)
        return []
      }

      return data?.map(d => ({
        id: d.competition_disciplines_id,
        name: d.name
      })) || []
    } catch (error) {
      console.error('Error in getDisciplines:', error)
      return []
    }
  }

  // Batch fetch all analytics data for a page
  static async getBatchAnalytics(): Promise<{
    clubAnalytics: any,
    winRateAnalysis: any,
    competitors: any,
    competitions: any,
    disciplines: Array<{id: number, name: string}>
  }> {
    try {
      console.log('Starting batch analytics fetch...')
      const startTime = performance.now()

      // Use Promise.all to fetch all data in parallel
      const [
        clubAnalyticsResult,
        winRateAnalysisResult,
        competitorsResult,
        competitionsResult,
        disciplinesResult
      ] = await Promise.allSettled([
        this.getClubAnalytics(),
        this.getWinRateAnalysis(),
        this.getAllCompetitors(),
        this.getCompetitionSummary(),
        this.getDisciplines()
      ])

      const endTime = performance.now()
      console.log(`Batch analytics fetch completed in ${Math.round(endTime - startTime)}ms`)

      return {
        clubAnalytics: clubAnalyticsResult.status === 'fulfilled' ? clubAnalyticsResult.value : null,
        winRateAnalysis: winRateAnalysisResult.status === 'fulfilled' ? winRateAnalysisResult.value : null,
        competitors: competitorsResult.status === 'fulfilled' ? competitorsResult.value : { competitors: [], totalStats: {} },
        competitions: competitionsResult.status === 'fulfilled' ? competitionsResult.value : [],
        disciplines: disciplinesResult.status === 'fulfilled' ? disciplinesResult.value : []
      }
    } catch (error) {
      console.error('Error in batch analytics fetch:', error)
      throw error
    }
  }

  // Filter win rate analysis by discipline
  static filterWinRateByDiscipline(winRateData: any, discipline: string): any {
    if (discipline === 'All Disciplines' || !winRateData) {
      return winRateData
    }

    const filteredData = { ...winRateData }

    // Filter individual bouts
    if (filteredData.individualBouts) {
      filteredData.individualBouts = filteredData.individualBouts.filter((bout: any) => 
        bout.discipline === discipline
      )
    }

    // Filter team bouts (most team bouts don't have discipline info, so keep them all)
    // if (filteredData.teamBouts) {
    //   filteredData.teamBouts = filteredData.teamBouts.filter((bout: any) => 
    //     bout.discipline === discipline
    //   )
    // }

    // Recalculate summary statistics
    if (filteredData.summary) {
      const individualBouts = filteredData.individualBouts || []
      const teamBouts = filteredData.teamBouts || []
      const totalBouts = individualBouts.length + teamBouts.length
      const individualWins = individualBouts.filter((b: any) => b.isWin).length
      const individualLosses = individualBouts.filter((b: any) => b.isLoss).length
      const teamWins = teamBouts.filter((b: any) => b.isWin).length
      const teamLosses = teamBouts.filter((b: any) => b.isLoss).length
      const totalWins = individualWins + teamWins
      const totalLosses = individualLosses + teamLosses
      const overallWinRate = totalBouts > 0 ? Math.round((totalWins / totalBouts) * 100 * 10) / 10 : 0
      const individualWinRate = individualBouts.length > 0 ? Math.round((individualWins / individualBouts.length) * 100 * 10) / 10 : 0
      const teamWinRate = teamBouts.length > 0 ? Math.round((teamWins / teamBouts.length) * 100 * 10) / 10 : 0

      filteredData.summary = {
        ...filteredData.summary,
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
        uniqueCompetitors: new Set(individualBouts.map((b: any) => b.memberId)).size,
        uniqueTeams: new Set(teamBouts.map((b: any) => b.teamId)).size,
        uniqueCompetitions: new Set([...individualBouts.map((b: any) => b.competitionId), ...teamBouts.map((b: any) => b.competitionId)]).size
      }
    }

    return filteredData
  }
}