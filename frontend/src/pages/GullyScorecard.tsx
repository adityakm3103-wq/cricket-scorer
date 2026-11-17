import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gullyApi } from '../services/api';
import { GullyMatchDetails } from '../types';
import {
  FileText,
  Calendar,
  MapPin,
  Trophy,
  ChevronLeft,
  Flame,
  Shield,
  Clock,
  Users,
  User,
  Sparkles,
  Award,
  Target,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export const GullyScorecard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedInningsNumber, setSelectedInningsNumber] = useState<number>(1);
  const [selectedRoundTab, setSelectedRoundTab] = useState<number>(1);

  const deleteMutation = useMutation({
    mutationFn: () => gullyApi.deleteMatch(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gullyMatches'] });
      queryClient.invalidateQueries({ queryKey: ['gullyMatchHistory'] });
      queryClient.invalidateQueries({ queryKey: ['gullyTeamStats'] });
      navigate('/gully');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to delete match');
    },
  });

  const handleDeleteMatch = () => {
    if (
      window.confirm(
        'Are you sure you want to permanently delete this Gully match? All scorecards, overs, and match records will be removed.'
      )
    ) {
      deleteMutation.mutate();
    }
  };

  const { data: match, isLoading } = useQuery<GullyMatchDetails>({
    queryKey: ['gullyMatch', id],
    queryFn: async () => {
      const res = await gullyApi.getMatch(id!);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-12 text-slate-400">
        Gully Match not found.{' '}
        <Link to="/gully" className="text-amber-400 hover:underline">
          Return to Gully Dashboard
        </Link>
      </div>
    );
  }

  const isSingles = match.matchType === 'SINGLES_MATCH';
  const rounds = match.rounds || [];
  const cumulativeLeaderboard = match.cumulativeLeaderboard || [];

  const selectedInnings =
    match.innings.find(i => i.inningsNumber === selectedInningsNumber) || match.innings[0];

  const totalExtras = selectedInnings
    ? selectedInnings.wides +
      selectedInnings.noBalls +
      selectedInnings.byes +
      selectedInnings.legByes +
      selectedInnings.penaltyRuns
    : 0;

  // Selected Round in Singles Match
  const currentSelectedRound =
    rounds.find(r => r.roundNumber === selectedRoundTab) || rounds[0] || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/gully"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Gully Dashboard
        </Link>
        <button
          onClick={handleDeleteMatch}
          disabled={deleteMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 transition-all hover:scale-105 disabled:opacity-50"
          title="Delete this Gully match"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Match'}
        </button>
      </div>

      {/* Hero Match Summary Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-50 dark:from-amber-950/80 via-white dark:via-slate-900 to-white dark:to-slate-900 border border-amber-200 dark:border-amber-500/30 p-6 sm:p-8 shadow-xl">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 tracking-wider">
                <Flame className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                Gully Cricket
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {match.totalOvers} Overs per Batter
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  match.status === 'COMPLETED'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {match.status}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(match.matchDate), 'MMM d, yyyy')}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {match.venue}
                </span>
              )}
            </div>
          </div>

          {/* Teams / Participants Title */}
          <div className="pt-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isSingles
                ? `Gully Singles Rounds Championship (${match.matchPlayers?.length || 0} Players)`
                : `${match.temporaryTeams?.find(t => t.isTeamA)?.teamName || 'Team A'} vs ${
                    match.temporaryTeams?.find(t => !t.isTeamA)?.teamName || 'Team B'
                  }`}
            </h1>

            {/* In Singles: Quick Leaderboard pills */}
            {isSingles && cumulativeLeaderboard.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Top Scorers:</div>
                {cumulativeLeaderboard.slice(0, 3).map((p, idx) => (
                  <div
                    key={p.playerId}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <span className="font-bold text-amber-600 dark:text-amber-400">#{idx + 1}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{p.playerName}</span>
                    <span className="font-extrabold text-orange-600 dark:text-orange-400">({p.totalRuns}r)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Result Banner */}
          {match.resultDescription && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
              <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>{match.resultDescription}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SINGLES MATCH: INDIVIDUAL ROUNDS STORAGE & GRAND CUMULATIVE SUMMARY       */}
      {/* ========================================================================= */}
      {isSingles ? (
        <div className="space-y-8">
          {/* Round Switcher Tabs */}
          {rounds.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Select Round:
                  </span>
                  <div className="flex items-center gap-2">
                    {rounds.map(r => (
                      <button
                        key={r.roundNumber}
                        type="button"
                        onClick={() => setSelectedRoundTab(r.roundNumber)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedRoundTab === r.roundNumber
                            ? 'bg-orange-500 text-slate-950 shadow-md font-black'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Round {r.roundNumber}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {currentSelectedRound?.inningsList?.length || 0} Batting Turns
                </span>
              </div>

              {/* Individual Round Content */}
              {currentSelectedRound && (
                <div className="space-y-6">
                  {/* Round Leaderboard Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                          Round {currentSelectedRound.roundNumber} Batting Leaderboard
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Batters ranked by runs scored in Round {currentSelectedRound.roundNumber}.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-3 px-4">Rank</th>
                            <th className="py-3 px-4">Batter</th>
                            <th className="py-3 px-4">Dismissal / How Out</th>
                            <th className="py-3 px-3 text-right">Runs</th>
                            <th className="py-3 px-3 text-right">Balls</th>
                            <th className="py-3 px-3 text-right">4s</th>
                            <th className="py-3 px-3 text-right">6s</th>
                            <th className="py-3 px-4 text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                          {currentSelectedRound.roundLeaderboard.map(item => (
                            <tr key={item.inningsId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 font-black text-amber-600 dark:text-amber-400">
                                {item.rank === 1 ? '🥇 #1' : item.rank === 2 ? '🥈 #2' : item.rank === 3 ? '🥉 #3' : `#${item.rank}`}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{item.playerName}</span>
                                {item.notOut && <span className="text-amber-500 dark:text-amber-400 font-extrabold">*</span>}
                              </td>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                                {item.notOut ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">not out</span>
                                ) : (
                                  item.dismissalText || 'out'
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white text-sm">
                                {item.runs}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{item.balls}</td>
                              <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{item.fours}</td>
                              <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{item.sixes}</td>
                              <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                {item.strikeRate.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detailed Innings & Bowling figures for each batter in this round */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      Individual Batting & Bowling Turns (Round {currentSelectedRound.roundNumber})
                    </h4>

                    {currentSelectedRound.inningsList.map((inn, turnIdx) => {
                      const bCard = inn.battingScorecards[0];
                      const bowlingCards = inn.bowlingScorecards || [];

                      return (
                        <div
                          key={inn.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-2"
                        >
                          {/* Turn Header */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black text-xs flex items-center justify-center">
                                #{turnIdx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                  {bCard?.player?.playerName || inn.battingTeamName}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                  {bCard?.notOut ? '(Not Out)' : `(${bCard?.dismissalText || 'Out'})`}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                                {inn.totalRuns} runs
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 font-mono">
                                ({inn.oversCompletedText} ov)
                              </span>
                            </div>
                          </div>

                          {/* Bowling figures against this batter */}
                          <div className="p-4">
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">
                              Bowling Attack Figures:
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 uppercase text-[9px] font-bold">
                                  <tr>
                                    <th className="py-2 px-3">Bowler</th>
                                    <th className="py-2 px-2 text-right">O</th>
                                    <th className="py-2 px-2 text-right">M</th>
                                    <th className="py-2 px-2 text-right">R (Given)</th>
                                    <th className="py-2 px-2 text-right">W</th>
                                    <th className="py-2 px-3 text-right">Econ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                                  {bowlingCards.map(bowl => (
                                    <tr key={bowl.id}>
                                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                                        {bowl.player.playerName}
                                      </td>
                                      <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">
                                        {bowl.oversText}
                                      </td>
                                      <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">
                                        {bowl.maidens}
                                      </td>
                                      <td className="py-2 px-2 text-right font-bold text-slate-800 dark:text-slate-200">
                                        {bowl.runsConceded}
                                      </td>
                                      <td className="py-2 px-2 text-right font-black text-rose-600 dark:text-rose-400">
                                        {bowl.wickets}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                                        {bowl.economy.toFixed(1)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* GRAND TOURNAMENT LEADERBOARD & TOTALS (AT THE LAST, AS REQUESTED)          */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-b from-amber-50/50 dark:from-slate-900 to-white dark:to-slate-950 border-2 border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <div className="p-6 border-b border-amber-500/20 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  OVERALL GRAND SUMMARY
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                  Total Scores & Bowling Wickets (All Rounds)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Cumulative tournament performance: Total runs scored, wickets taken, and runs given across all rounds!
                </p>
              </div>

              {match.winnerName && (
                <div className="bg-white dark:bg-slate-950/90 border border-amber-500/40 px-4 py-2.5 rounded-2xl text-right shadow-sm">
                  <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Tournament Champion</div>
                  <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5 justify-end">
                    <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    {match.winnerName}
                  </div>
                </div>
              )}
            </div>

            {/* Comprehensive Grand Leaderboard Table */}
            <div className="overflow-x-auto p-4 sm:p-6 pt-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    {/* Batting metrics */}
                    <th className="py-3 px-3 text-right text-amber-600 dark:text-amber-400 font-extrabold">Total Runs</th>
                    <th className="py-3 px-2 text-right">Balls</th>
                    <th className="py-3 px-2 text-right">4s</th>
                    <th className="py-3 px-2 text-right">6s</th>
                    <th className="py-3 px-3 text-right">Bat SR</th>
                    {/* Bowling metrics */}
                    <th className="py-3 px-3 text-right text-rose-600 dark:text-rose-400 font-extrabold">Wickets Taken</th>
                    <th className="py-3 px-3 text-right text-cyan-600 dark:text-cyan-400 font-bold">Runs Given</th>
                    <th className="py-3 px-2 text-right">Overs Bowled</th>
                    <th className="py-3 px-3 text-right">Bowl Econ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {cumulativeLeaderboard.map(p => {
                    const isChampion = p.rank === 1;
                    return (
                      <tr
                        key={p.playerId}
                        className={`transition-colors ${
                          isChampion
                            ? 'bg-amber-50 dark:bg-amber-500/10 font-bold hover:bg-amber-100/50 dark:hover:bg-amber-500/15'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-3 font-black text-amber-600 dark:text-amber-400">
                          {p.rank === 1 ? '🥇 #1' : p.rank === 2 ? '🥈 #2' : p.rank === 3 ? '🥉 #3' : `#${p.rank}`}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{p.playerName}</span>
                          <span className="font-mono text-[10px] text-slate-500">#{p.jerseyNumber}</span>
                          {isChampion && (
                            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">
                              CHAMPION
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white text-base">
                          {p.totalRuns}
                        </td>
                        <td className="py-3.5 px-2 text-right text-slate-500 dark:text-slate-400">{p.totalBalls}</td>
                        <td className="py-3.5 px-2 text-right text-slate-500 dark:text-slate-400">{p.fours}</td>
                        <td className="py-3.5 px-2 text-right text-slate-500 dark:text-slate-400">{p.sixes}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          {p.strikeRate.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                          {p.totalWickets}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                          {p.runsConceded}
                        </td>
                        <td className="py-3.5 px-2 text-right text-slate-500 dark:text-slate-400">{p.oversText}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                          {p.economy.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TEAM MATCH SCORECARD (Standard Team Layout)                                */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Innings Switcher for Team Match */}
          {match.innings.length > 1 && (
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              {match.innings.map(inn => (
                <button
                  key={inn.id}
                  onClick={() => setSelectedInningsNumber(inn.inningsNumber)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedInningsNumber === inn.inningsNumber
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  Innings {inn.inningsNumber} ({inn.battingTeamName})
                </button>
              ))}
            </div>
          )}

          {selectedInnings && (
            <div className="space-y-6">
              {/* Batting Scorecard */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      {selectedInnings.battingTeamName} Batting Scorecard
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                      {selectedInnings.totalRuns}/{selectedInnings.wickets}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-1.5">
                      ({selectedInnings.oversCompletedText} ov)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Batter</th>
                        <th className="py-3 px-4">Dismissal</th>
                        <th className="py-3 px-3 text-right">R</th>
                        <th className="py-3 px-3 text-right">B</th>
                        <th className="py-3 px-3 text-right">4s</th>
                        <th className="py-3 px-3 text-right">6s</th>
                        <th className="py-3 px-4 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {selectedInnings.battingScorecards?.map(card => (
                        <tr key={card.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{card.player.playerName}</span>
                            {card.notOut && <span className="text-amber-500 dark:text-amber-400 font-extrabold">*</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                            {card.notOut ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">not out</span>
                            ) : (
                              card.dismissalText || 'out'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white text-sm">{card.runs}</td>
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{card.balls}</td>
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{card.fours}</td>
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{card.sixes}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                            {card.strikeRate ? card.strikeRate.toFixed(1) : '0.0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Extras Row */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">
                    Extras:{' '}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {totalExtras} (w {selectedInnings.wides}, nb {selectedInnings.noBalls}, b{' '}
                      {selectedInnings.byes}, lb {selectedInnings.legByes})
                    </span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">
                    Total:{' '}
                    <span className="font-black text-slate-900 dark:text-white text-sm">
                      {selectedInnings.totalRuns}/{selectedInnings.wickets}
                    </span>{' '}
                    in {selectedInnings.oversCompletedText} overs
                  </span>
                </div>
              </div>

              {/* Bowling Scorecard */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    {selectedInnings.bowlingTeamName} Bowling Scorecard
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Bowler</th>
                        <th className="py-3 px-3 text-right">O</th>
                        <th className="py-3 px-3 text-right">M</th>
                        <th className="py-3 px-3 text-right">R</th>
                        <th className="py-3 px-3 text-right">W</th>
                        <th className="py-3 px-3 text-right">Wd</th>
                        <th className="py-3 px-3 text-right">Nb</th>
                        <th className="py-3 px-4 text-right">Econ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {selectedInnings.bowlingScorecards?.map(card => (
                        <tr key={card.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {card.player.playerName}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{card.oversText}</td>
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{card.maidens}</td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">{card.runsConceded}</td>
                          <td className="py-3 px-3 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                            {card.wickets}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{card.wides}</td>
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">{card.noBalls}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                            {card.economy ? card.economy.toFixed(1) : '0.0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
