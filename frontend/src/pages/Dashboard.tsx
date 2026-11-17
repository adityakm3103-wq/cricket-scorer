import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.js';
import { authApi, matchApi } from '../services/api.js';
import {
  CricketBallIcon,
  CricketStumpsIcon,
  CrossedBatsIcon,
  CricketPitchGraphic,
} from '../components/CricketIcons.js';
import {
  Users,
  Trophy,
  History,
  ShieldCheck,
  ChevronRight,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  Sparkles,
  Award,
  Radio,
} from 'lucide-react';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (matchId: string) => matchApi.deleteMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matchHistory'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete match');
    },
  });

  const handleDeleteMatch = (matchId: string, opponentName?: string) => {
    const label = opponentName ? ` vs ${opponentName}` : '';
    if (confirm(`Are you sure you want to delete this match${label}? All innings and scoring data will be permanently removed.`)) {
      deleteMutation.mutate(matchId);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['teamDashboard'],
    queryFn: async () => {
      const res = await authApi.getMe();
      return res.data;
    },
  });

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const { team, totalPlayers, totalMatches, won, lost, tied, drawn, recentMatches } = data || {};

  return (
    <div className="space-y-8 transition-colors duration-200">
      {/* Welcome Hero Banner with Cricket Turf Aesthetics */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-900 dark:from-emerald-950/90 dark:via-slate-900 dark:to-slate-900 border-2 border-emerald-500/40 p-6 sm:p-8 shadow-2xl text-white">
        {/* Subtle Pitch Grass Stripe Overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(255,255,255,0.08) 30px, rgba(255,255,255,0.08) 60px)',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 p-0.5 shadow-xl shadow-amber-500/25 shrink-0 hidden sm:block">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                <CricketBallIcon className="w-8 h-8" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2.5 backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Cricket Franchise
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {team?.teamName}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 dark:text-slate-400 mt-1 font-medium">
                Franchise Handle: <span className="font-mono text-white dark:text-slate-200 font-bold">@{team?.username}</span> • {team?.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/squad"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-emerald-900 hover:bg-emerald-50 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Users className="w-4 h-4 font-bold" />
              Manage Squad
            </Link>
            <Link
              to="/gully"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Flame className="w-4 h-4 fill-slate-950" />
              Gully Cricket Mode
            </Link>
          </div>
        </div>
      </div>

      {/* Two Modes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* International Cricket Mode Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 border-2 border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden shadow-lg flex flex-col justify-between transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CrossedBatsIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                MODE 1 • ICC STANDARD
              </span>
              <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">International Cricket</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Formal international matches (T20, ODI, 5-Day Test Matches). Administrator schedules fixtures, configures official Playing XIs, and records ball-by-ball scorecards.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {totalMatches || 0} Matches Recorded
            </span>
            <Link
              to="/history"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View Fixtures <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Gully Cricket Mode Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 border-2 border-amber-500/30 rounded-3xl p-6 relative overflow-hidden shadow-lg flex flex-col justify-between transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/40 flex items-center gap-1.5">
                <CricketStumpsIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                MODE 2 • GULLY CRICKET ARENA
              </span>
              <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Gully Cricket Arena</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Street cricket with custom over allocations, 50/50 squad auto-split, and solo batter Singles Matches with the animated Gully Draft!
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                to="/gully/create-team"
                className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/20 transition-colors"
              >
                + Team Match
              </Link>
              <Link
                to="/gully/create-singles"
                className="text-[11px] font-bold text-orange-700 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1 rounded-xl border border-orange-500/20 transition-colors"
              >
                + Singles Draft
              </Link>
            </div>
            <Link
              to="/gully"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Enter Arena <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Squad Size */}
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Squad</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{totalPlayers || 0}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-semibold">Registered</span>
          </div>
        </div>

        {/* Matches Played */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Matches</span>
            <Trophy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{totalMatches || 0}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-semibold">Completed</span>
          </div>
        </div>

        {/* Won */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Won</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{won || 0}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-semibold">Victories</span>
          </div>
        </div>

        {/* Lost */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-xs font-bold uppercase tracking-wider">Lost</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">{lost || 0}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-semibold">Defeats</span>
          </div>
        </div>

        {/* Tied */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tied</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{tied || 0}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-semibold">Ties</span>
          </div>
        </div>

        {/* Drawn */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-xs font-bold uppercase tracking-wider">Drawn</span>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">{drawn || 0}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-semibold">Tests</span>
          </div>
        </div>
      </div>

      {/* Recent Matches Section */}
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Recent Matches
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your team's latest fixtures and scorecards</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Full Match History <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentMatches && recentMatches.length > 0 ? (
          <div className="space-y-3">
            {recentMatches.map((m: any) => (
              <div
                key={m.id}
                className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{m.format}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {m.matchDate ? format(new Date(m.matchDate), 'dd MMM') : ''}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      vs {m.opponentName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {m.resultDescription || (m.status === 'LIVE' ? 'Match Live in Progress' : 'Upcoming Match')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Link
                    to={m.status === 'LIVE' ? `/live/${m.id}` : `/scorecard/${m.id}`}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      m.status === 'LIVE'
                        ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/30'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                    }`}
                  >
                    {m.status === 'LIVE' ? 'Go to Live Scoring' : 'View Scorecard'}
                  </Link>
                  <button
                    onClick={() => handleDeleteMatch(m.id, m.opponentName)}
                    disabled={deleteMutation.isPending}
                    className="p-2 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition-all hover:scale-105 disabled:opacity-50"
                    title="Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No matches recorded yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto font-medium">
              Matches are scheduled and configured by tournament administrators. Keep your squad roster updated!
            </p>
            <Link
              to="/squad"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Manage Squad
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
