import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchApi } from '../services/api.js';
import { useMatchSocket } from '../services/socket.js';
import {
  MatchDetails,
  ExtraType,
  DismissalType,
  Player,
} from '../types/index.js';
import { ScoreButton } from '../components/ScoreButton.js';
import { WicketModal } from '../components/WicketModal.js';
import { BowlerSelectModal } from '../components/BowlerSelectModal.js';
import { TestMatchControls } from '../components/TestMatchControls.js';
import { CricketBallIcon, CrossedBatsIcon, CricketStumpsIcon } from '../components/CricketIcons.js';
import {
  Trophy,
  RotateCcw,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
  X,
  Play,
  Users,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const LiveScoring: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => matchApi.deleteMatch(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matchHistory'] });
      queryClient.invalidateQueries({ queryKey: ['teamDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['adminMatches'] });
      navigate('/history');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete match');
    },
  });

  const handleDeleteMatch = () => {
    if (!match) return;
    if (confirm(`Are you sure you want to permanently delete this match (${match.teamA.teamName} vs ${match.teamB.teamName})? This will delete all live scoring data.`)) {
      deleteMutation.mutate();
    }
  };

  // Modals
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraType>('WIDE');
  const [extraRunningRuns, setExtraRunningRuns] = useState<number>(0);
  const [extraBatRuns, setExtraBatRuns] = useState<number>(0);

  // Dedicated Bye / Leg-Bye Modal
  const [isByeModalOpen, setIsByeModalOpen] = useState(false);
  const [byeModalType, setByeModalType] = useState<'BYE' | 'LEG_BYE'>('BYE');

  // Fetch Match Details
  const { data: match, refetch, isLoading } = useQuery<MatchDetails>({
    queryKey: ['match', id],
    queryFn: async () => {
      const res = await matchApi.getMatch(id!);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: false,
  });

  // Test match status query (if format is TEST)
  const { data: testStatus, refetch: refetchTestStatus } = useQuery({
    queryKey: ['testStatus', id],
    queryFn: async () => {
      const res = await matchApi.getTestStatus(id!);
      return res.data;
    },
    enabled: !!id && match?.format === 'TEST',
  });

  // Real-time Socket.IO Hook
  useMatchSocket(id, updatedMatch => {
    queryClient.setQueryData(['match', id], updatedMatch);
    if (match?.format === 'TEST') {
      refetchTestStatus();
    }
  });

  const currentInnings = match?.innings?.find(
    i => i.inningsNumber === match.currentInningsNumber
  ) || match?.innings?.[0];

  const battingTeam = match?.teamAId === currentInnings?.battingTeamId ? match?.teamA : match?.teamB;
  const bowlingTeam = match?.teamAId === currentInnings?.bowlingTeamId ? match?.teamA : match?.teamB;

  // Playing XI lists
  const battingPlayingXI = match?.matchPlayers
    ?.filter(mp => mp.teamId === currentInnings?.battingTeamId && mp.isPlayingXI)
    ?.map(mp => mp.player) || [];

  const bowlingPlayingXI = match?.matchPlayers
    ?.filter(mp => mp.teamId === currentInnings?.bowlingTeamId && mp.isPlayingXI)
    ?.map(mp => mp.player) || [];

  // Active Players (with fallback to playing XI)
  const strikerCard = currentInnings?.battingScorecards?.find(
    b => b.playerId === currentInnings.currentStrikerId
  );
  const nonStrikerCard = currentInnings?.battingScorecards?.find(
    b => b.playerId === currentInnings.currentNonStrikerId
  );
  const currentBowlerCard = currentInnings?.bowlingScorecards?.find(
    b => b.playerId === currentInnings.currentBowlerId
  );

  const striker = strikerCard?.player || battingPlayingXI.find(p => p.id === currentInnings?.currentStrikerId);
  const nonStriker = nonStrikerCard?.player || battingPlayingXI.find(p => p.id === currentInnings?.currentNonStrikerId);
  const currentBowler = currentBowlerCard?.player || bowlingPlayingXI.find(p => p.id === currentInnings?.currentBowlerId);

  // Incoming Batters available (excluding current striker, non-striker, and dismissed batters)
  const dismissedFromScorecards = currentInnings?.battingScorecards?.filter(b => !b.notOut).map(b => b.playerId) || [];
  const dismissedFromWickets = currentInnings?.wicketsList?.map(w => w.playerId) || [];
  const allDismissedIds = Array.from(new Set([...dismissedFromScorecards, ...dismissedFromWickets]));
  const availableIncomingBatters = battingPlayingXI.filter(
    p =>
      p.id !== currentInnings?.currentStrikerId &&
      p.id !== currentInnings?.currentNonStrikerId &&
      !allDismissedIds.includes(p.id)
  );

  const isAllOutNext = availableIncomingBatters.length === 0;

  // Opening players selection state (e.g. for Innings 1 or Innings 2)
  const [openingStrikerId, setOpeningStrikerId] = useState('');
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState('');
  const [openingBowlerId, setOpeningBowlerId] = useState('');
  const [openersError, setOpenersError] = useState('');

  const needsOpeningPlayers =
    match?.status !== 'COMPLETED' &&
    currentInnings?.status === 'IN_PROGRESS' &&
    (!currentInnings?.currentStrikerId || !currentInnings?.currentNonStrikerId || !currentInnings?.currentBowlerId);

  const setupOpenersMutation = useMutation({
    mutationFn: () =>
      matchApi.selectOpeningPlayers(id!, {
        strikerId: openingStrikerId,
        nonStrikerId: openingNonStrikerId,
        bowlerId: openingBowlerId,
        inningsNumber: currentInnings?.inningsNumber || 1,
      }),
    onSuccess: (res: any) => {
      queryClient.setQueryData(['match', id], res.data.match || res.data);
      refetch();
      setOpeningStrikerId('');
      setOpeningNonStrikerId('');
      setOpeningBowlerId('');
      setOpenersError('');
    },
    onError: (err: any) => {
      setOpenersError(err.response?.data?.message || 'Failed to set opening players');
    },
  });

  const handleStartInnings = (e: React.FormEvent) => {
    e.preventDefault();
    setOpenersError('');
    if (!openingStrikerId || !openingNonStrikerId || !openingBowlerId) {
      setOpenersError('Please select striker, non-striker, and opening bowler');
      return;
    }
    if (openingStrikerId === openingNonStrikerId) {
      setOpenersError('Striker and non-striker must be different players');
      return;
    }
    setupOpenersMutation.mutate();
  };

  // Prompt next bowler when over is completed and currentBowlerId is null
  const shouldPromptNextBowler =
    currentInnings?.status === 'IN_PROGRESS' &&
    currentInnings.currentBowlerId === null &&
    currentInnings.legalBalls > 0 &&
    currentInnings.legalBalls % 6 === 0;

  // Delivery mutation
  const deliveryMutation = useMutation({
    mutationFn: (data: any) => matchApi.scoreDelivery(id!, data),
    onSuccess: (res: any) => {
      queryClient.setQueryData(['match', id], res.data.match);
      if (res.data.match.status === 'COMPLETED') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      if (match?.format === 'TEST') refetchTestStatus();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to record delivery');
    },
  });

  // Undo delivery mutation
  const undoMutation = useMutation({
    mutationFn: () => matchApi.undoLastDelivery(id!),
    onSuccess: (res: any) => {
      queryClient.setQueryData(['match', id], res.data.match);
      if (match?.format === 'TEST') refetchTestStatus();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to undo delivery');
    },
  });

  // Bowler change mutation
  const bowlerChangeMutation = useMutation({
    mutationFn: (bowlerId: string) => matchApi.changeBowler(id!, bowlerId),
    onSuccess: (res: any) => {
      queryClient.setQueryData(['match', id], res.data.match);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to change bowler');
    },
  });

  // Test Match actions
  const advanceSessionMutation = useMutation({
    mutationFn: () => matchApi.advanceSession(id!),
    onSuccess: () => refetch(),
  });
  const advanceDayMutation = useMutation({
    mutationFn: () => matchApi.advanceDay(id!),
    onSuccess: () => refetch(),
  });
  const declareMutation = useMutation({
    mutationFn: () => matchApi.declareInnings(id!),
    onSuccess: () => refetch(),
  });
  const followOnMutation = useMutation({
    mutationFn: (enforce: boolean) => matchApi.handleFollowOn(id!, enforce),
    onSuccess: () => refetch(),
  });

  // Scoring Handlers
  const handleScoreRun = (runs: number) => {
    if (runs === 4 || runs === 6) {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    }
    deliveryMutation.mutate({
      batterRuns: runs,
      extraType: 'NONE',
    });
  };

  const openExtrasModal = (type: ExtraType) => {
    setSelectedExtraType(type);
    setExtraRunningRuns(0);
    setExtraBatRuns(0);
    setIsExtrasModalOpen(true);
  };

  const openByeModal = (type: 'BYE' | 'LEG_BYE') => {
    setByeModalType(type);
    setIsByeModalOpen(true);
  };

  const handleScoreByeOrLegBye = (runs: number) => {
    setIsByeModalOpen(false);
    deliveryMutation.mutate({
      batterRuns: 0,
      extraType: byeModalType,
      extraRuns: runs,
    });
  };

  const handleConfirmExtras = () => {
    setIsExtrasModalOpen(false);
    deliveryMutation.mutate({
      batterRuns: selectedExtraType === 'NO_BALL' ? extraBatRuns : 0,
      extraType: selectedExtraType,
      extraRuns: extraRunningRuns,
    });
  };

  const handleConfirmWicket = (wicketData: any) => {
    setIsWicketModalOpen(false);
    deliveryMutation.mutate({
      ...wicketData,
      isWicket: true,
      extraType: 'NONE',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!match || !currentInnings) {
    return <div className="text-center py-12 text-slate-400">Match details not found</div>;
  }

  // Chase calculations
  const isChasing = !!currentInnings.targetRuns;
  const runsRequired = isChasing ? Math.max(0, currentInnings.targetRuns! - currentInnings.totalRuns) : null;
  const maxOvers = match.format === 'T10' ? 10 : match.format === 'T20' ? 20 : match.format === 'ODI' ? 50 : null;
  const totalAllottedBalls = maxOvers ? maxOvers * 6 : null;
  const ballsRemaining = totalAllottedBalls ? Math.max(0, totalAllottedBalls - currentInnings.legalBalls) : null;
  const currentRunRate = currentInnings.legalBalls > 0
    ? ((currentInnings.totalRuns / currentInnings.legalBalls) * 6).toFixed(2)
    : '0.00';
  const requiredRunRate = isChasing && ballsRemaining && ballsRemaining > 0
    ? ((runsRequired! / ballsRemaining) * 6).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      {/* Match Completed Banner */}
      {match.status === 'COMPLETED' && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-3 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-slate-950/20 px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-4 h-4" /> Match Completed
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {match.resultDescription || 'Match Finished'}
          </h2>
          <div className="pt-2 flex items-center justify-center gap-4">
            <Link
              to={`/scorecard/${match.id}`}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-950 text-emerald-400 hover:bg-slate-900 transition-colors shadow-lg shadow-black/20"
            >
              View Full Scorecard & PDF
            </Link>
          </div>
        </div>
      )}

      {/* Main Scoreboard Header Card */}
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors">
        {/* Match Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-widest">
              {match.format}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {battingTeam?.teamName} vs {bowlingTeam?.teamName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/scorecard/${match.id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Scorecard
            </Link>
            <button
              onClick={() => undoMutation.mutate()}
              disabled={undoMutation.isPending || currentInnings.deliveries.length === 0}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-500/20 disabled:opacity-40 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo Ball
            </button>
            <button
              onClick={handleDeleteMatch}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 disabled:opacity-40 transition-colors hover:scale-105"
              title="Delete Match"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>

        {/* Big Score Board Display */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
              Innings {currentInnings.inningsNumber} • {battingTeam?.teamName} Batting
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentInnings.totalRuns}
                <span className="text-red-500 font-extrabold">/{currentInnings.wickets}</span>
              </span>
              <span className="text-2xl font-bold text-slate-500 dark:text-slate-400 font-mono">
                ({currentInnings.oversCompletedText}{maxOvers ? ` / ${maxOvers}` : ''} ov)
              </span>
            </div>
          </div>

          {/* Run Rates & Target Info */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">CRR</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">{currentRunRate}</span>
            </div>

            {isChasing && (
              <>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Target</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">{currentInnings.targetRuns}</span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Need</span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {runsRequired} off {ballsRemaining} b
                  </span>
                </div>
                {requiredRunRate && (
                  <>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">RRR</span>
                      <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">{requiredRunRate}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Active Batters & Current Bowler Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Striker Batter */}
          <div className={`p-4 rounded-2xl border transition-all ${
            striker
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <CrossedBatsIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                STRIKER *
              </span>
              <span className="text-slate-500 dark:text-slate-400">SR: {strikerCard?.strikeRate.toFixed(1) || '0.0'}</span>
            </div>

            <div className="font-extrabold text-base text-slate-900 dark:text-white truncate">
              {striker ? `${striker.playerName} (#${striker.jerseyNumber})` : 'No Striker'}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{strikerCard?.runs || 0}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">({strikerCard?.balls || 0} balls)</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-mono">
                {strikerCard?.fours || 0}x4, {strikerCard?.sixes || 0}x6
              </span>
            </div>
          </div>

          {/* Non-Striker Batter */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">
              <span>NON-STRIKER</span>
              <span>SR: {nonStrikerCard?.strikeRate.toFixed(1) || '0.0'}</span>
            </div>

            <div className="font-extrabold text-base text-slate-800 dark:text-slate-200 truncate">
              {nonStriker ? `${nonStriker.playerName} (#${nonStriker.jerseyNumber})` : 'No Non-Striker'}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{nonStrikerCard?.runs || 0}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">({nonStrikerCard?.balls || 0} balls)</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-mono">
                {nonStrikerCard?.fours || 0}x4, {nonStrikerCard?.sixes || 0}x6
              </span>
            </div>
          </div>

          {/* Current Bowler */}
          <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 shadow-sm">
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <CricketBallIcon className="w-3.5 h-3.5" />
                CURRENT BOWLER
              </span>
              <span>Econ: {currentBowlerCard?.economy.toFixed(2) || '0.00'}</span>
            </div>

            <div className="font-extrabold text-base text-slate-900 dark:text-white truncate">
              {currentBowler ? `${currentBowler.playerName} (#${currentBowler.jerseyNumber})` : 'Awaiting Bowler'}
            </div>

            <div className="mt-2 flex items-baseline gap-2 font-mono">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{currentBowlerCard?.wickets || 0}</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">/ {currentBowlerCard?.runsConceded || 0}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                {currentBowlerCard?.oversText || '0.0'} ov ({currentBowlerCard?.maidens || 0}M)
              </span>
            </div>
          </div>
        </div>

        {/* Recent Deliveries in Current Over Timeline */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
            <span>This Over:</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Extras: {currentInnings.byes}b, {currentInnings.legByes}lb, {currentInnings.wides}w, {currentInnings.noBalls}nb
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {currentInnings.deliveries && currentInnings.deliveries.length > 0 ? (
              currentInnings.deliveries.slice(0, 8).reverse().map((d, index) => {
                let badgeText = d.batterRuns.toString();
                let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';

                if (d.isWicket) {
                  badgeText = 'W';
                  badgeColor = 'bg-red-600 text-white border-red-500 font-bold';
                } else if (d.extraType === 'WIDE') {
                  badgeText = d.extraRuns > 0 ? `Wd+${d.extraRuns}` : 'Wd';
                  badgeColor = 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40 font-bold';
                } else if (d.extraType === 'NO_BALL') {
                  badgeText = d.batterRuns > 0 ? `Nb+${d.batterRuns}` : 'Nb';
                  badgeColor = 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40 font-bold';
                } else if (d.batterRuns === 4) {
                  badgeColor = 'bg-amber-400 text-slate-950 border-amber-500 font-black';
                } else if (d.batterRuns === 6) {
                  badgeColor = 'bg-purple-600 text-white border-purple-500 font-black';
                }

                return (
                  <div
                    key={d.id || index}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold border shrink-0 shadow-sm ${badgeColor}`}
                  >
                    {badgeText}
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 italic">No balls bowled yet in this innings</span>
            )}
          </div>
        </div>
      </div>

      {/* Test Match Controls & Day/Session Info */}
      {match.format === 'TEST' && (
        <TestMatchControls
          currentDay={match.currentDay}
          currentSession={match.currentSession}
          dayOvers={match.dayOvers}
          sessionOvers={match.sessionOvers}
          leadTrailData={testStatus}
          onEndSession={() => advanceSessionMutation.mutate()}
          onEndDay={() => advanceDayMutation.mutate()}
          onDeclare={() => declareMutation.mutate()}
          onFollowOn={enforce => followOnMutation.mutate(enforce)}
        />
      )}

      {/* Ball-by-Ball Scoring Controls Keypad OR Opening Players Setup */}
      {match.status !== 'COMPLETED' && currentInnings.status === 'IN_PROGRESS' && (
        needsOpeningPlayers ? (
          <div className="bg-white/90 dark:bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                  Innings {currentInnings.inningsNumber} Setup
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
                  Select Opening Players for Innings {currentInnings.inningsNumber}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {battingTeam?.teamName} is batting {isChasing ? `(Target: ${currentInnings.targetRuns} runs)` : ''}. Choose the opening batters and bowler to begin scoring.
                </p>
              </div>
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {openersError && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{openersError}</span>
              </div>
            )}

            <form onSubmit={handleStartInnings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Batting Team Openers */}
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700/50">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      Batting: {battingTeam?.teamName}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Opening Striker (On Strike *)
                    </label>
                    <select
                      required
                      value={openingStrikerId}
                      onChange={e => setOpeningStrikerId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-medium"
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
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Opening Non-Striker
                    </label>
                    <select
                      required
                      value={openingNonStrikerId}
                      onChange={e => setOpeningNonStrikerId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-medium"
                    >
                      <option value="">Select Opening Non-Striker</option>
                      {battingPlayingXI.map(p => (
                        <option key={p.id} value={p.id} disabled={p.id === openingStrikerId}>
                          #{p.jerseyNumber} - {p.playerName} ({p.role}) {p.id === openingStrikerId ? '(Selected as Striker)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bowling Team Opening Bowler */}
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700/50">
                    <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                      Bowling: {bowlingTeam?.teamName}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Opening Bowler
                    </label>
                    <select
                      required
                      value={openingBowlerId}
                      onChange={e => setOpeningBowlerId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-medium"
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
              </div>

              <button
                type="submit"
                disabled={setupOpenersMutation.isPending}
                className="w-full py-3.5 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {setupOpenersMutation.isPending
                  ? 'Starting Innings...'
                  : `Start Innings ${currentInnings.inningsNumber} & Begin Scoring`}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Ball-by-Ball Scoring Keypad
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Striker: {striker?.playerName}</span>
            </div>

            {/* Standard Runs */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
              <ScoreButton label="0" sublabel="Dot" onClick={() => handleScoreRun(0)} disabled={deliveryMutation.isPending} />
              <ScoreButton label="1" sublabel="Single" onClick={() => handleScoreRun(1)} disabled={deliveryMutation.isPending} />
              <ScoreButton label="2" sublabel="Double" onClick={() => handleScoreRun(2)} disabled={deliveryMutation.isPending} />
              <ScoreButton label="3" sublabel="Three" onClick={() => handleScoreRun(3)} disabled={deliveryMutation.isPending} />
              <ScoreButton label="4" sublabel="Boundary" variant="boundary" onClick={() => handleScoreRun(4)} disabled={deliveryMutation.isPending} />
              <ScoreButton label="5" sublabel="Five" onClick={() => handleScoreRun(5)} disabled={deliveryMutation.isPending} />
              <ScoreButton label="6" sublabel="Sixer" variant="boundary" onClick={() => handleScoreRun(6)} disabled={deliveryMutation.isPending} />
            </div>

            {/* Extras and Wicket Keypad */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              <ScoreButton label="Wide" variant="extra" onClick={() => openExtrasModal('WIDE')} disabled={deliveryMutation.isPending} />
              <ScoreButton label="No Ball" variant="extra" onClick={() => openExtrasModal('NO_BALL')} disabled={deliveryMutation.isPending} />
              <ScoreButton label="Bye" variant="extra" onClick={() => openByeModal('BYE')} disabled={deliveryMutation.isPending} />
              <ScoreButton label="Leg Bye" variant="extra" onClick={() => openByeModal('LEG_BYE')} disabled={deliveryMutation.isPending} />
              <ScoreButton
                label="Wicket"
                variant="wicket"
                className="col-span-2 sm:col-span-1"
                onClick={() => setIsWicketModalOpen(true)}
                disabled={deliveryMutation.isPending}
              />
            </div>
          </div>
        )
      )}

      {/* Wicket Modal */}
      {striker && nonStriker && (
        <WicketModal
          isOpen={isWicketModalOpen}
          onClose={() => setIsWicketModalOpen(false)}
          onConfirm={handleConfirmWicket}
          striker={striker}
          nonStriker={nonStriker}
          bowlingTeamPlayers={bowlingPlayingXI}
          availableIncomingBatters={availableIncomingBatters}
          isAllOutNext={isAllOutNext}
        />
      )}

      {/* Bowler Selection Modal on Over Complete */}
      <BowlerSelectModal
        isOpen={shouldPromptNextBowler}
        bowlingTeamPlayers={bowlingPlayingXI}
        scorecards={currentInnings.bowlingScorecards}
        lastBowlerId={currentInnings.lastBowlerId}
        matchFormat={match.format}
        onSelectBowler={bowlerId => bowlerChangeMutation.mutate(bowlerId)}
      />

      {/* Dedicated Bye / Leg-Bye Modal */}
      {isByeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in transition-colors">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs">
                  {byeModalType === 'BYE' ? 'B' : 'LB'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {byeModalType === 'BYE' ? 'Record Bye' : 'Record Leg Bye'}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    Legal delivery • 0 runs to bowler
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsByeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {byeModalType === 'BYE'
                  ? 'How many bye runs were completed?'
                  : 'How many leg-bye runs were completed?'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select completed runs (0–6). Odd runs rotate strike. Zero runs credited to striker and bowler.
              </p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-2">
              {[0, 1, 2, 3, 4, 5, 6].map(runs => (
                <button
                  key={runs}
                  type="button"
                  onClick={() => handleScoreByeOrLegBye(runs)}
                  disabled={deliveryMutation.isPending}
                  className="flex flex-col items-center justify-center py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-slate-950 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-900 dark:text-white font-black text-lg transition-all active:scale-95 group shadow-sm"
                >
                  <span>{runs}</span>
                  <span className="text-[9px] font-semibold opacity-70 group-hover:opacity-100">
                    {runs === 0 ? 'Dot' : runs === 1 ? 'Single' : runs === 4 ? 'Four' : runs === 6 ? 'Six' : `${runs}r`}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsByeModalOpen(false)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extras Modal (Running runs on Wide, No Ball) */}
      {isExtrasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-colors">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record {selectedExtraType.replace('_', ' ')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedExtraType === 'WIDE' && '1 wide penalty run automatically added. Specify additional running runs if taken.'}
              {selectedExtraType === 'NO_BALL' && '1 no-ball penalty run automatically added. Specify runs scored off bat.'}
              {(selectedExtraType === 'BYE' || selectedExtraType === 'LEG_BYE') && 'Enter runs completed by running.'}
            </p>

            {selectedExtraType === 'NO_BALL' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Runs Off Bat</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 6].map(runs => (
                    <button
                      key={runs}
                      type="button"
                      onClick={() => setExtraBatRuns(runs)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        extraBatRuns === runs
                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-600 dark:border-emerald-400 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {runs}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {selectedExtraType === 'NO_BALL' ? 'Additional Extras Runs' : 'Running Runs'}
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(runs => (
                  <button
                    key={runs}
                    type="button"
                    onClick={() => setExtraRunningRuns(runs)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      extraRunningRuns === runs
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-600 dark:border-emerald-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {runs}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExtrasModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExtras}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-600/20"
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
