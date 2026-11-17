-- =============================================================================
-- CRICKET SCORER: SUPABASE POSTGRESQL INITIAL SCHEMA & MIGRATION
-- Migration: 20261115000000_initial_cricket_schema.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE player_role AS ENUM ('BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE match_format AS ENUM ('T10', 'T20', 'ODI', 'TEST');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE toss_decision AS ENUM ('BAT', 'BOWL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'ABANDONED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE match_result_type AS ENUM ('WIN_RUNS', 'WIN_WICKETS', 'WIN_INNINGS_RUNS', 'TIE', 'DRAW', 'NO_RESULT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE innings_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DECLARED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE extra_type AS ENUM ('NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE dismissal_type AS ENUM ('BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_OUT', 'OBSTRUCTING_FIELD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'TEAM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE gully_match_type AS ENUM ('TEAM_MATCH', 'SINGLES_MATCH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bowling_allocation_rule AS ENUM ('EXACT', 'MAX_LIMIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE singles_dismissal_rule AS ENUM ('LAST_WICKET_ENDS_INNINGS', 'BATTER_CONTINUES');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bowler_order_rule AS ENUM ('FREE_SELECTION', 'PREDEFINED_ORDER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================================================
-- 2. CORE TABLES (INTERNATIONAL & REGISTERED SQUAD)
-- =============================================================================

-- Teams (maps 1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'TEAM',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_teams_username ON public.teams(username);
CREATE INDEX IF NOT EXISTS idx_teams_email ON public.teams(email);
CREATE INDEX IF NOT EXISTS idx_teams_role ON public.teams(role);
CREATE INDEX IF NOT EXISTS idx_teams_auth_user_id ON public.teams(auth_user_id);

-- Players
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    jersey_number INT NOT NULL,
    role player_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_team_jersey UNIQUE (team_id, jersey_number)
);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(player_name);
CREATE INDEX IF NOT EXISTS idx_players_jersey ON public.players(jersey_number);

-- International Matches
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    format match_format NOT NULL,
    team_a_id UUID NOT NULL REFERENCES public.teams(id),
    team_b_id UUID NOT NULL REFERENCES public.teams(id),
    match_date TIMESTAMPTZ NOT NULL,
    venue TEXT,
    toss_winner_id UUID REFERENCES public.teams(id),
    toss_decision toss_decision,
    status match_status NOT NULL DEFAULT 'UPCOMING',
    result_type match_result_type,
    result_description TEXT,
    winner_id UUID REFERENCES public.teams(id),
    current_innings_number INT NOT NULL DEFAULT 1,
    follow_on_enforced BOOLEAN NOT NULL DEFAULT false,
    current_day INT NOT NULL DEFAULT 1,
    current_session INT NOT NULL DEFAULT 1,
    day_overs INT NOT NULL DEFAULT 0,
    session_overs INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_matches_team_a ON public.matches(team_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_b ON public.matches(team_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_format ON public.matches(format);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);

-- Match Playing XI
CREATE TABLE IF NOT EXISTS public.match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id),
    is_playing_xi BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT unique_match_player UNIQUE (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_players_match ON public.match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player ON public.match_players(player_id);
CREATE INDEX IF NOT EXISTS idx_match_players_team ON public.match_players(team_id);

-- Innings
CREATE TABLE IF NOT EXISTS public.innings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    innings_number INT NOT NULL,
    batting_team_id UUID NOT NULL REFERENCES public.teams(id),
    bowling_team_id UUID NOT NULL REFERENCES public.teams(id),
    total_runs INT NOT NULL DEFAULT 0,
    wickets INT NOT NULL DEFAULT 0,
    legal_balls INT NOT NULL DEFAULT 0,
    overs_completed_text TEXT NOT NULL DEFAULT '0.0',
    status innings_status NOT NULL DEFAULT 'IN_PROGRESS',
    target_runs INT,
    is_declared BOOLEAN NOT NULL DEFAULT false,
    byes INT NOT NULL DEFAULT 0,
    leg_byes INT NOT NULL DEFAULT 0,
    wides INT NOT NULL DEFAULT 0,
    no_balls INT NOT NULL DEFAULT 0,
    penalty_runs INT NOT NULL DEFAULT 0,
    current_striker_id UUID REFERENCES public.players(id),
    current_non_striker_id UUID REFERENCES public.players(id),
    current_bowler_id UUID REFERENCES public.players(id),
    last_bowler_id UUID REFERENCES public.players(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_match_innings UNIQUE (match_id, innings_number)
);

CREATE INDEX IF NOT EXISTS idx_innings_match ON public.innings(match_id);
CREATE INDEX IF NOT EXISTS idx_innings_batting_team ON public.innings(batting_team_id);
CREATE INDEX IF NOT EXISTS idx_innings_bowling_team ON public.innings(bowling_team_id);

-- Deliveries (Structured Ball-by-ball Ledger)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.innings(id) ON DELETE CASCADE,
    over_number INT NOT NULL,
    ball_number INT NOT NULL,
    striker_id UUID NOT NULL REFERENCES public.players(id),
    non_striker_id UUID NOT NULL REFERENCES public.players(id),
    bowler_id UUID NOT NULL REFERENCES public.players(id),
    batter_runs INT NOT NULL DEFAULT 0,
    extra_runs INT NOT NULL DEFAULT 0,
    extra_type extra_type NOT NULL DEFAULT 'NONE',
    total_runs INT NOT NULL DEFAULT 0,
    is_legal_delivery BOOLEAN NOT NULL DEFAULT true,
    is_wicket BOOLEAN NOT NULL DEFAULT false,
    dismissal_type dismissal_type,
    dismissed_player_id UUID REFERENCES public.players(id),
    fielder_id UUID REFERENCES public.players(id),
    bowler_credited BOOLEAN NOT NULL DEFAULT false,
    runs_completed_before_dismissal INT NOT NULL DEFAULT 0,
    strike_rotated BOOLEAN NOT NULL DEFAULT false,
    incoming_batter_id UUID REFERENCES public.players(id),
    prev_striker_id UUID REFERENCES public.players(id),
    prev_non_striker_id UUID REFERENCES public.players(id),
    prev_bowler_id UUID REFERENCES public.players(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deliveries_innings ON public.deliveries(innings_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_over ON public.deliveries(innings_id, over_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_striker ON public.deliveries(striker_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_bowler ON public.deliveries(bowler_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON public.deliveries(created_at DESC);

-- Wickets
CREATE TABLE IF NOT EXISTS public.wickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.innings(id) ON DELETE CASCADE,
    delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
    player_id UUID NOT NULL REFERENCES public.players(id),
    dismissal_type dismissal_type NOT NULL,
    bowler_credited BOOLEAN NOT NULL DEFAULT true,
    bowler_id UUID REFERENCES public.players(id),
    fielder_id UUID REFERENCES public.players(id),
    over_ball_text TEXT NOT NULL,
    team_runs_at_fall INT NOT NULL,
    wicket_number INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wickets_innings ON public.wickets(innings_id);
CREATE INDEX IF NOT EXISTS idx_wickets_player ON public.wickets(player_id);
CREATE INDEX IF NOT EXISTS idx_wickets_bowler ON public.wickets(bowler_id);

-- Batting Scorecards
CREATE TABLE IF NOT EXISTS public.batting_scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.innings(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id),
    batting_order INT NOT NULL DEFAULT 0,
    runs INT NOT NULL DEFAULT 0,
    balls INT NOT NULL DEFAULT 0,
    fours INT NOT NULL DEFAULT 0,
    sixes INT NOT NULL DEFAULT 0,
    strike_rate NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    not_out BOOLEAN NOT NULL DEFAULT true,
    dismissal_type dismissal_type,
    dismissal_text TEXT,
    bowler_id UUID REFERENCES public.players(id),
    fielder_id UUID REFERENCES public.players(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_innings_batter UNIQUE (innings_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_batting_scorecards_innings ON public.batting_scorecards(innings_id);
CREATE INDEX IF NOT EXISTS idx_batting_scorecards_player ON public.batting_scorecards(player_id);

-- Bowling Scorecards
CREATE TABLE IF NOT EXISTS public.bowling_scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.innings(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id),
    bowling_order INT NOT NULL DEFAULT 0,
    legal_balls INT NOT NULL DEFAULT 0,
    overs_text TEXT NOT NULL DEFAULT '0.0',
    maidens INT NOT NULL DEFAULT 0,
    runs_conceded INT NOT NULL DEFAULT 0,
    wickets INT NOT NULL DEFAULT 0,
    economy NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    wides INT NOT NULL DEFAULT 0,
    no_balls INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_innings_bowler UNIQUE (innings_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_bowling_scorecards_innings ON public.bowling_scorecards(innings_id);
CREATE INDEX IF NOT EXISTS idx_bowling_scorecards_player ON public.bowling_scorecards(player_id);

-- Match Sessions (Test Cricket)
CREATE TABLE IF NOT EXISTS public.match_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    session_number INT NOT NULL,
    overs_bowled INT NOT NULL DEFAULT 0,
    runs_scored INT NOT NULL DEFAULT 0,
    wickets_fallen INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_match_sessions_match ON public.match_sessions(match_id);

-- Partnerships
CREATE TABLE IF NOT EXISTS public.partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.innings(id) ON DELETE CASCADE,
    wicket_number INT NOT NULL,
    batter_one_id UUID NOT NULL REFERENCES public.players(id),
    batter_two_id UUID NOT NULL REFERENCES public.players(id),
    runs INT NOT NULL DEFAULT 0,
    balls INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_partnerships_innings ON public.partnerships(innings_id);

-- =============================================================================
-- 3. GULLY CRICKET TABLES (COMPLETELY SEGREGATED)
-- =============================================================================

-- Gully Matches
CREATE TABLE IF NOT EXISTS public.gully_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registered_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    match_type gully_match_type NOT NULL,
    match_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    venue TEXT,
    status match_status NOT NULL DEFAULT 'UPCOMING',
    total_overs INT NOT NULL DEFAULT 2,
    players_per_team INT,
    bowling_allocation_rule bowling_allocation_rule NOT NULL DEFAULT 'MAX_LIMIT',
    singles_dismissal_rule singles_dismissal_rule,
    bowler_order_rule bowler_order_rule,
    selected_batter_id UUID REFERENCES public.players(id),
    draft_shuffled BOOLEAN NOT NULL DEFAULT false,
    toss_winner_team_id UUID,
    toss_decision toss_decision,
    current_innings_number INT NOT NULL DEFAULT 1,
    current_round_number INT NOT NULL DEFAULT 1,
    singles_batting_order TEXT,
    result_type match_result_type,
    result_description TEXT,
    winner_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gully_matches_registered_team ON public.gully_matches(registered_team_id);
CREATE INDEX IF NOT EXISTS idx_gully_matches_status ON public.gully_matches(status);
CREATE INDEX IF NOT EXISTS idx_gully_matches_type ON public.gully_matches(match_type);

-- Gully Temporary Teams (Ad-hoc teams without polluting permanent registry)
CREATE TABLE IF NOT EXISTS public.gully_temporary_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gully_match_id UUID NOT NULL REFERENCES public.gully_matches(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    is_team_a BOOLEAN NOT NULL DEFAULT true,
    captain_player_id UUID REFERENCES public.players(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gully_temporary_teams_match ON public.gully_temporary_teams(gully_match_id);

-- Gully Match Players
CREATE TABLE IF NOT EXISTS public.gully_match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gully_match_id UUID NOT NULL REFERENCES public.gully_matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    temporary_team_id UUID REFERENCES public.gully_temporary_teams(id) ON DELETE SET NULL,
    is_batter BOOLEAN NOT NULL DEFAULT false,
    is_bowler BOOLEAN NOT NULL DEFAULT true,
    allocated_overs INT NOT NULL DEFAULT 1,
    bowling_order INT,
    batting_order INT,
    is_playing BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT unique_gully_match_player UNIQUE (gully_match_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_gully_match_players_match ON public.gully_match_players(gully_match_id);
CREATE INDEX IF NOT EXISTS idx_gully_match_players_player ON public.gully_match_players(player_id);
CREATE INDEX IF NOT EXISTS idx_gully_match_players_temp_team ON public.gully_match_players(temporary_team_id);

-- Gully Innings
CREATE TABLE IF NOT EXISTS public.gully_innings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gully_match_id UUID NOT NULL REFERENCES public.gully_matches(id) ON DELETE CASCADE,
    innings_number INT NOT NULL,
    round_number INT NOT NULL DEFAULT 1,
    batter_id UUID REFERENCES public.players(id),
    batting_team_name TEXT NOT NULL,
    bowling_team_name TEXT NOT NULL,
    batting_temp_team_id UUID REFERENCES public.gully_temporary_teams(id),
    bowling_temp_team_id UUID REFERENCES public.gully_temporary_teams(id),
    total_runs INT NOT NULL DEFAULT 0,
    wickets INT NOT NULL DEFAULT 0,
    legal_balls INT NOT NULL DEFAULT 0,
    overs_completed_text TEXT NOT NULL DEFAULT '0.0',
    status innings_status NOT NULL DEFAULT 'IN_PROGRESS',
    target_runs INT,
    byes INT NOT NULL DEFAULT 0,
    leg_byes INT NOT NULL DEFAULT 0,
    wides INT NOT NULL DEFAULT 0,
    no_balls INT NOT NULL DEFAULT 0,
    penalty_runs INT NOT NULL DEFAULT 0,
    current_striker_id UUID REFERENCES public.players(id),
    current_non_striker_id UUID REFERENCES public.players(id),
    current_bowler_id UUID REFERENCES public.players(id),
    last_bowler_id UUID REFERENCES public.players(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_gully_match_innings UNIQUE (gully_match_id, innings_number)
);

CREATE INDEX IF NOT EXISTS idx_gully_innings_match ON public.gully_innings(gully_match_id);

-- Gully Deliveries
CREATE TABLE IF NOT EXISTS public.gully_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.gully_innings(id) ON DELETE CASCADE,
    over_number INT NOT NULL,
    ball_number INT NOT NULL,
    striker_id UUID NOT NULL REFERENCES public.players(id),
    non_striker_id UUID REFERENCES public.players(id),
    bowler_id UUID NOT NULL REFERENCES public.players(id),
    batter_runs INT NOT NULL DEFAULT 0,
    extra_runs INT NOT NULL DEFAULT 0,
    extra_type extra_type NOT NULL DEFAULT 'NONE',
    total_runs INT NOT NULL DEFAULT 0,
    is_legal_delivery BOOLEAN NOT NULL DEFAULT true,
    is_wicket BOOLEAN NOT NULL DEFAULT false,
    dismissal_type dismissal_type,
    dismissed_player_id UUID REFERENCES public.players(id),
    fielder_id UUID REFERENCES public.players(id),
    bowler_credited BOOLEAN NOT NULL DEFAULT false,
    runs_completed_before_dismissal INT NOT NULL DEFAULT 0,
    strike_rotated BOOLEAN NOT NULL DEFAULT false,
    incoming_batter_id UUID REFERENCES public.players(id),
    prev_striker_id UUID REFERENCES public.players(id),
    prev_non_striker_id UUID REFERENCES public.players(id),
    prev_bowler_id UUID REFERENCES public.players(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gully_deliveries_innings ON public.gully_deliveries(innings_id);
CREATE INDEX IF NOT EXISTS idx_gully_deliveries_over ON public.gully_deliveries(innings_id, over_number);

-- Gully Wickets
CREATE TABLE IF NOT EXISTS public.gully_wickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.gully_innings(id) ON DELETE CASCADE,
    delivery_id UUID REFERENCES public.gully_deliveries(id) ON DELETE SET NULL,
    player_id UUID NOT NULL REFERENCES public.players(id),
    dismissal_type dismissal_type NOT NULL,
    bowler_credited BOOLEAN NOT NULL DEFAULT true,
    bowler_id UUID REFERENCES public.players(id),
    fielder_id UUID REFERENCES public.players(id),
    over_ball_text TEXT NOT NULL,
    team_runs_at_fall INT NOT NULL,
    wicket_number INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gully_wickets_innings ON public.gully_wickets(innings_id);

-- Gully Batting Scorecards
CREATE TABLE IF NOT EXISTS public.gully_batting_scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.gully_innings(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id),
    batting_order INT NOT NULL DEFAULT 0,
    runs INT NOT NULL DEFAULT 0,
    balls INT NOT NULL DEFAULT 0,
    fours INT NOT NULL DEFAULT 0,
    sixes INT NOT NULL DEFAULT 0,
    strike_rate NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    not_out BOOLEAN NOT NULL DEFAULT true,
    dismissal_type dismissal_type,
    dismissal_text TEXT,
    bowler_id UUID REFERENCES public.players(id),
    fielder_id UUID REFERENCES public.players(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_gully_innings_batter UNIQUE (innings_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_gully_batting_scorecards_innings ON public.gully_batting_scorecards(innings_id);

-- Gully Bowling Scorecards
CREATE TABLE IF NOT EXISTS public.gully_bowling_scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID NOT NULL REFERENCES public.gully_innings(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id),
    bowling_order INT NOT NULL DEFAULT 0,
    legal_balls INT NOT NULL DEFAULT 0,
    overs_text TEXT NOT NULL DEFAULT '0.0',
    maidens INT NOT NULL DEFAULT 0,
    runs_conceded INT NOT NULL DEFAULT 0,
    wickets INT NOT NULL DEFAULT 0,
    economy NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    wides INT NOT NULL DEFAULT 0,
    no_balls INT NOT NULL DEFAULT 0,
    allocated_overs INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_gully_innings_bowler UNIQUE (innings_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_gully_bowling_scorecards_innings ON public.gully_bowling_scorecards(innings_id);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN' OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.current_team_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.teams WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Enable RLS on all public tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batting_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bowling_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gully_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gully_temporary_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gully_match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gully_innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gully_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gully_wickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gully_batting_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gully_bowling_scorecards ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS POLICIES
-- =============================================================================

-- TEAMS
CREATE POLICY "Teams are viewable by authenticated users"
    ON public.teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teams can update their own profile"
    ON public.teams FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid() OR public.is_admin())
    WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admin can manage all teams"
    ON public.teams FOR ALL
    TO authenticated
    USING (public.is_admin());

-- PLAYERS
CREATE POLICY "Players are viewable by all authenticated users"
    ON public.players FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teams can insert their own players"
    ON public.players FOR INSERT
    TO authenticated
    WITH CHECK (team_id = public.current_team_id() OR public.is_admin());

CREATE POLICY "Teams can update their own players"
    ON public.players FOR UPDATE
    TO authenticated
    USING (team_id = public.current_team_id() OR public.is_admin())
    WITH CHECK (team_id = public.current_team_id() OR public.is_admin());

CREATE POLICY "Teams can delete their own players"
    ON public.players FOR DELETE
    TO authenticated
    USING (team_id = public.current_team_id() OR public.is_admin());

-- INTERNATIONAL MATCHES (Read by all, Managed ONLY by Admin)
CREATE POLICY "Matches viewable by authenticated users"
    ON public.matches FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admin can insert matches"
    ON public.matches FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admin can update matches"
    ON public.matches FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admin can delete matches"
    ON public.matches FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- MATCH CHILDREN (MatchPlayers, Innings, Deliveries, Wickets, Scorecards, Sessions, Partnerships)
-- SELECT open to authenticated users; Writes controlled by Admin or SECURITY DEFINER scoring procedures
CREATE POLICY "Match players viewable by authenticated" ON public.match_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Match players admin write" ON public.match_players FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Innings viewable by authenticated" ON public.innings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Innings admin write" ON public.innings FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Deliveries viewable by authenticated" ON public.deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Deliveries admin write" ON public.deliveries FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Wickets viewable by authenticated" ON public.wickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Wickets admin write" ON public.wickets FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Batting scorecards viewable by authenticated" ON public.batting_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Batting scorecards admin write" ON public.batting_scorecards FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Bowling scorecards viewable by authenticated" ON public.bowling_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bowling scorecards admin write" ON public.bowling_scorecards FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Sessions viewable by authenticated" ON public.match_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sessions admin write" ON public.match_sessions FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Partnerships viewable by authenticated" ON public.partnerships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partnerships admin write" ON public.partnerships FOR ALL TO authenticated USING (public.is_admin());

-- GULLY CRICKET (STRICT MULTI-TENANT ISOLATION)
CREATE POLICY "Gully matches isolated to owning team"
    ON public.gully_matches FOR ALL
    TO authenticated
    USING (registered_team_id = public.current_team_id())
    WITH CHECK (registered_team_id = public.current_team_id());

CREATE POLICY "Gully temporary teams isolated to owning team"
    ON public.gully_temporary_teams FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gully_matches
        WHERE public.gully_matches.id = public.gully_temporary_teams.gully_match_id
        AND public.gully_matches.registered_team_id = public.current_team_id()
    ));

CREATE POLICY "Gully match players isolated to owning team"
    ON public.gully_match_players FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gully_matches
        WHERE public.gully_matches.id = public.gully_match_players.gully_match_id
        AND public.gully_matches.registered_team_id = public.current_team_id()
    ));

CREATE POLICY "Gully innings isolated to owning team"
    ON public.gully_innings FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gully_matches
        WHERE public.gully_matches.id = public.gully_innings.gully_match_id
        AND public.gully_matches.registered_team_id = public.current_team_id()
    ));

CREATE POLICY "Gully deliveries isolated to owning team"
    ON public.gully_deliveries FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gully_innings gi
        JOIN public.gully_matches gm ON gm.id = gi.gully_match_id
        WHERE gi.id = public.gully_deliveries.innings_id
        AND gm.registered_team_id = public.current_team_id()
    ));

CREATE POLICY "Gully wickets isolated to owning team"
    ON public.gully_wickets FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gully_innings gi
        JOIN public.gully_matches gm ON gm.id = gi.gully_match_id
        WHERE gi.id = public.gully_wickets.innings_id
        AND gm.registered_team_id = public.current_team_id()
    ));

CREATE POLICY "Gully batting scorecards isolated to owning team"
    ON public.gully_batting_scorecards FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gully_innings gi
        JOIN public.gully_matches gm ON gm.id = gi.gully_match_id
        WHERE gi.id = public.gully_batting_scorecards.innings_id
        AND gm.registered_team_id = public.current_team_id()
    ));

CREATE POLICY "Gully bowling scorecards isolated to owning team"
    ON public.gully_bowling_scorecards FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gully_innings gi
        JOIN public.gully_matches gm ON gm.id = gi.gully_match_id
        WHERE gi.id = public.gully_bowling_scorecards.innings_id
        AND gm.registered_team_id = public.current_team_id()
    ));

-- =============================================================================
-- 6. AUTH SIGNUP TRIGGER (SYNC auth.users -> public.teams)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_team_name TEXT;
    v_username TEXT;
    v_role user_role;
BEGIN
    v_team_name := COALESCE(NEW.raw_user_meta_data->>'team_name', NEW.raw_user_meta_data->>'teamName', 'Team ' || substr(NEW.id::text, 1, 6));
    v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    v_role := CASE
        WHEN (NEW.raw_app_meta_data->>'role') = 'ADMIN' OR (NEW.raw_user_meta_data->>'role') = 'ADMIN' THEN 'ADMIN'::user_role
        ELSE 'TEAM'::user_role
    END;

    INSERT INTO public.teams (auth_user_id, team_name, username, email, role, is_active)
    VALUES (NEW.id, v_team_name, v_username, NEW.email, v_role, true)
    ON CONFLICT (email) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id,
        team_name = EXCLUDED.team_name,
        updated_at = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 7. ENABLE SUPABASE REALTIME REPLICATION
-- =============================================================================

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.innings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.batting_scorecards;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bowling_scorecards;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gully_matches;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gully_innings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gully_deliveries;
EXCEPTION WHEN OTHERS THEN null; END $$;
