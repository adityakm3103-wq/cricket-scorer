import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gullyApi } from '../services/api.js';
import { GullyMatchDetails, GullyMatchType, MatchStatus } from '../types/index.js';
import {
  Flame,
  History,
  Filter,
  Play,
  FileText,
  Calendar,
  Trophy,
  ChevronRight,
  PlusCircle,
  Users,
  User,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export const GullyMatchHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const deleteMutation = useMutation({
    mutationFn: (matchId: string) => gullyApi.deleteMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gullyMatchHistory'] });
      queryClient.invalidateQueries({ queryKey: ['gullyMatches'] });
      queryClient.invalidateQueries({ queryKey: ['gullyTeamStats'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to delete Gully match');
    },
  });

  const handleDeleteMatch = (matchId: string) => {
    if (
      window.confirm(
        'Are you sure you want to permanently delete this Gully match? All scorecards, overs, and match records will be removed.'
      )
    ) {
      deleteMutation.mutate(matchId);
    }
  };

  const { data: matches, isLoading } = useQuery<GullyMatchDetails[]>({
    queryKey: ['gullyMatchHistory', matchTypeFilter, statusFilter],
    queryFn: async () => {
      const res = await gullyApi.listMatches({
        matchType: (matchTypeFilter as GullyMatchType) || undefined,
        status: (statusFilter as MatchStatus) || undefined,
      });
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Flame className="w-8 h-8 text-amber-500 dark:text-amber-400" />
            Gully Cricket Fixtures & History
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Browse all Team and Singles matches played by your squad. Resuming live matches or viewing scorecards is always available.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/gully/create-team"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Team Match
          </Link>
          <Link
            to="/gully/create-singles"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            Singles Draft
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Filter className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          Filter:
        </div>

        {/* Match Type */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {[
            { id: '', label: 'All Types' },
            { id: 'TEAM_MATCH', label: 'Team Matches' },
            { id: 'SINGLES_MATCH', label: 'Singles Matches' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setMatchTypeFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                matchTypeFilter === f.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 ml-auto">
          {[
            { id: '', label: 'All Status' },
            { id: 'LIVE', label: 'Live' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'UPCOMING', label: 'Upcoming' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === s.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Matches List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      ) : !matches || matches.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-600 dark:text-slate-400 space-y-3 shadow-sm">
          <Flame className="w-10 h-10 text-amber-500/40 mx-auto" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">No Gully matches match your filter criteria.</p>
          <button
            onClick={() => {
              setMatchTypeFilter('');
              setStatusFilter('');
            }}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(m => {
            const isSingles = m.matchType === 'SINGLES_MATCH';
            const isLive = m.status === 'LIVE';
            const isCompleted = m.status === 'COMPLETED';

            const teamA = m.temporaryTeams?.find(t => t.isTeamA)?.teamName || 'Team A';
            const teamB = m.temporaryTeams?.find(t => !t.isTeamA)?.teamName || 'Team B';

            const inn1 = m.innings?.[0];
            const inn2 = m.innings?.[1];

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 transition-all shadow-sm dark:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider border ${
                        isSingles
                          ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isSingles ? 'Singles Match' : 'Team Match'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {m.totalOvers} Overs
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        isLive
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-pulse'
                          : isCompleted
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {isSingles ? `${m.selectedBatter?.playerName} (Solo Batter) vs Bowlers XI` : `${teamA} vs ${teamB}`}
                  </h3>

                  {/* Innings score breakdown */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-3">
                    {inn1 && (
                      <span>
                        {inn1.battingTeamName}:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {inn1.totalRuns}/{inn1.wickets}
                        </strong>{' '}
                        ({inn1.oversCompletedText} ov)
                      </span>
                    )}
                    {inn2 && (
                      <span>
                        • {inn2.battingTeamName}:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {inn2.totalRuns}/{inn2.wickets}
                        </strong>{' '}
                        ({inn2.oversCompletedText} ov)
                      </span>
                    )}
                  </div>

                  {m.resultDescription && (
                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                      <Trophy className="w-3.5 h-3.5" />
                      {m.resultDescription}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCompleted ? (
                    <Link
                      to={`/gully/scorecard/${m.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Scorecard
                    </Link>
                  ) : (
                    <Link
                      to={`/gully/live/${m.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md shadow-amber-500/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      Resume
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteMatch(m.id)}
                    disabled={deleteMutation.isPending}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700/60 hover:border-rose-300 dark:hover:border-rose-500/40 transition-colors shrink-0 disabled:opacity-50"
                    title="Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
