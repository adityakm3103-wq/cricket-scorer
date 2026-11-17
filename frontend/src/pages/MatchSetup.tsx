import React, { useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.js';
import { adminApi, squadApi, matchApi } from '../services/api.js';
import { MatchFormat, Player } from '../types/index.js';
import {
  Trophy,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const MatchSetup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const formatParam = (searchParams.get('format') as MatchFormat) || 'T20';
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Match details state
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState('');
  const [error, setError] = useState('');

  // Playing XI selection states
  const [teamAPlayingXI, setTeamAPlayingXI] = useState<string[]>([]);
  const [teamBPlayingXI, setTeamBPlayingXI] = useState<string[]>([]);

  // If not admin, redirect to team dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch all active registered teams for admin to configure
  const { data: teams, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['adminAllTeams'],
    queryFn: async () => {
      const res = await adminApi.getAllTeams();
      return (res.data || []).filter((t: any) => t.isActive !== false);
    },
  });

  // Fetch Team A squad
  const { data: teamASquad, isLoading: isTeamASquadLoading } = useQuery<Player[]>({
    queryKey: ['squad', teamAId],
    queryFn: async () => {
      const res = await squadApi.getSquad({ teamId: teamAId });
      return res.data;
    },
    enabled: !!teamAId,
  });

  // Fetch Team B squad
  const { data: teamBSquad, isLoading: isTeamBSquadLoading } = useQuery<Player[]>({
    queryKey: ['squad', teamBId],
    queryFn: async () => {
      const res = await squadApi.getSquad({ teamId: teamBId });
      return res.data;
    },
    enabled: !!teamBId,
  });

  const handleTeamAChange = (id: string) => {
    setTeamAId(id);
    setTeamAPlayingXI([]);
    if (id === teamBId) {
      setTeamBId('');
      setTeamBPlayingXI([]);
    }
  };

  const handleTeamBChange = (id: string) => {
    setTeamBId(id);
    setTeamBPlayingXI([]);
  };

  const toggleTeamAPlayer = (playerId: string) => {
    if (teamAPlayingXI.includes(playerId)) {
      setTeamAPlayingXI(teamAPlayingXI.filter(id => id !== playerId));
    } else {
      if (teamAPlayingXI.length >= 11) {
        alert('Maximum 11 players can be selected for Playing XI');
        return;
      }
      setTeamAPlayingXI([...teamAPlayingXI, playerId]);
    }
  };

  const toggleTeamBPlayer = (playerId: string) => {
    if (teamBPlayingXI.includes(playerId)) {
      setTeamBPlayingXI(teamBPlayingXI.filter(id => id !== playerId));
    } else {
      if (teamBPlayingXI.length >= 11) {
        alert('Maximum 11 players can be selected for Playing XI');
        return;
      }
      setTeamBPlayingXI([...teamBPlayingXI, playerId]);
    }
  };

  const selectFirst11TeamA = () => {
    if (teamASquad) {
      setTeamAPlayingXI(teamASquad.slice(0, 11).map(p => p.id));
    }
  };

  const selectFirst11TeamB = () => {
    if (teamBSquad) {
      setTeamBPlayingXI(teamBSquad.slice(0, 11).map(p => p.id));
    }
  };

  const createMatchMutation = useMutation({
    mutationFn: async () => {
      // 1. Create match with Admin specified Team A and Team B
      const createRes = await matchApi.createMatch({
        format: formatParam,
        teamAId,
        teamBId,
        matchDate,
        venue: venue.trim() || undefined,
      });
      const matchId = createRes.data.id;

      // 2. Setup Playing XIs
      await matchApi.setupPlayingXI(matchId, {
        teamAPlayingXI,
        teamBPlayingXI,
      });

      return matchId;
    },
    onSuccess: (matchId: string) => {
      navigate(`/toss/${matchId}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create match');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!teamAId || !teamBId) {
      setError('Please select both Team A and Team B');
      return;
    }

    if (teamAId === teamBId) {
      setError('Team A and Team B cannot be the same team');
      return;
    }

    if (teamAPlayingXI.length < 2 || teamBPlayingXI.length < 2) {
      setError('Both teams must have at least 2 players in Playing XI (Standard is 11)');
      return;
    }

    createMatchMutation.mutate();
  };

  const selectedTeamA = teams?.find((t: any) => t.id === teamAId);
  const selectedTeamB = teams?.find((t: any) => t.id === teamBId);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          Admin Match Configuration • Step 2 of 4
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Configure Match & Playing XIs
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Format: <strong className="text-emerald-600 dark:text-emerald-400">{formatParam}</strong>. Select the competing registered teams and designate both Playing XIs.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Match Configuration Details */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Trophy className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Match Details & Competing Teams
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Team A (Home)
              </label>
              <select
                required
                value={teamAId}
                onChange={e => handleTeamAChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select Team A</option>
                {teams?.map((team: any) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName} (@{team.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Team B (Away)
              </label>
              <select
                required
                value={teamBId}
                onChange={e => handleTeamBChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select Team B</option>
                {teams
                  ?.filter((t: any) => t.id !== teamAId)
                  .map((team: any) => (
                    <option key={team.id} value={team.id}>
                      {team.teamName} (@{team.username})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Match Date
              </label>
              <input
                type="date"
                required
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Venue (Optional)
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Wankhede Stadium"
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Playing XI Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A Playing XI */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedTeamA ? selectedTeamA.teamName : 'Team A'} XI
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {teamAId ? 'Select playing squad' : 'Select Team A above'}
                </p>
              </div>
              {teamAId && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      teamAPlayingXI.length === 11
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {teamAPlayingXI.length} / 11 Selected
                  </span>
                  <button
                    type="button"
                    onClick={selectFirst11TeamA}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Auto Pick 11
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {teamAId ? (
                teamASquad && teamASquad.length > 0 ? (
                  teamASquad.map(player => {
                    const isSelected = teamAPlayingXI.includes(player.id);
                    return (
                      <div
                        key={player.id}
                        onClick={() => toggleTeamAPlayer(player.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500/60 text-slate-900 dark:text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400 shadow-sm">
                            #{player.jerseyNumber}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white">{player.playerName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                              {player.role.replace('_', ' ')}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    {isTeamASquadLoading
                      ? 'Loading squad...'
                      : 'Selected Team A has no registered players in their squad.'}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  Select Team A above to view and pick their Playing XI.
                </div>
              )}
            </div>
          </div>

          {/* Team B Playing XI */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedTeamB ? selectedTeamB.teamName : 'Team B'} XI
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {teamBId ? 'Select playing squad' : 'Select Team B above'}
                </p>
              </div>
              {teamBId && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      teamBPlayingXI.length === 11
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {teamBPlayingXI.length} / 11 Selected
                  </span>
                  <button
                    type="button"
                    onClick={selectFirst11TeamB}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Auto Pick 11
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {teamBId ? (
                teamBSquad && teamBSquad.length > 0 ? (
                  teamBSquad.map(player => {
                    const isSelected = teamBPlayingXI.includes(player.id);
                    return (
                      <div
                        key={player.id}
                        onClick={() => toggleTeamBPlayer(player.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500/60 text-slate-900 dark:text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold font-mono text-xs text-blue-600 dark:text-blue-400 shadow-sm">
                            #{player.jerseyNumber}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white">{player.playerName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                              {player.role.replace('_', ' ')}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    {isTeamBSquadLoading
                      ? 'Loading squad...'
                      : 'Selected Team B has no registered players in their squad.'}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  Select Team B above to view and pick their Playing XI.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={createMatchMutation.isPending}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {createMatchMutation.isPending
              ? 'Setting up Match...'
              : 'Confirm Playing XIs & Proceed to Toss'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
