import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { matchApi } from '../services/api.js';
import { MatchDetails, Player } from '../types/index.js';
import { UserCheck, Shield, ChevronRight, AlertCircle, Play } from 'lucide-react';

export const OpeningPlayers: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [error, setError] = useState('');

  const { data: match, isLoading } = useQuery<MatchDetails>({
    queryKey: ['match', id],
    queryFn: async () => {
      const res = await matchApi.getMatch(id!);
      return res.data;
    },
    enabled: !!id,
  });

  const queryInnings = searchParams.get('inningsNumber');
  const targetInningsNumber = queryInnings ? parseInt(queryInnings, 10) : (match?.currentInningsNumber || 1);
  const currentInnings = match?.innings?.find(i => i.inningsNumber === targetInningsNumber) || match?.innings?.[0];

  const setupOpenersMutation = useMutation({
    mutationFn: () =>
      matchApi.selectOpeningPlayers(id!, {
        strikerId,
        nonStrikerId,
        bowlerId,
        inningsNumber: currentInnings?.inningsNumber || 1,
      }),
    onSuccess: () => {
      navigate(`/live/${id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to set opening players');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!match) {
    return <div className="text-center py-12 text-slate-400">Match not found</div>;
  }

  const battingTeamId = currentInnings?.battingTeamId || match.teamAId;
  const bowlingTeamId = currentInnings?.bowlingTeamId || match.teamBId;

  const battingTeamName = match.teamAId === battingTeamId ? match.teamA.teamName : match.teamB.teamName;
  const bowlingTeamName = match.teamAId === bowlingTeamId ? match.teamA.teamName : match.teamB.teamName;

  // Filter playing XI players for batting and bowling teams
  const battingPlayingXI = match.matchPlayers
    .filter(mp => mp.teamId === battingTeamId && mp.isPlayingXI)
    .map(mp => mp.player);

  const bowlingPlayingXI = match.matchPlayers
    .filter(mp => mp.teamId === bowlingTeamId && mp.isPlayingXI)
    .map(mp => mp.player);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError('Please select striker, non-striker, and opening bowler');
      return;
    }

    if (strikerId === nonStrikerId) {
      setError('Striker and non-striker must be different players');
      return;
    }

    setupOpenersMutation.mutate();
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          Match Setup • Step 4 of 4
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Select Opening Players
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Pick opening batters and the bowler to begin live ball-by-ball scoring.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
        {/* Batting Team Openers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Batting: {battingTeamName}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Innings {currentInnings?.inningsNumber || 1}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Opening Striker (On Strike *)
            </label>
            <select
              required
              value={strikerId}
              onChange={e => setStrikerId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select Opening Striker</option>
              {battingPlayingXI.map(p => (
                <option key={p.id} value={p.id}>
                  #{p.jerseyNumber} - {p.playerName} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Opening Non-Striker
            </label>
            <select
              required
              value={nonStrikerId}
              onChange={e => setNonStrikerId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select Opening Non-Striker</option>
              {battingPlayingXI.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === strikerId}>
                  #{p.jerseyNumber} - {p.playerName} ({p.role}) {p.id === strikerId ? '(Selected as Striker)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bowling Team Opening Bowler */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              Bowling: {bowlingTeamName}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Over 1</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Opening Bowler
            </label>
            <select
              required
              value={bowlerId}
              onChange={e => setBowlerId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select Opening Bowler</option>
              {bowlingPlayingXI.map(p => (
                <option key={p.id} value={p.id}>
                  #{p.jerseyNumber} - {p.playerName} ({p.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={setupOpenersMutation.isPending}
          className="w-full py-4 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          {setupOpenersMutation.isPending ? 'Starting Match...' : 'Start Live Ball-by-Ball Scoring'}
        </button>
      </form>
    </div>
  );
};
