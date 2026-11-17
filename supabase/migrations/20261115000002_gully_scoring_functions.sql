-- =============================================================================
-- CRICKET SCORER: GULLY SCORING ENGINE FUNCTIONS & RPCS
-- Migration: 20261115000002_gully_scoring_functions.sql
-- =============================================================================

-- =============================================================================
-- 1. GULLY SCORE DELIVERY (TEAM MATCH & SINGLES MATCH)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_gully_score_delivery(p_match_id UUID, p_dto JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.gully_matches%ROWTYPE;
    v_inn public.gully_innings%ROWTYPE;
    v_striker_id UUID;
    v_non_striker_id UUID;
    v_bowler_id UUID;
    v_prev_striker_id UUID;
    v_prev_non_striker_id UUID;
    v_prev_bowler_id UUID;
    v_extra_type extra_type;
    v_batter_runs INT;
    v_extra_runs INT;
    v_delivery_runs INT := 0;
    v_bowler_runs_conceded INT := 0;
    v_wide_penalty INT := 0;
    v_noball_penalty INT := 0;
    v_bye_runs INT := 0;
    v_leg_bye_runs INT := 0;
    v_penalty_runs INT := 0;
    v_is_legal_delivery BOOLEAN := true;
    v_is_wicket BOOLEAN := false;
    v_dismissal_type dismissal_type := null;
    v_dismissed_player_id UUID := null;
    v_fielder_id UUID := null;
    v_bowler_credited BOOLEAN := false;
    v_runs_before_dismissal INT := 0;
    v_running_runs INT := 0;
    v_strike_rotated BOOLEAN := false;
    v_incoming_batter_id UUID := null;
    v_next_striker_id UUID;
    v_next_non_striker_id UUID;
    v_over_num INT;
    v_ball_num INT;
    v_new_legal_balls INT;
    v_is_over_complete BOOLEAN := false;
    v_is_singles BOOLEAN := false;
    v_delivery_id UUID;
    v_new_total_runs INT;
    v_new_wickets INT;
    v_striker_card public.gully_batting_scorecards%ROWTYPE;
    v_non_striker_card public.gully_batting_scorecards%ROWTYPE;
    v_bowler_card public.gully_bowling_scorecards%ROWTYPE;
    v_should_end_innings BOOLEAN := false;
    v_is_striker_dismissed BOOLEAN;
    v_dismissal_text TEXT := null;
    v_bowler_name TEXT := '';
    v_fielder_name TEXT := '';
BEGIN
    SELECT * INTO v_match FROM public.gully_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully match not found'; END IF;
    IF v_match.status = 'COMPLETED' THEN RAISE EXCEPTION 'Gully match is already completed'; END IF;

    v_is_singles := (v_match.match_type = 'SINGLES_MATCH');

    SELECT * INTO v_inn FROM public.gully_innings
    WHERE gully_match_id = p_match_id AND innings_number = v_match.current_innings_number FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Current gully innings not found'; END IF;
    IF v_inn.status != 'IN_PROGRESS' THEN RAISE EXCEPTION 'Current gully innings is not in progress'; END IF;

    v_striker_id := v_inn.current_striker_id;
    v_non_striker_id := v_inn.current_non_striker_id;
    v_bowler_id := v_inn.current_bowler_id;

    IF v_striker_id IS NULL OR v_bowler_id IS NULL THEN
        RAISE EXCEPTION 'Striker and bowler must be set before scoring';
    END IF;
    IF NOT v_is_singles AND v_non_striker_id IS NULL THEN
        RAISE EXCEPTION 'Non-striker must be set in Team Match mode';
    END IF;

    v_prev_striker_id := v_striker_id;
    v_prev_non_striker_id := v_non_striker_id;
    v_prev_bowler_id := v_bowler_id;

    v_extra_type := COALESCE((p_dto->>'extraType')::extra_type, 'NONE'::extra_type);
    v_batter_runs := COALESCE((p_dto->>'batterRuns')::int, 0);
    v_extra_runs := COALESCE((p_dto->>'extraRuns')::int, 0);
    v_is_legal_delivery := (v_extra_type != 'WIDE' AND v_extra_type != 'NO_BALL' AND v_extra_type != 'PENALTY');

    IF v_extra_type = 'NONE' THEN
        v_delivery_runs := v_batter_runs;
        v_bowler_runs_conceded := v_batter_runs;
        v_running_runs := v_batter_runs;
    ELSIF v_extra_type = 'WIDE' THEN
        v_wide_penalty := 1 + v_extra_runs;
        v_delivery_runs := v_wide_penalty;
        v_bowler_runs_conceded := v_wide_penalty;
        v_running_runs := GREATEST(0, v_extra_runs);
    ELSIF v_extra_type = 'NO_BALL' THEN
        v_noball_penalty := 1;
        v_delivery_runs := 1 + v_batter_runs + v_extra_runs;
        v_bowler_runs_conceded := 1 + v_batter_runs;
        v_running_runs := v_batter_runs;
    ELSIF v_extra_type = 'BYE' THEN
        -- Exact 0 to 6 runs selector for Byes
        v_bye_runs := v_extra_runs;
        v_delivery_runs := v_bye_runs;
        v_bowler_runs_conceded := 0;
        v_running_runs := v_bye_runs;
    ELSIF v_extra_type = 'LEG_BYE' THEN
        -- Exact 0 to 6 runs selector for Leg Byes
        v_leg_bye_runs := v_extra_runs;
        v_delivery_runs := v_leg_bye_runs;
        v_bowler_runs_conceded := 0;
        v_running_runs := v_leg_bye_runs;
    ELSIF v_extra_type = 'PENALTY' THEN
        v_penalty_runs := CASE WHEN v_extra_runs > 0 THEN v_extra_runs ELSE 5 END;
        v_delivery_runs := v_penalty_runs;
        v_bowler_runs_conceded := 0;
        v_running_runs := 0;
    END IF;

    v_over_num := v_inn.legal_balls / 6;
    v_ball_num := (v_inn.legal_balls % 6) + 1;

    v_is_wicket := COALESCE((p_dto->>'isWicket')::boolean, false);
    IF v_is_wicket AND p_dto->>'dismissalType' IS NOT NULL THEN
        v_dismissal_type := (p_dto->>'dismissalType')::dismissal_type;
        v_bowler_credited := v_dismissal_type IN ('BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET');
        v_dismissed_player_id := (p_dto->>'dismissedPlayerId')::uuid;
        IF v_dismissed_player_id IS NULL THEN v_dismissed_player_id := v_striker_id; END IF;
    END IF;

    IF p_dto->>'fielderId' IS NOT NULL THEN v_fielder_id := (p_dto->>'fielderId')::uuid; END IF;
    IF p_dto->>'incomingBatterId' IS NOT NULL THEN v_incoming_batter_id := (p_dto->>'incomingBatterId')::uuid; END IF;

    IF p_dto->>'runsCompletedBeforeDismissal' IS NOT NULL THEN
        v_running_runs := (p_dto->>'runsCompletedBeforeDismissal')::int;
    END IF;

    -- STRIKE ROTATION:
    -- In Singles Match, striker NEVER rotates!
    -- In Team Match, odd runs rotate striker and non-striker.
    IF v_is_singles THEN
        v_strike_rotated := false;
        v_next_striker_id := v_prev_striker_id;
        v_next_non_striker_id := null;
    ELSE
        v_strike_rotated := (v_running_runs % 2 = 1);
        IF v_strike_rotated THEN
            v_next_striker_id := v_prev_non_striker_id;
            v_next_non_striker_id := v_prev_striker_id;
        ELSE
            v_next_striker_id := v_prev_striker_id;
            v_next_non_striker_id := v_prev_non_striker_id;
        END IF;

        IF v_is_wicket THEN
            IF v_dismissed_player_id = v_prev_striker_id THEN
                IF v_strike_rotated THEN v_next_non_striker_id := v_incoming_batter_id;
                ELSE v_next_striker_id := v_incoming_batter_id; END IF;
            ELSIF v_dismissed_player_id = v_prev_non_striker_id THEN
                IF v_strike_rotated THEN v_next_striker_id := v_incoming_batter_id;
                ELSE v_next_non_striker_id := v_incoming_batter_id; END IF;
            END IF;
        END IF;
    END IF;

    v_new_legal_balls := v_inn.legal_balls + (CASE WHEN v_is_legal_delivery THEN 1 ELSE 0 END);
    v_is_over_complete := v_is_legal_delivery AND (v_new_legal_balls % 6 = 0);

    -- End of over: In Team Match, batters rotate ends. In Singles, batter remains at crease!
    IF v_is_over_complete AND NOT v_is_singles THEN
        DECLARE v_tmp UUID := v_next_striker_id; BEGIN
            v_next_striker_id := v_next_non_striker_id;
            v_next_non_striker_id := v_tmp;
        END;
    END IF;

    -- Insert Gully Delivery
    INSERT INTO public.gully_deliveries (
        innings_id, over_number, ball_number, striker_id, non_striker_id, bowler_id,
        batter_runs, extra_runs, extra_type, total_runs, is_legal_delivery, is_wicket,
        dismissal_type, dismissed_player_id, fielder_id, bowler_credited,
        runs_completed_before_dismissal, strike_rotated, incoming_batter_id,
        prev_striker_id, prev_non_striker_id, prev_bowler_id
    ) VALUES (
        v_inn.id, v_over_num, v_ball_num, v_striker_id, v_non_striker_id, v_bowler_id,
        v_batter_runs, v_extra_runs, v_extra_type, v_delivery_runs, v_is_legal_delivery, v_is_wicket,
        v_dismissal_type, v_dismissed_player_id, v_fielder_id, v_bowler_credited,
        COALESCE((p_dto->>'runsCompletedBeforeDismissal')::int, 0), v_strike_rotated, v_incoming_batter_id,
        v_prev_striker_id, v_prev_non_striker_id, v_prev_bowler_id
    ) RETURNING id INTO v_delivery_id;

    v_new_total_runs := v_inn.total_runs + v_delivery_runs;
    v_new_wickets := v_inn.wickets + (CASE WHEN v_is_wicket THEN 1 ELSE 0 END);

    -- Insert Gully Wicket
    IF v_is_wicket AND v_dismissed_player_id IS NOT NULL AND v_dismissal_type IS NOT NULL THEN
        INSERT INTO public.gully_wickets (
            innings_id, delivery_id, player_id, dismissal_type, bowler_credited,
            bowler_id, fielder_id, over_ball_text, team_runs_at_fall, wicket_number
        ) VALUES (
            v_inn.id, v_delivery_id, v_dismissed_player_id, v_dismissal_type, v_bowler_credited,
            CASE WHEN v_bowler_credited THEN v_bowler_id ELSE null END, v_fielder_id,
            v_over_num::text || '.' || v_ball_num::text, v_new_total_runs, v_new_wickets
        );
    END IF;

    -- Update Batting Scorecard
    SELECT * INTO v_striker_card FROM public.gully_batting_scorecards
    WHERE innings_id = v_inn.id AND player_id = v_striker_id FOR UPDATE;

    IF FOUND THEN
        v_is_striker_dismissed := v_is_wicket AND v_dismissed_player_id = v_striker_id;
        IF v_is_striker_dismissed THEN
            SELECT player_name INTO v_bowler_name FROM public.players WHERE id = v_bowler_id;
            IF v_fielder_id IS NOT NULL THEN
                SELECT player_name INTO v_fielder_name FROM public.players WHERE id = v_fielder_id;
            END IF;
            v_dismissal_text := CASE
                WHEN v_dismissal_type = 'BOWLED' THEN 'b ' || v_bowler_name
                WHEN v_dismissal_type = 'CAUGHT' THEN 'c ' || v_fielder_name || ' b ' || v_bowler_name
                WHEN v_dismissal_type = 'LBW' THEN 'lbw b ' || v_bowler_name
                WHEN v_dismissal_type = 'STUMPED' THEN 'st ' || v_fielder_name || ' b ' || v_bowler_name
                WHEN v_dismissal_type = 'RUN_OUT' THEN 'run out (' || COALESCE(v_fielder_name, 'sub') || ')'
                WHEN v_dismissal_type = 'HIT_WICKET' THEN 'hit wicket b ' || v_bowler_name
                ELSE v_dismissal_type::text
            END;
        END IF;

        UPDATE public.gully_batting_scorecards SET
            runs = runs + (CASE WHEN v_extra_type IN ('NONE', 'NO_BALL') THEN v_batter_runs ELSE 0 END),
            balls = balls + (CASE WHEN v_is_legal_delivery OR v_extra_type = 'NO_BALL' THEN 1 ELSE 0 END),
            fours = fours + (CASE WHEN v_batter_runs = 4 THEN 1 ELSE 0 END),
            sixes = sixes + (CASE WHEN v_batter_runs = 6 THEN 1 ELSE 0 END),
            strike_rate = public.calc_strike_rate(
                runs + (CASE WHEN v_extra_type IN ('NONE', 'NO_BALL') THEN v_batter_runs ELSE 0 END),
                balls + (CASE WHEN v_is_legal_delivery OR v_extra_type = 'NO_BALL' THEN 1 ELSE 0 END)
            ),
            not_out = CASE WHEN v_is_striker_dismissed THEN false ELSE not_out END,
            dismissal_type = CASE WHEN v_is_striker_dismissed THEN v_dismissal_type ELSE dismissal_type END,
            dismissal_text = CASE WHEN v_is_striker_dismissed THEN v_dismissal_text ELSE dismissal_text END,
            bowler_id = CASE WHEN v_is_striker_dismissed AND v_bowler_credited THEN v_bowler_id ELSE bowler_id END,
            fielder_id = CASE WHEN v_is_striker_dismissed THEN v_fielder_id ELSE fielder_id END,
            updated_at = now()
        WHERE id = v_striker_card.id;
    END IF;

    -- Update Bowling Scorecard
    SELECT * INTO v_bowler_card FROM public.gully_bowling_scorecards
    WHERE innings_id = v_inn.id AND player_id = v_bowler_id FOR UPDATE;

    IF FOUND THEN
        UPDATE public.gully_bowling_scorecards SET
            legal_balls = legal_balls + (CASE WHEN v_is_legal_delivery THEN 1 ELSE 0 END),
            overs_text = public.balls_to_overs_text(legal_balls + (CASE WHEN v_is_legal_delivery THEN 1 ELSE 0 END)),
            runs_conceded = runs_conceded + v_bowler_runs_conceded,
            wickets = wickets + (CASE WHEN v_is_wicket AND v_bowler_credited THEN 1 ELSE 0 END),
            economy = public.calc_economy(
                runs_conceded + v_bowler_runs_conceded,
                legal_balls + (CASE WHEN v_is_legal_delivery THEN 1 ELSE 0 END)
            ),
            wides = wides + (CASE WHEN v_extra_type = 'WIDE' THEN 1 ELSE 0 END),
            no_balls = no_balls + (CASE WHEN v_extra_type = 'NO_BALL' THEN 1 ELSE 0 END),
            updated_at = now()
        WHERE id = v_bowler_card.id;
    END IF;

    -- Check completion conditions
    IF v_is_singles THEN
        IF v_is_wicket AND v_match.singles_dismissal_rule = 'LAST_WICKET_ENDS_INNINGS' THEN
            v_should_end_innings := true;
        ELSIF v_new_legal_balls >= (v_match.total_overs * 6) THEN
            v_should_end_innings := true;
        END IF;
    ELSE
        IF v_inn.target_runs IS NOT NULL AND v_new_total_runs >= v_inn.target_runs THEN
            v_should_end_innings := true;
        ELSIF v_new_legal_balls >= (v_match.total_overs * 6) THEN
            v_should_end_innings := true;
        END IF;
    END IF;

    -- Update Gully Innings
    UPDATE public.gully_innings SET
        total_runs = v_new_total_runs,
        wickets = v_new_wickets,
        legal_balls = v_new_legal_balls,
        overs_completed_text = public.balls_to_overs_text(v_new_legal_balls),
        wides = wides + v_wide_penalty,
        no_balls = no_balls + (CASE WHEN v_extra_type = 'NO_BALL' THEN 1 ELSE 0 END),
        byes = byes + v_bye_runs,
        leg_byes = leg_byes + v_leg_bye_runs,
        penalty_runs = penalty_runs + v_penalty_runs,
        current_striker_id = CASE WHEN v_should_end_innings THEN null ELSE v_next_striker_id END,
        current_non_striker_id = CASE WHEN v_should_end_innings THEN null ELSE v_next_non_striker_id END,
        current_bowler_id = CASE WHEN v_is_over_complete OR v_should_end_innings THEN null ELSE v_bowler_id END,
        last_bowler_id = CASE WHEN v_is_over_complete THEN v_bowler_id ELSE last_bowler_id END,
        status = CASE WHEN v_should_end_innings THEN 'COMPLETED'::innings_status ELSE 'IN_PROGRESS'::innings_status END,
        updated_at = now()
    WHERE id = v_inn.id;

    RETURN jsonb_build_object(
        'success', true,
        'deliveryId', v_delivery_id,
        'totalRuns', v_new_total_runs,
        'wickets', v_new_wickets,
        'overs', public.balls_to_overs_text(v_new_legal_balls),
        'isOverComplete', v_is_over_complete,
        'inningsCompleted', v_should_end_innings
    );
END;
$$;

-- =============================================================================
-- 2. GULLY UNDO LAST DELIVERY
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_gully_undo_last_delivery(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match public.gully_matches%ROWTYPE;
    v_inn public.gully_innings%ROWTYPE;
    v_last_del public.gully_deliveries%ROWTYPE;
    v_rev_legal_balls INT;
    v_del_runs INT;
    v_wide_pen INT := 0;
    v_noball_pen INT := 0;
    v_bye_runs INT := 0;
    v_leg_bye_runs INT := 0;
    v_penalty_runs INT := 0;
    v_bowler_conceded INT := 0;
BEGIN
    SELECT * INTO v_match FROM public.gully_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully match not found'; END IF;

    SELECT * INTO v_inn FROM public.gully_innings
    WHERE gully_match_id = p_match_id AND innings_number = v_match.current_innings_number FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gully innings not found'; END IF;

    SELECT * INTO v_last_del FROM public.gully_deliveries
    WHERE innings_id = v_inn.id
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No delivery to undo'; END IF;

    v_del_runs := v_last_del.total_runs;
    v_rev_legal_balls := v_inn.legal_balls - (CASE WHEN v_last_del.is_legal_delivery THEN 1 ELSE 0 END);

    IF v_last_del.extra_type = 'WIDE' THEN
        v_wide_pen := 1 + v_last_del.extra_runs;
        v_bowler_conceded := v_wide_pen;
    ELSIF v_last_del.extra_type = 'NO_BALL' THEN
        v_noball_pen := 1;
        v_bowler_conceded := 1 + v_last_del.batter_runs;
    ELSIF v_last_del.extra_type = 'BYE' THEN
        v_bye_runs := v_last_del.total_runs;
    ELSIF v_last_del.extra_type = 'LEG_BYE' THEN
        v_leg_bye_runs := v_last_del.total_runs;
    ELSIF v_last_del.extra_type = 'PENALTY' THEN
        v_penalty_runs := v_last_del.total_runs;
    ELSE
        v_bowler_conceded := v_last_del.batter_runs;
    END IF;

    -- Revert Batting Scorecard
    UPDATE public.gully_batting_scorecards SET
        runs = GREATEST(0, runs - (CASE WHEN v_last_del.extra_type IN ('NONE', 'NO_BALL') THEN v_last_del.batter_runs ELSE 0 END)),
        balls = GREATEST(0, balls - (CASE WHEN v_last_del.is_legal_delivery OR v_last_del.extra_type = 'NO_BALL' THEN 1 ELSE 0 END)),
        fours = GREATEST(0, fours - (CASE WHEN v_last_del.batter_runs = 4 THEN 1 ELSE 0 END)),
        sixes = GREATEST(0, sixes - (CASE WHEN v_last_del.batter_runs = 6 THEN 1 ELSE 0 END)),
        strike_rate = public.calc_strike_rate(
            GREATEST(0, runs - (CASE WHEN v_last_del.extra_type IN ('NONE', 'NO_BALL') THEN v_last_del.batter_runs ELSE 0 END)),
            GREATEST(0, balls - (CASE WHEN v_last_del.is_legal_delivery OR v_last_del.extra_type = 'NO_BALL' THEN 1 ELSE 0 END))
        ),
        not_out = CASE WHEN v_last_del.is_wicket AND v_last_del.dismissed_player_id = v_last_del.striker_id THEN true ELSE not_out END,
        dismissal_type = CASE WHEN v_last_del.is_wicket AND v_last_del.dismissed_player_id = v_last_del.striker_id THEN null ELSE dismissal_type END,
        dismissal_text = CASE WHEN v_last_del.is_wicket AND v_last_del.dismissed_player_id = v_last_del.striker_id THEN null ELSE dismissal_text END,
        bowler_id = CASE WHEN v_last_del.is_wicket AND v_last_del.dismissed_player_id = v_last_del.striker_id THEN null ELSE bowler_id END,
        fielder_id = CASE WHEN v_last_del.is_wicket AND v_last_del.dismissed_player_id = v_last_del.striker_id THEN null ELSE fielder_id END,
        updated_at = now()
    WHERE innings_id = v_inn.id AND player_id = v_last_del.striker_id;

    -- Revert Bowling Scorecard
    UPDATE public.gully_bowling_scorecards SET
        legal_balls = GREATEST(0, legal_balls - (CASE WHEN v_last_del.is_legal_delivery THEN 1 ELSE 0 END)),
        overs_text = public.balls_to_overs_text(GREATEST(0, legal_balls - (CASE WHEN v_last_del.is_legal_delivery THEN 1 ELSE 0 END))),
        runs_conceded = GREATEST(0, runs_conceded - v_bowler_conceded),
        wickets = GREATEST(0, wickets - (CASE WHEN v_last_del.is_wicket AND v_last_del.bowler_credited THEN 1 ELSE 0 END)),
        economy = public.calc_economy(
            GREATEST(0, runs_conceded - v_bowler_conceded),
            GREATEST(0, legal_balls - (CASE WHEN v_last_del.is_legal_delivery THEN 1 ELSE 0 END))
        ),
        wides = GREATEST(0, wides - (CASE WHEN v_last_del.extra_type = 'WIDE' THEN 1 ELSE 0 END)),
        no_balls = GREATEST(0, no_balls - (CASE WHEN v_last_del.extra_type = 'NO_BALL' THEN 1 ELSE 0 END)),
        updated_at = now()
    WHERE innings_id = v_inn.id AND player_id = v_last_del.bowler_id;

    -- Delete Wicket row if any
    DELETE FROM public.gully_wickets WHERE delivery_id = v_last_del.id;

    -- Delete Delivery
    DELETE FROM public.gully_deliveries WHERE id = v_last_del.id;

    -- Restore Gully Innings Snapshot
    UPDATE public.gully_innings SET
        total_runs = GREATEST(0, total_runs - v_del_runs),
        wickets = GREATEST(0, wickets - (CASE WHEN v_last_del.is_wicket THEN 1 ELSE 0 END)),
        legal_balls = v_rev_legal_balls,
        overs_completed_text = public.balls_to_overs_text(v_rev_legal_balls),
        wides = GREATEST(0, wides - v_wide_pen),
        no_balls = GREATEST(0, no_balls - v_noball_pen),
        byes = GREATEST(0, byes - v_bye_runs),
        leg_byes = GREATEST(0, leg_byes - v_leg_bye_runs),
        penalty_runs = GREATEST(0, penalty_runs - v_penalty_runs),
        current_striker_id = v_last_del.prev_striker_id,
        current_non_striker_id = v_last_del.prev_non_striker_id,
        current_bowler_id = v_last_del.prev_bowler_id,
        status = 'IN_PROGRESS'::innings_status,
        updated_at = now()
    WHERE id = v_inn.id;

    RETURN jsonb_build_object(
        'success', true,
        'revertedDeliveryId', v_last_del.id,
        'totalRuns', GREATEST(0, v_inn.total_runs - v_del_runs),
        'overs', public.balls_to_overs_text(v_rev_legal_balls)
    );
END;
$$;
