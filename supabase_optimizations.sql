-- Supabase Analytics Optimization
-- This file contains views and functions to precompute analytics data

-- 1. Competition Summary View
-- Aggregates total medals, bouts, win rate, and entries per competition
CREATE OR REPLACE VIEW view_competition_summary AS
SELECT 
    c.competitions_id,
    c.Name as competition_name,
    c.date_start,
    c.date_end,
    c.location,
    c.organisations_id,
    
    -- Medal counts
    COALESCE(medals.total_gold, 0) as total_gold,
    COALESCE(medals.total_silver, 0) as total_silver,
    COALESCE(medals.total_bronze, 0) as total_bronze,
    COALESCE(medals.total_gold + medals.total_silver + medals.total_bronze, 0) as total_medals,
    
    -- Bout statistics
    COALESCE(bouts.total_bouts, 0) as total_bouts,
    COALESCE(bouts.total_wins, 0) as total_wins,
    COALESCE(bouts.total_losses, 0) as total_losses,
    CASE 
        WHEN COALESCE(bouts.total_bouts, 0) > 0 
        THEN ROUND((COALESCE(bouts.total_wins, 0)::decimal / bouts.total_bouts) * 100, 1)
        ELSE 0 
    END as win_rate_percentage,
    
    -- Entry statistics
    COALESCE(entries.total_entries, 0) as total_entries,
    COALESCE(entries.unique_competitors, 0) as unique_competitors,
    
    -- Medal efficiency
    CASE 
        WHEN COALESCE(entries.total_entries, 0) > 0 
        THEN ROUND(((COALESCE(medals.total_gold, 0) + medals.total_silver + medals.total_bronze)::decimal / entries.total_entries) * 100, 1)
        ELSE 0 
    END as medal_efficiency_percentage

FROM competitions c

-- Medal aggregations
LEFT JOIN (
    SELECT 
        competitions_id,
        SUM(CASE WHEN medal = 'Gold' THEN 1 ELSE 0 END) as total_gold,
        SUM(CASE WHEN medal = 'Silver' THEN 1 ELSE 0 END) as total_silver,
        SUM(CASE WHEN medal = 'Bronze' THEN 1 ELSE 0 END) as total_bronze
    FROM competition_results cr
    JOIN competition_entries ce ON cr.competition_entries_id = ce.competition_entries_id
    GROUP BY competitions_id
) medals ON c.competitions_id = medals.competitions_id

-- Bout aggregations
LEFT JOIN (
    SELECT 
        COALESCE(ce.competitions_id, ct.competitions_id) as competitions_id,
        COUNT(*) as total_bouts,
        SUM(CASE WHEN LOWER(cb.result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed') THEN 1 ELSE 0 END) as total_wins,
        SUM(CASE WHEN LOWER(cb.result) IN ('loss', 'l', 'defeat', 'defeated', 'lost', '0', 'false', 'no', 'fail', 'failed', 'unsuccessful') THEN 1 ELSE 0 END) as total_losses
    FROM competition_bouts cb
    LEFT JOIN competition_entries ce ON cb.competition_entries_id = ce.competition_entries_id
    LEFT JOIN competition_teams ct ON cb.competition_teams_id = ct.competition_teams_id
    GROUP BY COALESCE(ce.competitions_id, ct.competitions_id)
) bouts ON c.competitions_id = bouts.competitions_id

-- Entry aggregations
LEFT JOIN (
    SELECT 
        competitions_id,
        COUNT(*) as total_entries,
        COUNT(DISTINCT members_id) as unique_competitors
    FROM competition_entries
    GROUP BY competitions_id
) entries ON c.competitions_id = entries.competitions_id

ORDER BY c.date_start DESC;

-- 2. Competitor Summary View
-- Aggregates total medals, win rate, and average round per competitor
CREATE OR REPLACE VIEW view_competitor_summary AS
SELECT 
    m.members_id,
    m.first_name,
    m.last_name,
    m.profile_picture_url,
    CONCAT(m.first_name, ' ', m.last_name) as full_name,
    
    -- Competition statistics
    COALESCE(stats.total_competitions, 0) as total_competitions,
    COALESCE(stats.total_bouts, 0) as total_bouts,
    COALESCE(stats.total_wins, 0) as total_wins,
    COALESCE(stats.total_losses, 0) as total_losses,
    CASE 
        WHEN COALESCE(stats.total_bouts, 0) > 0 
        THEN ROUND((COALESCE(stats.total_wins, 0)::decimal / stats.total_bouts) * 100, 1)
        ELSE 0 
    END as win_rate_percentage,
    
    -- Medal statistics
    COALESCE(medals.total_gold, 0) as total_gold,
    COALESCE(medals.total_silver, 0) as total_silver,
    COALESCE(medals.total_bronze, 0) as total_bronze,
    COALESCE(medals.total_gold + medals.total_silver + medals.total_bronze, 0) as total_medals,
    COALESCE(medals.total_gold * 3 + medals.total_silver * 2 + medals.total_bronze, 0) as medal_points,
    
    -- Competition dates
    stats.first_competition_date,
    stats.last_competition_date,
    
    -- Average round reached
    CASE 
        WHEN COALESCE(stats.total_bouts, 0) > 0 
        THEN ROUND(AVG(
            CASE 
                WHEN LOWER(cb.round) LIKE '%final%' THEN 4
                WHEN LOWER(cb.round) LIKE '%semi%' THEN 3
                WHEN LOWER(cb.round) LIKE '%quarter%' THEN 2
                WHEN LOWER(cb.round) LIKE '%first%' OR LOWER(cb.round) LIKE '%prelim%' THEN 1
                ELSE 1
            END
        )::decimal, 1)
        ELSE 0 
    END as average_round_reached

FROM members m

-- Bout and competition statistics
LEFT JOIN (
    SELECT 
        ce.members_id,
        COUNT(DISTINCT ce.competitions_id) as total_competitions,
        COUNT(cb.competition_bouts_id) as total_bouts,
        SUM(CASE WHEN LOWER(cb.result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed') THEN 1 ELSE 0 END) as total_wins,
        SUM(CASE WHEN LOWER(cb.result) IN ('loss', 'l', 'defeat', 'defeated', 'lost', '0', 'false', 'no', 'fail', 'failed', 'unsuccessful') THEN 1 ELSE 0 END) as total_losses,
        MIN(c.date_start) as first_competition_date,
        MAX(c.date_start) as last_competition_date
    FROM competition_entries ce
    LEFT JOIN competition_bouts cb ON ce.competition_entries_id = cb.competition_entries_id
    LEFT JOIN competitions c ON ce.competitions_id = c.competitions_id
    GROUP BY ce.members_id
) stats ON m.members_id = stats.members_id

-- Medal statistics
LEFT JOIN (
    SELECT 
        ce.members_id,
        SUM(CASE WHEN cr.medal = 'Gold' THEN 1 ELSE 0 END) as total_gold,
        SUM(CASE WHEN cr.medal = 'Silver' THEN 1 ELSE 0 END) as total_silver,
        SUM(CASE WHEN cr.medal = 'Bronze' THEN 1 ELSE 0 END) as total_bronze
    FROM competition_entries ce
    LEFT JOIN competition_results cr ON ce.competition_entries_id = cr.competition_entries_id
    GROUP BY ce.members_id
) medals ON m.members_id = medals.members_id

-- Only include members who have competed
WHERE stats.members_id IS NOT NULL

ORDER BY medal_points DESC, total_medals DESC, win_rate_percentage DESC;

-- 3. Club Analytics RPC Function
-- Returns all club-level analytics in a single call
CREATE OR REPLACE FUNCTION get_club_analytics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalCompetitions', COUNT(*),
        'totalMedals', SUM(total_medals),
        'goldMedals', SUM(total_gold),
        'silverMedals', SUM(total_silver),
        'bronzeMedals', SUM(total_bronze),
        'totalBouts', SUM(total_bouts),
        'totalWins', SUM(total_wins),
        'totalLosses', SUM(total_losses),
        'winRate', CASE 
            WHEN SUM(total_bouts) > 0 
            THEN ROUND((SUM(total_wins)::decimal / SUM(total_bouts)) * 100, 1)
            ELSE 0 
        END,
        'totalCompetitors', SUM(unique_competitors),
        'medalEfficiency', CASE 
            WHEN SUM(total_entries) > 0 
            THEN ROUND((SUM(total_medals)::decimal / SUM(total_entries)) * 100, 1)
            ELSE 0 
        END,
        'competitionsAttended', COUNT(*),
        'yearOnYearTrend', 0, -- Calculate this separately if needed
        'topPerformer', (
            SELECT json_build_object(
                'memberId', members_id,
                'name', full_name,
                'medalPoints', medal_points
            )
            FROM view_competitor_summary
            ORDER BY medal_points DESC
            LIMIT 1
        ),
        'competitionLevels', json_build_object(
            'club', COUNT(CASE WHEN organisations_id IS NULL OR organisations_id = 1 THEN 1 END),
            'national', COUNT(CASE WHEN organisations_id = 2 THEN 1 END),
            'international', COUNT(CASE WHEN organisations_id > 2 THEN 1 END)
        )
    ) INTO result
    FROM view_competition_summary;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Win Rate Analysis RPC Function
-- Returns detailed win rate analysis with individual and team bouts
CREATE OR REPLACE FUNCTION get_win_rate_analysis()
RETURNS JSON AS $$
DECLARE
    result JSON;
    individual_bouts JSON;
    team_bouts JSON;
    summary JSON;
BEGIN
    -- Individual bouts with details
    SELECT json_agg(
        json_build_object(
            'boutId', cb.competition_bouts_id,
            'memberId', ce.members_id,
            'memberName', CONCAT(m.first_name, ' ', m.last_name),
            'profilePicture', m.profile_picture_url,
            'competitionId', c.competitions_id,
            'competitionName', c.Name,
            'date', c.date_start,
            'result', cb.result,
            'opponent', cb.opponent_name,
            'opponentClub', cb.opponent_club,
            'scoreFor', cb.score_for,
            'scoreAgainst', cb.score_against,
            'coach', CONCAT(cc.first_name, ' ', cc.last_name),
            'discipline', cd.name,
            'round', cb.round,
            'isWin', LOWER(cb.result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed'),
            'isLoss', LOWER(cb.result) IN ('loss', 'l', 'defeat', 'defeated', 'lost', '0', 'false', 'no', 'fail', 'failed', 'unsuccessful')
        )
    ) INTO individual_bouts
    FROM competition_bouts cb
    JOIN competition_entries ce ON cb.competition_entries_id = ce.competition_entries_id
    JOIN members m ON ce.members_id = m.members_id
    JOIN competitions c ON ce.competitions_id = c.competitions_id
    LEFT JOIN competition_coaches cc ON ce.competition_coaches_id = cc.competition_coaches_id
    LEFT JOIN competition_disciplines cd ON ce.competition_disciplines_id = cd.competition_disciplines_id
    WHERE cb.competition_teams_id IS NULL
    ORDER BY cb.created_at DESC;

    -- Team bouts with details
    SELECT json_agg(
        json_build_object(
            'boutId', cb.competition_bouts_id,
            'teamId', cb.competition_teams_id,
            'teamName', ct.team_name,
            'competitionId', c.competitions_id,
            'competitionName', c.Name,
            'date', c.date_start,
            'result', cb.result,
            'opponent', cb.opponent_name,
            'opponentClub', cb.opponent_club,
            'scoreFor', cb.score_for,
            'scoreAgainst', cb.score_against,
            'discipline', 'Team Event',
            'isWin', LOWER(cb.result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed'),
            'isLoss', LOWER(cb.result) IN ('loss', 'l', 'defeat', 'defeated', 'lost', '0', 'false', 'no', 'fail', 'failed', 'unsuccessful')
        )
    ) INTO team_bouts
    FROM competition_bouts cb
    JOIN competition_teams ct ON cb.competition_teams_id = ct.competition_teams_id
    JOIN competitions c ON ct.competitions_id = c.competitions_id
    WHERE cb.competition_entries_id IS NULL
    ORDER BY cb.created_at DESC;

    -- Summary statistics
    SELECT json_build_object(
        'totalBouts', COALESCE((SELECT COUNT(*) FROM competition_bouts), 0),
        'totalWins', COALESCE((
            SELECT COUNT(*) FROM competition_bouts 
            WHERE LOWER(result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed')
        ), 0),
        'totalLosses', COALESCE((
            SELECT COUNT(*) FROM competition_bouts 
            WHERE LOWER(result) IN ('loss', 'l', 'defeat', 'defeated', 'lost', '0', 'false', 'no', 'fail', 'failed', 'unsuccessful')
        ), 0),
        'overallWinRate', CASE 
            WHEN (SELECT COUNT(*) FROM competition_bouts) > 0 
            THEN ROUND((
                (SELECT COUNT(*) FROM competition_bouts 
                 WHERE LOWER(result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed'))::decimal 
                / (SELECT COUNT(*) FROM competition_bouts)
            ) * 100, 1)
            ELSE 0 
        END,
        'individualBouts', COALESCE((SELECT COUNT(*) FROM competition_bouts WHERE competition_teams_id IS NULL), 0),
        'individualWins', COALESCE((
            SELECT COUNT(*) FROM competition_bouts 
            WHERE competition_teams_id IS NULL 
            AND LOWER(result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed')
        ), 0),
        'individualLosses', COALESCE((
            SELECT COUNT(*) FROM competition_bouts 
            WHERE competition_teams_id IS NULL 
            AND LOWER(result) IN ('loss', 'l', 'defeat', 'defeated', 'lost', '0', 'false', 'no', 'fail', 'failed', 'unsuccessful')
        ), 0),
        'individualWinRate', CASE 
            WHEN (SELECT COUNT(*) FROM competition_bouts WHERE competition_teams_id IS NULL) > 0 
            THEN ROUND((
                (SELECT COUNT(*) FROM competition_bouts 
                 WHERE competition_teams_id IS NULL 
                 AND LOWER(result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed'))::decimal 
                / (SELECT COUNT(*) FROM competition_bouts WHERE competition_teams_id IS NULL)
            ) * 100, 1)
            ELSE 0 
        END,
        'teamBouts', COALESCE((SELECT COUNT(*) FROM competition_bouts WHERE competition_entries_id IS NULL), 0),
        'teamWins', COALESCE((
            SELECT COUNT(*) FROM competition_bouts 
            WHERE competition_entries_id IS NULL 
            AND LOWER(result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed')
        ), 0),
        'teamLosses', COALESCE((
            SELECT COUNT(*) FROM competition_bouts 
            WHERE competition_entries_id IS NULL 
            AND LOWER(result) IN ('loss', 'l', 'defeat', 'defeated', 'lost', '0', 'false', 'no', 'fail', 'failed', 'unsuccessful')
        ), 0),
        'teamWinRate', CASE 
            WHEN (SELECT COUNT(*) FROM competition_bouts WHERE competition_entries_id IS NULL) > 0 
            THEN ROUND((
                (SELECT COUNT(*) FROM competition_bouts 
                 WHERE competition_entries_id IS NULL 
                 AND LOWER(result) IN ('win', 'w', 'victory', 'victorious', 'won', '1', 'true', 'yes', 'success', 'successful', 'pass', 'passed'))::decimal 
                / (SELECT COUNT(*) FROM competition_bouts WHERE competition_entries_id IS NULL)
            ) * 100, 1)
            ELSE 0 
        END,
        'uniqueCompetitors', COALESCE((SELECT COUNT(DISTINCT members_id) FROM competition_entries), 0),
        'uniqueTeams', COALESCE((SELECT COUNT(DISTINCT competition_teams_id) FROM competition_bouts WHERE competition_teams_id IS NOT NULL), 0),
        'uniqueCompetitions', COALESCE((SELECT COUNT(DISTINCT competitions_id) FROM competition_entries), 0)
    ) INTO summary;

    -- Build final result
    result := json_build_object(
        'individualBouts', COALESCE(individual_bouts, '[]'::json),
        'teamBouts', COALESCE(team_bouts, '[]'::json),
        'summary', summary
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant permissions for the views and functions
GRANT SELECT ON view_competition_summary TO authenticated;
GRANT SELECT ON view_competitor_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_club_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_win_rate_analysis() TO authenticated;
