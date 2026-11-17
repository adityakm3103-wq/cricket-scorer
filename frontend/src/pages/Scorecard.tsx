import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchApi } from '../services/api.js';
import { generateAndDownloadMatchPdf } from '../services/pdfExport.js';
import { MatchDetails } from '../types/index.js';
import {
  Download,
  ChevronLeft,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export const Scorecard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedInningsNumber, setSelectedInningsNumber] = useState<number>(1);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (matchId: string) => matchApi.deleteMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matchHistory'] });
      queryClient.invalidateQueries({ queryKey: ['teamDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['adminMatches'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      navigate('/history');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete match');
    },
  });

  const handleDeleteMatch = () => {
    if (!match) return;
    if (confirm(`Are you sure you want to permanently delete this match (${match.teamA.teamName} vs ${match.teamB.teamName})? This will delete all scorecards, overs, and match statistics.`)) {
      deleteMutation.mutate(match.id);
    }
  };

  const { data: match, isLoading } = useQuery<MatchDetails>({
    queryKey: ['match', id],
    queryFn: async () => {
      const res = await matchApi.getMatch(id!);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: testStatus } = useQuery({
    queryKey: ['testStatus', id],
    queryFn: async () => {
      const res = await matchApi.getTestStatus(id!);
      return res.data;
    },
    enabled: !!id && match?.format === 'TEST',
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

  const selectedInnings =
    match.innings.find(i => i.inningsNumber === selectedInningsNumber) || match.innings[0];

  const battingTeam =
    match.teamAId === selectedInnings?.battingTeamId ? match.teamA : match.teamB;
  const bowlingTeam =
    match.teamAId === selectedInnings?.bowlingTeamId ? match.teamA : match.teamB;

  const totalExtras =
    (selectedInnings?.byes || 0) +
    (selectedInnings?.legByes || 0) +
    (selectedInnings?.wides || 0) +
    (selectedInnings?.noBalls || 0) +
    (selectedInnings?.penaltyRuns || 0);

  const handleDownloadPdf = async () => {
    if (!match?.id) return;
    try {
      setIsExportingPdf(true);
      await generateAndDownloadMatchPdf(match.id);
    } catch (err: any) {
      alert(err.message || 'Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto transition-colors duration-200">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/live/${match.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Live Scoring
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExportingPdf ? 'Generating PDF...' : 'Download PDF Scorecard'}
          </button>
          <button
            onClick={handleDeleteMatch}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 transition-all hover:scale-105 disabled:opacity-50"
            title="Permanently delete this match"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Match'}
          </button>
        </div>
      </div>

      {/* Match Summary Header Card */}
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-widest">
              {match.format}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
              {match.matchDate ? format(new Date(match.matchDate), 'dd MMMM yyyy') : ''}
              {match.venue ? ` • ${match.venue}` : ''}
            </span>
          </div>

          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            match.status === 'COMPLETED'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
              : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
          }`}>
            {match.status}
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {match.teamA.teamName} vs {match.teamB.teamName}
          </h1>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {match.resultDescription ||
              (match.tossWinnerId
                ? `${match.tossWinnerId === match.teamAId ? match.teamA.teamName : match.teamB.teamName} won toss & elected to ${match.tossDecision?.toLowerCase()}`
                : 'Match in progress')}
          </p>
        </div>

        {/* Test Match Lead/Trail Banner */}
        {match.format === 'TEST' && testStatus && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs font-medium">
            <div className="flex items-center gap-4">
              <span>
                {match.teamA.teamName}: <strong className="text-slate-900 dark:text-white text-sm">{testStatus.teamA.cumulativeRuns}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span>
                {match.teamB.teamName}: <strong className="text-slate-900 dark:text-white text-sm">{testStatus.teamB.cumulativeRuns}</strong>
              </span>
            </div>
            <div>
              {testStatus.leadRuns > 0 && testStatus.leaderTeam && (
                <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                  {testStatus.leaderTeam.teamName} lead by {testStatus.leadRuns} runs
                </span>
              )}
            </div>
          </div>
        )}

        {/* Innings Tabs */}
        <div className="flex flex-wrap gap-2 pt-2">
          {match.innings.map(inn => {
            const innBatting = inn.battingTeamId === match.teamAId ? match.teamA : match.teamB;
            const isSelected = selectedInningsNumber === inn.inningsNumber;
            return (
              <button
                key={inn.id}
                onClick={() => setSelectedInningsNumber(inn.inningsNumber)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-600 dark:border-emerald-400 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Innings {inn.inningsNumber}: {innBatting.teamName} ({inn.totalRuns}/{inn.wickets})
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Innings Scorecard */}
      {selectedInnings && (
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
          {/* Innings Banner */}
          <div className="bg-slate-100/90 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {battingTeam.teamName} Innings
                {selectedInnings.isDeclared ? ' (Declared)' : ''}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Opponent: {bowlingTeam.teamName}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {selectedInnings.totalRuns}/{selectedInnings.wickets}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono font-medium">
                ({selectedInnings.oversCompletedText} ov)
              </span>
            </div>
          </div>

          {/* Batting Scorecard Table */}
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Batting Scorecard
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Batter</th>
                      <th className="py-2.5 px-3">Dismissal</th>
                      <th className="py-2.5 px-3 text-center">R</th>
                      <th className="py-2.5 px-3 text-center">B</th>
                      <th className="py-2.5 px-3 text-center">4s</th>
                      <th className="py-2.5 px-3 text-center">6s</th>
                      <th className="py-2.5 px-3 text-center">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {selectedInnings.battingScorecards.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <Link
                            to={`/player/${b.playerId}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            {b.player.playerName}
                            {b.notOut ? '*' : ''}
                          </Link>
                          <span className="text-slate-400 text-xs ml-1 font-mono">
                            (#{b.player.jerseyNumber})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {b.notOut ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">not out</span>
                          ) : (
                            b.dismissalText || b.dismissalType?.toLowerCase() || 'out'
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white font-mono">
                          {b.runs}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono">
                          {b.balls}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-mono">
                          {b.fours}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-mono">
                          {b.sixes}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
                          {b.strikeRate.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Extras & Total Row */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 mt-3 flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-200 dark:border-slate-800">
                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  <strong className="text-slate-900 dark:text-slate-200">Extras:</strong> {totalExtras}{' '}
                  <span className="text-slate-400 dark:text-slate-500">
                    (b {selectedInnings.byes}, lb {selectedInnings.legByes}, w {selectedInnings.wides}, nb {selectedInnings.noBalls})
                  </span>
                </div>
                <div className="text-slate-700 dark:text-slate-200 font-medium">
                  <strong className="text-slate-900 dark:text-white">Total:</strong> {selectedInnings.totalRuns}/{selectedInnings.wickets}{' '}
                  <span className="text-slate-500 dark:text-slate-400">({selectedInnings.oversCompletedText} Overs)</span>
                </div>
              </div>
            </div>

            {/* Bowling Scorecard Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Bowling Scorecard
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Bowler</th>
                      <th className="py-2.5 px-3 text-center">O</th>
                      <th className="py-2.5 px-3 text-center">M</th>
                      <th className="py-2.5 px-3 text-center">R</th>
                      <th className="py-2.5 px-3 text-center">W</th>
                      <th className="py-2.5 px-3 text-center">Econ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {selectedInnings.bowlingScorecards.map(bw => (
                      <tr key={bw.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <Link
                            to={`/player/${bw.playerId}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            {bw.player.playerName}
                          </Link>
                          <span className="text-slate-400 text-xs ml-1 font-mono">
                            (#{bw.player.jerseyNumber})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-800 dark:text-slate-200 font-bold">{bw.oversText}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 dark:text-slate-400">{bw.maidens}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">{bw.runsConceded}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{bw.wickets}</td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{bw.economy.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fall of Wickets */}
            {selectedInnings.wicketsList && selectedInnings.wicketsList.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Fall of Wickets
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedInnings.wicketsList.map(w => (
                    <div
                      key={w.id}
                      className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    >
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {w.teamRunsAtFall}-{w.wicketNumber}
                      </strong>{' '}
                      ({w.player.playerName}, {w.overBallText} ov)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
