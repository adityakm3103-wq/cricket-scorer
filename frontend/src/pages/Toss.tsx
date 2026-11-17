import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { matchApi } from '../services/api.js';
import { MatchDetails, TossDecision } from '../types/index.js';
import { Coins, ChevronRight, AlertCircle } from 'lucide-react';

export const Toss: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tossWinnerId, setTossWinnerId] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<TossDecision>('BAT');
  const [error, setError] = useState<string>('');

  const { data: match, isLoading } = useQuery<MatchDetails>({
    queryKey: ['match', id],
    queryFn: async () => {
      const res = await matchApi.getMatch(id!);
      return res.data;
    },
    enabled: !!id,
  });

  const tossMutation = useMutation({
    mutationFn: () =>
      matchApi.conductToss(id!, {
        tossWinnerId,
        tossDecision,
      }),
    onSuccess: () => {
      navigate(`/opening-players/${id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to record toss');
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
    return <div className="text-center py-12 text-slate-500">Match not found</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tossWinnerId) {
      setError('Please select which team won the toss');
      return;
    }
    tossMutation.mutate();
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-6 transition-colors duration-200">
      <div className="text-center space-y-2">
        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
          Match Setup • Step 3 of 4
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
          <Coins className="w-8 h-8 text-amber-500" />
          The Toss
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {match.teamA.teamName} vs {match.teamB.teamName} ({match.format})
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
        {/* Toss Winner Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
            Who won the toss?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTossWinnerId(match.teamAId)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                tossWinnerId === match.teamAId
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 text-slate-900 dark:text-white ring-2 ring-emerald-500/40 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                Home Team
              </span>
              <span className="font-extrabold text-base block">{match.teamA.teamName}</span>
            </button>

            <button
              type="button"
              onClick={() => setTossWinnerId(match.teamBId)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                tossWinnerId === match.teamBId
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 text-slate-900 dark:text-white ring-2 ring-emerald-500/40 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block mb-1">
                Away Team
              </span>
              <span className="font-extrabold text-base block">{match.teamB.teamName}</span>
            </button>
          </div>
        </div>

        {/* Decision Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
            Elected to:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTossDecision('BAT')}
              className={`py-3.5 px-4 rounded-2xl border font-bold text-sm text-center transition-all ${
                tossDecision === 'BAT'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-600 dark:border-emerald-400 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Bat First
            </button>

            <button
              type="button"
              onClick={() => setTossDecision('BOWL')}
              className={`py-3.5 px-4 rounded-2xl border font-bold text-sm text-center transition-all ${
                tossDecision === 'BOWL'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-600 dark:border-emerald-400 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Bowl First
            </button>
          </div>
        </div>

        {/* Summary Preview */}
        {tossWinnerId && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-1 font-medium">
            <div className="font-bold text-slate-900 dark:text-white">Summary:</div>
            <div>
              {tossWinnerId === match.teamAId ? match.teamA.teamName : match.teamB.teamName} won the toss and chose to {tossDecision.toLowerCase()}.
            </div>
            <div className="text-emerald-700 dark:text-emerald-400 font-bold pt-1">
              1st Batting Team:{' '}
              {tossDecision === 'BAT'
                ? tossWinnerId === match.teamAId ? match.teamA.teamName : match.teamB.teamName
                : tossWinnerId === match.teamAId ? match.teamB.teamName : match.teamA.teamName}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!tossWinnerId || tossMutation.isPending}
          className="w-full py-3.5 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {tossMutation.isPending ? 'Saving Toss...' : 'Save Toss & Select Openers'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
