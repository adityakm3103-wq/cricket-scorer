-- =============================================================================
-- CRICKET SCORER: MATCH MANAGEMENT, TOSS, SESSIONS & TEST FUNCTIONS
-- Migration: 20261115000003_match_management_functions.sql
-- =============================================================================

-- =============================================================================
-- 1. SETUP PLAYING XI (INTERNATIONAL)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_setup_playing_xi(
    p_match_id UUID,
    p_team_a_playing_xi UUID[],
    p_team_b_playing_xi UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.matches%ROWTYPE;
    v_p_id UUID;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

    -- Delete existing playing XI for this match
    DELETE FROM public.match_players WHERE match_id = p_match_id;

    -- Insert Team A players
    FOREACH v_p_id IN ARRAY p_team_a_playing_xi LOOP
        INSERT INTO public.match_players (match_id, player_id, team_id, is_playing_xi)
        VALUES (p_match_id, v_p_id, v_match.team_a_id, true);
    END LOOP;

    -- Insert Team B players
    FOREACH v_p_id IN ARRAY p_team_b_playing_xi LOOP
        INSERT INTO public.match_players (match_id, player_id, team_id, is_playing_xi)
        VALUES (p_match_id, v_p_id, v_match.team_b_id, true);
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- 2. CONDUCT TOSS (INTERNATIONAL)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_conduct_toss(
    p_match_id UUID,
    p_toss_winner_id UUID,
    p_toss_decision toss_decision
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.matches%ROWTYPE;
    v_batting_team_id UUID;
    v_bowling_team_id UUID;
    v_inn_id UUID;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

    IF p_toss_winner_id != v_match.team_a_id AND p_toss_winner_id != v_match.team_b_id THEN
        RAISE EXCEPTION 'Toss winner must be Team A or Team B';
    END IF;

    IF p_toss_decision = 'BAT' THEN
        v_batting_team_id := p_toss_winner_id;
        v_bowling_team_id := CASE WHEN p_toss_winner_id = v_match.team_a_id THEN v_match.team_b_id ELSE v_match.team_a_id END;
    ELSE
        v_bowling_team_id := p_toss_winner_id;
        v_batting_team_id := CASE WHEN p_toss_winner_id = v_match.team_a_id THEN v_match.team_b_id ELSE v_match.team_a_id END;
    END IF;

    UPDATE public.matches SET
        toss_winner_id = p_toss_winner_id,
        toss_decision = p_toss_decision,
        status = 'UPCOMING',
        updated_at = now()
    WHERE id = p_match_id;

    -- Create Innings 1 if it doesn't exist yet
    INSERT INTO public.innings (
        match_id, innings_number, batting_team_id, bowling_team_id, status
    ) VALUES (
        p_match_id, 1, v_batting_team_id, v_bowling_team_id, 'IN_PROGRESS'
    ) ON CONFLICT (match_id, innings_number) DO UPDATE
    SET batting_team_id = EXCLUDED.batting_team_id,
        bowling_team_id = EXCLUDED.bowling_team_id,
        updated_at = now()
    RETURNING id INTO v_inn_id;

    RETURN jsonb_build_object(
        'success', true,
        'inningsId', v_inn_id,
        'battingTeamId', v_batting_team_id,
        'bowlingTeamId', v_bowling_team_id
    );
END;
$$;

-- =============================================================================
-- 3. SELECT OPENING PLAYERS (INTERNATIONAL)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_select_opening_players(
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
    v_match public.matches%ROWTYPE;
    v_inn_num INT;
    v_inn public.innings%ROWTYPE;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

    v_inn_num := COALESCE(p_innings_number, v_match.current_innings_number);

    SELECT * INTO v_inn FROM public.innings
    WHERE match_id = p_match_id AND innings_number = v_inn_num FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Innings not found'; END IF;

    IF p_striker_id = p_non_striker_id THEN
        RAISE EXCEPTION 'Striker and non-striker must be different players';
    END IF;

    -- Upsert Batting Scorecard for Striker
    INSERT INTO public.batting_scorecards (innings_id, player_id, batting_order, not_out)
    VALUES (v_inn.id, p_striker_id, 1, true)
    ON CONFLICT (innings_id, player_id) DO NOTHING;

    -- Upsert Batting Scorecard for Non-Striker
    INSERT INTO public.batting_scorecards (innings_id, player_id, batting_order, not_out)
    VALUES (v_inn.id, p_non_striker_id, 2, true)
    ON CONFLICT (innings_id, player_id) DO NOTHING;

    -- Upsert Bowling Scorecard for Bowler
    INSERT INTO public.bowling_scorecards (innings_id, player_id, bowling_order)
    VALUES (v_inn.id, p_bowler_id, 1)
    ON CONFLICT (innings_id, player_id) DO NOTHING;

    -- Update Innings
    UPDATE public.innings SET
        current_striker_id = p_striker_id,
        current_non_striker_id = p_non_striker_id,
        current_bowler_id = p_bowler_id,
        status = 'IN_PROGRESS',
        updated_at = now()
    WHERE id = v_inn.id;

    -- Mark match LIVE
    UPDATE public.matches SET
        status = 'LIVE',
        current_innings_number = v_inn_num,
        updated_at = now()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- 4. CHANGE BOWLER (INTERNATIONAL)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_change_bowler(
    p_match_id UUID,
    p_bowler_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.matches%ROWTYPE;
    v_inn public.innings%ROWTYPE;
    v_next_order INT;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

    SELECT * INTO v_inn FROM public.innings
    WHERE match_id = p_match_id AND innings_number = v_match.current_innings_number FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Innings not found'; END IF;

    IF v_inn.last_bowler_id = p_bowler_id THEN
        RAISE EXCEPTION 'The same bowler cannot bowl consecutive overs';
    END IF;

    -- Get highest bowling order
    SELECT COALESCE(MAX(bowling_order), 0) + 1 INTO v_next_order
    FROM public.bowling_scorecards WHERE innings_id = v_inn.id;

    -- Ensure bowling scorecard exists
    INSERT INTO public.bowling_scorecards (innings_id, player_id, bowling_order)
    VALUES (v_inn.id, p_bowler_id, v_next_order)
    ON CONFLICT (innings_id, player_id) DO NOTHING;

    UPDATE public.innings SET
        current_bowler_id = p_bowler_id,
        updated_at = now()
    WHERE id = v_inn.id;

    RETURN jsonb_build_object('success', true, 'bowlerId', p_bowler_id);
END;
$$;

-- =============================================================================
-- 5. TEST MATCH ADVANCE SESSION & DAY
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_advance_session(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.matches%ROWTYPE;
    v_next_session INT;
    v_next_day INT;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
    IF v_match.format != 'TEST' THEN RAISE EXCEPTION 'Not a test match'; END IF;

    IF v_match.current_session >= 3 THEN
        v_next_session := 1;
        v_next_day := v_match.current_day + 1;
    ELSE
        v_next_session := v_match.current_session + 1;
        v_next_day := v_match.current_day;
    END IF;

    -- Record session summary in match_sessions
    INSERT INTO public.match_sessions (
        match_id, day_number, session_number, overs_bowled, status
    ) VALUES (
        p_match_id, v_match.current_day, v_match.current_session, v_match.session_overs, 'COMPLETED'
    );

    UPDATE public.matches SET
        current_session = v_next_session,
        current_day = v_next_day,
        session_overs = 0,
        day_overs = CASE WHEN v_next_session = 1 THEN 0 ELSE day_overs END,
        updated_at = now()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'day', v_next_day, 'session', v_next_session);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_advance_day(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.matches%ROWTYPE;
    v_next_day INT;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
    IF v_match.format != 'TEST' THEN RAISE EXCEPTION 'Not a test match'; END IF;

    v_next_day := v_match.current_day + 1;

    UPDATE public.matches SET
        current_day = v_next_day,
        current_session = 1,
        day_overs = 0,
        session_overs = 0,
        updated_at = now()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'day', v_next_day);
END;
$$;

-- =============================================================================
-- 6. TEST MATCH FOLLOW-ON & DECLARATION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_handle_follow_on(p_match_id UUID, p_enforce BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.matches%ROWTYPE;
    v_inn1 public.innings%ROWTYPE;
    v_inn2 public.innings%ROWTYPE;
    v_trail INT;
    v_batting_team_id UUID;
    v_bowling_team_id UUID;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
    IF v_match.format != 'TEST' THEN RAISE EXCEPTION 'Not a test match'; END IF;

    SELECT * INTO v_inn1 FROM public.innings WHERE match_id = p_match_id AND innings_number = 1;
    SELECT * INTO v_inn2 FROM public.innings WHERE match_id = p_match_id AND innings_number = 2;

    IF v_inn1.id IS NULL OR v_inn2.id IS NULL OR v_inn2.status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Follow-on can only be decided after Innings 2 is completed';
    END IF;

    v_trail := v_inn1.total_runs - v_inn2.total_runs;
    IF v_trail < 200 THEN
        RAISE EXCEPTION 'Team does not trail by 200 or more runs (% runs trail)', v_trail;
    END IF;

    IF p_enforce THEN
        -- Team B bats again in Innings 3
        v_batting_team_id := v_inn2.batting_team_id;
        v_bowling_team_id := v_inn2.bowling_team_id;
    ELSE
        -- Normal: Team A bats in Innings 3
        v_batting_team_id := v_inn1.batting_team_id;
        v_bowling_team_id := v_inn1.bowling_team_id;
    END IF;

    UPDATE public.matches SET
        follow_on_enforced = p_enforce,
        current_innings_number = 3,
        updated_at = now()
    WHERE id = p_match_id;

    INSERT INTO public.innings (
        match_id, innings_number, batting_team_id, bowling_team_id, status
    ) VALUES (
        p_match_id, 3, v_batting_team_id, v_bowling_team_id, 'IN_PROGRESS'
    ) ON CONFLICT (match_id, innings_number) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'followOnEnforced', p_enforce);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_declare_innings(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.matches%ROWTYPE;
    v_inn public.innings%ROWTYPE;
    v_next_inn_num INT;
    v_next_batting_team UUID;
    v_next_bowling_team UUID;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
    IF v_match.format != 'TEST' THEN RAISE EXCEPTION 'Innings declaration only permitted in Test matches'; END IF;

    SELECT * INTO v_inn FROM public.innings
    WHERE match_id = p_match_id AND innings_number = v_match.current_innings_number FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Innings not found'; END IF;

    -- Mark current innings declared & completed
    UPDATE public.innings SET
        is_declared = true,
        status = 'DECLARED',
        current_striker_id = null,
        current_non_striker_id = null,
        current_bowler_id = null,
        updated_at = now()
    WHERE id = v_inn.id;

    v_next_inn_num := v_match.current_innings_number + 1;
    IF v_next_inn_num <= 4 THEN
        v_next_batting_team := v_inn.bowling_team_id;
        v_next_bowling_team := v_inn.batting_team_id;

        UPDATE public.matches SET
            current_innings_number = v_next_inn_num,
            updated_at = now()
        WHERE id = p_match_id;

        INSERT INTO public.innings (
            match_id, innings_number, batting_team_id, bowling_team_id, status
        ) VALUES (
            p_match_id, v_next_inn_num, v_next_batting_team, v_next_bowling_team, 'IN_PROGRESS'
        ) ON CONFLICT (match_id, innings_number) DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true, 'nextInningsNumber', v_next_inn_num);
END;
$$;
