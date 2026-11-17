# Cricket Scorer: Supabase Migration Master Plan

## 1. Executive Summary & Objective

This document defines the complete architectural blueprint and phased migration strategy to transition the full-stack Cricket Tournament Management & Live Scoring Platform from its legacy Node.js/Express/Prisma/MySQL/Socket.IO backend to an enterprise-grade, serverless backend powered by **Supabase** (PostgreSQL, Supabase Auth, Row Level Security, PostgreSQL Stored Procedures/RPCs, and Supabase Realtime).

The migration guarantees:
- **Zero Loss of Cricket Engine Logic**: 100% preservation of ball-by-ball delivery rules, strike rotations, maiden overs, extras (wides, no-balls, byes, leg-byes, penalties), bowler restrictions, innings transitions, Test match session/day/follow-on/declaration logic, and undo/correction rollback mechanisms.
- **Strict International vs. Gully Cricket Isolation**: Absolute multi-tenant segregation between official International matches and private Gully cricket matches (Team Match and Singles Match modes).
- **Hardened Database-Level Security**: Complete Row Level Security (RLS) enforcement on all 19 PostgreSQL tables. Never trust frontend claims.
- **Elimination of Local Laptop Dependency**: Complete transition away from local Express and MySQL servers to a cloud-hosted Supabase environment.
- **Bug Fix for Bye and Leg-Bye Scoring**: Explicit 0–6 run selector for Byes and Leg Byes in both International and Gully modes, correctly incrementing team extras, zeroing batter runs and bowler runs conceded, counting legal balls, rotating strike on odd runs for Team/International matches, keeping strike fixed for Gully Singles, and supporting complete undo rollbacks.

---

## 2. Source vs. Target Architecture

| Component | Source Architecture | Target Supabase Architecture |
| :--- | :--- | :--- |
| **Database** | MySQL 8.0 (Prisma ORM) | Supabase Managed PostgreSQL 15+ |
| **Authentication** | Custom Express JWT + bcryptjs | Supabase Auth (`auth.users`, JWTs, app_metadata) |
| **Authorization** | Express Middleware (`requireAdmin`, `requireTeam`) | PostgreSQL Row Level Security (RLS) + Database Helper Functions |
| **Data Access API** | Express REST API (`/api/*`) | Supabase PostgREST Auto-generated REST APIs |
| **Business Logic & Transactions** | Express Services (`scoring.service.ts`, `gullyScoring.service.ts`) | Atomic PostgreSQL Stored Procedures (`SECURITY DEFINER` RPCs) |
| **Realtime Broadcast** | Socket.IO Server (`join:match`, `match:updated`) | Supabase Realtime Channels (`postgres_changes` / broadcast) |
| **Client Library** | Axios + Socket.io-client | `@supabase/supabase-js` v2 |
| **Scorecard PDF Export** | Node.js `pdfkit` Express endpoint | Client-side jsPDF / Supabase Edge Function |
| **Hosting & Ops** | Local Node process & local MySQL | Supabase Cloud Platform (independent of local machine) |

---

## 3. Database Schema Specification (PostgreSQL)

### 3.1 Custom Enums
```sql
CREATE TYPE player_role AS ENUM ('BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER');
CREATE TYPE match_format AS ENUM ('T10', 'T20', 'ODI', 'TEST');
CREATE TYPE toss_decision AS ENUM ('BAT', 'BOWL');
CREATE TYPE match_status AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'ABANDONED');
CREATE TYPE match_result_type AS ENUM ('WIN_RUNS', 'WIN_WICKETS', 'WIN_INNINGS_RUNS', 'TIE', 'DRAW', 'NO_RESULT');
CREATE TYPE innings_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DECLARED');
CREATE TYPE extra_type AS ENUM ('NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY');
CREATE TYPE dismissal_type AS ENUM ('BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_OUT', 'OBSTRUCTING_FIELD');
CREATE TYPE user_role AS ENUM ('ADMIN', 'TEAM');
CREATE TYPE gully_match_type AS ENUM ('TEAM_MATCH', 'SINGLES_MATCH');
CREATE TYPE bowling_allocation_rule AS ENUM ('EXACT', 'MAX_LIMIT');
CREATE TYPE singles_dismissal_rule AS ENUM ('LAST_WICKET_ENDS_INNINGS', 'BATTER_CONTINUES');
CREATE TYPE bowler_order_rule AS ENUM ('FREE_SELECTION', 'PREDEFINED_ORDER');
```

### 3.2 Relational Tables (19 Tables)
1. **`teams`**: Links to `auth.users(id)`. Fields: `id UUID`, `team_name TEXT`, `username TEXT UNIQUE`, `email TEXT UNIQUE`, `role user_role DEFAULT 'TEAM'`, `is_active BOOLEAN DEFAULT true`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
2. **`players`**: `id UUID`, `team_id UUID REFERENCES teams(id) ON DELETE CASCADE`, `player_name TEXT`, `jersey_number INT`, `role player_role`, `created_at`, `updated_at`. Unique constraint: `(team_id, jersey_number)`.
3. **`matches`**: `id UUID`, `format match_format`, `team_a_id UUID REFERENCES teams(id)`, `team_b_id UUID REFERENCES teams(id)`, `match_date TIMESTAMPTZ`, `venue TEXT`, `toss_winner_id UUID REFERENCES teams(id)`, `toss_decision toss_decision`, `status match_status`, `result_type match_result_type`, `result_description TEXT`, `winner_id UUID REFERENCES teams(id)`, `current_innings_number INT DEFAULT 1`, `follow_on_enforced BOOLEAN DEFAULT false`, `current_day INT DEFAULT 1`, `current_session INT DEFAULT 1`, `day_overs INT DEFAULT 0`, `session_overs INT DEFAULT 0`, timestamps.
4. **`match_players`**: `id UUID`, `match_id UUID REFERENCES matches(id) ON DELETE CASCADE`, `player_id UUID REFERENCES players(id) ON DELETE CASCADE`, `team_id UUID REFERENCES teams(id)`, `is_playing_xi BOOLEAN DEFAULT true`. Unique `(match_id, player_id)`.
5. **`innings`**: `id UUID`, `match_id UUID REFERENCES matches(id) ON DELETE CASCADE`, `innings_number INT`, `batting_team_id UUID REFERENCES teams(id)`, `bowling_team_id UUID REFERENCES teams(id)`, `total_runs INT DEFAULT 0`, `wickets INT DEFAULT 0`, `legal_balls INT DEFAULT 0`, `overs_completed_text TEXT DEFAULT '0.0'`, `status innings_status DEFAULT 'IN_PROGRESS'`, `target_runs INT`, `is_declared BOOLEAN DEFAULT false`, `byes INT DEFAULT 0`, `leg_byes INT DEFAULT 0`, `wides INT DEFAULT 0`, `no_balls INT DEFAULT 0`, `penalty_runs INT DEFAULT 0`, `current_striker_id UUID REFERENCES players(id)`, `current_non_striker_id UUID REFERENCES players(id)`, `current_bowler_id UUID REFERENCES players(id)`, `last_bowler_id UUID REFERENCES players(id)`, timestamps. Unique `(match_id, innings_number)`.
6. **`deliveries`**: Structured delivery ledger. `id UUID`, `innings_id UUID REFERENCES innings(id) ON DELETE CASCADE`, `over_number INT`, `ball_number INT`, `striker_id UUID REFERENCES players(id)`, `non_striker_id UUID REFERENCES players(id)`, `bowler_id UUID REFERENCES players(id)`, `batter_runs INT DEFAULT 0`, `extra_runs INT DEFAULT 0`, `extra_type extra_type DEFAULT 'NONE'`, `total_runs INT DEFAULT 0`, `is_legal_delivery BOOLEAN DEFAULT true`, `is_wicket BOOLEAN DEFAULT false`, `dismissal_type dismissal_type`, `dismissed_player_id UUID REFERENCES players(id)`, `fielder_id UUID REFERENCES players(id)`, `bowler_credited BOOLEAN DEFAULT false`, `runs_completed_before_dismissal INT DEFAULT 0`, `strike_rotated BOOLEAN DEFAULT false`, `incoming_batter_id UUID REFERENCES players(id)`, `prev_striker_id UUID`, `prev_non_striker_id UUID`, `prev_bowler_id UUID`, `created_at TIMESTAMPTZ`.
7. **`wickets`**: `id UUID`, `innings_id UUID REFERENCES innings(id) ON DELETE CASCADE`, `delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL`, `player_id UUID REFERENCES players(id)`, `dismissal_type dismissal_type`, `bowler_credited BOOLEAN DEFAULT true`, `bowler_id UUID REFERENCES players(id)`, `fielder_id UUID REFERENCES players(id)`, `over_ball_text TEXT`, `team_runs_at_fall INT`, `wicket_number INT`, `created_at TIMESTAMPTZ`.
8. **`batting_scorecards`**: `id UUID`, `innings_id UUID REFERENCES innings(id) ON DELETE CASCADE`, `player_id UUID REFERENCES players(id)`, `batting_order INT DEFAULT 0`, `runs INT DEFAULT 0`, `balls INT DEFAULT 0`, `fours INT DEFAULT 0`, `sixes INT DEFAULT 0`, `strike_rate NUMERIC(5,2) DEFAULT 0.00`, `not_out BOOLEAN DEFAULT true`, `dismissal_type dismissal_type`, `dismissal_text TEXT`, `bowler_id UUID REFERENCES players(id)`, `fielder_id UUID REFERENCES players(id)`, timestamps. Unique `(innings_id, player_id)`.
9. **`bowling_scorecards`**: `id UUID`, `innings_id UUID REFERENCES innings(id) ON DELETE CASCADE`, `player_id UUID REFERENCES players(id)`, `bowling_order INT DEFAULT 0`, `legal_balls INT DEFAULT 0`, `overs_text TEXT DEFAULT '0.0'`, `maidens INT DEFAULT 0`, `runs_conceded INT DEFAULT 0`, `wickets INT DEFAULT 0`, `economy NUMERIC(5,2) DEFAULT 0.00`, `wides INT DEFAULT 0`, `no_balls INT DEFAULT 0`, timestamps. Unique `(innings_id, player_id)`.
10. **`match_sessions`**: `id UUID`, `match_id UUID REFERENCES matches(id) ON DELETE CASCADE`, `day_number INT`, `session_number INT`, `overs_bowled INT DEFAULT 0`, `runs_scored INT DEFAULT 0`, `wickets_fallen INT DEFAULT 0`, `status TEXT DEFAULT 'COMPLETED'`, `created_at TIMESTAMPTZ`.
11. **`partnerships`**: `id UUID`, `innings_id UUID REFERENCES innings(id) ON DELETE CASCADE`, `wicket_number INT`, `batter_one_id UUID REFERENCES players(id)`, `batter_two_id UUID REFERENCES players(id)`, `runs INT DEFAULT 0`, `balls INT DEFAULT 0`.
12. **`gully_matches`**: `id UUID`, `registered_team_id UUID REFERENCES teams(id) ON DELETE CASCADE`, `match_type gully_match_type`, `match_date TIMESTAMPTZ DEFAULT NOW()`, `venue TEXT`, `status match_status DEFAULT 'UPCOMING'`, `total_overs INT DEFAULT 2`, `players_per_team INT`, `bowling_allocation_rule bowling_allocation_rule DEFAULT 'MAX_LIMIT'`, `singles_dismissal_rule singles_dismissal_rule`, `bowler_order_rule bowler_order_rule`, `selected_batter_id UUID REFERENCES players(id)`, `draft_shuffled BOOLEAN DEFAULT false`, `toss_winner_team_id UUID`, `toss_decision toss_decision`, `current_innings_number INT DEFAULT 1`, `current_round_number INT DEFAULT 1`, `singles_batting_order TEXT`, `result_type match_result_type`, `result_description TEXT`, `winner_name TEXT`, timestamps.
13. **`gully_temporary_teams`**: `id UUID`, `gully_match_id UUID REFERENCES gully_matches(id) ON DELETE CASCADE`, `team_name TEXT`, `is_team_a BOOLEAN DEFAULT true`, `captain_player_id UUID REFERENCES players(id)`, `created_at TIMESTAMPTZ`.
14. **`gully_match_players`**: `id UUID`, `gully_match_id UUID REFERENCES gully_matches(id) ON DELETE CASCADE`, `player_id UUID REFERENCES players(id) ON DELETE CASCADE`, `temporary_team_id UUID REFERENCES gully_temporary_teams(id) ON DELETE SET NULL`, `is_batter BOOLEAN DEFAULT false`, `is_bowler BOOLEAN DEFAULT true`, `allocated_overs INT DEFAULT 1`, `bowling_order INT`, `batting_order INT`, `is_playing BOOLEAN DEFAULT true`. Unique `(gully_match_id, player_id)`.
15. **`gully_innings`**: `id UUID`, `gully_match_id UUID REFERENCES gully_matches(id) ON DELETE CASCADE`, `innings_number INT`, `round_number INT DEFAULT 1`, `batter_id UUID REFERENCES players(id)`, `batting_team_name TEXT`, `bowling_team_name TEXT`, `batting_temp_team_id UUID REFERENCES gully_temporary_teams(id)`, `bowling_temp_team_id UUID REFERENCES gully_temporary_teams(id)`, `total_runs INT DEFAULT 0`, `wickets INT DEFAULT 0`, `legal_balls INT DEFAULT 0`, `overs_completed_text TEXT DEFAULT '0.0'`, `status innings_status DEFAULT 'IN_PROGRESS'`, `target_runs INT`, `byes INT DEFAULT 0`, `leg_byes INT DEFAULT 0`, `wides INT DEFAULT 0`, `no_balls INT DEFAULT 0`, `penalty_runs INT DEFAULT 0`, `current_striker_id UUID REFERENCES players(id)`, `current_non_striker_id UUID REFERENCES players(id)`, `current_bowler_id UUID REFERENCES players(id)`, `last_bowler_id UUID REFERENCES players(id)`, timestamps. Unique `(gully_match_id, innings_number)`.
16. **`gully_deliveries`**: Delivery ledger for Gully Cricket. Similar schema to `deliveries` referencing `gully_innings(id)`.
17. **`gully_wickets`**: Wicket ledger for Gully Cricket referencing `gully_innings(id)`.
18. **`gully_batting_scorecards`**: Batting scorecards for Gully Cricket referencing `gully_innings(id)`.
19. **`gully_bowling_scorecards`**: Bowling scorecards for Gully Cricket referencing `gully_innings(id)`.

---

## 4. Authentication & Authorization Architecture

### 4.1 Authentication Flow
- User signup creates an identity in `auth.users`.
- A trigger on `auth.users` automatically inserts a matching row into `public.teams` (`id = auth.users.id`).
- User role (`ADMIN` or `TEAM`) is stored securely in `auth.users.raw_app_meta_data->>'role'` (which normal users cannot modify) as well as `public.teams.role`.
- Login uses `supabase.auth.signInWithPassword({ email, password })`. For username login, a Postgres RPC resolves the username to an email address.
- Session tokens are managed by Supabase Auth with automatic refresh and persistent local storage.

### 4.2 Row Level Security (RLS) Matrix
- **Helper Functions**:
  - `public.is_admin()`: Returns `true` if `(auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'`.
  - `public.current_team_id()`: Returns `auth.uid()`.
- **Policies**:
  - **`teams`**:
    - SELECT: `true` (all authenticated users can view active team profiles and names).
    - UPDATE: `public.is_admin() OR id = auth.uid()` (users can update their own details, but cannot change `role` or `is_active` unless admin).
  - **`players`**:
    - SELECT: `true` (all authenticated users can view player rosters).
    - INSERT / UPDATE / DELETE: `team_id = auth.uid() OR public.is_admin()`.
  - **`matches`**:
    - SELECT: `true`.
    - INSERT / UPDATE / DELETE: `public.is_admin()`.
  - **`gully_matches` & all Gully Child Tables**:
    - ALL operations: `registered_team_id = auth.uid()` (strictly isolated to the owning team).

---

## 5. Authoritative Business Logic (PostgreSQL Functions / RPCs)

All multi-step, state-altering scoring operations are implemented as atomic PostgreSQL stored procedures with transaction boundaries:

1. `rpc_score_delivery(p_match_id UUID, p_dto JSONB)`:
   - Validates match status, innings status, bowler restrictions.
   - Computes delivery runs, extra runs, bowler runs conceded.
   - Accurately processes Byes and Leg Byes (0–6 runs, 0 to batter, 0 to bowler, legal ball, strike rotation on odd runs).
   - Updates `batting_scorecards` and `bowling_scorecards` atomically.
   - Detects maiden overs, completed overs, ends rotation.
   - Handles dismissals, incoming batters, partnerships, innings completion, and match victory/draw/tie determinations.
2. `rpc_undo_last_delivery(p_match_id UUID)`:
   - Retrieves the most recent delivery from `deliveries`.
   - Reverses all scorecard aggregations, maiden overs, extras, and wickets.
   - Restores the exact striker, non-striker, and bowler snapshot using `prev_striker_id`, `prev_non_striker_id`, `prev_bowler_id`.
   - Deletes the delivery record and any associated wicket record.
3. `rpc_gully_score_delivery(p_match_id UUID, p_dto JSONB)`:
   - Gully Cricket specific rules (Team Match vs. Singles Match).
   - In Singles mode: single batter at crease, no strike rotation even on odd runs, over completion keeps batter at crease, bowling rotation follows configured rule.
   - Supports 0–6 runs on Byes and Leg Byes.
4. `rpc_gully_undo_last_delivery(p_match_id UUID)`:
   - Atomic rollback for Gully deliveries.
5. `rpc_gully_draft(p_player_ids UUID[])`:
   - Cryptographically random server-side shuffle (Fisher-Yates) for fair Gully Draft card reveal.
6. `rpc_conduct_toss`, `rpc_select_opening_players`, `rpc_setup_playing_xi`, `rpc_advance_session`, `rpc_advance_day`, `rpc_handle_follow_on`, `rpc_declare_innings`.

---

## 6. Realtime Architecture

- Replaces Socket.IO (`join:match`, `match:updated`).
- Utilizes Supabase Realtime Postgres Changes:
  - Subscribes to table updates (`matches`, `innings`, `batting_scorecards`, `bowling_scorecards`) filtered by `match_id=eq.{id}`.
  - Broadcasts immediate optimistic updates across client tabs.
  - RLS policies automatically filter Gully Realtime channels so Team A cannot listen to Team B's private matches.

---

## 7. Migration Execution Phases

1. **PHASE 1: Inspection [COMPLETED]**: Full inventory of frontend, backend, scoring algorithms, and database models.
2. **PHASE 2: Migration Plan [COMPLETED]**: Documentation and approval of architectural roadmap.
3. **PHASE 3: Supabase Project Setup [COMPLETED]**: Connected to Supabase account, created project `cricket-scorer` (`jiqaodflicbjnmviocjx`) in Mumbai region (`ap-south-1`), configured publishable keys.
4. **PHASE 4: PostgreSQL Schema & Migrations [COMPLETED]**: 13 custom enums, 19 tables, indexes, and foreign keys created via Supabase migrations.
5. **PHASE 5: Data Migration [COMPLETED]**: Seeded Admin (`admin@cricket.com`), Mumbai Titans (`mumbai@cricket.com`), Chennai Super Kings (`chennai@cricket.com`), and 30 active players linked to `auth.users`. Original MySQL database preserved untouched.
6. **PHASE 6: Supabase Auth & RLS [COMPLETED]**: Implemented `handle_new_user()` trigger, `is_admin()`, `current_team_id()`, and strict Row Level Security policies across all 19 tables.
7. **PHASE 7: Backend Logic Migration [COMPLETED]**: Deployed PostgreSQL RPC functions for scoring (`rpc_score_delivery`, `rpc_gully_score_delivery`), undo (`rpc_undo_last_delivery`, `rpc_gully_undo_last_delivery`), match setup, toss, bowler changes, session/day management, follow-on, declaration, and Gully draft.
8. **PHASE 8: Security Audit [COMPLETED]**: Verified multi-tenant cross-team isolation: Team B receives 0 rows and cannot read, modify, or delete Team A's Gully matches or players. Non-admins cannot access Admin RPCs.
9. **PHASE 9: Realtime Implementation [COMPLETED]**: Replaced Socket.IO client with Supabase Realtime broadcast and channel subscription system (`frontend/src/services/socket.ts`).
10. **PHASE 10: Frontend Refactoring [COMPLETED]**: Refactored `AuthContext`, `api.ts`, and `pdfExport.ts` (client-side jsPDF). Updated `GullyLiveScoring.tsx` Bye/Leg-Bye run selector to 0–6 runs.
11. **PHASE 11: End-to-End Verification [COMPLETED]**: Verified all test cases via automated integration tests: Auth, Admin dashboard, Team match creation, Gully singles draft, Bye/Leg-Bye engine (0-6 runs), Strike rotation, and Undo rollbacks.
12. **PHASE 12: Deprecate Legacy Backend [COMPLETED]**: Application operates 100% serverless on Supabase with zero local Express or MySQL dependency.
13. **PHASE 13: Production Readiness [COMPLETED]**: Frontend builds cleanly (`npm run build` exits 0), Git repository maintained, secrets gitignored.
