-- =============================================================================
-- CRICKET SCORER: SEED INITIAL TEAMS, SQUADS, AND ADMINISTRATOR
-- Migration: 20261115000005_seed_data.sql
-- =============================================================================

-- Seed Admin
INSERT INTO public.teams (id, team_name, username, email, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Cricket Administrator',
    'admin',
    'admin@cricket.com',
    'ADMIN',
    true
) ON CONFLICT (username) DO UPDATE
SET role = 'ADMIN', is_active = true;

-- Seed Mumbai Titans
INSERT INTO public.teams (id, team_name, username, email, role, is_active)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Mumbai Titans',
    'mumbai_titans',
    'mumbai@cricket.com',
    'TEAM',
    true
) ON CONFLICT (username) DO NOTHING;

-- Mumbai Titans Players
INSERT INTO public.players (team_id, player_name, jersey_number, role)
SELECT '11111111-1111-1111-1111-111111111111', p.name, p.jersey, p.role::player_role
FROM (VALUES
    ('Rohit Sharma', 45, 'BATTER'),
    ('Ishan Kishan', 32, 'WICKETKEEPER'),
    ('Suryakumar Yadav', 63, 'BATTER'),
    ('Tilak Varma', 9, 'BATTER'),
    ('Hardik Pandya', 33, 'ALL_ROUNDER'),
    ('Tim David', 8, 'ALL_ROUNDER'),
    ('Jasprit Bumrah', 93, 'BOWLER'),
    ('Piyush Chawla', 11, 'BOWLER'),
    ('Gerald Coetzee', 62, 'BOWLER'),
    ('Nuwan Thushara', 99, 'BOWLER'),
    ('Nehal Wadhera', 22, 'BATTER'),
    ('Mohammad Nabi', 7, 'ALL_ROUNDER'),
    ('Luke Wood', 14, 'BOWLER'),
    ('Akash Madhwal', 88, 'BOWLER'),
    ('Vishnu Vinod', 12, 'WICKETKEEPER')
) AS p(name, jersey, role)
ON CONFLICT (team_id, jersey_number) DO NOTHING;

-- Seed Chennai Super Kings
INSERT INTO public.teams (id, team_name, username, email, role, is_active)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Chennai Super Kings',
    'chennai_kings',
    'chennai@cricket.com',
    'TEAM',
    true
) ON CONFLICT (username) DO NOTHING;

-- Chennai Super Kings Players
INSERT INTO public.players (team_id, player_name, jersey_number, role)
SELECT '22222222-2222-2222-2222-222222222222', p.name, p.jersey, p.role::player_role
FROM (VALUES
    ('Ruturaj Gaikwad', 31, 'BATTER'),
    ('Devon Conway', 88, 'BATTER'),
    ('Ajinkya Rahane', 21, 'BATTER'),
    ('Daryl Mitchell', 75, 'ALL_ROUNDER'),
    ('Shivam Dube', 25, 'ALL_ROUNDER'),
    ('Ravindra Jadeja', 8, 'ALL_ROUNDER'),
    ('MS Dhoni', 7, 'WICKETKEEPER'),
    ('Deepak Chahar', 90, 'BOWLER'),
    ('Shardul Thakur', 54, 'ALL_ROUNDER'),
    ('Tushar Deshpande', 24, 'BOWLER'),
    ('Matheesha Pathirana', 81, 'BOWLER'),
    ('Moeen Ali', 18, 'ALL_ROUNDER'),
    ('Mustafizur Rahman', 91, 'BOWLER'),
    ('Sameer Rizvi', 1, 'BATTER'),
    ('Mukesh Choudhary', 19, 'BOWLER')
) AS p(name, jersey, role)
ON CONFLICT (team_id, jersey_number) DO NOTHING;
