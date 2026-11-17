import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gullyApi } from '../services/api';
import { useMatchSocket } from '../services/socket';
import {
  GullyMatchDetails,
  ExtraType,
  DismissalType,
} from '../types';
import {
  Flame,
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
  User,
  Check,
  Trophy,
  XOctagon,
  ArrowRight,
  Award,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const GullyLiveScoring: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modals state
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [wicketDismissalType, setWicketDismissalType] = useState<DismissalType>('BOWLED');
  const [dismissedBatterId, setDismissedBatterId] = useState<string>('');
  const [fielderId, setFielderId] = useState<string>('');
  const [incomingBatterId, setIncomingBatterId] = useState<string>('');

  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraType>('WIDE');
  const [extraRunningRuns, setExtraRunningRuns] = useState<number>(0);
  const [extraBatRuns, setExtraBatRuns] = useState<number>(0);

  const [isByeModalOpen, setIsByeModalOpen] = useState(false);
  const [byeModalType, setByeModalType] = useState<'BYE' | 'LEG_BYE'>('BYE');

  const [isBowlerSelectOpen, setIsBowlerSelectOpen] = useState(false);
  const [selectedNextBowlerId, setSelectedNextBowlerId] = useState<string>('');

  // End Match confirmation modal
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState(false);

  // Singles next batter opening bowler selection
  const [singlesNextBowlerId, setSinglesNextBowlerId] = useState<string>('');

  // Fetch Gully Match Details
  const { data: match, isLoading } = useQuery<GullyMatchDetails>({
    queryKey: ['gullyMatch', id],
    queryFn: async () => {
      const res = await gullyApi.getMatch(id!);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: false,
  });

  // Real-time Socket.IO Hook
  useMatchSocket(id, updatedMatch => {
    queryClient.setQueryData(['gullyMatch', id], updatedMatch);
  });

  const isSingles = match?.matchType === 'SINGLES_MATCH';
  const currentInnings =
    match?.innings?.find(i => i.inningsNumber === match.currentInningsNumber) ||
    match?.innings?.[0];

  // Active Players
  const strikerCard = currentInnings?.battingScorecards?.find(
    b => b.playerId === currentInnings?.currentStrikerId
  );
  const nonStrikerCard = currentInnings?.battingScorecards?.find(
    b => b.playerId === currentInnings?.currentNonStrikerId
  );
  const currentBowlerCard = currentInnings?.bowlingScorecards?.find(
    b => b.playerId === currentInnings?.currentBowlerId
  );

  const striker =
    strikerCard?.player ||
    match?.matchPlayers?.find(p => p.playerId === currentInnings?.currentStrikerId)?.player;
  const nonStriker =
    nonStrikerCard?.player ||
    match?.matchPlayers?.find(p => p.playerId === currentInnings?.currentNonStrikerId)?.player;
  const currentBowler =
    currentBowlerCard?.player ||
    match?.matchPlayers?.find(p => p.playerId === currentInnings?.currentBowlerId)?.player;

  // Available incoming batters for team match
  const teamBattingPlayers =
    match?.matchPlayers?.filter(
      mp => !isSingles && mp.temporaryTeamId === currentInnings?.battingTempTeamId
    ) || [];

  const dismissedIds = currentInnings?.wicketsList?.map(w => w.playerId) || [];
  const availableIncomingBatters = teamBattingPlayers.filter(
    mp =>
      mp.playerId !== currentInnings?.currentStrikerId &&
      mp.playerId !== currentInnings?.currentNonStrikerId &&
      !dismissedIds.includes(mp.playerId)
  );

  // Score Delivery Mutation
  const scoreMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await gullyApi.scoreDelivery(id!, payload);
      return res.data;
    },
    onSuccess: data => {
      queryClient.setQueryData(['gullyMatch', id], data.match);
      if (data.isOverComplete && !data.match.status.includes('COMPLETED')) {
        setIsBowlerSelectOpen(true);
      }
      if (data.match.status === 'COMPLETED') {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      }
    },
  });

  // Change Bowler Mutation
  const changeBowlerMutation = useMutation({
    mutationFn: async (bowlerId: string) => {
      const res = await gullyApi.changeBowler(id!, bowlerId);
      return res.data;
    },
    onSuccess: data => {
      queryClient.setQueryData(['gullyMatch', id], data);
      setIsBowlerSelectOpen(false);
    },
  });

  // Delete Gully Match Mutation
  const deleteMutation = useMutation({
    mutationFn: () => gullyApi.deleteMatch(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gullyMatches'] });
      queryClient.invalidateQueries({ queryKey: ['gullyMatchHistory'] });
      queryClient.invalidateQueries({ queryKey: ['gullyTeamStats'] });
      navigate('/gully');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete Gully match');
    },
  });

  const handleDeleteMatch = () => {
    if (confirm('Are you sure you want to delete this Gully match? All scorecards, overs, and rounds will be permanently deleted.')) {
      deleteMutation.mutate();
    }
  };

  // Undo Last Delivery Mutation
  const undoMutation = useMutation({
    mutationFn: async () => {
      const res = await gullyApi.undoLastDelivery(id!);
      return res.data;
    },
    onSuccess: data => {
      queryClient.setQueryData(['gullyMatch', id], data.match);
    },
  });

  // End Match Mutation
  const endMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await gullyApi.endMatch(id!);
      return res.data;
    },
    onSuccess: data => {
      queryClient.setQueryData(['gullyMatch', id], data);
      setIsEndMatchModalOpen(false);
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
      navigate(`/gully/scorecard/${id}`);
    },
  });

  // Start Next Singles Batter Mutation
  const nextBatterMutation = useMutation({
    mutationFn: async (openingBowlerId?: string) => {
      const res = await gullyApi.startNextSinglesBatter(id!, { openingBowlerId });
      return res.data;
    },
    onSuccess: data => {
      queryClient.setQueryData(['gullyMatch', id], data);
    },
  });

  // Start Next Singles Round Mutation (Seeded by highest scores)
  const nextRoundMutation = useMutation({
    mutationFn: async () => {
      const res = await gullyApi.startNextSinglesRound(id!);
      return res.data;
    },
    onSuccess: data => {
      queryClient.setQueryData(['gullyMatch', id], data);
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!match || !currentInnings) {
    return (
      <div className="text-center py-12 text-slate-400">
        Gully Match not found.{' '}
        <Link to="/gully" className="text-amber-400 hover:underline">
          Return to Gully Dashboard
        </Link>
      </div>
    );
  }

  const isCompleted = match.status === 'COMPLETED';
  const isInningsCompleted = currentInnings.status === 'COMPLETED';

  // Available bowlers for bowler change
  const availableBowlers = isSingles
    ? match.matchPlayers.filter(mp => mp.isBowler && mp.playerId !== currentInnings?.currentStrikerId)
    : match.matchPlayers.filter(mp => mp.temporaryTeamId === currentInnings.bowlingTempTeamId);

  // Next batter in queue for Singles
  const nextQueueItem = match.singlesQueue?.find(q => !q.hasBatted && !q.isCurrentlyBatting);

  // Bowlers for the next batter
  const bowlersForNextBatter = nextQueueItem
    ? match.matchPlayers.filter(mp => mp.playerId !== nextQueueItem.playerId)
    : [];

  // Current round summary
  const currentRoundNumber = match.currentRoundNumber || 1;
  const currentRoundGroup = match.rounds?.find(r => r.roundNumber === currentRoundNumber);
  const roundLeader = currentRoundGroup?.roundLeaderboard?.[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Bar with Badges and Actions */}
      <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-md">
        <div className="flex items-center gap-2">
          <Link
            to="/gully"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider border ${
                  isSingles
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isSingles ? `Singles (Round ${currentRoundNumber})` : 'Team Match'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {match.totalOvers} Overs
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  isCompleted
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                }`}
              >
                {match.status}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-200 mt-0.5 truncate max-w-[180px] sm:max-w-md">
              {isSingles
                ? `${currentInnings.battingTeamName} • Singles Arena`
                : `${currentInnings.battingTeamName} vs ${currentInnings.bowlingTeamName}`}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <button
              onClick={() => undoMutation.mutate()}
              disabled={undoMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
              title="Undo Last Delivery"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${undoMutation.isPending ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Undo Ball</span>
            </button>
          )}

          {/* PERMANENT END MATCH BUTTON */}
          {!isCompleted && (
            <button
              type="button"
              onClick={() => setIsEndMatchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 transition-all active:scale-95 shadow-md shadow-rose-500/10"
              title="End Match & View Leaderboard"
            >
              <XOctagon className="w-3.5 h-3.5 font-bold" />
              <span>End Match</span>
            </button>
          )}

          <Link
            to={`/gully/scorecard/${match.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md shadow-amber-500/20"
          >
            <FileText className="w-3.5 h-3.5 font-bold" />
            <span className="hidden sm:inline">Scorecard</span>
          </Link>

          <button
            type="button"
            onClick={handleDeleteMatch}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all hover:scale-105 disabled:opacity-50"
            title="Delete this Gully match"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SINGLES ROUND & BATTING QUEUE STATUS BAR                                 */}
      {/* ========================================================================= */}
      {isSingles && match.singlesQueue && match.singlesQueue.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-orange-400" />
              Round {currentRoundNumber} Batting Queue
            </span>
            <span className="text-[11px] text-slate-400">
              {match.singlesQueue.filter(q => q.hasBatted).length} of {match.singlesQueue.length} Batters Finished
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {match.singlesQueue.map(q => {
              const isCurrent = q.isCurrentlyBatting;
              const hasBatted = q.hasBatted;

              return (
                <div
                  key={q.playerId}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-orange-500/25 to-amber-500/15 border-orange-500 text-white font-bold shadow-md shadow-orange-500/20 ring-1 ring-orange-500/40'
                      : hasBatted
                      ? 'bg-slate-950 border-emerald-500/30 text-emerald-400 font-semibold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-mono text-[10px] font-black opacity-70">#{q.order}</span>
                  <span className="truncate max-w-[100px]">{q.playerName}</span>
                  {hasBatted && (
                    <span className="text-[10px] font-black text-emerald-400">
                      ({q.runsScored ?? 0}r)
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[9px] font-black uppercase text-orange-300 bg-orange-500/30 px-1 rounded animate-pulse">
                      Batting
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Score Board Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border border-amber-500/40 p-6 shadow-2xl text-white">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-400 mb-1">
              {currentInnings.battingTeamName} {isInningsCompleted ? '(Innings Done)' : 'Batting'}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                {currentInnings.totalRuns}/{currentInnings.wickets}
              </span>
              <span className="text-lg sm:text-xl font-bold text-slate-400 font-mono">
                ({currentInnings.oversCompletedText} / {match.totalOvers} ov)
              </span>
            </div>

            {currentInnings.targetRuns && (
              <div className="text-xs text-amber-300 font-bold mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Target: {currentInnings.targetRuns} runs (Need{' '}
                {Math.max(0, currentInnings.targetRuns - currentInnings.totalRuns)} from{' '}
                {Math.max(0, match.totalOvers * 6 - currentInnings.legalBalls)} balls)
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl px-4 py-3 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Run Rate</div>
              <div className="text-lg font-black text-amber-400">
                {currentInnings.legalBalls > 0
                  ? ((currentInnings.totalRuns / currentInnings.legalBalls) * 6).toFixed(2)
                  : '0.00'}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl px-4 py-3 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Extras</div>
              <div className="text-lg font-black text-slate-300">
                {currentInnings.wides +
                  currentInnings.noBalls +
                  currentInnings.byes +
                  currentInnings.legByes +
                  currentInnings.penaltyRuns}
              </div>
            </div>
          </div>
        </div>

        {/* Match Result Banner */}
        {match.resultDescription && (
          <div className="mt-4 pt-3 border-t border-amber-500/20 text-xs font-bold text-amber-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            {match.resultDescription}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SINGLES INNINGS COMPLETED / TRANSITION CARD                              */}
      {/* ========================================================================= */}
      {isSingles && isInningsCompleted && !isCompleted && (
        <div className="bg-slate-900 border-2 border-orange-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-orange-500/20">
            🏏
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <span className="text-[10px] font-black tracking-widest uppercase px-3 py-0.5 rounded-full bg-orange-500 text-slate-950">
              TURN FINISHED
            </span>
            <h3 className="text-2xl font-black text-white">
              {currentInnings.battingTeamName} Completed!
            </h3>
            <p className="text-xs text-slate-400">
              Final score: <strong className="text-white">{currentInnings.totalRuns} runs</strong> in{' '}
              <strong className="text-white">{currentInnings.oversCompletedText} overs</strong>{' '}
              ({currentInnings.wickets} wicket{currentInnings.wickets === 1 ? '' : 's'} lost)
            </p>
          </div>

          {/* Condition A: More batters left in current round */}
          {!match.isRoundComplete && nextQueueItem ? (
            <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="text-xs text-slate-300">
                Next in queue: <strong className="text-orange-400 text-sm font-black">{nextQueueItem.playerName}</strong> (Position #{nextQueueItem.order})
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1.5 text-left">
                  Select Opening Bowler for {nextQueueItem.playerName}:
                </label>
                <select
                  value={singlesNextBowlerId || bowlersForNextBatter[0]?.playerId || ''}
                  onChange={e => setSinglesNextBowlerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 font-bold"
                >
                  {bowlersForNextBatter.map(b => (
                    <option key={b.playerId} value={b.playerId}>
                      {b.player.playerName} #{b.player.jerseyNumber} ({b.player.role})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  nextBatterMutation.mutate(singlesNextBowlerId || bowlersForNextBatter[0]?.playerId)
                }
                disabled={nextBatterMutation.isPending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 active:scale-95 disabled:opacity-50"
              >
                <Play className="w-4 h-4 font-bold" />
                {nextBatterMutation.isPending
                  ? 'Starting Next Turn...'
                  : `Start Next Batter (${nextQueueItem.playerName}) 🏏`}
              </button>
            </div>
          ) : match.isRoundComplete ? (
            /* Condition B: All batters in this round have finished! */
            <div className="max-w-lg mx-auto bg-slate-950 border border-amber-500/40 rounded-2xl p-6 space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  ROUND {currentRoundNumber} COMPLETED!
                </span>
                <h4 className="text-lg font-black text-white">All Squad Batters Have Finished</h4>
                {roundLeader && (
                  <p className="text-xs text-amber-300">
                    🥇 <strong>{roundLeader.playerName}</strong> scored the highest in Round {currentRoundNumber} with{' '}
                    <strong>{roundLeader.runs} runs</strong> and will bat 1st in Round {currentRoundNumber + 1}!
                  </p>
                )}
              </div>

              {/* Two clear actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => nextRoundMutation.mutate()}
                  disabled={nextRoundMutation.isPending}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4 font-bold" />
                  {nextRoundMutation.isPending
                    ? 'Starting Round...'
                    : `Start Round ${currentRoundNumber + 1} (Seeded by Scores) 🚀`}
                </button>

                <button
                  type="button"
                  onClick={() => endMatchMutation.mutate()}
                  disabled={endMatchMutation.isPending}
                  className="py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white border border-rose-500/40 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  {endMatchMutation.isPending ? 'Ending...' : 'End Match & Crown Champion 🏆'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Solo Batter / Team Batters Display (when innings in progress) */}
      {!isInningsCompleted && isSingles ? (
        <div className="bg-slate-900 border border-orange-500/30 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-slate-950 font-black text-lg">
                🏏
              </div>
              <div>
                <div className="text-base font-black text-white flex items-center gap-2">
                  {striker?.playerName}
                  <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded">
                    SOLO BATTER
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Strike never changes • All runs belong to solo batter
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-orange-400">
                {strikerCard?.runs || 0}
                <span className="text-sm text-slate-400 font-medium ml-1">
                  ({strikerCard?.balls || 0}b)
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                4s: {strikerCard?.fours || 0} • 6s: {strikerCard?.sixes || 0} • SR:{' '}
                {strikerCard?.strikeRate?.toFixed(1) || '0.0'}
              </div>
            </div>
          </div>

          {/* Dismissal Rule Banner */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-2xl">
            <span>Dismissal Rule:</span>
            <span className="font-bold text-orange-400">
              {match.singlesDismissalRule === 'BATTER_CONTINUES'
                ? 'Wickets Recorded • Batter Continues'
                : 'Wicket Ends Turn (Next Batter In)'}
            </span>
          </div>
        </div>
      ) : !isInningsCompleted && !isSingles ? (
        /* Team Match Batters Card */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Current Batters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Striker */}
            <div className="p-3 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{striker?.playerName}</span>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                    STRIKER
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">#{striker?.jerseyNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-white">{strikerCard?.runs || 0}</div>
                <div className="text-[10px] text-slate-400">
                  {strikerCard?.balls || 0}b • 4s:{strikerCard?.fours || 0} 6s:{strikerCard?.sixes || 0}
                </div>
              </div>
            </div>

            {/* Non-Striker */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200">{nonStriker?.playerName}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    NON-STRIKER
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">#{nonStriker?.jerseyNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-slate-300">{nonStrikerCard?.runs || 0}</div>
                <div className="text-[10px] text-slate-400">
                  {nonStrikerCard?.balls || 0}b • 4s:{nonStrikerCard?.fours || 0} 6s:{nonStrikerCard?.sixes || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Current Bowler Card (when innings in progress) */}
      {!isInningsCompleted && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Current Bowler
            </div>
            {!isCompleted && (
              <button
                type="button"
                onClick={() => setIsBowlerSelectOpen(true)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3 py-1 rounded-xl transition-colors"
              >
                Change Bowler
              </button>
            )}
          </div>

          <div className="p-3.5 bg-slate-950 border border-cyan-500/30 rounded-2xl flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                {currentBowler?.playerName || 'Unselected'}
                <span className="font-mono text-xs text-slate-400 font-bold">
                  #{currentBowler?.jerseyNumber}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Allocated: {currentBowlerCard?.allocatedOvers || 1} ov max
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-base font-black text-white">
                {currentBowlerCard?.wickets || 0}-{currentBowlerCard?.runsConceded || 0}
              </div>
              <div className="text-[10px] text-slate-400">
                {currentBowlerCard?.oversText || '0.0'} ov • Econ:{' '}
                {currentBowlerCard?.economy?.toFixed(1) || '0.0'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Deliveries Strip */}
      {currentInnings.deliveries && currentInnings.deliveries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2 shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            This Over Deliveries
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {currentInnings.deliveries.slice(0, 12).map((d, i) => (
              <div
                key={d.id || i}
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-md ${
                  d.isWicket
                    ? 'bg-rose-600 text-white shadow-rose-600/30'
                    : d.batterRuns === 4
                    ? 'bg-amber-500 text-slate-950 shadow-amber-500/30'
                    : d.batterRuns === 6
                    ? 'bg-purple-600 text-white shadow-purple-600/30'
                    : d.extraType === 'WIDE'
                    ? 'bg-cyan-700 text-white'
                    : d.extraType === 'NO_BALL'
                    ? 'bg-orange-600 text-white'
                    : d.extraType === 'BYE' || d.extraType === 'LEG_BYE'
                    ? 'bg-teal-700 text-white'
                    : d.batterRuns === 0
                    ? 'bg-slate-950 text-slate-500 border border-slate-800'
                    : 'bg-slate-800 text-white'
                }`}
              >
                {d.isWicket
                  ? 'W'
                  : d.extraType === 'WIDE'
                  ? `${d.totalRuns}Wd`
                  : d.extraType === 'NO_BALL'
                  ? `${d.totalRuns}Nb`
                  : d.extraType === 'BYE'
                  ? `${d.totalRuns}B`
                  : d.extraType === 'LEG_BYE'
                  ? `${d.totalRuns}Lb`
                  : d.batterRuns === 0
                  ? '•'
                  : d.batterRuns}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Touch Scoring Keypad (Rendered when innings is IN_PROGRESS) */}
      {!isCompleted && !isInningsCompleted && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Scoring Controls</span>
            <span className="text-[10px] text-amber-400 font-semibold">Touch / Click to Score</span>
          </div>

          {/* Primary Runs Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
            {[0, 1, 2, 3, 4, 5, 6].map(runs => (
              <button
                key={runs}
                type="button"
                onClick={() => scoreMutation.mutate({ batterRuns: runs, extraType: 'NONE' })}
                disabled={scoreMutation.isPending}
                className={`h-16 rounded-2xl text-xl sm:text-2xl font-black transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                  runs === 0
                    ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    : runs === 4
                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/20'
                    : runs === 6
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-purple-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {runs === 0 ? '•' : runs}
              </button>
            ))}
          </div>

          {/* Secondary Controls: Extras, Byes, Wicket */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsExtrasModalOpen(true)}
              disabled={scoreMutation.isPending}
              className="py-3 px-4 rounded-2xl font-bold text-xs bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Zap className="w-4 h-4" /> Wide / No-Ball
            </button>

            <button
              type="button"
              onClick={() => {
                setByeModalType('BYE');
                setIsByeModalOpen(true);
              }}
              disabled={scoreMutation.isPending}
              className="py-3 px-4 rounded-2xl font-bold text-xs bg-slate-950 hover:bg-slate-800 text-teal-400 border border-teal-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Clock className="w-4 h-4" /> Bye / Leg-Bye
            </button>

            <button
              type="button"
              onClick={() => {
                setDismissedBatterId(currentInnings.currentStrikerId || '');
                setIsWicketModalOpen(true);
              }}
              disabled={scoreMutation.isPending}
              className="py-3 px-4 rounded-2xl font-black text-xs bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/25 active:scale-95"
            >
              <X className="w-4 h-4 font-bold" /> Wicket Dismissal
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: END MATCH CONFIRMATION                                            */}
      {/* ========================================================================= */}
      {isEndMatchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <XOctagon className="w-5 h-5 text-rose-400" />
                End Gully Match?
              </h3>
              <button
                type="button"
                onClick={() => setIsEndMatchModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to end this match? Scores across all rounds will be finalized, the winner crowned, and the grand scorecard displayed.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEndMatchModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => endMatchMutation.mutate()}
                disabled={endMatchMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black text-white transition-colors shadow-lg shadow-rose-600/30"
              >
                {endMatchMutation.isPending ? 'Ending...' : 'Yes, End Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BOWLER SELECT                                                     */}
      {/* ========================================================================= */}
      {isBowlerSelectOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Select Next Bowler
              </h3>
              <button
                type="button"
                onClick={() => setIsBowlerSelectOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableBowlers.map(mp => {
                const bCard = currentInnings?.bowlingScorecards?.find(
                  b => b.playerId === mp.playerId
                );
                const isLastBowler = mp.playerId === currentInnings.lastBowlerId;
                const isSelected = selectedNextBowlerId === mp.playerId;

                return (
                  <div
                    key={mp.playerId}
                    onClick={() => {
                      if (!isLastBowler || availableBowlers.length === 1) {
                        setSelectedNextBowlerId(mp.playerId);
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isLastBowler && availableBowlers.length > 1
                        ? 'opacity-40 bg-slate-950 border-slate-800 cursor-not-allowed'
                        : isSelected
                        ? 'bg-cyan-500/20 border-cyan-500 text-white cursor-pointer'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {mp.player.playerName}
                        <span className="font-mono text-xs text-slate-400">
                          #{mp.player.jerseyNumber}
                        </span>
                        {isLastBowler && availableBowlers.length > 1 && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Consecutive
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Overs: {bCard?.oversText || '0.0'} / {bCard?.allocatedOvers || mp.allocatedOvers || 1} max
                      </div>
                    </div>

                    <div className="text-right text-xs font-mono font-bold">
                      {bCard ? `${bCard.wickets}w - ${bCard.runsConceded}r` : 'Yet to bowl'}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!selectedNextBowlerId || changeBowlerMutation.isPending}
              onClick={() => changeBowlerMutation.mutate(selectedNextBowlerId)}
              className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40"
            >
              Confirm Bowler
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXTRAS (Wide / No-Ball)                                            */}
      {/* ========================================================================= */}
      {isExtrasModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Wide or No-Ball
              </h3>
              <button
                type="button"
                onClick={() => setIsExtrasModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedExtraType('WIDE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                  selectedExtraType === 'WIDE'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Wide (1 run penalty)
              </button>
              <button
                type="button"
                onClick={() => setSelectedExtraType('NO_BALL')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                  selectedExtraType === 'NO_BALL'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                No-Ball (1 run penalty)
              </button>
            </div>

            {selectedExtraType === 'WIDE' && (
              <div>
                <label className="text-xs font-bold text-slate-300">Additional Runs Run (Byes on Wide)</label>
                <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                  {[0, 1, 2, 3, 4].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setExtraRunningRuns(r)}
                      className={`py-2 rounded-xl text-xs font-black border ${
                        extraRunningRuns === r
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      +{r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedExtraType === 'NO_BALL' && (
              <div>
                <label className="text-xs font-bold text-slate-300">Bat Runs Off No-Ball</label>
                <div className="grid grid-cols-6 gap-1.5 mt-1.5">
                  {[0, 1, 2, 3, 4, 6].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setExtraBatRuns(r)}
                      className={`py-2 rounded-xl text-xs font-black border ${
                        extraBatRuns === r
                          ? 'bg-orange-500 text-slate-950 border-orange-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      +{r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                scoreMutation.mutate({
                  extraType: selectedExtraType,
                  batterRuns: selectedExtraType === 'NO_BALL' ? extraBatRuns : 0,
                  extraRuns: selectedExtraType === 'WIDE' ? extraRunningRuns : 0,
                });
                setIsExtrasModalOpen(false);
                setExtraRunningRuns(0);
                setExtraBatRuns(0);
              }}
              className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider"
            >
              Record Extra
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BYE / LEG-BYE                                                     */}
      {/* ========================================================================= */}
      {isByeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in transition-colors">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                {byeModalType === 'BYE' ? 'Record Bye' : 'Record Leg-Bye'}
              </h3>
              <button
                type="button"
                onClick={() => setIsByeModalOpen(false)}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setByeModalType('BYE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                  byeModalType === 'BYE'
                    ? 'bg-teal-50 dark:bg-teal-500/20 border-teal-500 text-teal-700 dark:text-teal-300'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Bye
              </button>
              <button
                type="button"
                onClick={() => setByeModalType('LEG_BYE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                  byeModalType === 'LEG_BYE'
                    ? 'bg-teal-50 dark:bg-teal-500/20 border-teal-500 text-teal-700 dark:text-teal-300'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Leg-Bye
              </button>
            </div>

            <div className="text-center py-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select completed runs (0–6). Odd runs rotate strike in Team matches. 0 runs credited to striker and bowler.
              </p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-2">
              {[0, 1, 2, 3, 4, 5, 6].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    scoreMutation.mutate({
                      extraType: byeModalType,
                      batterRuns: 0,
                      extraRuns: r,
                    });
                    setIsByeModalOpen(false);
                  }}
                  disabled={scoreMutation.isPending}
                  className="flex flex-col items-center justify-center py-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-500 dark:hover:text-slate-950 text-slate-900 dark:text-white font-black text-sm border border-slate-200 dark:border-slate-800 transition-all active:scale-95 group shadow-sm"
                >
                  <span>{r}</span>
                  <span className="text-[9px] font-semibold opacity-70 group-hover:opacity-100">
                    {r === 0 ? 'Dot' : r === 1 ? 'Single' : r === 4 ? 'Four' : r === 6 ? 'Six' : `${r}r`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: WICKET DISMISSAL                                                  */}
      {/* ========================================================================= */}
      {isWicketModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-rose-400 flex items-center gap-2">
                <X className="w-5 h-5" /> Record Wicket Dismissal
              </h3>
              <button
                type="button"
                onClick={() => setIsWicketModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dismissal Type */}
            <div>
              <label className="text-xs font-bold text-slate-300">How Out</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { id: 'BOWLED', label: 'Bowled' },
                  { id: 'CAUGHT', label: 'Caught' },
                  { id: 'LBW', label: 'LBW' },
                  { id: 'RUN_OUT', label: 'Run Out' },
                  { id: 'STUMPED', label: 'Stumped' },
                  { id: 'HIT_WICKET', label: 'Hit Wicket' },
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setWicketDismissalType(type.id as DismissalType)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                      wicketDismissalType === type.id
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Incoming Batter Selector for Team Match */}
            {!isSingles && availableIncomingBatters.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-300">Incoming Batter</label>
                <select
                  value={incomingBatterId}
                  onChange={e => setIncomingBatterId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 mt-1.5 focus:outline-none"
                >
                  <option value="">Select Next Batter</option>
                  {availableIncomingBatters.map(mp => (
                    <option key={mp.playerId} value={mp.playerId}>
                      {mp.player.playerName} #{mp.player.jerseyNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isSingles && match.singlesDismissalRule === 'BATTER_CONTINUES' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300">
                Notice: Under &quot;Batter Continues&quot; rule, this wicket will be recorded on the scorecard and bowler credited, but the solo batter will continue batting!
              </div>
            )}

            {isSingles && match.singlesDismissalRule === 'LAST_WICKET_ENDS_INNINGS' && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300">
                Notice: Under &quot;Wicket Ends Turn&quot; rule, this dismissal will conclude this batter&apos;s turn and the next batter in the queue will step up!
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                scoreMutation.mutate({
                  isWicket: true,
                  dismissalType: wicketDismissalType,
                  dismissedPlayerId: dismissedBatterId || currentInnings.currentStrikerId,
                  fielderId: fielderId || null,
                  incomingBatterId: incomingBatterId || null,
                });
                setIsWicketModalOpen(false);
              }}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/30"
            >
              Confirm Dismissal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
