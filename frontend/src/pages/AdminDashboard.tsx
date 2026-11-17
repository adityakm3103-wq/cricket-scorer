import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api.js';
import { CricketBallIcon, CricketStumpsIcon } from '../components/CricketIcons.js';
import {
  ShieldAlert,
  Users,
  Trophy,
  PlusCircle,
  CheckCircle,
  Clock,
  Search,
  Eye,
  X,
  Radio,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'matches'>('overview');
  const [teamSearch, setTeamSearch] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState<string>('');
  const [selectedTeamModal, setSelectedTeamModal] = useState<any | null>(null);

  // 1. Admin KPI metrics
  const { data: dashboard } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await adminApi.getDashboard();
      return res.data;
    },
  });

  // 2. All Registered Teams
  const { data: teams } = useQuery({
    queryKey: ['adminTeams'],
    queryFn: async () => {
      const res = await adminApi.getAllTeams();
      return res.data;
    },
  });

  // 3. All Matches
  const { data: matches } = useQuery({
    queryKey: ['adminMatches', matchStatusFilter],
    queryFn: async () => {
      const res = await adminApi.getAllMatches({ status: matchStatusFilter as any });
      return res.data;
    },
  });

  // Toggle Team Active status
  const toggleTeamMutation = useMutation({
    mutationFn: ({ teamId, isActive }: { teamId: string; isActive: boolean }) =>
      adminApi.updateTeamStatus(teamId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update team status');
    },
  });

  // Cancel match mutation
  const cancelMatchMutation = useMutation({
    mutationFn: (matchId: string) => adminApi.cancelMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to cancel match');
    },
  });

  // Delete match mutation (permanent admin delete)
  const deleteMatchMutation = useMutation({
    mutationFn: (matchId: string) => adminApi.deleteMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete match');
    },
  });

  const handleDeleteMatch = (matchId: string, teamAName?: string, teamBName?: string) => {
    const matchLabel = teamAName && teamBName ? ` (${teamAName} vs ${teamBName})` : '';
    if (confirm(`Are you sure you want to permanently delete this match${matchLabel}? All scorecards, overs, and match statistics will be permanently removed.`)) {
      deleteMatchMutation.mutate(matchId);
    }
  };

  const handleToggleActive = (teamId: string, currentStatus: boolean, teamName: string) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} ${teamName}'s account?`)) {
      toggleTeamMutation.mutate({ teamId, isActive: !currentStatus });
    }
  };

  const handleCancelMatch = (matchId: string) => {
    if (confirm('Are you sure you want to cancel this match? This action marks the match as abandoned.')) {
      cancelMatchMutation.mutate(matchId);
    }
  };

  const filteredTeams = teams?.filter(
    (t: any) =>
      t.teamName.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.username.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(teamSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2 transition-colors duration-200">
      {/* Admin Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-950 border border-indigo-500/30 p-6 sm:p-8 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 p-0.5 shadow-xl shadow-amber-500/20 shrink-0 hidden sm:block">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                <CricketBallIcon className="w-8 h-8" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Tournament Director Console
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Tournament & Match Administration
              </h1>
              <p className="text-xs text-slate-300 dark:text-slate-400 mt-1.5 max-w-2xl">
                Global authority to schedule fixtures, supervise Playing XIs, manage franchises, and monitor live ball-by-ball scorecards.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/create-match"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              Create & Schedule Match
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-6 border-t border-slate-700/80 dark:border-slate-800/80 mt-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 dark:text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'teams'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 dark:text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Registered Teams ({teams?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'matches'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 dark:text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Match Supervision ({dashboard?.totalMatches || 0})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Teams</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{dashboard?.totalTeams || 0}</span>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Players</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{dashboard?.totalPlayers || 0}</span>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">All Matches</span>
            <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{dashboard?.totalMatches || 0}</span>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{dashboard?.upcomingMatches || 0}</span>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Now</span>
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">{dashboard?.liveMatches || 0}</span>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{dashboard?.completedMatches || 0}</span>
          </div>
        </div>
      </div>

      {/* Tab Content 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Recent Matches Across Competition
              </h2>
              <button
                onClick={() => setActiveTab('matches')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View All Matches
              </button>
            </div>

            {dashboard?.recentMatches && dashboard.recentMatches.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentMatches.map((m: any) => (
                  <div
                    key={m.id}
                    className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
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
                          {m.teamA.teamName} vs {m.teamB.teamName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          {m.resultDescription || (m.status === 'LIVE' ? 'Live match in progress' : 'Scheduled match')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {m.status === 'LIVE' ? (
                        <Link
                          to={`/live/${m.id}`}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-sm"
                        >
                          Score / Monitor
                        </Link>
                      ) : (
                        <Link
                          to={`/scorecard/${m.id}`}
                          className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                        >
                          Scorecard
                        </Link>
                      )}
                      <button
                        onClick={() => handleDeleteMatch(m.id, m.teamA?.teamName, m.teamB?.teamName)}
                        disabled={deleteMatchMutation.isPending}
                        className="p-1.5 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition-all hover:scale-105 disabled:opacity-50"
                        title="Permanently Delete Match"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">No matches registered yet</div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Team Management */}
      {activeTab === 'teams' && (
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Team Accounts & Squad Control
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">View team rosters, performance, and toggle active status</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder="Search teams by name or email..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="py-3 px-3">Team Name</th>
                  <th className="py-3 px-3">Handle</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3 text-center">Players</th>
                  <th className="py-3 px-3 text-center">Matches</th>
                  <th className="py-3 px-3 text-center">W / L / T</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {filteredTeams?.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{t.teamName}</td>
                    <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">@{t.username}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{t.email}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">{t.totalPlayers}</td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{t.matchesPlayed}</td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t.wins}</span> /{' '}
                      <span className="text-red-600 dark:text-red-400 font-bold">{t.losses}</span> /{' '}
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{t.ties}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                        }`}
                      >
                        {t.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            const res = await adminApi.getTeamDetails(t.id);
                            setSelectedTeamModal(res.data);
                          }}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="w-3 h-3" /> View Roster
                        </button>

                        <button
                          onClick={() => handleToggleActive(t.id, t.isActive, t.teamName)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                            t.isActive
                              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                          }`}
                        >
                          {t.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Match Supervision */}
      {activeTab === 'matches' && (
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Match Management & Supervision
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">All matches across all registered formats</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={matchStatusFilter}
                onChange={e => setMatchStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="LIVE">Live</option>
                <option value="COMPLETED">Completed</option>
                <option value="ABANDONED">Cancelled / Abandoned</option>
              </select>

              <Link
                to="/create-match"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Create Match
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {matches?.map((m: any) => (
              <div
                key={m.id}
                className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
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
                      {m.teamA.teamName} vs {m.teamB.teamName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {m.resultDescription || `Status: ${m.status}`}
                    </p>
                    {m.venue && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Venue: {m.venue}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {m.status === 'LIVE' ? (
                    <Link
                      to={`/live/${m.id}`}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-sm"
                    >
                      Live Scoring
                    </Link>
                  ) : m.status === 'UPCOMING' ? (
                    <>
                      <Link
                        to={`/toss/${m.id}`}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-sm"
                      >
                        Start Toss
                      </Link>
                      <button
                        onClick={() => handleCancelMatch(m.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20"
                      >
                        Cancel Match
                      </button>
                    </>
                  ) : (
                    <Link
                      to={`/scorecard/${m.id}`}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      Scorecard
                    </Link>
                  )}
                  <button
                    onClick={() => handleDeleteMatch(m.id, m.teamA?.teamName, m.teamB?.teamName)}
                    disabled={deleteMatchMutation.isPending}
                    className="p-1.5 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition-all hover:scale-105 disabled:opacity-50"
                    title="Permanently Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Roster Modal */}
      {selectedTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-colors duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[85vh] overflow-y-auto transition-colors duration-200">
            <button
              onClick={() => setSelectedTeamModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedTeamModal.teamName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                @{selectedTeamModal.username} • {selectedTeamModal.email} • {selectedTeamModal.players?.length || 0} Players Registered
              </p>
            </div>

            <div className="space-y-2">
              {selectedTeamModal.players?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedTeamModal.players.map((p: any) => (
                    <div
                      key={p.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                          #{p.jerseyNumber}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{p.playerName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{p.role}</div>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-600 dark:text-slate-300">
                        <div><strong className="text-emerald-600 dark:text-emerald-400">{p.runsScored}</strong> runs</div>
                        <div><strong className="text-blue-600 dark:text-blue-400">{p.wicketsTaken}</strong> wkts</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  No registered players in this squad yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
