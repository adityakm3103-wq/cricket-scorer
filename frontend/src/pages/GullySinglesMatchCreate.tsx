import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Users,
  AlertCircle,
  RotateCw,
  Eye,
  Check,
  Trophy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { squadApi, gullyApi } from '../services/api';
import { Player, SinglesDismissalRule, BowlerOrderRule } from '../types';

export const GullySinglesMatchCreate: React.FC = () => {
  const navigate = useNavigate();

  // Fetch registered squad
  const { data: squadData, isLoading } = useQuery<Player[]>({
    queryKey: ['mySquad'],
    queryFn: async () => {
      const res = await squadApi.getSquad();
      return Array.isArray(res.data) ? res.data : (res.data as any)?.players || [];
    },
  });

  const allPlayers: Player[] = Array.isArray(squadData)
    ? squadData
    : (squadData as any)?.players || [];

  // Step state (1: Batting Order & Draft, 2: Match Rules & Overs)
  const [step, setStep] = useState<1 | 2>(1);

  // Ordered Batting Queue
  const [battingOrder, setBattingOrder] = useState<Player[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftReadyToReveal, setDraftReadyToReveal] = useState(false);
  const [draftShuffled, setDraftShuffled] = useState(false);

  // Match Config (Default 2 overs as requested!)
  const [totalOvers, setTotalOvers] = useState<number>(2);
  const [customOversInput, setCustomOversInput] = useState<string>('2');
  const [venue, setVenue] = useState('Gully Street Turf');
  const [bowlingRule, setBowlingRule] = useState<'MAX_LIMIT' | 'EXACT'>('MAX_LIMIT');
  const [singlesDismissalRule, setSinglesDismissalRule] = useState<SinglesDismissalRule>(
    'LAST_WICKET_ENDS_INNINGS'
  );
  const [bowlerOrderRule, setBowlerOrderRule] = useState<BowlerOrderRule>('FREE_SELECTION');
  const [openingBowlerId, setOpeningBowlerId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize batting order when squad loads
  useEffect(() => {
    if (allPlayers.length > 0 && battingOrder.length === 0) {
      setBattingOrder([...allPlayers]);
      if (allPlayers.length > 1) {
        setOpeningBowlerId(allPlayers[1].id);
      }
    }
  }, [allPlayers]);

  // Start Gully Draft Shuffling Animation
  const handleStartDraft = () => {
    if (allPlayers.length < 2) {
      setErrorMessage('You need at least 2 players in your squad to perform a Gully Draft');
      return;
    }

    setErrorMessage(null);
    setIsDrafting(true);
    setDraftReadyToReveal(false);

    // Shuffle animation for 700ms, then present Reveal button
    setTimeout(() => {
      setIsDrafting(false);
      setDraftReadyToReveal(true);
    }, 700);
  };

  // Reveal the drafted batting order from backend
  const handleRevealDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await gullyApi.performDraft(allPlayers.map(p => p.id));
      const draftedOrder: Player[] =
        res.data.battingOrder || [res.data.selectedBatter, ...(res.data.bowlers || [])];

      setBattingOrder(draftedOrder);
      if (draftedOrder.length > 1) {
        setOpeningBowlerId(draftedOrder[1].id);
      }

      setIsDrafting(false);
      setDraftReadyToReveal(false);
      setDraftShuffled(true);

      // Confetti burst on reveal!
      confetti({
        particleCount: 70,
        spread: 90,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setIsDrafting(false);
      setErrorMessage(err?.response?.data?.message || 'Gully Draft failed');
    }
  };

  // Move player up in batting order
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...battingOrder];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setBattingOrder(newOrder);
    if (newOrder.length > 1) {
      setOpeningBowlerId(newOrder[1].id);
    }
  };

  // Move player down in batting order
  const handleMoveDown = (index: number) => {
    if (index === battingOrder.length - 1) return;
    const newOrder = [...battingOrder];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setBattingOrder(newOrder);
    if (newOrder.length > 1) {
      setOpeningBowlerId(newOrder[1].id);
    }
  };

  // Move player to 1st position (Make 1st Batter)
  const handleMakeFirst = (index: number) => {
    if (index === 0) return;
    const newOrder = [...battingOrder];
    const [selected] = newOrder.splice(index, 1);
    newOrder.unshift(selected);
    setBattingOrder(newOrder);
    if (newOrder.length > 1) {
      setOpeningBowlerId(newOrder[1].id);
    }
  };

  // Mutation to create Singles match
  const createSinglesMatchMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      if (battingOrder.length < 2) {
        throw new Error('At least 2 participating players are required');
      }

      const firstBatterId = battingOrder[0].id;
      const initialBowlerIds = battingOrder.slice(1).map(p => p.id);

      const allocations = initialBowlerIds.map(bId => ({
        playerId: bId,
        allocatedOvers: Math.max(1, Math.ceil(totalOvers / initialBowlerIds.length)),
      }));

      const payload = {
        venue,
        totalOvers, // Default 2 overs
        selectedBatterId: firstBatterId,
        battingOrderPlayerIds: battingOrder.map(p => p.id),
        draftShuffled,
        bowlerPlayerIds: initialBowlerIds,
        bowlingAllocations: allocations,
        bowlingAllocationRule: bowlingRule,
        singlesDismissalRule,
        bowlerOrderRule,
        openingBowlerId: openingBowlerId || initialBowlerIds[0],
      };

      const res = await gullyApi.createSinglesMatch(payload);
      return res.data;
    },
    onSuccess: data => {
      navigate(`/gully/live/${data.id}`);
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to create Singles Match');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const firstBatter = battingOrder[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <Link
            to="/gully"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Gully Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Shuffle className="w-7 h-7 text-orange-500 dark:text-orange-400" />
            Gully Singles Rounds & Draft
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Every player takes turns batting alone in rounds. When a wicket falls or overs end, the next batter takes strike!
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              step === 1 ? 'bg-orange-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            1. Batting Order & Draft
          </span>
          <span className="text-slate-400 dark:text-slate-600">→</span>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              step === 2 ? 'bg-orange-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            2. Overs & Rules
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs p-3.5 rounded-2xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Squad size check */}
      {allPlayers.length < 2 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 text-center space-y-3">
          <Users className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Your squad has {allPlayers.length} registered player(s)</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Gully Singles requires at least 2 squad players so players can take turns batting and bowling against each other.
          </p>
          <Link
            to="/squad"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4 font-bold" />
            Manage / Add Players to Squad
          </Link>
        </div>
      )}

      {step === 1 && allPlayers.length >= 2 && (
        <div className="space-y-6">
          {/* THE GULLY DRAFT HERO */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-orange-50 dark:from-orange-950/70 via-white dark:via-slate-900 to-white dark:to-slate-900 border border-orange-200 dark:border-orange-500/30 p-6 sm:p-8 text-center space-y-6 shadow-xl">
            <div className="space-y-2 max-w-xl mx-auto">
              <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 inline-flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                THE GULLY DRAFT
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Shuffle & Decide Batting Order
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Run the Gully Draft to fairly shuffle which player bats 1st, 2nd, 3rd... in Round 1.
                After Round 1 completes, the <strong className="text-orange-600 dark:text-orange-400">highest scorer</strong> will automatically bat first in Round 2!
              </p>
            </div>

            {/* Interactive Draft Reveal Area */}
            <div className="py-2">
              {isDrafting ? (
                /* Shuffling State */
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                  <div className="relative flex items-center justify-center">
                    <div className="w-24 h-32 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 animate-spin opacity-80 flex items-center justify-center shadow-2xl">
                      <Shuffle className="w-8 h-8 text-slate-950" />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-orange-600 dark:text-orange-400 animate-pulse">
                    Fairly Shuffling Squad Batting Queue...
                  </div>
                </div>
              ) : draftReadyToReveal ? (
                /* Ready to Reveal State */
                <div className="max-w-sm mx-auto bg-white dark:bg-slate-950 border-2 border-orange-500 rounded-3xl p-6 shadow-2xl space-y-4 animate-bounce">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-500 dark:text-orange-400 flex items-center justify-center text-2xl mx-auto">
                    ❓
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Deck Shuffled!</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Tap below to reveal the fair randomized batting order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRevealDraft}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
                  >
                    <Eye className="w-4 h-4 font-bold" />
                    Reveal Batting Order Now
                  </button>
                </div>
              ) : firstBatter ? (
                /* 1st Batter Preview */
                <div className="max-w-md mx-auto bg-white dark:bg-slate-950 border-2 border-orange-500 rounded-3xl p-6 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded-full">
                      👑 1st Batter in Round 1
                    </span>
                    {draftShuffled && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Draft Shuffled
                      </span>
                    )}
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-3xl mx-auto shadow-lg shadow-orange-500/30 mt-2">
                    🏏
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {firstBatter.playerName}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Jersey #{firstBatter.jerseyNumber} • {firstBatter.role}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 py-1.5 px-3 rounded-xl font-semibold inline-block">
                    Bats 1st alone • When out, Batter #2 takes strike!
                  </div>
                </div>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartDraft}
                disabled={isDrafting}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 transition-all shadow-xl shadow-orange-500/25 active:scale-95 disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${isDrafting ? 'animate-spin' : ''}`} />
                {draftShuffled ? 'Shuffle Again (Re-Roll Order)' : 'Start Gully Draft'}
              </button>
            </div>
          </div>

          {/* BATTING ORDER QUEUE CARDS (Interactive Order Management) */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  Round 1 Batting Queue ({battingOrder.length} players)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Batters take turns alone in this exact order. Use arrows to re-order, or click &quot;Make 1st&quot; to set the opening batter.
                </p>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                Default: <strong className="text-orange-600 dark:text-orange-400">{totalOvers} overs</strong> per batter
              </div>
            </div>

            {/* Reorderable Player Queue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {battingOrder.map((player, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={player.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      isFirst
                        ? 'bg-gradient-to-r from-orange-50 dark:from-orange-500/20 via-amber-50/50 dark:via-amber-500/10 to-white dark:to-slate-950 border-orange-500 shadow-md ring-1 ring-orange-500/30'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                          isFirst
                            ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                            : idx === 1
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                            : idx === 2
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{player.playerName}</span>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">
                            #{player.jerseyNumber}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{player.role}</span>
                          <span>•</span>
                          <span className={isFirst ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-slate-500'}>
                            {isFirst ? 'Opens Round 1' : `Batting Position #${idx + 1}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order adjustment buttons */}
                    <div className="flex items-center gap-1.5">
                      {!isFirst && (
                        <button
                          type="button"
                          onClick={() => handleMakeFirst(idx)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200 hover:bg-orange-500 hover:text-slate-950 dark:bg-slate-800 dark:hover:bg-orange-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors"
                          title="Set as 1st Batter"
                        >
                          Make 1st
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-200 dark:disabled:hover:bg-slate-800"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === battingOrder.length - 1}
                        className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-200 dark:disabled:hover:bg-slate-800"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tournament Rules Banner */}
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200 dark:border-orange-500/20 rounded-2xl p-4 flex items-start gap-3 mt-3">
              <Sparkles className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">How Gully Singles Rounds Work:</div>
                <div className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  1. <strong>Round 1</strong>: Batters play individually in the order shown above for {totalOvers} overs each. While one player bats, everyone else bowls and fields.
                </div>
                <div className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  2. <strong>Round 2 Qualification</strong>: When all players have batted in Round 1, the <strong className="text-orange-600 dark:text-orange-400">highest run scorer</strong> gets to bat first in Round 2, followed by the others ranked by score!
                </div>
                <div className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  3. <strong>End Match Anytime</strong>: Scorer can click the <strong>&quot;End Match&quot;</strong> button at any point to crown the champion and view the complete tournament leaderboard!
                </div>
              </div>
            </div>
          </div>

          {/* Continue to Step 2 Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                if (battingOrder.length < 2) {
                  setErrorMessage('At least 2 players are required');
                  return;
                }
                setErrorMessage(null);
                setStep(2);
              }}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-slate-950 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              Continue to Overs & Match Rules <ChevronRight className="w-4 h-4 font-bold" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Match Rules & Overs Configuration */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Overs Selector (Default 2 overs!) */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  Overs Per Batter (Default: 2 Overs)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  How many overs will each solo batter face per turn? (Completely customizable)
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-orange-500 dark:text-orange-400">{totalOvers}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">Overs</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5, 6, 8, 10].map(ov => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => {
                    setTotalOvers(ov);
                    setCustomOversInput(ov.toString());
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    totalOvers === ov
                      ? 'bg-orange-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {ov} {ov === 1 ? 'over' : 'overs'}
                </button>
              ))}

              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Custom:</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={customOversInput}
                  onChange={e => {
                    setCustomOversInput(e.target.value);
                    const val = parseInt(e.target.value);
                    if (val > 0) setTotalOvers(val);
                  }}
                  className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-sm font-bold text-slate-900 dark:text-white text-center focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dismissal Rule Configuration */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                Dismissal & Next Batter Rule
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Choose what happens when a wicket falls during a batter&apos;s turn.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setSinglesDismissalRule('LAST_WICKET_ENDS_INNINGS')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  singlesDismissalRule === 'LAST_WICKET_ENDS_INNINGS'
                    ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500 text-slate-900 dark:text-white shadow-lg'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm text-orange-600 dark:text-orange-400">
                    Wicket Ends Batter&apos;s Turn (Next Batter In)
                  </div>
                  {singlesDismissalRule === 'LAST_WICKET_ENDS_INNINGS' && (
                    <Check className="w-4 h-4 text-orange-500 dark:text-orange-400 font-bold" />
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Classic street cricket sudden death! When a batter gets out, their individual innings ends immediately, and the next batter in the queue steps up to bat!
                </p>
              </div>

              <div
                onClick={() => setSinglesDismissalRule('BATTER_CONTINUES')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  singlesDismissalRule === 'BATTER_CONTINUES'
                    ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500 text-slate-900 dark:text-white shadow-lg'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm text-orange-600 dark:text-orange-400">
                    Wickets Recorded (Batter Plays Full Overs)
                  </div>
                  {singlesDismissalRule === 'BATTER_CONTINUES' && (
                    <Check className="w-4 h-4 text-orange-500 dark:text-orange-400 font-bold" />
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Wickets are credited to bowlers, but the batter continues batting until all configured overs are completed before the next batter enters.
                </p>
              </div>
            </div>
          </div>

          {/* Opening Bowler & Venue */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              Opening Bowler & Match Venue
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Opening Bowler for 1st Batter</label>
                <select
                  value={openingBowlerId}
                  onChange={e => setOpeningBowlerId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 mt-1.5 focus:outline-none focus:border-cyan-500 font-bold"
                >
                  {battingOrder.slice(1).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.playerName} #{p.jerseyNumber} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Match Venue / Ground</label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="e.g. Street Turf, Terrace, School Ground"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 mt-1.5 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Batting Order
            </button>

            <button
              type="button"
              onClick={() => createSinglesMatchMutation.mutate()}
              disabled={createSinglesMatchMutation.isPending}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 transition-all shadow-xl shadow-orange-500/25 active:scale-95 disabled:opacity-50"
            >
              {createSinglesMatchMutation.isPending ? 'Starting Match...' : 'Start Gully Singles Match 🏏'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
