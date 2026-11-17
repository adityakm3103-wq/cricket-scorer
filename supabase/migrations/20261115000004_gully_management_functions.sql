-- =============================================================================
-- CRICKET SCORER: GULLY MATCH MANAGEMENT, TOSS, OPENERS & SINGLES FUNCTIONS
-- Migration: 20261115000004_gully_management_functions.sql
-- =============================================================================

-- =============================================================================
-- 1. GULLY CONDUCT TOSS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_gully_conduct_toss(
    p_match_id UUID,
    p_toss_winner_team_id UUID,
    p_toss_decision toss_decision
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.gully_matches%ROWTYPE;
    v_team_a public.gully_temporary_teams%ROWTYPE;
    v_team_b public.gully_temporary_teams%ROWTYPE;
    v_batting_temp_id UUID;
    v_bowling_temp_id UUID;
    v_batting_name TEXT;
    v_bowling_name TEXT;
    v_inn_id UUID;
BEGIN
    SELECT * INTO v_match FROM public.gully_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully match not found'; END IF;

    SELECT * INTO v_team_a FROM public.gully_temporary_teams WHERE gully_match_id = p_match_id AND is_team_a = true;
    SELECT * INTO v_team_b FROM public.gully_temporary_teams WHERE gully_match_id = p_match_id AND is_team_a = false;

    IF p_toss_decision = 'BAT' THEN
        v_batting_temp_id := p_toss_winner_team_id;
        v_bowling_temp_id := CASE WHEN p_toss_winner_team_id = v_team_a.id THEN v_team_b.id ELSE v_team_a.id END;
    ELSE
        v_bowling_temp_id := p_toss_winner_team_id;
        v_batting_temp_id := CASE WHEN p_toss_winner_team_id = v_team_a.id THEN v_team_b.id ELSE v_team_a.id END;
    END IF;

    v_batting_name := CASE WHEN v_batting_temp_id = v_team_a.id THEN v_team_a.team_name ELSE v_team_b.team_name END;
    v_bowling_name := CASE WHEN v_bowling_temp_id = v_team_a.id THEN v_team_a.team_name ELSE v_team_b.team_name END;

    UPDATE public.gully_matches SET
        toss_winner_team_id = p_toss_winner_team_id,
        toss_decision = p_toss_decision,
        status = 'UPCOMING',
        updated_at = now()
    WHERE id = p_match_id;

    -- Create Gully Innings 1
    INSERT INTO public.gully_innings (
        gully_match_id, innings_number, round_number, batting_team_name, bowling_team_name,
        batting_temp_team_id, bowling_temp_team_id, status
    ) VALUES (
        p_match_id, 1, 1, v_batting_name, v_bowling_name, v_batting_temp_id, v_bowling_temp_id, 'IN_PROGRESS'
    ) ON CONFLICT (gully_match_id, innings_number) DO UPDATE
    SET batting_team_name = EXCLUDED.batting_team_name,
        bowling_team_name = EXCLUDED.bowling_team_name,
        batting_temp_team_id = EXCLUDED.batting_temp_team_id,
        bowling_temp_team_id = EXCLUDED.bowling_temp_team_id,
        updated_at = now()
    RETURNING id INTO v_inn_id;

    RETURN jsonb_build_object('success', true, 'inningsId', v_inn_id);
END;
$$;

-- =============================================================================
-- 2. GULLY SELECT OPENING PLAYERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_gully_select_opening_players(
    p_match_id UUID,
    p_striker_id UUID,
    p_non_striker_id UUID,
    p_bowler_id UUID,
    p_innings_number INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.gully_matches%ROWTYPE;
    v_inn_num INT;
    v_inn public.gully_innings%ROWTYPE;
BEGIN
    SELECT * INTO v_match FROM public.gully_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully match not found'; END IF;

    v_inn_num := COALESCE(p_innings_number, v_match.current_innings_number);

    SELECT * INTO v_inn FROM public.gully_innings
    WHERE gully_match_id = p_match_id AND innings_number = v_inn_num FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully innings not found'; END IF;

    -- Scorecard for striker
    INSERT INTO public.gully_batting_scorecards (innings_id, player_id, batting_order, not_out)
    VALUES (v_inn.id, p_striker_id, 1, true)
    ON CONFLICT (innings_id, player_id) DO NOTHING;

    -- Scorecard for non-striker (if team match)
    IF v_match.match_type != 'SINGLES_MATCH' AND p_non_striker_id IS NOT NULL THEN
        INSERT INTO public.gully_batting_scorecards (innings_id, player_id, batting_order, not_out)
        VALUES (v_inn.id, p_non_striker_id, 2, true)
        ON CONFLICT (innings_id, player_id) DO NOTHING;
    END IF;

    -- Scorecard for bowler
    INSERT INTO public.gully_bowling_scorecards (innings_id, player_id, bowling_order)
    VALUES (v_inn.id, p_bowler_id, 1)
    ON CONFLICT (innings_id, player_id) DO NOTHING;

    UPDATE public.gully_innings SET
        current_striker_id = p_striker_id,
        current_non_striker_id = CASE WHEN v_match.match_type = 'SINGLES_MATCH' THEN null ELSE p_non_striker_id END,
        current_bowler_id = p_bowler_id,
        batter_id = CASE WHEN v_match.match_type = 'SINGLES_MATCH' THEN p_striker_id ELSE batter_id END,
        status = 'IN_PROGRESS',
        updated_at = now()
    WHERE id = v_inn.id;

    UPDATE public.gully_matches SET
        status = 'LIVE',
        current_innings_number = v_inn_num,
        updated_at = now()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- 3. GULLY CHANGE BOWLER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_gully_change_bowler(
    p_match_id UUID,
    p_bowler_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.gully_matches%ROWTYPE;
    v_inn public.gully_innings%ROWTYPE;
    v_next_order INT;
BEGIN
    SELECT * INTO v_match FROM public.gully_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully match not found'; END IF;

    SELECT * INTO v_inn FROM public.gully_innings
    WHERE gully_match_id = p_match_id AND innings_number = v_match.current_innings_number FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Innings not found'; END IF;

    IF v_inn.last_bowler_id = p_bowler_id THEN
        RAISE EXCEPTION 'The same bowler cannot bowl consecutive overs';
    END IF;

    SELECT COALESCE(MAX(bowling_order), 0) + 1 INTO v_next_order
    FROM public.gully_bowling_scorecards WHERE innings_id = v_inn.id;

    INSERT INTO public.gully_bowling_scorecards (innings_id, player_id, bowling_order)
    VALUES (v_inn.id, p_bowler_id, v_next_order)
    ON CONFLICT (innings_id, player_id) DO NOTHING;

    UPDATE public.gully_innings SET
        current_bowler_id = p_bowler_id,
        updated_at = now()
    WHERE id = v_inn.id;

    RETURN jsonb_build_object('success', true, 'bowlerId', p_bowler_id);
END;
$$;

-- =============================================================================
-- 4. GULLY SINGLES NEXT BATTER & NEXT ROUND
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_gully_start_next_singles_batter(
    p_match_id UUID,
    p_opening_bowler_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.gully_matches%ROWTYPE;
    v_curr_inn public.gully_innings%ROWTYPE;
    v_queue TEXT[];
    v_next_batter_id UUID;
    v_bowler_id UUID;
    v_next_inn_num INT;
    v_batter_name TEXT;
    v_new_inn_id UUID;
BEGIN
    SELECT * INTO v_match FROM public.gully_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully match not found'; END IF;
    IF v_match.match_type != 'SINGLES_MATCH' THEN RAISE EXCEPTION 'Only applicable to Singles Match'; END IF;

    SELECT * INTO v_curr_inn FROM public.gully_innings
    WHERE gully_match_id = p_match_id AND innings_number = v_match.current_innings_number FOR UPDATE;

    -- Mark current innings completed
    IF FOUND THEN
        UPDATE public.gully_innings SET
            status = 'COMPLETED',
            current_striker_id = null,
            current_bowler_id = null,
            updated_at = now()
        WHERE id = v_curr_inn.id;
    END IF;

    v_next_inn_num := v_match.current_innings_number + 1;
    v_queue := string_to_array(v_match.singles_batting_order, ',');

    IF v_next_inn_num > array_length(v_queue, 1) THEN
        RAISE EXCEPTION 'All players have completed their batting innings in this round';
    END IF;

    v_next_batter_id := v_queue[v_next_inn_num]::uuid;
    SELECT player_name INTO v_batter_name FROM public.players WHERE id = v_next_batter_id;

    -- Opening bowler
    IF p_opening_bowler_id IS NOT NULL THEN
        v_bowler_id := p_opening_bowler_id;
    ELSE
        -- Pick first player in queue who is not the batter
        SELECT player_id INTO v_bowler_id
        FROM public.gully_match_players
        WHERE gully_match_id = p_match_id AND player_id != v_next_batter_id
        ORDER BY bowling_order ASC NULLS LAST, created_at ASC
        LIMIT 1;
    END IF;

    -- Create new Innings
    INSERT INTO public.gully_innings (
        gully_match_id, innings_number, round_number, batter_id,
        batting_team_name, bowling_team_name, current_striker_id, current_bowler_id, status
    ) VALUES (
        p_match_id, v_next_inn_num, v_match.current_round_number, v_next_batter_id,
        v_batter_name, 'Fielders', v_next_batter_id, v_bowler_id, 'IN_PROGRESS'
    ) RETURNING id INTO v_new_inn_id;

    -- Create Batting Scorecard
    INSERT INTO public.gully_batting_scorecards (innings_id, player_id, batting_order, not_out)
    VALUES (v_new_inn_id, v_next_batter_id, 1, true);

    -- Create Bowling Scorecard
    IF v_bowler_id IS NOT NULL THEN
        INSERT INTO public.gully_bowling_scorecards (innings_id, player_id, bowling_order)
        VALUES (v_new_inn_id, v_bowler_id, 1);
    END IF;

    UPDATE public.gully_matches SET
        current_innings_number = v_next_inn_num,
        status = 'LIVE',
        updated_at = now()
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'inningsNumber', v_next_inn_num,
        'batterId', v_next_batter_id,
        'bowlerId', v_bowler_id
    );
END;
$$;

-- =============================================================================
-- 5. GULLY END MATCH
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_gully_end_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.gully_matches%ROWTYPE;
    v_top_batter RECORD;
    v_winner_desc TEXT;
BEGIN
    SELECT * INTO v_match FROM public.gully_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully match not found'; END IF;

    IF v_match.match_type = 'SINGLES_MATCH' THEN
        -- Find highest scoring batter
        SELECT p.player_name, bs.runs, bs.balls
        INTO v_top_batter
        FROM public.gully_batting_scorecards bs
        JOIN public.gully_innings gi ON gi.id = bs.innings_id
        JOIN public.players p ON p.id = bs.player_id
        WHERE gi.gully_match_id = p_match_id
        ORDER BY bs.runs DESC, bs.balls ASC
        LIMIT 1;

        v_winner_desc := 'Winner: ' || v_top_batter.player_name || ' with ' || v_top_batter.runs || ' runs';
        UPDATE public.gully_matches SET
            status = 'COMPLETED',
            winner_name = v_top_batter.player_name,
            result_description = v_winner_desc,
            updated_at = now()
        WHERE id = p_match_id;
    ELSE
        -- Team match completion
        UPDATE public.gully_matches SET
            status = 'COMPLETED',
            updated_at = now()
        WHERE id = p_match_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
