import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchApi } from '../services/api.js';
import { MatchFormat, MatchStatus } from '../types/index.js';
import {
  History,
  Filter,
  Play,
  FileText,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export const MatchHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const [formatFilter, setFormatFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const deleteMutation = useMutation({
    mutationFn: (matchId: string) => matchApi.deleteMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchHistory'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete match');
    },
  });

  const handleDeleteMatch = (matchId: string, teamAName?: string, teamBName?: string) => {
    const label = teamAName && teamBName ? ` (${teamAName} vs ${teamBName})` : '';
    if (confirm(`Are you sure you want to delete this match${label}? All innings and scoring data will be deleted.`)) {
      deleteMutation.mutate(matchId);
    }
  };

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matchHistory', formatFilter, statusFilter],
    queryFn: async () => {
      const res = await matchApi.listMatches({
        format: (formatFilter as MatchFormat) || undefined,
        status: (statusFilter as MatchStatus) || undefined,
      });
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <History className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            Match History & Fixtures
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse all fixtures involving your team. You can resume any in-progress match anytime.
          </p>
        </div>

        <Link
          to="/create-match"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Create Match
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm transition-colors">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Filter By:
        </div>

        <select
          value={formatFilter}
          onChange={e => setFormatFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
        >
          <option value="">All Formats</option>
          <option value="T10">T10</option>
          <option value="T20">T20</option>
          <option value="ODI">ODI</option>
          <option value="TEST">Test Match</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="LIVE">Live / In Progress</option>
          <option value="UPCOMING">Upcoming</option>
        </select>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : matches && matches.length > 0 ? (
          matches.map((m: any) => (
            <div
              key={m.id}
              className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-3xl p-6 shadow-sm transition-all space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-widest">
                    {m.format}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                    {m.matchDate ? format(new Date(m.matchDate), 'dd MMMM yyyy') : ''}
                    {m.venue ? ` • ${m.venue}` : ''}
                  </span>
                </div>

                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  m.status === 'COMPLETED'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                    : m.status === 'LIVE'
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 animate-pulse'
                    : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                }`}>
                  {m.status}
                </span>
              </div>

              {/* Match Teams and Scores */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {m.teamA.teamName} <span className="text-slate-400 font-normal">vs</span> {m.teamB.teamName}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {m.resultDescription || (m.status === 'LIVE' ? 'Match currently live' : 'Scheduled match')}
                  </p>

                  {/* Innings score chips */}
                  {m.innings && m.innings.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.innings.map((inn: any) => (
                        <span
                          key={inn.inningsNumber}
                          className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1 rounded-xl text-slate-700 dark:text-slate-300 font-medium"
                        >
                          Inn {inn.inningsNumber}: <strong className="text-slate-900 dark:text-white">{inn.totalRuns}/{inn.wickets}</strong> ({inn.oversCompletedText} ov)
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {m.status === 'LIVE' ? (
                    <Link
                      to={`/live/${m.id}`}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Resume Scoring
                    </Link>
                  ) : (
                    <Link
                      to={`/scorecard/${m.id}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Scorecard
                    </Link>
                  )}
                  <button
                    onClick={() => handleDeleteMatch(m.id, m.teamA?.teamName, m.teamB?.teamName)}
                    disabled={deleteMutation.isPending}
                    className="p-2 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition-all hover:scale-105 disabled:opacity-50"
                    title="Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-400">No matches found</p>
            <p className="text-xs text-slate-500 mt-1">
              {formatFilter || statusFilter ? 'Try clearing your filters' : 'Create your first match to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
