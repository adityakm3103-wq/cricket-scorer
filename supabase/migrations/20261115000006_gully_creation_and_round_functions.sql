-- ============================================================================
-- 20261115000006_gully_creation_and_round_functions.sql
-- Gully Match Creation, Singles Round Advance, and Admin Dashboard RPC Functions
-- ============================================================================

-- Function 1: rpc_create_gully_team_match
CREATE OR REPLACE FUNCTION public.rpc_create_gully_team_match(
    p_match_date TIMESTAMPTZ,
    p_venue TEXT,
    p_total_overs INT,
    p_bowling_allocation_rule public.bowling_allocation_rule,
    p_team_a_name TEXT,
    p_team_a_player_ids UUID[],
    p_team_a_captain_id UUID,
    p_team_a_allocations JSONB,
    p_team_b_name TEXT,
    p_team_b_player_ids UUID[],
    p_team_b_captain_id UUID,
    p_team_b_allocations JSONB,
    p_toss_winner_team TEXT DEFAULT NULL,
    p_toss_decision public.toss_decision DEFAULT NULL,
    p_striker_id UUID DEFAULT NULL,
    p_non_striker_id UUID DEFAULT NULL,
    p_bowler_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_team_id UUID;
    v_match_id UUID;
    v_temp_team_a_id UUID;
    v_temp_team_b_id UUID;
    v_toss_winner_id UUID;
    v_innings_id UUID;
    v_batting_temp_team_id UUID;
    v_bowling_temp_team_id UUID;
    v_batting_team_name TEXT;
    v_bowling_team_name TEXT;
    v_status public.match_status;
    v_pid UUID;
    v_alloc INT;
    v_default_alloc_a INT;
    v_default_alloc_b INT;
    v_is_live BOOLEAN;
BEGIN
    v_team_id := public.current_team_id();
    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or team not found';
    END IF;

    IF array_length(p_team_a_player_ids, 1) IS NULL OR array_length(p_team_b_player_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'Both Team A and Team B must have players selected';
    END IF;

    v_default_alloc_a := GREATEST(1, CEIL(p_total_overs::FLOAT / array_length(p_team_a_player_ids, 1))::INT);
    v_default_alloc_b := GREATEST(1, CEIL(p_total_overs::FLOAT / array_length(p_team_b_player_ids, 1))::INT);

    v_is_live := (p_toss_winner_team IS NOT NULL AND p_toss_decision IS NOT NULL AND p_striker_id IS NOT NULL AND p_bowler_id IS NOT NULL);
    IF v_is_live THEN
        v_status := 'LIVE'::public.match_status;
    ELSE
        v_status := 'UPCOMING'::public.match_status;
    END IF;

    -- Create Gully Match
    INSERT INTO public.gully_matches (
        registered_team_id,
        match_type,
        match_date,
        venue,
        status,
        total_overs,
        players_per_team,
        bowling_allocation_rule,
        toss_decision
    ) VALUES (
        v_team_id,
        'TEAM_MATCH',
        COALESCE(p_match_date, NOW()),
        NULLIF(TRIM(p_venue), ''),
        v_status,
        p_total_overs,
        GREATEST(array_length(p_team_a_player_ids, 1), array_length(p_team_b_player_ids, 1)),
        p_bowling_allocation_rule,
        p_toss_decision
    ) RETURNING id INTO v_match_id;

    -- Create Temporary Teams
    INSERT INTO public.gully_temporary_teams (
        gully_match_id, team_name, is_team_a, captain_player_id
    ) VALUES (
        v_match_id, TRIM(p_team_a_name), true, p_team_a_captain_id
    ) RETURNING id INTO v_temp_team_a_id;

    INSERT INTO public.gully_temporary_teams (
        gully_match_id, team_name, is_team_a, captain_player_id
    ) VALUES (
        v_match_id, TRIM(p_team_b_name), false, p_team_b_captain_id
    ) RETURNING id INTO v_temp_team_b_id;

    -- Insert Team A players
    FOREACH v_pid IN ARRAY p_team_a_player_ids
    LOOP
        v_alloc := COALESCE((p_team_a_allocations->>v_pid::TEXT)::INT, v_default_alloc_a);
        INSERT INTO public.gully_match_players (
            gully_match_id, player_id, temporary_team_id, is_batter, is_bowler, allocated_overs
        ) VALUES (
            v_match_id, v_pid, v_temp_team_a_id, true, true, v_alloc
        );
    END LOOP;

    -- Insert Team B players
    FOREACH v_pid IN ARRAY p_team_b_player_ids
    LOOP
        v_alloc := COALESCE((p_team_b_allocations->>v_pid::TEXT)::INT, v_default_alloc_b);
        INSERT INTO public.gully_match_players (
            gully_match_id, player_id, temporary_team_id, is_batter, is_bowler, allocated_overs
        ) VALUES (
            v_match_id, v_pid, v_temp_team_b_id, true, true, v_alloc
        );
    END LOOP;

    -- If toss conducted at creation
    IF p_toss_winner_team IS NOT NULL THEN
        IF p_toss_winner_team = 'teamA' THEN
            v_toss_winner_id := v_temp_team_a_id;
        ELSE
            v_toss_winner_id := v_temp_team_b_id;
        END IF;

        UPDATE public.gully_matches
        SET toss_winner_team_id = v_toss_winner_id,
            toss_decision = p_toss_decision
        WHERE id = v_match_id;

        IF (p_toss_winner_team = 'teamA' AND p_toss_decision = 'BAT') OR (p_toss_winner_team = 'teamB' AND p_toss_decision = 'BOWL') THEN
            v_batting_temp_team_id := v_temp_team_a_id;
            v_bowling_temp_team_id := v_temp_team_b_id;
            v_batting_team_name := TRIM(p_team_a_name);
            v_bowling_team_name := TRIM(p_team_b_name);
        ELSE
            v_batting_temp_team_id := v_temp_team_b_id;
            v_bowling_temp_team_id := v_temp_team_a_id;
            v_batting_team_name := TRIM(p_team_b_name);
            v_bowling_team_name := TRIM(p_team_a_name);
        END IF;

        IF v_is_live THEN
            INSERT INTO public.gully_innings (
                gully_match_id,
                innings_number,
                batting_team_id,
                bowling_team_id,
                batting_team_name,
                bowling_team_name,
                status,
                current_striker_id,
                current_non_striker_id,
                current_bowler_id
            ) VALUES (
                v_match_id,
                1,
                v_batting_temp_team_id,
                v_bowling_temp_team_id,
                v_batting_team_name,
                v_bowling_team_name,
                'IN_PROGRESS',
                p_striker_id,
                p_non_striker_id,
                p_bowler_id
            ) RETURNING id INTO v_innings_id;

            -- Striker scorecard
            INSERT INTO public.gully_batting_scorecards (
                innings_id, player_id, batting_order, not_out
            ) VALUES (
                v_innings_id, p_striker_id, 1, true
            );

            -- Non-striker scorecard
            IF p_non_striker_id IS NOT NULL THEN
                INSERT INTO public.gully_batting_scorecards (
                    innings_id, player_id, batting_order, not_out
                ) VALUES (
                    v_innings_id, p_non_striker_id, 2, true
                );
            END IF;

            -- Bowler scorecard
            INSERT INTO public.gully_bowling_scorecards (
                innings_id, player_id, bowling_order, allocated_overs
            ) VALUES (
                v_innings_id,
                p_bowler_id,
                1,
                COALESCE(
                    (SELECT allocated_overs FROM public.gully_match_players WHERE gully_match_id = v_match_id AND player_id = p_bowler_id LIMIT 1),
                    1
                )
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'id', v_match_id,
        'status', v_status,
        'message', 'Gully team match created successfully'
    );
END;
$$;

-- Function 2: rpc_create_gully_singles_match
CREATE OR REPLACE FUNCTION public.rpc_create_gully_singles_match(
    p_match_date TIMESTAMPTZ,
    p_venue TEXT,
    p_total_overs INT,
    p_draft_shuffled BOOLEAN,
    p_singles_batting_order UUID[],
    p_bowling_allocation_rule public.bowling_allocation_rule,
    p_singles_dismissal_rule public.singles_dismissal_rule,
    p_bowler_order_rule public.bowler_order_rule,
    p_bowling_allocations JSONB,
    p_opening_bowler_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_team_id UUID;
    v_match_id UUID;
    v_innings_id UUID;
    v_first_batter_id UUID;
    v_first_batter_name TEXT;
    v_opening_bowler_id UUID;
    v_pid UUID;
    v_idx INT;
    v_alloc INT;
    v_default_alloc INT;
    v_bowler_count INT;
BEGIN
    v_team_id := public.current_team_id();
    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or team not found';
    END IF;

    IF array_length(p_singles_batting_order, 1) IS NULL OR array_length(p_singles_batting_order, 1) < 2 THEN
        RAISE EXCEPTION 'At least 2 players are required for Singles match';
    END IF;

    v_first_batter_id := p_singles_batting_order[1];
    SELECT player_name INTO v_first_batter_name FROM public.players WHERE id = v_first_batter_id;

    v_bowler_count := array_length(p_singles_batting_order, 1) - 1;
    v_default_alloc := GREATEST(1, CEIL(p_total_overs::FLOAT / v_bowler_count)::INT);

    IF p_opening_bowler_id IS NOT NULL AND p_opening_bowler_id != v_first_batter_id THEN
        v_opening_bowler_id := p_opening_bowler_id;
    ELSE
        v_opening_bowler_id := p_singles_batting_order[2];
    END IF;

    -- Create Gully Match
    INSERT INTO public.gully_matches (
        registered_team_id,
        match_type,
        match_date,
        venue,
        status,
        total_overs,
        selected_batter_id,
        draft_shuffled,
        current_innings_number,
        current_round_number,
        singles_batting_order,
        bowling_allocation_rule,
        singles_dismissal_rule,
        bowler_order_rule
    ) VALUES (
        v_team_id,
        'SINGLES_MATCH',
        COALESCE(p_match_date, NOW()),
        NULLIF(TRIM(p_venue), ''),
        'LIVE',
        p_total_overs,
        v_first_batter_id,
        COALESCE(p_draft_shuffled, false),
        1,
        1,
        to_jsonb(p_singles_batting_order)::TEXT,
        p_bowling_allocation_rule,
        p_singles_dismissal_rule,
        p_bowler_order_rule
    ) RETURNING id INTO v_match_id;

    -- Insert match players
    v_idx := 1;
    FOREACH v_pid IN ARRAY p_singles_batting_order
    LOOP
        v_alloc := COALESCE((p_bowling_allocations->>v_pid::TEXT)::INT, v_default_alloc);
        INSERT INTO public.gully_match_players (
            gully_match_id, player_id, is_batter, is_bowler, batting_order, allocated_overs
        ) VALUES (
            v_match_id, v_pid, true, true, v_idx, v_alloc
        );
        v_idx := v_idx + 1;
    END LOOP;

    -- Create 1st Innings (Round 1, Batter #1)
    INSERT INTO public.gully_innings (
        gully_match_id,
        innings_number,
        round_number,
        batter_id,
        batting_team_name,
        bowling_team_name,
        status,
        current_striker_id,
        current_non_striker_id,
        current_bowler_id
    ) VALUES (
        v_match_id,
        1,
        1,
        v_first_batter_id,
        v_first_batter_name || ' (Round 1)',
        'Bowling Attack',
        'IN_PROGRESS',
        v_first_batter_id,
        NULL,
        v_opening_bowler_id
    ) RETURNING id INTO v_innings_id;

    -- Create Batting Scorecard for Solo Batter
    INSERT INTO public.gully_batting_scorecards (
        innings_id, player_id, batting_order, not_out
    ) VALUES (
        v_innings_id, v_first_batter_id, 1, true
    );

    -- Create Bowling Scorecards for all other players
    v_idx := 1;
    FOREACH v_pid IN ARRAY p_singles_batting_order
    LOOP
        IF v_pid != v_first_batter_id THEN
            v_alloc := COALESCE((p_bowling_allocations->>v_pid::TEXT)::INT, v_default_alloc);
            INSERT INTO public.gully_bowling_scorecards (
                innings_id, player_id, bowling_order, allocated_overs
            ) VALUES (
                v_innings_id, v_pid, v_idx, v_alloc
            );
            v_idx := v_idx + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'id', v_match_id,
        'status', 'LIVE',
        'message', 'Gully singles match created successfully'
    );
END;
$$;

-- Function 3: rpc_gully_start_next_singles_round
CREATE OR REPLACE FUNCTION public.rpc_gully_start_next_singles_round(
    p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.gully_matches%ROWTYPE;
    v_team_id UUID;
    v_current_round INT;
    v_next_round INT;
    v_new_batting_order UUID[];
    v_first_batter_id UUID;
    v_first_batter_name TEXT;
    v_opening_bowler_id UUID;
    v_new_innings_id UUID;
    v_innings_count INT;
    v_default_alloc INT;
    v_pid UUID;
    v_idx INT;
BEGIN
    v_team_id := public.current_team_id();
    SELECT * INTO v_match FROM public.gully_matches WHERE id = p_match_id;

    IF v_match.id IS NULL THEN
        RAISE EXCEPTION 'Gully match not found';
    END IF;

    IF v_match.registered_team_id != v_team_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    IF v_match.match_type != 'SINGLES_MATCH' THEN
        RAISE EXCEPTION 'Rounds are only applicable for Singles Match';
    END IF;

    IF v_match.status = 'COMPLETED' THEN
        RAISE EXCEPTION 'Match is already completed';
    END IF;

    v_current_round := COALESCE(v_match.current_round_number, 1);
    v_next_round := v_current_round + 1;

    -- Mark active innings completed
    UPDATE public.gully_innings
    SET status = 'COMPLETED'
    WHERE gully_match_id = p_match_id AND status = 'IN_PROGRESS';

    -- Sort players by highest runs, then highest strike rate, then fewest balls in current round
    SELECT array_agg(mp.player_id ORDER BY COALESCE(bs.runs, 0) DESC, COALESCE(bs.strike_rate, 0) DESC, COALESCE(bs.balls, 0) ASC)
    INTO v_new_batting_order
    FROM public.gully_match_players mp
    LEFT JOIN (
        SELECT b.player_id, b.runs, b.strike_rate, b.balls
        FROM public.gully_batting_scorecards b
        JOIN public.gully_innings gi ON gi.id = b.innings_id
        WHERE gi.gully_match_id = p_match_id AND gi.round_number = v_current_round
    ) bs ON bs.player_id = mp.player_id
    WHERE mp.gully_match_id = p_match_id;

    IF array_length(v_new_batting_order, 1) IS NULL THEN
        RAISE EXCEPTION 'Unable to compute next round batting order';
    END IF;

    v_first_batter_id := v_new_batting_order[1];
    SELECT player_name INTO v_first_batter_name FROM public.players WHERE id = v_first_batter_id;

    -- Update match
    UPDATE public.gully_matches
    SET current_round_number = v_next_round,
        selected_batter_id = v_first_batter_id,
        singles_batting_order = to_jsonb(v_new_batting_order)::TEXT
    WHERE id = p_match_id;

    -- Determine opening bowler
    v_opening_bowler_id := v_new_batting_order[2];

    SELECT COUNT(*) INTO v_innings_count FROM public.gully_innings WHERE gully_match_id = p_match_id;

    -- Insert new innings
    INSERT INTO public.gully_innings (
        gully_match_id,
        innings_number,
        round_number,
        batter_id,
        batting_team_name,
        bowling_team_name,
        status,
        current_striker_id,
        current_non_striker_id,
        current_bowler_id
    ) VALUES (
        p_match_id,
        v_innings_count + 1,
        v_next_round,
        v_first_batter_id,
        v_first_batter_name || ' (Round ' || v_next_round || ')',
        'Bowling Attack',
        'IN_PROGRESS',
        v_first_batter_id,
        NULL,
        v_opening_bowler_id
    ) RETURNING id INTO v_new_innings_id;

    -- Insert solo batter scorecard
    INSERT INTO public.gully_batting_scorecards (
        innings_id, player_id, batting_order, not_out
    ) VALUES (
        v_new_innings_id, v_first_batter_id, 1, true
    );

    -- Insert bowling scorecards
    v_default_alloc := GREATEST(1, CEIL(v_match.total_overs::FLOAT / (array_length(v_new_batting_order, 1) - 1))::INT);
    v_idx := 1;
    FOREACH v_pid IN ARRAY v_new_batting_order
    LOOP
        IF v_pid != v_first_batter_id THEN
            INSERT INTO public.gully_bowling_scorecards (
                innings_id, player_id, bowling_order, allocated_overs
            ) VALUES (
                v_new_innings_id, v_pid, v_idx, v_default_alloc
            );
            v_idx := v_idx + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'message', 'Round ' || v_next_round || ' started',
        'roundNumber', v_next_round,
        'firstBatterId', v_first_batter_id,
        'firstBatterName', v_first_batter_name
    );
END;
$$;

-- Function 4: rpc_admin_dashboard
CREATE OR REPLACE FUNCTION public.rpc_admin_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_teams INT;
    v_total_players INT;
    v_total_matches INT;
    v_upcoming_matches INT;
    v_live_matches INT;
    v_completed_matches INT;
    v_recent_matches JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;

    SELECT COUNT(*) INTO v_total_teams FROM public.teams WHERE role = 'TEAM';
    SELECT COUNT(*) INTO v_total_players FROM public.players;
    SELECT COUNT(*) INTO v_total_matches FROM public.matches;
    SELECT COUNT(*) INTO v_upcoming_matches FROM public.matches WHERE status = 'UPCOMING';
    SELECT COUNT(*) INTO v_live_matches FROM public.matches WHERE status = 'LIVE';
    SELECT COUNT(*) INTO v_completed_matches FROM public.matches WHERE status = 'COMPLETED';

    SELECT COALESCE(jsonb_agg(sub.m), '[]'::jsonb)
    INTO v_recent_matches
    FROM (
        SELECT jsonb_build_object(
            'id', m.id,
            'format', m.format,
            'matchDate', m.match_date,
            'status', m.status,
            'venue', m.venue,
            'resultDescription', m.result_description,
            'teamA', jsonb_build_object('id', ta.id, 'teamName', ta.team_name),
            'teamB', jsonb_build_object('id', tb.id, 'teamName', tb.team_name),
            'innings', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'inningsNumber', i.innings_number,
                        'totalRuns', i.total_runs,
                        'wickets', i.wickets,
                        'oversCompletedText', i.overs_completed_text
                    ) ORDER BY i.innings_number ASC
                ), '[]'::jsonb)
                FROM public.innings i
                WHERE i.match_id = m.id
            )
        ) AS m
        FROM public.matches m
        JOIN public.teams ta ON ta.id = m.team_a_id
        JOIN public.teams tb ON tb.id = m.team_b_id
        ORDER BY m.match_date DESC
        LIMIT 10
    ) sub;

    RETURN jsonb_build_object(
        'totalTeams', v_total_teams,
        'totalPlayers', v_total_players,
        'totalMatches', v_total_matches,
        'upcomingMatches', v_upcoming_matches,
        'liveMatches', v_live_matches,
        'completedMatches', v_completed_matches,
        'recentMatches', v_recent_matches
    );
END;
$$;

-- Function 5: rpc_admin_get_all_teams
CREATE OR REPLACE FUNCTION public.rpc_admin_get_all_teams()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;

    SELECT COALESCE(jsonb_agg(sub.t), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', t.id,
            'teamName', t.team_name,
            'username', t.username,
            'email', t.email,
            'isActive', t.is_active,
            'createdAt', t.created_at,
            'totalPlayers', (SELECT COUNT(*) FROM public.players p WHERE p.team_id = t.id),
            'matchesPlayed', (
                SELECT COUNT(*) FROM public.matches m
                WHERE (m.team_a_id = t.id OR m.team_b_id = t.id) AND m.status = 'COMPLETED'
            ),
            'wins', (
                SELECT COUNT(*) FROM public.matches m
                WHERE m.winner_id = t.id AND m.status = 'COMPLETED'
            ),
            'losses', (
                SELECT COUNT(*) FROM public.matches m
                WHERE (m.team_a_id = t.id OR m.team_b_id = t.id)
                  AND m.winner_id IS NOT NULL
                  AND m.winner_id != t.id
                  AND m.status = 'COMPLETED'
            ),
            'ties', (
                SELECT COUNT(*) FROM public.matches m
                WHERE (m.team_a_id = t.id OR m.team_b_id = t.id)
                  AND m.result_type = 'TIE'
                  AND m.status = 'COMPLETED'
            ),
            'draws', (
                SELECT COUNT(*) FROM public.matches m
                WHERE (m.team_a_id = t.id OR m.team_b_id = t.id)
                  AND m.result_type = 'DRAW'
                  AND m.status = 'COMPLETED'
            )
        ) AS t
        FROM public.teams t
        WHERE t.role = 'TEAM'
        ORDER BY t.created_at DESC
    ) sub;

    RETURN v_result;
END;
$$;
