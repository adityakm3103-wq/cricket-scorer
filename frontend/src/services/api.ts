import { supabase } from '../lib/supabase.js';
import {
  MatchFormat,
  MatchStatus,
  PlayerRole,
  TossDecision,
  ExtraType,
  DismissalType,
  Player,
  MatchDetails,
} from '../types/index.js';
import {
  ballsToOversText,
  calculateBattingAverage,
  calculateBowlingAverage,
  calculateEconomyRate,
  calculateStrikeRate,
} from '../utils/cricket.js';

// Helper: Wrap data in { data: T } structure expected by TanStack Query callers
function wrapResponse<T>(data: T): { data: T } {
  return { data };
}

// Helper: Standardized error formatting
function throwApiError(err: any): never {
  const message =
    err?.message ||
    (typeof err === 'string' ? err : 'An unexpected database error occurred');
  const errorObj: any = new Error(message);
  errorObj.response = { data: { message } };
  throw errorObj;
}

// Helper: Get authenticated team record with resilient fallbacks
export async function getCurrentTeam() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .or(`auth_user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email || ''}`)
        .maybeSingle();

      if (team) {
        if (!team.auth_user_id) {
          await supabase.from('teams').update({ auth_user_id: user.id }).eq('id', team.id);
        }
        return team;
      }

      // If user exists in Auth but not in teams table yet, provision automatically
      const teamName =
        user.user_metadata?.teamName ||
        user.user_metadata?.team_name ||
        user.email?.split('@')[0] ||
        'Team';
      const username =
        user.user_metadata?.username ||
        user.email?.split('@')[0] ||
        `team_${user.id.slice(0, 6)}`;
      const role = (user.user_metadata?.role as any) || 'TEAM';

      const { data: newTeam } = await supabase
        .from('teams')
        .insert({
          auth_user_id: user.id,
          team_name: teamName,
          username: username,
          email: user.email || '',
          role: role,
          is_active: true,
        })
        .select()
        .maybeSingle();

      if (newTeam) return newTeam;
    }
  } catch (err) {
    console.warn('getCurrentTeam auth.getUser failed, checking fallbacks:', err);
  }

  // Fallback 1: check getSession
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .or(
          `auth_user_id.eq.${session.user.id},id.eq.${session.user.id},email.eq.${
            session.user.email || ''
          }`
        )
        .maybeSingle();
      if (team) return team;
    }
  } catch {
    // ignore
  }

  // Fallback 2: check localStorage
  const savedTeamStr = localStorage.getItem('cricket_team');
  if (savedTeamStr) {
    try {
      const saved = JSON.parse(savedTeamStr);
      if (saved?.id) {
        const { data: team } = await supabase
          .from('teams')
          .select('*')
          .or(`id.eq.${saved.id},email.eq.${saved.email || ''}`)
          .maybeSingle();
        if (team) return team;

        return {
          id: saved.id,
          team_name: saved.teamName || saved.team_name,
          username: saved.username,
          email: saved.email,
          role: saved.role || 'TEAM',
          is_active: saved.isActive ?? true,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// ============================================================================
// AUTH API
// ============================================================================
export const authApi = {
  register: async (data: {
    teamName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<{ data: any }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanTeamName = data.teamName.trim();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: data.password,
      options: {
        data: {
          teamName: cleanTeamName,
          username: cleanUsername,
          role: 'TEAM',
        },
      },
    });

    if (signUpError) throwApiError(signUpError);

    // Auto-confirm email immediately in Supabase so users never need email verification
    try {
      await (supabase.rpc as any)('rpc_auto_confirm_user', { p_email: cleanEmail });
    } catch {
      // ignore
    }

    // Ensure session is signed in
    let token = authData.session?.access_token || '';
    let currentAuthUser = authData.user;

    if (!token) {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: data.password,
        });

      if (signInError && signInError.message?.toLowerCase().includes('confirm')) {
        await (supabase.rpc as any)('rpc_auto_confirm_user', { p_email: cleanEmail });
        const { data: retrySignIn } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: data.password,
        });
        token = retrySignIn?.session?.access_token || '';
        if (retrySignIn?.user) currentAuthUser = retrySignIn.user;
      } else if (signInData?.session) {
        token = signInData.session.access_token;
        if (signInData.user) currentAuthUser = signInData.user;
      }
    }

    const authUserId = currentAuthUser?.id || authData.user?.id || '';

    // Retrieve or provision team record
    let { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .or(`auth_user_id.eq.${authUserId},email.eq.${cleanEmail}`)
      .maybeSingle();

    if (!teamData && authUserId) {
      const { data: createdTeam } = await supabase
        .from('teams')
        .insert({
          auth_user_id: authUserId,
          team_name: cleanTeamName,
          username: cleanUsername,
          email: cleanEmail,
          role: 'TEAM',
          is_active: true,
        })
        .select()
        .maybeSingle();
      teamData = createdTeam;
    }

    const teamPayload = {
      id: teamData?.id || authUserId,
      teamName: teamData?.team_name || cleanTeamName,
      username: teamData?.username || cleanUsername,
      email: cleanEmail,
      role: 'TEAM',
      isActive: true,
    };

    return wrapResponse({
      message: 'Registration successful',
      token,
      team: teamPayload,
      user: teamPayload,
    });
  },

  login: async (data: {
    usernameOrEmail: string;
    password: string;
  }): Promise<{ data: any }> => {
    let email = data.usernameOrEmail?.trim();
    if (!email) throwApiError('Username or email is required');

    // If username supplied without @, lookup email via RPC
    if (!email.includes('@')) {
      const { data: lookedUpEmail, error: lookupErr } = await (
        supabase.rpc as any
      )('rpc_lookup_email_by_username', { p_username: email.toLowerCase() });
      if (lookupErr || !lookedUpEmail) {
        throwApiError('Invalid username or password');
      }
      email = lookedUpEmail as string;
    }

    let { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: data.password,
      });

    // If blocked by unconfirmed email, auto-confirm and retry immediately
    if (signInError && signInError.message?.toLowerCase().includes('confirm')) {
      try {
        await (supabase.rpc as any)('rpc_auto_confirm_user', {
          p_email: email.toLowerCase(),
        });
        const retryResult = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password: data.password,
        });
        authData = retryResult.data;
        signInError = retryResult.error;
      } catch {
        // preserve original error
      }
    }

    if (signInError || !authData?.user) {
      throwApiError(signInError || 'Invalid credentials');
    }

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .or(
        `auth_user_id.eq.${authData.user.id},id.eq.${authData.user.id},email.eq.${email.toLowerCase()}`
      )
      .maybeSingle();

    const teamPayload = {
      id: teamData?.id || authData.user.id,
      role: teamData?.role || authData.user.user_metadata?.role || 'TEAM',
      teamName:
        teamData?.team_name || authData.user.user_metadata?.teamName || '',
      username:
        teamData?.username || authData.user.user_metadata?.username || '',
      email: teamData?.email || authData.user.email || email,
      isActive: teamData?.is_active ?? true,
    };

    return wrapResponse({
      token: authData.session?.access_token || '',
      team: teamPayload,
      user: teamPayload,
    });
  },

  getMe: async (): Promise<{ data: any }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return wrapResponse({ user: null });

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email || ''}`)
      .maybeSingle();

    if (!teamData) {
      const placeholderTeam = {
        id: user.id,
        role: user.user_metadata?.role || 'TEAM',
        teamName: user.user_metadata?.teamName || '',
        username: user.user_metadata?.username || '',
        email: user.email || '',
        isActive: true,
      };
      return wrapResponse({
        user: placeholderTeam,
        team: placeholderTeam,
        totalPlayers: 0,
        totalMatches: 0,
        won: 0,
        lost: 0,
        tied: 0,
        drawn: 0,
        recentMatches: [],
      });
    }

    const team = {
      id: teamData.id,
      teamName: teamData.team_name,
      username: teamData.username,
      email: teamData.email,
      role: teamData.role,
      isActive: teamData.is_active,
    };

    // Calculate team dashboard metrics
    const { count: totalPlayers } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamData.id);

    const { data: matches } = await supabase
      .from('matches')
      .select(`
        id, format, status, match_date, result_description, result_type, winner_id, team_a_id, team_b_id,
        teamA:teams!matches_team_a_id_fkey(id, team_name),
        teamB:teams!matches_team_b_id_fkey(id, team_name),
        innings(innings_number, batting_team_id, total_runs, wickets, overs_completed_text)
      `)
      .or(`team_a_id.eq.${teamData.id},team_b_id.eq.${teamData.id}`)
      .order('match_date', { ascending: false });

    const matchItems = matches || [];
    const completedMatches = matchItems.filter(m => m.status === 'COMPLETED');
    const totalMatches = completedMatches.length;

    let won = 0;
    let lost = 0;
    let tied = 0;
    let drawn = 0;

    completedMatches.forEach((m: any) => {
      if (m.result_type === 'TIE') tied++;
      else if (m.result_type === 'DRAW') drawn++;
      else if (m.winner_id === teamData.id) won++;
      else if (m.winner_id && m.winner_id !== teamData.id) lost++;
    });

    const recentMatches = matchItems.slice(0, 5).map((m: any) => {
      const isHome = m.team_a_id === teamData.id;
      const opponent = isHome ? m.teamB : m.teamA;
      return {
        id: m.id,
        format: m.format,
        opponentName: opponent?.team_name || 'Opponent',
        matchDate: m.match_date,
        status: m.status,
        resultDescription: m.result_description,
        innings: (m.innings || [])
          .sort((a: any, b: any) => a.innings_number - b.innings_number)
          .map((i: any) => ({
            inningsNumber: i.innings_number,
            battingTeamId: i.batting_team_id,
            totalRuns: i.total_runs,
            wickets: i.wickets,
            oversCompletedText: i.overs_completed_text,
          })),
      };
    });

    return wrapResponse({
      user: team,
      team,
      totalPlayers: totalPlayers || 0,
      totalMatches,
      won,
      lost,
      tied,
      drawn,
      recentMatches,
    });
  },

  getOpponents: async (): Promise<{
    data: Array<{ id: string; teamName: string; username: string }>;
  }> => {
    const currentTeam = await getCurrentTeam();
    let query = supabase
      .from('teams')
      .select('id, team_name, username')
      .eq('role', 'TEAM')
      .eq('is_active', true);

    if (currentTeam?.id) {
      query = query.neq('id', currentTeam.id);
    }

    const { data, error } = await query.order('team_name');
    if (error) throwApiError(error);

    return wrapResponse(
      (data || []).map(t => ({
        id: t.id,
        teamName: t.team_name,
        username: t.username,
      }))
    );
  },
};

// ============================================================================
// ADMIN API
// ============================================================================
export const adminApi = {
  getDashboard: async (): Promise<{ data: any }> => {
    const { data, error } = await (supabase.rpc as any)('rpc_admin_dashboard');
    if (error) throwApiError(error);
    return wrapResponse(data);
  },

  getAllTeams: async (): Promise<{ data: any[] }> => {
    const { data, error } = await (supabase.rpc as any)('rpc_admin_get_all_teams');
    if (error) throwApiError(error);
    return wrapResponse((data as any[]) || []);
  },

  getTeamDetails: async (id: string): Promise<{ data: any }> => {
    const { data: team, error } = await supabase
      .from('teams')
      .select('*, players(*)')
      .eq('id', id)
      .single();

    if (error) throwApiError(error);

    return wrapResponse({
      id: team.id,
      teamName: team.team_name,
      username: team.username,
      email: team.email,
      role: team.role,
      isActive: team.is_active,
      createdAt: team.created_at,
      players: (team.players || []).map((p: any) => ({
        id: p.id,
        playerName: p.player_name,
        jerseyNumber: p.jersey_number,
        role: p.role,
        teamId: p.team_id,
        createdAt: p.created_at,
      })),
    });
  },

  updateTeamStatus: async (
    id: string,
    isActive: boolean
  ): Promise<{ data: any }> => {
    const { data, error } = await supabase
      .from('teams')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throwApiError(error);
    return wrapResponse(data);
  },

  getAllMatches: async (params?: {
    format?: MatchFormat;
    status?: MatchStatus;
  }): Promise<{ data: any[] }> => {
    let query = supabase.from('matches').select(`
      id, format, status, match_date, venue, result_type, result_description, winner_id,
      teamA:teams!matches_team_a_id_fkey(id, team_name),
      teamB:teams!matches_team_b_id_fkey(id, team_name),
      innings(innings_number, total_runs, wickets, overs_completed_text)
    `);

    if (params?.format) query = query.eq('format', params.format);
    if (params?.status) query = query.eq('status', params.status);

    const { data, error } = await query.order('match_date', {
      ascending: false,
    });
    if (error) throwApiError(error);

    return wrapResponse(
      (data || []).map((m: any) => ({
        id: m.id,
        format: m.format,
        status: m.status,
        matchDate: m.match_date,
        venue: m.venue,
        resultType: m.result_type,
        resultDescription: m.result_description,
        winnerId: m.winner_id,
        teamA: { id: m.teamA?.id, teamName: m.teamA?.team_name },
        teamB: { id: m.teamB?.id, teamName: m.teamB?.team_name },
        innings: (m.innings || [])
          .sort((a: any, b: any) => a.innings_number - b.innings_number)
          .map((i: any) => ({
            inningsNumber: i.innings_number,
            totalRuns: i.total_runs,
            wickets: i.wickets,
            oversCompletedText: i.overs_completed_text,
          })),
      }))
    );
  },

  updateMatch: async (
    id: string,
    data: { venue?: string; matchDate?: string }
  ): Promise<{ data: any }> => {
    const updatePayload: any = {};
    if (data.venue !== undefined)
      updatePayload.venue = data.venue?.trim() || null;
    if (data.matchDate) updatePayload.match_date = data.matchDate;

    const { data: updated, error } = await supabase
      .from('matches')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throwApiError(error);
    return wrapResponse(updated);
  },

  cancelMatch: async (id: string): Promise<{ data: any }> => {
    const { data, error } = await supabase
      .from('matches')
      .update({
        status: 'ABANDONED',
        result_description: 'Match cancelled by administrator',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throwApiError(error);
    return wrapResponse({
      message: 'Match cancelled successfully',
      match: data,
    });
  },

  deleteMatch: async (id: string): Promise<{ data: any }> => {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) throwApiError(error);
    return wrapResponse({ message: 'Match deleted successfully' });
  },
};

// ============================================================================
// SQUAD API
// ============================================================================
export const squadApi = {
  getSquad: async (params?: {
    teamId?: string;
    role?: PlayerRole;
    search?: string;
  }): Promise<{ data: Player[] }> => {
    let query = supabase.from('players').select('*');

    let targetTeamId = params?.teamId;
    if (!targetTeamId) {
      const currentTeam = await getCurrentTeam();
      if (currentTeam?.id) {
        targetTeamId = currentTeam.id;
      }
    }

    if (targetTeamId) {
      query = query.eq('team_id', targetTeamId);
    }

    if (params?.role) query = query.eq('role', params.role);
    if (params?.search) query = query.ilike('player_name', `%${params.search}%`);

    const { data, error } = await query.order('jersey_number', {
      ascending: true,
    });
    if (error) throwApiError(error);

    return wrapResponse(
      (data || []).map(p => ({
        id: p.id,
        playerName: p.player_name,
        jerseyNumber: p.jersey_number,
        role: p.role as PlayerRole,
        teamId: p.team_id,
        createdAt: p.created_at,
      }))
    );
  },

  addPlayer: async (data: {
    playerName: string;
    jerseyNumber: number;
    role: PlayerRole;
    teamId?: string;
  }): Promise<{ data: Player }> => {
    let targetTeamId = data.teamId;

    if (!targetTeamId) {
      const currentTeam = await getCurrentTeam();
      if (currentTeam?.id) {
        targetTeamId = currentTeam.id;
      }
    }

    if (!targetTeamId) {
      const savedTeamStr = localStorage.getItem('cricket_team');
      if (savedTeamStr) {
        try {
          const saved = JSON.parse(savedTeamStr);
          targetTeamId = saved?.id;
        } catch {}
      }
    }

    if (!targetTeamId) {
      throwApiError('Authenticated team not found. Please log in again to manage squad.');
    }

    // Attempt using secure database RPC function
    try {
      const { data: rpcPlayer, error: rpcError } = await (supabase.rpc as any)(
        'rpc_add_team_player',
        {
          p_team_id: targetTeamId,
          p_player_name: data.playerName.trim(),
          p_jersey_number: data.jerseyNumber,
          p_role: data.role,
        }
      );

      if (!rpcError && rpcPlayer) {
        return wrapResponse({
          id: rpcPlayer.id,
          playerName: rpcPlayer.player_name,
          jerseyNumber: rpcPlayer.jersey_number,
          role: rpcPlayer.role as PlayerRole,
          teamId: rpcPlayer.team_id,
          createdAt: rpcPlayer.created_at,
        });
      }
    } catch {
      // Fallback to direct table insert
    }

    // Direct table insert fallback
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        team_id: targetTeamId,
        player_name: data.playerName.trim(),
        jersey_number: data.jerseyNumber,
        role: data.role,
      })
      .select()
      .single();

    if (error) throwApiError(error);

    return wrapResponse({
      id: player.id,
      playerName: player.player_name,
      jerseyNumber: player.jersey_number,
      role: player.role as PlayerRole,
      teamId: player.team_id,
      createdAt: player.created_at,
    });
  },

  updatePlayer: async (
    id: string,
    data: { playerName: string; jerseyNumber: number; role: PlayerRole }
  ): Promise<{ data: Player }> => {
    // Attempt using secure RPC function
    try {
      const { data: rpcPlayer, error: rpcError } = await (supabase.rpc as any)(
        'rpc_update_team_player',
        {
          p_player_id: id,
          p_player_name: data.playerName.trim(),
          p_jersey_number: data.jerseyNumber,
          p_role: data.role,
        }
      );

      if (!rpcError && rpcPlayer) {
        return wrapResponse({
          id: rpcPlayer.id,
          playerName: rpcPlayer.player_name,
          jerseyNumber: rpcPlayer.jersey_number,
          role: rpcPlayer.role as PlayerRole,
          teamId: rpcPlayer.team_id,
          createdAt: rpcPlayer.created_at,
        });
      }
    } catch {
      // Fallback to direct update
    }

    const { data: player, error } = await supabase
      .from('players')
      .update({
        player_name: data.playerName.trim(),
        jersey_number: data.jerseyNumber,
        role: data.role,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throwApiError(error);

    return wrapResponse({
      id: player.id,
      playerName: player.player_name,
      jerseyNumber: player.jersey_number,
      role: player.role as PlayerRole,
      teamId: player.team_id,
      createdAt: player.created_at,
    });
  },

  deletePlayer: async (id: string): Promise<{ data: any }> => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throwApiError(error);
    return wrapResponse({ message: 'Player deleted successfully' });
  },
};

// ============================================================================
// HELPER: Map Match from DB to Frontend CamelCase
// ============================================================================
function mapMatchFromDb(match: any): MatchDetails {
  if (!match) {
    throw new Error('Match not found');
  }

  return {
    id: match.id,
    format: match.format,
    teamAId: match.team_a_id,
    teamBId: match.team_b_id,
    matchDate: match.match_date,
    venue: match.venue,
    tossWinnerId: match.toss_winner_id,
    tossDecision: match.toss_decision,
    status: match.status,
    resultType: match.result_type,
    resultDescription: match.result_description,
    winnerId: match.winner_id,
    currentInningsNumber: match.current_innings_number,
    followOnEnforced: !!match.follow_on_enforced,
    currentDay: match.current_day,
    currentSession: match.current_session,
    dayOvers: match.day_overs,
    sessionOvers: match.session_overs,
    teamA: {
      id: match.teamA?.id || match.team_a_id,
      teamName: match.teamA?.team_name || 'Team A',
      players: (match.teamA?.players || []).map((p: any) => ({
        id: p.id,
        playerName: p.player_name,
        jerseyNumber: p.jersey_number,
        role: p.role,
      })),
    },
    teamB: {
      id: match.teamB?.id || match.team_b_id,
      teamName: match.teamB?.team_name || 'Team B',
      players: (match.teamB?.players || []).map((p: any) => ({
        id: p.id,
        playerName: p.player_name,
        jerseyNumber: p.jersey_number,
        role: p.role,
      })),
    },
    matchPlayers: (match.match_players || []).map((mp: any) => ({
      playerId: mp.player_id,
      teamId: mp.team_id,
      isPlayingXI: mp.is_playing_xi,
      player: {
        id: mp.player?.id || mp.player_id,
        playerName: mp.player?.player_name,
        jerseyNumber: mp.player?.jersey_number,
        role: mp.player?.role,
        teamId: mp.player?.team_id || mp.team_id,
      },
    })),
    innings: (match.innings || [])
      .sort((a: any, b: any) => a.innings_number - b.innings_number)
      .map((inn: any) => ({
        id: inn.id,
        inningsNumber: inn.innings_number,
        battingTeamId: inn.batting_team_id,
        bowlingTeamId: inn.bowling_team_id,
        totalRuns: inn.total_runs,
        wickets: inn.wickets,
        legalBalls: inn.legal_balls,
        oversCompletedText: inn.overs_completed_text,
        status: inn.status,
        targetRuns: inn.target_runs,
        isDeclared: !!inn.is_declared,
        byes: inn.byes || 0,
        legByes: inn.leg_byes || 0,
        wides: inn.wides || 0,
        noBalls: inn.no_balls || 0,
        penaltyRuns: inn.penalty_runs || 0,
        currentStrikerId: inn.current_striker_id,
        currentNonStrikerId: inn.current_non_striker_id,
        currentBowlerId: inn.current_bowler_id,
        lastBowlerId: inn.last_bowler_id,
        battingScorecards: (inn.batting_scorecards || [])
          .sort((a: any, b: any) => a.batting_order - b.batting_order)
          .map((b: any) => ({
            id: b.id,
            playerId: b.player_id,
            battingOrder: b.batting_order,
            runs: b.runs,
            balls: b.balls,
            fours: b.fours,
            sixes: b.sixes,
            strikeRate: b.strike_rate,
            notOut: b.not_out,
            dismissalType: b.dismissal_type,
            dismissalText: b.dismissal_text,
            bowlerId: b.bowler_id,
            fielderId: b.fielder_id,
            player: {
              id: b.player?.id || b.player_id,
              playerName: b.player?.player_name,
              jerseyNumber: b.player?.jersey_number,
              role: b.player?.role,
            },
          })),
        bowlingScorecards: (inn.bowling_scorecards || [])
          .sort((a: any, b: any) => a.bowling_order - b.bowling_order)
          .map((b: any) => ({
            id: b.id,
            playerId: b.player_id,
            bowlingOrder: b.bowling_order,
            legalBalls: b.legal_balls,
            oversText: b.overs_text,
            maidens: b.maidens,
            runsConceded: b.runs_conceded,
            wickets: b.wickets,
            economy: b.economy,
            wides: b.wides || 0,
            noBalls: b.no_balls || 0,
            player: {
              id: b.player?.id || b.player_id,
              playerName: b.player?.player_name,
              jerseyNumber: b.player?.jersey_number,
              role: b.player?.role,
            },
          })),
        wicketsList: (inn.wickets || [])
          .sort((a: any, b: any) => a.wicket_number - b.wicket_number)
          .map((w: any) => ({
            id: w.id,
            playerId: w.player_id,
            dismissalType: w.dismissal_type,
            bowlerCredited: w.bowler_credited,
            bowlerId: w.bowler_id,
            fielderId: w.fielder_id,
            overBallText: w.over_ball_text,
            teamRunsAtFall: w.team_runs_at_fall,
            wicketNumber: w.wicket_number,
            player: { id: w.player?.id, playerName: w.player?.player_name },
            bowler: w.bowler
              ? { id: w.bowler.id, playerName: w.bowler.player_name }
              : null,
            fielder: w.fielder
              ? { id: w.fielder.id, playerName: w.fielder.player_name }
              : null,
          })),
        deliveries: (inn.deliveries || []).map((d: any) => ({
          id: d.id,
          overNumber: d.over_number,
          ballNumber: d.ball_number_in_over,
          legalBallNumber: d.legal_ball_number,
          strikerId: d.striker_id,
          nonStrikerId: d.non_striker_id,
          bowlerId: d.bowler_id,
          batterRuns: d.batter_runs,
          extraRuns: d.extra_runs,
          extraType: d.extra_type,
          totalRuns: d.total_runs,
          isLegalDelivery: d.is_legal_delivery,
          isWicket: d.is_wicket,
          dismissalType: d.dismissal_type,
          dismissedPlayerId: d.dismissed_player_id,
          createdAt: d.created_at,
        })),
      })),
    sessions: (match.sessions || []).map((s: any) => ({
      id: s.id,
      dayNumber: s.day_number,
      sessionNumber: s.session_number,
      oversBowled: s.overs_bowled,
    })),
  };
}

// ============================================================================
// MATCH API
// ============================================================================
export const matchApi = {
  createMatch: async (data: {
    format: MatchFormat;
    teamAId?: string;
    teamBId?: string;
    opponentTeamId?: string;
    matchDate: string;
    venue?: string;
  }): Promise<{ data: MatchDetails }> => {
    const currentTeam = await getCurrentTeam();
    const teamAId = data.teamAId || currentTeam?.id;
    const teamBId = data.teamBId || data.opponentTeamId;

    if (!teamAId || !teamBId) {
      throwApiError('Both Team A and Team B are required');
    }
    if (teamAId === teamBId) {
      throwApiError('A team cannot play against itself');
    }

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        format: data.format,
        team_a_id: teamAId,
        team_b_id: teamBId,
        match_date: data.matchDate,
        venue: data.venue?.trim() || null,
        status: 'UPCOMING',
      })
      .select(`
        *,
        teamA:teams!matches_team_a_id_fkey(id, team_name),
        teamB:teams!matches_team_b_id_fkey(id, team_name)
      `)
      .single();

    if (error) throwApiError(error);
    return wrapResponse(mapMatchFromDb(match));
  },

  getMatch: async (id: string): Promise<{ data: MatchDetails }> => {
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        teamA:teams!matches_team_a_id_fkey(
          id, team_name, players(id, player_name, jersey_number, role)
        ),
        teamB:teams!matches_team_b_id_fkey(
          id, team_name, players(id, player_name, jersey_number, role)
        ),
        match_players(
          id, player_id, team_id, is_playing_xi,
          player:players(id, player_name, jersey_number, role, team_id)
        ),
        innings(
          id, match_id, innings_number, batting_team_id, bowling_team_id,
          total_runs, wickets, legal_balls, overs_completed_text, status,
          target_runs, is_declared, byes, leg_byes, wides, no_balls, penalty_runs,
          current_striker_id, current_non_striker_id, current_bowler_id, last_bowler_id,
          batting_scorecards(
            id, player_id, batting_order, runs, balls, fours, sixes,
            strike_rate, not_out, dismissal_type, dismissal_text, bowler_id, fielder_id,
            player:players(id, player_name, jersey_number, role)
          ),
          bowling_scorecards(
            id, player_id, bowling_order, overs, legal_balls, overs_text, maidens,
            runs_conceded, wickets, economy, wides, no_balls,
            player:players(id, player_name, jersey_number, role)
          ),
          wickets(
            id, wicket_number, player_id, bowler_id, fielder_id, dismissal_type,
            bowler_credited, team_runs_at_fall, over_ball_text,
            player:players!wickets_player_id_fkey(id, player_name),
            bowler:players!wickets_bowler_id_fkey(id, player_name),
            fielder:players!wickets_fielder_id_fkey(id, player_name)
          ),
          deliveries(
            id, over_number, ball_number_in_over, legal_ball_number,
            striker_id, non_striker_id, bowler_id, batter_runs, extra_runs,
            extra_type, total_runs, is_legal_delivery, is_wicket, dismissal_type,
            dismissed_player_id, created_at
          )
        ),
        sessions:match_sessions(id, match_id, day_number, session_number, overs_bowled)
      `)
      .eq('id', id)
      .single();

    if (error) throwApiError(error);
    return wrapResponse(mapMatchFromDb(match));
  },

  listMatches: async (params?: {
    format?: MatchFormat;
    status?: MatchStatus;
  }): Promise<{ data: any[] }> => {
    let query = supabase.from('matches').select(`
      id, format, status, match_date, venue, result_type, result_description, winner_id,
      teamA:teams!matches_team_a_id_fkey(id, team_name),
      teamB:teams!matches_team_b_id_fkey(id, team_name),
      innings(innings_number, total_runs, wickets, overs_completed_text)
    `);

    if (params?.format) query = query.eq('format', params.format);
    if (params?.status) query = query.eq('status', params.status);

    const { data, error } = await query.order('match_date', {
      ascending: false,
    });
    if (error) throwApiError(error);

    return wrapResponse(
      (data || []).map((m: any) => ({
        id: m.id,
        format: m.format,
        status: m.status,
        matchDate: m.match_date,
        venue: m.venue,
        resultType: m.result_type,
        resultDescription: m.result_description,
        winnerId: m.winner_id,
        teamA: { id: m.teamA?.id, teamName: m.teamA?.team_name },
        teamB: { id: m.teamB?.id, teamName: m.teamB?.team_name },
        innings: (m.innings || [])
          .sort((a: any, b: any) => a.innings_number - b.innings_number)
          .map((i: any) => ({
            inningsNumber: i.innings_number,
            totalRuns: i.total_runs,
            wickets: i.wickets,
            oversCompletedText: i.overs_completed_text,
          })),
      }))
    );
  },

  deleteMatch: async (id: string): Promise<{ data: any }> => {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) throwApiError(error);
    return wrapResponse({ message: 'Match deleted successfully' });
  },

  setupPlayingXI: async (
    matchId: string,
    data: { teamAPlayingXI: string[]; teamBPlayingXI: string[] }
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_setup_playing_xi',
      {
        p_match_id: matchId,
        p_team_a_playing_xi: data.teamAPlayingXI,
        p_team_b_playing_xi: data.teamBPlayingXI,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Playing XI saved successfully' });
  },

  conductToss: async (
    matchId: string,
    data: { tossWinnerId: string; tossDecision: TossDecision }
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_conduct_toss',
      {
        p_match_id: matchId,
        p_toss_winner_id: data.tossWinnerId,
        p_toss_decision: data.tossDecision,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Toss recorded successfully' });
  },

  selectOpeningPlayers: async (
    matchId: string,
    data: {
      strikerId: string;
      nonStrikerId: string;
      bowlerId: string;
      inningsNumber?: number;
    }
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_select_opening_players',
      {
        p_match_id: matchId,
        p_striker_id: data.strikerId,
        p_non_striker_id: data.nonStrikerId,
        p_bowler_id: data.bowlerId,
        p_innings_number: data.inningsNumber || 1,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Opening players set' });
  },

  scoreDelivery: async (
    matchId: string,
    data: {
      batterRuns: number;
      extraType: ExtraType;
      extraRuns?: number;
      isWicket?: boolean;
      dismissalType?: DismissalType | null;
      dismissedPlayerId?: string | null;
      fielderId?: string | null;
      incomingBatterId?: string | null;
      runsCompletedBeforeDismissal?: number;
    }
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_score_delivery',
      {
        p_match_id: matchId,
        p_dto: {
          batterRuns: data.batterRuns,
          extraType: data.extraType,
          extraRuns: data.extraRuns || 0,
          isWicket: !!data.isWicket,
          dismissalType: data.dismissalType || null,
          dismissedPlayerId: data.dismissedPlayerId || null,
          fielderId: data.fielderId || null,
          incomingBatterId: data.incomingBatterId || null,
          runsCompletedBeforeDismissal:
            data.runsCompletedBeforeDismissal || 0,
        },
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result);
  },

  changeBowler: async (
    matchId: string,
    bowlerId: string
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_change_bowler',
      {
        p_match_id: matchId,
        p_bowler_id: bowlerId,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Bowler changed' });
  },

  undoLastDelivery: async (matchId: string): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_undo_last_delivery',
      {
        p_match_id: matchId,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Delivery undone successfully' });
  },

  getTestStatus: async (matchId: string): Promise<{ data: any }> => {
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        teamA:teams!matches_team_a_id_fkey(id, team_name),
        teamB:teams!matches_team_b_id_fkey(id, team_name),
        innings(innings_number, batting_team_id, total_runs, wickets, status, target_runs)
      `)
      .eq('id', matchId)
      .single();

    if (error) throwApiError(error);
    if (match.format !== 'TEST') {
      throwApiError('Not a test match');
    }

    let teamARuns = 0;
    let teamBRuns = 0;
    (match.innings || []).forEach((inn: any) => {
      if (inn.batting_team_id === match.team_a_id) {
        teamARuns += inn.total_runs;
      } else {
        teamBRuns += inn.total_runs;
      }
    });

    const diff = teamARuns - teamBRuns;
    let leaderTeam: any = null;
    let leadRuns = 0;
    let trailRuns = 0;

    if (diff > 0) {
      leaderTeam = { id: match.teamA.id, name: match.teamA.team_name };
      leadRuns = diff;
      trailRuns = diff;
    } else if (diff < 0) {
      leaderTeam = { id: match.teamB.id, name: match.teamB.team_name };
      leadRuns = Math.abs(diff);
      trailRuns = Math.abs(diff);
    }

    let canEnforceFollowOn = false;
    if (
      match.innings?.length === 2 &&
      match.innings[1].status === 'COMPLETED'
    ) {
      const inn1 = match.innings[0];
      const inn2 = match.innings[1];
      const trail = inn1.total_runs - inn2.total_runs;
      if (trail >= 200 && !match.follow_on_enforced) {
        canEnforceFollowOn = true;
      }
    }

    let targetRuns: number | null = null;
    if (match.innings?.length === 4) {
      targetRuns = match.innings[3].target_runs;
    }

    return wrapResponse({
      matchId: match.id,
      currentDay: match.current_day,
      currentSession: match.current_session,
      dayOvers: match.day_overs,
      sessionOvers: match.session_overs,
      teamA: {
        id: match.teamA.id,
        name: match.teamA.team_name,
        cumulativeRuns: teamARuns,
      },
      teamB: {
        id: match.teamB.id,
        name: match.teamB.team_name,
        cumulativeRuns: teamBRuns,
      },
      leaderTeam,
      leadRuns,
      trailRuns,
      canEnforceFollowOn,
      followOnEnforced: match.follow_on_enforced,
      targetRuns,
    });
  },

  advanceSession: async (matchId: string): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_advance_session',
      {
        p_match_id: matchId,
      }
    );
    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Session advanced' });
  },

  advanceDay: async (matchId: string): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_advance_day',
      {
        p_match_id: matchId,
      }
    );
    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Day advanced' });
  },

  handleFollowOn: async (
    matchId: string,
    enforce: boolean
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_handle_follow_on',
      {
        p_match_id: matchId,
        p_enforce: enforce,
      }
    );
    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Follow-on handled' });
  },

  declareInnings: async (matchId: string): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_declare_innings',
      {
        p_match_id: matchId,
      }
    );
    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Innings declared' });
  },

  downloadPdfUrl: (matchId: string) => `/scorecard/${matchId}`,
};

// ============================================================================
// STATS API
// ============================================================================
export const statsApi = {
  getPlayerProfile: async (playerId: string): Promise<{ data: any }> => {
    const { data: player, error: pError } = await supabase
      .from('players')
      .select('*, team:teams!players_team_id_fkey(id, team_name)')
      .eq('id', playerId)
      .single();

    if (pError) throwApiError(pError);

    // Get batting scorecards for completed matches
    const { data: battingData } = await supabase
      .from('batting_scorecards')
      .select('*, innings!inner(match:matches!inner(id, status, match_date, format, result_description, teamA:teams!matches_team_a_id_fkey(team_name), teamB:teams!matches_team_b_id_fkey(team_name)))')
      .eq('player_id', playerId)
      .eq('innings.match.status', 'COMPLETED');

    // Get bowling scorecards for completed matches
    const { data: bowlingData } = await supabase
      .from('bowling_scorecards')
      .select('*, innings!inner(match:matches!inner(id, status, match_date, format, result_description, teamA:teams!matches_team_a_id_fkey(team_name), teamB:teams!matches_team_b_id_fkey(team_name)))')
      .eq('player_id', playerId)
      .eq('innings.match.status', 'COMPLETED');

    // Get catches and run outs
    const { data: catchesData } = await supabase
      .from('wickets')
      .select('*, innings!inner(match:matches!inner(id, status))')
      .eq('fielder_id', playerId)
      .eq('innings.match.status', 'COMPLETED');

    const batting = battingData || [];
    const bowling = bowlingData || [];
    const catchesList = catchesData || [];

    const inningsBatted = batting.length;
    const totalRuns = batting.reduce((s, b) => s + b.runs, 0);
    const totalBalls = batting.reduce((s, b) => s + b.balls, 0);
    const fours = batting.reduce((s, b) => s + b.fours, 0);
    const sixes = batting.reduce((s, b) => s + b.sixes, 0);
    const notOuts = batting.filter(b => b.not_out).length;
    const dismissals = inningsBatted - notOuts;
    const highestScoreRecord = batting.reduce(
      (max, b) => (b.runs > max.runs ? b : max),
      { runs: 0, not_out: false }
    );
    const highestScore =
      batting.length > 0
        ? `${highestScoreRecord.runs}${highestScoreRecord.not_out ? '*' : ''}`
        : '0';

    const centuries = batting.filter(b => b.runs >= 100).length;
    const halfCenturies = batting.filter(b => b.runs >= 50 && b.runs < 100).length;
    const ducks = batting.filter(b => b.runs === 0 && !b.not_out).length;
    const battingAverage = calculateBattingAverage(totalRuns, dismissals);
    const strikeRate = calculateStrikeRate(totalRuns, totalBalls);

    const bowlingInnings = bowling.length;
    const totalWickets = bowling.reduce((s, b) => s + b.wickets, 0);
    const totalLegalBalls = bowling.reduce((s, b) => s + b.legal_balls, 0);
    const totalRunsConceded = bowling.reduce((s, b) => s + b.runs_conceded, 0);
    const maidens = bowling.reduce((s, b) => s + b.maidens, 0);
    const bowlingAverage = calculateBowlingAverage(totalRunsConceded, totalWickets);
    const economyRate = calculateEconomyRate(totalRunsConceded, totalLegalBalls);
    const oversBowledText = ballsToOversText(totalLegalBalls);

    let bestBowling = '-';
    if (bowling.length > 0) {
      const sorted = [...bowling].sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return a.runs_conceded - b.runs_conceded;
      });
      if (sorted[0].wickets > 0 || sorted[0].legal_balls > 0) {
        bestBowling = `${sorted[0].wickets}/${sorted[0].runs_conceded}`;
      }
    }

    const catches = catchesList.filter(w => w.dismissal_type === 'CAUGHT').length;
    const runOuts = catchesList.filter(w => w.dismissal_type === 'RUN_OUT').length;

    // Match participation map
    const matchMap = new Map<string, any>();
    batting.forEach((b: any) => {
      const m = b.innings.match;
      if (!matchMap.has(m.id)) {
        matchMap.set(m.id, {
          matchId: m.id,
          matchDate: m.match_date,
          format: m.format,
          opponent:
            m.teamA?.team_name === player.team?.team_name
              ? m.teamB?.team_name
              : m.teamA?.team_name,
          runsScored: 0,
          ballsFaced: 0,
          wicketsTaken: 0,
          legalBallsBowled: 0,
          resultDescription: m.result_description,
        });
      }
      const item = matchMap.get(m.id);
      item.runsScored += b.runs;
      item.ballsFaced += b.balls;
    });

    bowling.forEach((b: any) => {
      const m = b.innings.match;
      if (!matchMap.has(m.id)) {
        matchMap.set(m.id, {
          matchId: m.id,
          matchDate: m.match_date,
          format: m.format,
          opponent:
            m.teamA?.team_name === player.team?.team_name
              ? m.teamB?.team_name
              : m.teamA?.team_name,
          runsScored: 0,
          ballsFaced: 0,
          wicketsTaken: 0,
          legalBallsBowled: 0,
          resultDescription: m.result_description,
        });
      }
      const item = matchMap.get(m.id);
      item.wicketsTaken += b.wickets;
      item.legalBallsBowled += b.legal_balls;
    });

    const matchHistory = Array.from(matchMap.values()).map(m => ({
      matchId: m.matchId,
      matchDate: m.matchDate,
      format: m.format,
      opponent: m.opponent,
      runsScored: m.runsScored,
      ballsFaced: m.ballsFaced,
      wicketsTaken: m.wicketsTaken,
      oversBowled: ballsToOversText(m.legalBallsBowled),
      resultDescription: m.resultDescription,
    }));

    return wrapResponse({
      player: {
        id: player.id,
        playerName: player.player_name,
        jerseyNumber: player.jersey_number,
        role: player.role,
        teamId: player.team_id,
        teamName: player.team?.team_name,
      },
      battingStats: {
        matchesPlayed: matchHistory.length,
        inningsBatted,
        totalRuns,
        highestScore,
        battingAverage,
        strikeRate,
        ballsFaced: totalBalls,
        fours,
        sixes,
        notOuts,
        centuries,
        halfCenturies,
        ducks,
      },
      bowlingStats: {
        bowlingInnings,
        totalWickets,
        oversBowled: oversBowledText,
        legalBalls: totalLegalBalls,
        runsConceded: totalRunsConceded,
        bowlingAverage,
        economyRate,
        bestBowling,
        maidens,
      },
      fieldingStats: {
        catches,
        runOuts,
      },
      matchHistory,
    });
  },

  getTeamStats: async (teamId: string): Promise<{ data: any }> => {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, innings(batting_team_id, total_runs)')
      .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
      .eq('status', 'COMPLETED');

    if (error) throwApiError(error);

    const matchItems = matches || [];
    const totalMatches = matchItems.length;
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let draws = 0;
    let totalRuns = 0;
    let highestTotal = 0;
    let lowestTotal = Infinity;

    matchItems.forEach((m: any) => {
      if (m.result_type === 'TIE') ties++;
      else if (m.result_type === 'DRAW') draws++;
      else if (m.winner_id === teamId) wins++;
      else if (m.winner_id) losses++;

      (m.innings || []).forEach((inn: any) => {
        if (inn.batting_team_id === teamId) {
          totalRuns += inn.total_runs;
          if (inn.total_runs > highestTotal) highestTotal = inn.total_runs;
          if (inn.total_runs < lowestTotal) lowestTotal = inn.total_runs;
        }
      });
    });

    const { data: bowlingCards } = await supabase
      .from('bowling_scorecards')
      .select('wickets, player:players!inner(team_id), innings!inner(match:matches!inner(status))')
      .eq('player.team_id', teamId)
      .eq('innings.match.status', 'COMPLETED');

    const totalWickets = (bowlingCards || []).reduce(
      (sum, b) => sum + (b.wickets || 0),
      0
    );

    return wrapResponse({
      totalMatches,
      wins,
      losses,
      ties,
      draws,
      highestTotal: highestTotal > 0 ? highestTotal : 0,
      lowestTotal: lowestTotal !== Infinity ? lowestTotal : 0,
      totalRunsScored: totalRuns,
      totalWicketsTaken: totalWickets,
    });
  },
};

// ============================================================================
// HELPER: Map Gully Match DB record to Frontend structure
// ============================================================================
function mapGullyMatchFromDb(match: any): any {
  if (!match) return null;

  const res: any = {
    id: match.id,
    registeredTeamId: match.registered_team_id,
    matchType: match.match_type,
    matchDate: match.match_date,
    venue: match.venue,
    status: match.status,
    totalOvers: match.total_overs,
    playersPerTeam: match.players_per_team,
    bowlingAllocationRule: match.bowling_allocation_rule,
    singlesDismissalRule: match.singles_dismissal_rule,
    bowlerOrderRule: match.bowler_order_rule,
    tossWinnerTeamId: match.toss_winner_team_id,
    tossDecision: match.toss_decision,
    resultType: match.result_type,
    resultDescription: match.result_description,
    winnerTeamId: match.winner_team_id,
    currentInningsNumber: match.current_innings_number,
    currentRoundNumber: match.current_round_number,
    singlesBattingOrder: match.singles_batting_order,
    selectedBatterId: match.selected_batter_id,
    draftShuffled: !!match.draft_shuffled,
    registeredTeam: match.registeredTeam
      ? {
          id: match.registeredTeam.id,
          teamName: match.registeredTeam.team_name,
          username: match.registeredTeam.username,
        }
      : null,
    selectedBatter: match.selectedBatter
      ? {
          id: match.selectedBatter.id,
          playerName: match.selectedBatter.player_name,
          jerseyNumber: match.selectedBatter.jersey_number,
          role: match.selectedBatter.role,
        }
      : null,
    temporaryTeams: (match.temporary_teams || []).map((t: any) => ({
      id: t.id,
      gullyMatchId: t.gully_match_id,
      teamName: t.team_name,
      isTeamA: t.is_team_a,
      captainPlayerId: t.captain_player_id,
      captain: t.captain
        ? { id: t.captain.id, playerName: t.captain.player_name }
        : null,
      players: (t.players || []).map((p: any) => ({
        playerId: p.player_id,
        temporaryTeamId: p.temporary_team_id,
        isBatter: p.is_batter,
        isBowler: p.is_bowler,
        allocatedOvers: p.allocated_overs,
        oversBowled: p.overs_bowled,
        battingOrder: p.batting_order,
        player: {
          id: p.player?.id || p.player_id,
          playerName: p.player?.player_name,
          jerseyNumber: p.player?.jersey_number,
          role: p.player?.role,
        },
      })),
    })),
    matchPlayers: (match.match_players || []).map((p: any) => ({
      playerId: p.player_id,
      temporaryTeamId: p.temporary_team_id,
      isBatter: p.is_batter,
      isBowler: p.is_bowler,
      allocatedOvers: p.allocated_overs,
      oversBowled: p.overs_bowled,
      battingOrder: p.batting_order,
      player: {
        id: p.player?.id || p.player_id,
        playerName: p.player?.player_name,
        jerseyNumber: p.player?.jersey_number,
        role: p.player?.role,
      },
    })),
    innings: (match.innings || [])
      .sort((a: any, b: any) => a.innings_number - b.innings_number)
      .map((inn: any) => ({
        id: inn.id,
        gullyMatchId: inn.gully_match_id,
        inningsNumber: inn.innings_number,
        roundNumber: inn.round_number,
        batterId: inn.batter_id,
        battingTeamId: inn.batting_team_id,
        bowlingTeamId: inn.bowling_team_id,
        battingTeamName: inn.batting_team_name,
        bowlingTeamName: inn.bowling_team_name,
        totalRuns: inn.total_runs,
        wickets: inn.wickets,
        legalBalls: inn.legal_balls,
        oversCompletedText: inn.overs_completed_text,
        status: inn.status,
        targetRuns: inn.target_runs,
        byes: inn.byes || 0,
        legByes: inn.leg_byes || 0,
        wides: inn.wides || 0,
        noBalls: inn.no_balls || 0,
        penaltyRuns: inn.penalty_runs || 0,
        currentStrikerId: inn.current_striker_id,
        currentNonStrikerId: inn.current_non_striker_id,
        currentBowlerId: inn.current_bowler_id,
        lastBowlerId: inn.last_bowler_id,
        battingScorecards: (inn.batting_scorecards || [])
          .sort((a: any, b: any) => a.batting_order - b.batting_order)
          .map((b: any) => ({
            id: b.id,
            playerId: b.player_id,
            battingOrder: b.batting_order,
            runs: b.runs,
            balls: b.balls,
            fours: b.fours,
            sixes: b.sixes,
            strikeRate: b.strike_rate,
            notOut: b.not_out,
            dismissalType: b.dismissal_type,
            dismissalText: b.dismissal_text,
            bowlerId: b.bowler_id,
            fielderId: b.fielder_id,
            player: {
              id: b.player?.id || b.player_id,
              playerName: b.player?.player_name,
              jerseyNumber: b.player?.jersey_number,
              role: b.player?.role,
            },
          })),
        bowlingScorecards: (inn.bowling_scorecards || [])
          .sort((a: any, b: any) => a.bowling_order - b.bowling_order)
          .map((b: any) => ({
            id: b.id,
            playerId: b.player_id,
            bowlingOrder: b.bowling_order,
            legalBalls: b.legal_balls,
            oversText: b.overs_text,
            maidens: b.maidens,
            runsConceded: b.runs_conceded,
            wickets: b.wickets,
            economy: b.economy,
            wides: b.wides || 0,
            noBalls: b.no_balls || 0,
            allocatedOvers: b.allocated_overs,
            player: {
              id: b.player?.id || b.player_id,
              playerName: b.player?.player_name,
              jerseyNumber: b.player?.jersey_number,
              role: b.player?.role,
            },
          })),
        wicketsList: (inn.wickets || [])
          .sort((a: any, b: any) => a.wicket_number - b.wicket_number)
          .map((w: any) => ({
            id: w.id,
            playerId: w.player_id,
            dismissalType: w.dismissal_type,
            bowlerCredited: w.bowler_credited,
            bowlerId: w.bowler_id,
            fielderId: w.fielder_id,
            overBallText: w.over_ball_text,
            teamRunsAtFall: w.team_runs_at_fall,
            wicketNumber: w.wicket_number,
            player: { id: w.player?.id, playerName: w.player?.player_name },
            bowler: w.bowler
              ? { id: w.bowler.id, playerName: w.bowler.player_name }
              : null,
            fielder: w.fielder
              ? { id: w.fielder.id, playerName: w.fielder.player_name }
              : null,
          })),
        deliveries: (inn.deliveries || []).map((d: any) => ({
          id: d.id,
          overNumber: d.over_number,
          ballNumber: d.ball_number_in_over,
          legalBallNumber: d.legal_ball_number,
          strikerId: d.striker_id,
          nonStrikerId: d.non_striker_id,
          bowlerId: d.bowler_id,
          batterRuns: d.batter_runs,
          extraRuns: d.extra_runs,
          extraType: d.extra_type,
          totalRuns: d.total_runs,
          isLegalDelivery: d.is_legal_delivery,
          isWicket: d.is_wicket,
          dismissalType: d.dismissal_type,
          dismissedPlayerId: d.dismissed_player_id,
          createdAt: d.created_at,
        })),
      })),
  };

  // If SINGLES_MATCH, attach round-by-round breakdown and cumulative tournament leaderboard
  if (match.match_type === 'SINGLES_MATCH') {
    let battingOrder: string[] = [];
    try {
      battingOrder = JSON.parse(match.singles_batting_order || '[]');
    } catch {
      battingOrder = [];
    }

    const roundMap = new Map<number, any[]>();
    for (const inn of res.innings) {
      const r = inn.roundNumber || 1;
      if (!roundMap.has(r)) roundMap.set(r, []);
      roundMap.get(r)!.push(inn);
    }

    const rounds = Array.from(roundMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([roundNumber, inningsList]) => {
        const roundLeaderboard = inningsList
          .map(inn => {
            const card = inn.battingScorecards[0];
            return {
              inningsId: inn.id,
              inningsNumber: inn.inningsNumber,
              batterId: inn.batterId || card?.playerId,
              playerName: card?.player?.playerName || inn.battingTeamName,
              jerseyNumber: card?.player?.jerseyNumber,
              role: card?.player?.role,
              runs: card?.runs || inn.totalRuns || 0,
              balls: card?.balls || 0,
              fours: card?.fours || 0,
              sixes: card?.sixes || 0,
              strikeRate: card?.strikeRate || 0,
              notOut: card?.notOut ?? true,
              dismissalText: card?.dismissalText || null,
              wicketsLost: inn.wickets,
              oversFacedText: inn.oversCompletedText,
              status: inn.status,
            };
          })
          .sort((a, b) => {
            if (b.runs !== a.runs) return b.runs - a.runs;
            if (b.strikeRate !== a.strikeRate) return b.strikeRate - a.strikeRate;
            return a.balls - b.balls;
          })
          .map((item, idx) => ({ ...item, rank: idx + 1 }));

        return {
          roundNumber,
          inningsList,
          roundLeaderboard,
        };
      });

    const cumulativeMap = new Map<string, any>();
    for (const mp of res.matchPlayers) {
      cumulativeMap.set(mp.playerId, {
        playerId: mp.playerId,
        playerName: mp.player.playerName,
        jerseyNumber: mp.player.jerseyNumber,
        role: mp.player.role,
        totalRuns: 0,
        totalBalls: 0,
        fours: 0,
        sixes: 0,
        inningsBatted: 0,
        highestScore: 0,
        totalWickets: 0,
        runsConceded: 0,
        legalBalls: 0,
        maidens: 0,
      });
    }

    for (const inn of res.innings) {
      for (const bCard of inn.battingScorecards) {
        const stats = cumulativeMap.get(bCard.playerId);
        if (stats) {
          stats.totalRuns += bCard.runs;
          stats.totalBalls += bCard.balls;
          stats.fours += bCard.fours;
          stats.sixes += bCard.sixes;
          stats.inningsBatted += 1;
          if (bCard.runs > stats.highestScore) stats.highestScore = bCard.runs;
        }
      }
      for (const bowlCard of inn.bowlingScorecards) {
        const stats = cumulativeMap.get(bowlCard.playerId);
        if (stats) {
          stats.totalWickets += bowlCard.wickets;
          stats.runsConceded += bowlCard.runsConceded;
          stats.legalBalls += bowlCard.legalBalls;
          stats.maidens += bowlCard.maidens;
        }
      }
    }

    const cumulativeLeaderboard = Array.from(cumulativeMap.values())
      .map(p => ({
        ...p,
        strikeRate:
          p.totalBalls > 0
            ? parseFloat(((p.totalRuns / p.totalBalls) * 100).toFixed(2))
            : 0,
        oversText: `${Math.floor(p.legalBalls / 6)}.${p.legalBalls % 6}`,
        economy:
          p.legalBalls > 0
            ? parseFloat(((p.runsConceded / p.legalBalls) * 6).toFixed(2))
            : 0,
      }))
      .sort((a, b) => {
        if (b.totalRuns !== a.totalRuns) return b.totalRuns - a.totalRuns;
        if (b.totalWickets !== a.totalWickets) return b.totalWickets - a.totalWickets;
        return a.runsConceded - b.runsConceded;
      })
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const currentRound = match.current_round_number || 1;
    const currentRoundInnings = res.innings.filter(
      (i: any) => (i.roundNumber || 1) === currentRound
    );
    const completedBatterIdsInRound = new Set(
      currentRoundInnings
        .filter((i: any) => i.status === 'COMPLETED')
        .map((i: any) => i.batterId)
        .filter(Boolean)
    );
    const activeInnings = res.innings.find(
      (i: any) => i.inningsNumber === match.current_innings_number
    );
    const isRoundComplete =
      battingOrder.length > 0 &&
      battingOrder.every(id => completedBatterIdsInRound.has(id));

    const singlesQueue = battingOrder.map((id, idx) => {
      const p = res.matchPlayers.find((mp: any) => mp.playerId === id)?.player;
      const inn = currentRoundInnings.find((i: any) => i.batterId === id);
      return {
        order: idx + 1,
        playerId: id,
        playerName: p?.playerName || 'Unknown Player',
        jerseyNumber: p?.jerseyNumber,
        role: p?.role,
        hasBattedInRound: !!inn,
        status: inn ? inn.status : 'QUEUED',
        runs: inn?.totalRuns || 0,
        balls: inn?.battingScorecards[0]?.balls || 0,
      };
    });

    res.roundBreakdown = rounds;
    res.singlesLeaderboard = cumulativeLeaderboard;
    res.singlesQueue = singlesQueue;
    res.isRoundComplete = isRoundComplete;
    res.activeInnings = activeInnings;
  }

  return res;
}

// ============================================================================
// GULLY CRICKET API
// ============================================================================
export const gullyApi = {
  createTeamMatch: async (data: any): Promise<{ data: any }> => {
    const teamAAlloc = Object.fromEntries(
      (data.teamA.bowlingAllocations || []).map((a: any) => [
        a.playerId,
        a.allocatedOvers,
      ])
    );
    const teamBAlloc = Object.fromEntries(
      (data.teamB.bowlingAllocations || []).map((a: any) => [
        a.playerId,
        a.allocatedOvers,
      ])
    );

    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_create_gully_team_match',
      {
        p_match_date: data.matchDate || null,
        p_venue: data.venue || null,
        p_total_overs: data.totalOvers,
        p_bowling_allocation_rule: data.bowlingAllocationRule,
        p_team_a_name: data.teamA.teamName,
        p_team_a_player_ids: data.teamA.playerIds,
        p_team_a_captain_id: data.teamA.captainPlayerId || null,
        p_team_a_allocations: teamAAlloc,
        p_team_b_name: data.teamB.teamName,
        p_team_b_player_ids: data.teamB.playerIds,
        p_team_b_captain_id: data.teamB.captainPlayerId || null,
        p_team_b_allocations: teamBAlloc,
        p_toss_winner_team: data.toss?.tossWinnerTeam || null,
        p_toss_decision: data.toss?.tossDecision || null,
        p_striker_id: data.openingPlayers?.strikerId || null,
        p_non_striker_id: data.openingPlayers?.nonStrikerId || null,
        p_bowler_id: data.openingPlayers?.bowlerId || null,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result);
  },

  createSinglesMatch: async (data: any): Promise<{ data: any }> => {
    const allocMap = Object.fromEntries(
      (data.bowlingAllocations || []).map((a: any) => [
        a.playerId,
        a.allocatedOvers,
      ])
    );

    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_create_gully_singles_match',
      {
        p_match_date: data.matchDate || null,
        p_venue: data.venue || null,
        p_total_overs: data.totalOvers || 2,
        p_draft_shuffled: !!data.draftShuffled,
        p_singles_batting_order: data.battingOrderPlayerIds,
        p_bowling_allocation_rule: data.bowlingAllocationRule || 'MAX_LIMIT',
        p_singles_dismissal_rule:
          data.singlesDismissalRule || 'LAST_WICKET_ENDS_INNINGS',
        p_bowler_order_rule: data.bowlerOrderRule || 'FREE_SELECTION',
        p_bowling_allocations: allocMap,
        p_opening_bowler_id: data.openingBowlerId || null,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result);
  },

  performDraft: async (playerIds: string[]): Promise<{ data: any }> => {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, player_name, jersey_number, role')
      .in('id', playerIds);

    if (error) throwApiError(error);
    if (!players || players.length < 2) {
      throwApiError('At least 2 players are needed for a Gully Draft');
    }

    // Fisher-Yates fair shuffle of all players
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedBatter = {
      id: shuffled[0].id,
      playerName: shuffled[0].player_name,
      jerseyNumber: shuffled[0].jersey_number,
      role: shuffled[0].role,
    };
    const bowlers = shuffled.slice(1).map(p => ({
      id: p.id,
      playerName: p.player_name,
      jerseyNumber: p.jersey_number,
      role: p.role,
    }));
    const battingQueue = shuffled.map(p => ({
      id: p.id,
      playerName: p.player_name,
      jerseyNumber: p.jersey_number,
      role: p.role,
    }));

    return wrapResponse({
      selectedBatter,
      bowlers,
      battingOrder: battingQueue,
      battingQueue,
      shuffledOrder: shuffled.map(p => p.id),
    });
  },

  getMatch: async (id: string): Promise<{ data: any }> => {
    const { data: match, error } = await supabase
      .from('gully_matches')
      .select(`
        *,
        registeredTeam:teams!gully_matches_registered_team_id_fkey(id, team_name, username),
        selectedBatter:players!gully_matches_selected_batter_id_fkey(id, player_name, jersey_number, role),
        temporary_teams:gully_temporary_teams(
          id, gully_match_id, team_name, is_team_a, captain_player_id,
          captain:players!gully_temporary_teams_captain_player_id_fkey(id, player_name),
          players:gully_match_players(
            player_id, temporary_team_id, is_batter, is_bowler, allocated_overs, overs_bowled, batting_order,
            player:players(id, player_name, jersey_number, role)
          )
        ),
        match_players:gully_match_players(
          player_id, temporary_team_id, is_batter, is_bowler, allocated_overs, overs_bowled, batting_order,
          player:players(id, player_name, jersey_number, role)
        ),
        innings:gully_innings(
          id, gully_match_id, innings_number, round_number, batter_id,
          batting_team_id, bowling_team_id, batting_team_name, bowling_team_name,
          total_runs, wickets, legal_balls, overs_completed_text, status,
          target_runs, byes, leg_byes, wides, no_balls, penalty_runs,
          current_striker_id, current_non_striker_id, current_bowler_id, last_bowler_id,
          batting_scorecards:gully_batting_scorecards(
            id, player_id, batting_order, runs, balls, fours, sixes,
            strike_rate, not_out, dismissal_type, dismissal_text, bowler_id, fielder_id,
            player:players(id, player_name, jersey_number, role)
          ),
          bowling_scorecards:gully_bowling_scorecards(
            id, player_id, bowling_order, overs, legal_balls, overs_text, maidens,
            runs_conceded, wickets, economy, wides, no_balls, allocated_overs,
            player:players(id, player_name, jersey_number, role)
          ),
          wickets:gully_wickets(
            id, wicket_number, player_id, bowler_id, fielder_id, dismissal_type,
            bowler_credited, team_runs_at_fall, over_ball_text,
            player:players!gully_wickets_player_id_fkey(id, player_name),
            bowler:players!gully_wickets_bowler_id_fkey(id, player_name),
            fielder:players!gully_wickets_fielder_id_fkey(id, player_name)
          ),
          deliveries:gully_deliveries(
            id, over_number, ball_number_in_over, legal_ball_number,
            striker_id, non_striker_id, bowler_id, batter_runs, extra_runs,
            extra_type, total_runs, is_legal_delivery, is_wicket, dismissal_type,
            dismissed_player_id, created_at
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throwApiError(error);
    return wrapResponse(mapGullyMatchFromDb(match));
  },

  listMatches: async (params?: {
    matchType?: any;
    status?: any;
  }): Promise<{ data: any[] }> => {
    let query = supabase.from('gully_matches').select(`
      id, match_type, status, match_date, venue, total_overs, result_type, result_description,
      winner_team_id, current_round_number, current_innings_number, registered_team_id,
      bowling_allocation_rule, draft_shuffled,
      registeredTeam:teams!gully_matches_registered_team_id_fkey(id, team_name),
      temporaryTeams:gully_temporary_teams(id, team_name, is_team_a),
      selectedBatter:players!gully_matches_selected_batter_id_fkey(id, player_name),
      matchPlayers:gully_match_players(player_id, allocated_overs, is_batter, is_bowler, player:players(id, player_name)),
      innings:gully_innings(id, innings_number, round_number, batting_team_name, total_runs, wickets, overs_completed_text)
    `);

    if (params?.matchType) query = query.eq('match_type', params.matchType);
    if (params?.status) query = query.eq('status', params.status);

    const { data, error } = await query.order('match_date', {
      ascending: false,
    });
    if (error) throwApiError(error);

    return wrapResponse(
      (data || []).map((m: any) => ({
        id: m.id,
        registeredTeamId: m.registered_team_id,
        matchType: m.match_type,
        status: m.status,
        matchDate: m.match_date,
        venue: m.venue,
        totalOvers: m.total_overs,
        bowlingAllocationRule: m.bowling_allocation_rule,
        draftShuffled: !!m.draft_shuffled,
        resultType: m.result_type,
        resultDescription: m.result_description,
        winnerTeamId: m.winner_team_id,
        currentRoundNumber: m.current_round_number,
        currentInningsNumber: m.current_innings_number,
        registeredTeam: m.registeredTeam
          ? { id: m.registeredTeam.id, teamName: m.registeredTeam.team_name }
          : null,
        temporaryTeams: (m.temporaryTeams || []).map((t: any) => ({
          id: t.id,
          teamName: t.team_name,
          isTeamA: t.is_team_a,
        })),
        selectedBatter: m.selectedBatter
          ? { id: m.selectedBatter.id, playerName: m.selectedBatter.player_name }
          : null,
        matchPlayers: (m.matchPlayers || []).map((mp: any) => ({
          playerId: mp.player_id,
          allocatedOvers: mp.allocated_overs,
          isBatter: mp.is_batter,
          isBowler: mp.is_bowler,
          player: mp.player,
        })),
        innings: (m.innings || []).map((i: any) => ({
          id: i.id,
          inningsNumber: i.innings_number,
          roundNumber: i.round_number,
          battingTeamName: i.batting_team_name,
          totalRuns: i.total_runs,
          wickets: i.wickets,
          oversCompletedText: i.overs_completed_text,
        })),
      }))
    );
  },

  conductToss: async (
    id: string,
    data: { tossWinnerTeamId: string; tossDecision: TossDecision }
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_gully_conduct_toss',
      {
        p_match_id: id,
        p_toss_winner_team_id: data.tossWinnerTeamId,
        p_toss_decision: data.tossDecision,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Toss recorded' });
  },

  selectOpeningPlayers: async (
    id: string,
    data: {
      strikerId: string;
      nonStrikerId?: string | null;
      bowlerId: string;
      inningsNumber?: number;
    }
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_gully_select_opening_players',
      {
        p_match_id: id,
        p_striker_id: data.strikerId,
        p_non_striker_id: data.nonStrikerId || null,
        p_bowler_id: data.bowlerId,
        p_innings_number: data.inningsNumber || 1,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Opening players set' });
  },

  scoreDelivery: async (id: string, data: any): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_gully_score_delivery',
      {
        p_match_id: id,
        p_dto: {
          batterRuns: data.batterRuns,
          extraType: data.extraType,
          extraRuns: data.extraRuns || 0,
          isWicket: !!data.isWicket,
          dismissalType: data.dismissalType || null,
          dismissedPlayerId: data.dismissedPlayerId || null,
          fielderId: data.fielderId || null,
          incomingBatterId: data.incomingBatterId || null,
          runsCompletedBeforeDismissal:
            data.runsCompletedBeforeDismissal || 0,
        },
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result);
  },

  changeBowler: async (
    id: string,
    bowlerId: string
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_gully_change_bowler',
      {
        p_match_id: id,
        p_bowler_id: bowlerId,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Bowler changed' });
  },

  undoLastDelivery: async (id: string): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_gully_undo_last_delivery',
      {
        p_match_id: id,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Delivery undone successfully' });
  },

  endMatch: async (id: string): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_gully_end_match',
      {
        p_match_id: id,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Match concluded' });
  },

  startNextSinglesBatter: async (
    id: string,
    data?: { openingBowlerId?: string }
  ): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_gully_start_next_singles_batter',
      {
        p_match_id: id,
        p_opening_bowler_id: data?.openingBowlerId || null,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Next singles batter started' });
  },

  startNextSinglesRound: async (id: string): Promise<{ data: any }> => {
    const { data: result, error } = await (supabase.rpc as any)(
      'rpc_gully_start_next_singles_round',
      {
        p_match_id: id,
      }
    );

    if (error) throwApiError(error);
    return wrapResponse(result || { message: 'Next round started' });
  },

  getPlayerGullyProfile: async (playerId: string): Promise<{ data: any }> => {
    const currentTeam = await getCurrentTeam();
    const teamId = currentTeam?.id;

    const { data: player, error: pError } = await supabase
      .from('players')
      .select('*, team:teams!players_team_id_fkey(id, team_name)')
      .eq('id', playerId)
      .single();

    if (pError) throwApiError(pError);

    // Get gully batting scores for completed matches of current team
    let battingQuery = supabase
      .from('gully_batting_scorecards')
      .select('*, innings:gully_innings!inner(match:gully_matches!inner(id, match_type, match_date, status, registered_team_id, result_description))')
      .eq('player_id', playerId)
      .eq('innings.match.status', 'COMPLETED');

    if (teamId) {
      battingQuery = battingQuery.eq('innings.match.registered_team_id', teamId);
    }

    const { data: battingData } = await battingQuery;

    // Get gully bowling scores
    let bowlingQuery = supabase
      .from('gully_bowling_scorecards')
      .select('*, innings:gully_innings!inner(match:gully_matches!inner(id, match_type, match_date, status, registered_team_id, result_description))')
      .eq('player_id', playerId)
      .eq('innings.match.status', 'COMPLETED');

    if (teamId) {
      bowlingQuery = bowlingQuery.eq('innings.match.registered_team_id', teamId);
    }

    const { data: bowlingData } = await bowlingQuery;

    const batting = battingData || [];
    const bowling = bowlingData || [];

    const inningsBatted = batting.length;
    const totalRuns = batting.reduce((s, b) => s + b.runs, 0);
    const totalBalls = batting.reduce((s, b) => s + b.balls, 0);
    const fours = batting.reduce((s, b) => s + b.fours, 0);
    const sixes = batting.reduce((s, b) => s + b.sixes, 0);
    const notOuts = batting.filter(b => b.not_out).length;
    const dismissals = inningsBatted - notOuts;
    const highestScoreRecord = batting.reduce(
      (max, b) => (b.runs > max.runs ? b : max),
      { runs: 0, not_out: false }
    );
    const highestScore =
      batting.length > 0
        ? `${highestScoreRecord.runs}${highestScoreRecord.not_out ? '*' : ''}`
        : '0';

    const battingAverage = calculateBattingAverage(totalRuns, dismissals);
    const strikeRate = calculateStrikeRate(totalRuns, totalBalls);
    const halfCenturies = batting.filter(b => b.runs >= 50 && b.runs < 100).length;
    const centuries = batting.filter(b => b.runs >= 100).length;
    const ducks = batting.filter(b => b.runs === 0 && !b.not_out).length;

    const bowlingInnings = bowling.length;
    const totalWickets = bowling.reduce((s, b) => s + b.wickets, 0);
    const totalLegalBalls = bowling.reduce((s, b) => s + b.legal_balls, 0);
    const totalRunsConceded = bowling.reduce((s, b) => s + b.runs_conceded, 0);
    const maidens = bowling.reduce((s, b) => s + b.maidens, 0);
    const bowlingAverage = calculateBowlingAverage(totalRunsConceded, totalWickets);
    const economyRate = calculateEconomyRate(totalRunsConceded, totalLegalBalls);
    const oversBowledText = ballsToOversText(totalLegalBalls);

    let bestBowling = '-';
    if (bowling.length > 0) {
      const sorted = [...bowling].sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return a.runs_conceded - b.runs_conceded;
      });
      if (sorted[0].wickets > 0 || sorted[0].legal_balls > 0) {
        bestBowling = `${sorted[0].wickets}/${sorted[0].runs_conceded}`;
      }
    }

    // Breakdown: Team Match
    const teamBatting = batting.filter(
      (b: any) => b.innings.match.match_type === 'TEAM_MATCH'
    );
    const teamRuns = teamBatting.reduce((s, b) => s + b.runs, 0);
    const teamBalls = teamBatting.reduce((s, b) => s + b.balls, 0);
    const teamNotOuts = teamBatting.filter(b => b.not_out).length;
    const teamDismissals = teamBatting.length - teamNotOuts;
    const teamHighestRecord = teamBatting.reduce(
      (max, b) => (b.runs > max.runs ? b : max),
      { runs: 0, not_out: false }
    );

    const teamBowling = bowling.filter(
      (b: any) => b.innings.match.match_type === 'TEAM_MATCH'
    );
    const teamWickets = teamBowling.reduce((s, b) => s + b.wickets, 0);
    const teamBallsBowled = teamBowling.reduce((s, b) => s + b.legal_balls, 0);
    const teamRunsConceded = teamBowling.reduce((s, b) => s + b.runs_conceded, 0);

    // Breakdown: Singles Match
    const singlesBatting = batting.filter(
      (b: any) => b.innings.match.match_type === 'SINGLES_MATCH'
    );
    const singlesRuns = singlesBatting.reduce((s, b) => s + b.runs, 0);
    const singlesBalls = singlesBatting.reduce((s, b) => s + b.balls, 0);
    const singlesHighestRecord = singlesBatting.reduce(
      (max, b) => (b.runs > max.runs ? b : max),
      { runs: 0, not_out: false }
    );

    const singlesBowling = bowling.filter(
      (b: any) => b.innings.match.match_type === 'SINGLES_MATCH'
    );
    const singlesWickets = singlesBowling.reduce((s, b) => s + b.wickets, 0);
    const singlesBallsBowled = singlesBowling.reduce(
      (s, b) => s + b.legal_balls,
      0
    );
    const singlesRunsConceded = singlesBowling.reduce(
      (s, b) => s + b.runs_conceded,
      0
    );

    // Match history
    const matchHistoryMap = new Map<string, any>();
    batting.forEach((b: any) => {
      const m = b.innings.match;
      if (!matchHistoryMap.has(m.id)) {
        matchHistoryMap.set(m.id, {
          matchId: m.id,
          matchDate: m.match_date,
          matchType: m.match_type,
          opponent:
            m.match_type === 'SINGLES_MATCH' ? 'Singles Arena' : 'Team Match',
          runsScored: 0,
          ballsFaced: 0,
          wicketsTaken: 0,
          legalBallsBowled: 0,
          resultDescription: m.result_description,
        });
      }
      const item = matchHistoryMap.get(m.id);
      item.runsScored += b.runs;
      item.ballsFaced += b.balls;
    });

    bowling.forEach((b: any) => {
      const m = b.innings.match;
      if (!matchHistoryMap.has(m.id)) {
        matchHistoryMap.set(m.id, {
          matchId: m.id,
          matchDate: m.match_date,
          matchType: m.match_type,
          opponent:
            m.match_type === 'SINGLES_MATCH' ? 'Singles Arena' : 'Team Match',
          runsScored: 0,
          ballsFaced: 0,
          wicketsTaken: 0,
          legalBallsBowled: 0,
          resultDescription: m.result_description,
        });
      }
      const item = matchHistoryMap.get(m.id);
      item.wicketsTaken += b.wickets;
      item.legalBallsBowled += b.legal_balls;
    });

    const matchHistory = Array.from(matchHistoryMap.values()).map(m => ({
      matchId: m.matchId,
      matchDate: m.matchDate,
      matchType: m.matchType,
      opponent: m.opponent,
      runsScored: m.runsScored,
      ballsFaced: m.ballsFaced,
      wicketsTaken: m.wicketsTaken,
      oversBowled: ballsToOversText(m.legalBallsBowled),
      resultDescription: m.resultDescription,
    }));

    return wrapResponse({
      player: {
        id: player.id,
        playerName: player.player_name,
        jerseyNumber: player.jersey_number,
        role: player.role,
        teamId: player.team_id,
        teamName: player.team?.team_name,
      },
      gullyBattingStats: {
        matchesPlayed: matchHistory.length,
        inningsBatted,
        totalRuns,
        highestScore,
        battingAverage,
        strikeRate,
        ballsFaced: totalBalls,
        fours,
        sixes,
        notOuts,
        centuries,
        halfCenturies,
        ducks,
      },
      gullyBowlingStats: {
        bowlingInnings,
        totalWickets,
        oversBowled: oversBowledText,
        legalBalls: totalLegalBalls,
        runsConceded: totalRunsConceded,
        bowlingAverage,
        economyRate,
        bestBowling,
        maidens,
      },
      teamMatchBreakdown: {
        matches: matchHistory.filter(m => m.matchType === 'TEAM_MATCH').length,
        runs: teamRuns,
        highestScore:
          teamBatting.length > 0
            ? `${teamHighestRecord.runs}${teamHighestRecord.not_out ? '*' : ''}`
            : '0',
        battingAverage: calculateBattingAverage(teamRuns, teamDismissals),
        strikeRate: calculateStrikeRate(teamRuns, teamBalls),
        wickets: teamWickets,
        bowlingAverage: calculateBowlingAverage(teamRunsConceded, teamWickets),
        economy: calculateEconomyRate(teamRunsConceded, teamBallsBowled),
      },
      singlesMatchBreakdown: {
        matchesAsBatter: singlesBatting.length,
        runsAsBatter: singlesRuns,
        highestScore:
          singlesBatting.length > 0
            ? `${singlesHighestRecord.runs}${singlesHighestRecord.not_out ? '*' : ''}`
            : '0',
        strikeRate: calculateStrikeRate(singlesRuns, singlesBalls),
        matchesAsBowler: singlesBowling.length,
        wicketsAsBowler: singlesWickets,
        bowlingAverage: calculateBowlingAverage(singlesRunsConceded, singlesWickets),
        economy: calculateEconomyRate(singlesRunsConceded, singlesBallsBowled),
      },
      matchHistory,
    });
  },

  getTeamGullyStats: async (): Promise<{ data: any }> => {
    const currentTeam = await getCurrentTeam();
    if (!currentTeam) throwApiError('Authenticated team not found');

    const { data: matches, error } = await supabase
      .from('gully_matches')
      .select('id, match_type, status, innings:gully_innings(total_runs)')
      .eq('registered_team_id', currentTeam.id)
      .eq('status', 'COMPLETED');

    if (error) throwApiError(error);

    const matchItems = matches || [];
    const totalMatches = matchItems.length;
    const teamMatchesCount = matchItems.filter(
      (m: any) => m.match_type === 'TEAM_MATCH'
    ).length;
    const singlesMatchesCount = matchItems.filter(
      (m: any) => m.match_type === 'SINGLES_MATCH'
    ).length;

    let totalRuns = 0;
    let highestScore = 0;

    matchItems.forEach((m: any) => {
      (m.innings || []).forEach((inn: any) => {
        totalRuns += inn.total_runs || 0;
        if (inn.total_runs > highestScore) highestScore = inn.total_runs;
      });
    });

    return wrapResponse({
      totalMatches,
      teamMatchesCount,
      singlesMatchesCount,
      totalRunsScored: totalRuns,
      highestScore,
    });
  },

  deleteMatch: async (id: string): Promise<{ data: any }> => {
    const { error } = await supabase.from('gully_matches').delete().eq('id', id);
    if (error) throwApiError(error);
    return wrapResponse({ message: 'Gully match deleted successfully' });
  },
};
