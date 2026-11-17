import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { squadApi, gullyApi } from '../services/api.js';
import { Player, PlayerRole } from '../types/index.js';
import {
  Users,
  Shield,
  Trophy,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  Crown,
  Sparkles,
  Flame,
  AlertCircle,
  Clock,
  ArrowLeftRight,
} from 'lucide-react';

export const GullyTeamMatchCreate: React.FC = () => {
  const navigate = useNavigate();

  // Fetch Registered Squad
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

  // Step state (1: Divide Teams, 2: Match Config & Toss, 3: Openers)
  const [step, setStep] = useState<1 | 2>(1);

  // Temporary Teams
  const [teamAName, setTeamAName] = useState('Street Kings');
  const [teamBName, setTeamBName] = useState('Night Riders');
  const [teamAPlayerIds, setTeamAPlayerIds] = useState<string[]>([]);
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<string[]>([]);
  const [teamACaptainId, setTeamACaptainId] = useState<string>('');
  const [teamBCaptainId, setTeamBCaptainId] = useState<string>('');

  // Match Configuration
  const [totalOvers, setTotalOvers] = useState<number>(5);
  const [customOversInput, setCustomOversInput] = useState<string>('5');
  const [venue, setVenue] = useState('Local Street Arena');
  const [bowlingRule, setBowlingRule] = useState<'MAX_LIMIT' | 'EXACT'>('MAX_LIMIT');

  // Bowling allocations
  const [teamAAllocations, setTeamAAllocations] = useState<Record<string, number>>({});
  const [teamBAllocations, setTeamBAllocations] = useState<Record<string, number>>({});

  // Toss & Openers
  const [tossWinnerTeam, setTossWinnerTeam] = useState<'teamA' | 'teamB'>('teamA');
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL'>('BAT');
  const [strikerId, setStrikerId] = useState<string>('');
  const [nonStrikerId, setNonStrikerId] = useState<string>('');
  const [bowlerId, setBowlerId] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick player assignment
  const moveToTeamA = (playerId: string) => {
    setTeamBPlayerIds(prev => prev.filter(id => id !== playerId));
    setTeamAPlayerIds(prev => (prev.includes(playerId) ? prev : [...prev, playerId]));
    if (!teamAAllocations[playerId]) {
      setTeamAAllocations(prev => ({ ...prev, [playerId]: 1 }));
    }
  };

  const moveToTeamB = (playerId: string) => {
    setTeamAPlayerIds(prev => prev.filter(id => id !== playerId));
    setTeamBPlayerIds(prev => (prev.includes(playerId) ? prev : [...prev, playerId]));
    if (!teamBAllocations[playerId]) {
      setTeamBAllocations(prev => ({ ...prev, [playerId]: 1 }));
    }
  };

  const removeFromTeams = (playerId: string) => {
    setTeamAPlayerIds(prev => prev.filter(id => id !== playerId));
    setTeamBPlayerIds(prev => prev.filter(id => id !== playerId));
  };

  const autoSplitSquad = () => {
    const shuffled = [...allPlayers].sort(() => 0.5 - Math.random());
    const mid = Math.ceil(shuffled.length / 2);
    const a = shuffled.slice(0, mid).map(p => p.id);
    const b = shuffled.slice(mid).map(p => p.id);
    setTeamAPlayerIds(a);
    setTeamBPlayerIds(b);

    const aAlloc: Record<string, number> = {};
    const bAlloc: Record<string, number> = {};
    a.forEach(id => (aAlloc[id] = 1));
    b.forEach(id => (bAlloc[id] = 1));
    setTeamAAllocations(aAlloc);
    setTeamBAllocations(bAlloc);
  };

  // Determine batting and bowling temporary teams based on toss
  const isTeamABattingFirst =
    (tossWinnerTeam === 'teamA' && tossDecision === 'BAT') ||
    (tossWinnerTeam === 'teamB' && tossDecision === 'BOWL');

  const battingPlayerIds = isTeamABattingFirst ? teamAPlayerIds : teamBPlayerIds;
  const bowlingPlayerIds = isTeamABattingFirst ? teamBPlayerIds : teamAPlayerIds;

  const battingTeamDisplayName = isTeamABattingFirst ? teamAName : teamBName;
  const bowlingTeamDisplayName = isTeamABattingFirst ? teamBName : teamAName;

  // Create Match Mutation
  const createMatchMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      if (teamAPlayerIds.length === 0 || teamBPlayerIds.length === 0) {
        throw new Error('Both Team A and Team B must have at least 1 player');
      }

      if (!strikerId || !nonStrikerId || !bowlerId) {
        throw new Error('Please select opening striker, non-striker, and bowler');
      }

      if (strikerId === nonStrikerId) {
        throw new Error('Striker and non-striker cannot be the same player');
      }

      const teamABowlingAllocations = teamAPlayerIds.map(pId => ({
        playerId: pId,
        allocatedOvers: teamAAllocations[pId] || 1,
      }));

      const teamBBowlingAllocations = teamBPlayerIds.map(pId => ({
        playerId: pId,
        allocatedOvers: teamBAllocations[pId] || 1,
      }));

      const payload = {
        venue,
        totalOvers,
        bowlingAllocationRule: bowlingRule,
        teamA: {
          teamName: teamAName.trim(),
          playerIds: teamAPlayerIds,
          captainPlayerId: teamACaptainId || undefined,
          bowlingAllocations: teamABowlingAllocations,
        },
        teamB: {
          teamName: teamBName.trim(),
          playerIds: teamBPlayerIds,
          captainPlayerId: teamBCaptainId || undefined,
          bowlingAllocations: teamBBowlingAllocations,
        },
        toss: {
          tossWinnerTeam,
          tossDecision,
        },
        openingPlayers: {
          strikerId,
          nonStrikerId,
          bowlerId,
        },
      };

      const res = await gullyApi.createTeamMatch(payload);
      return res.data;
    },
    onSuccess: data => {
      navigate(`/gully/live/${data.id}`);
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to create match');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const unassignedPlayers = allPlayers.filter(
    p => !teamAPlayerIds.includes(p.id) && !teamBPlayerIds.includes(p.id)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <Link
            to="/gully"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Gully Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-amber-400" />
            Create Gully Team Match
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Divide your squad into temporary teams with custom overs and flexible rules.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              step === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            1. Form Teams
          </span>
          <span className="text-slate-400 dark:text-slate-600">→</span>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              step === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            2. Overs & Toss
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs p-3.5 rounded-2xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Registered Squad ({allPlayers.length} players)</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Click "Move to A" or "Move to B" to divide your squad. You can have unequal team sizes.
              </div>
            </div>
            <button
              onClick={autoSplitSquad}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-Split Squad 50/50
            </button>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team A */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Team A Name
                  </label>
                  <input
                    type="text"
                    value={teamAName}
                    onChange={e => setTeamAName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white mt-1 focus:outline-none"
                    placeholder="Team A Name"
                  />
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Count</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{teamAPlayerIds.length}</div>
                </div>
              </div>

              {/* Captain selector */}
              {teamAPlayerIds.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="text-slate-600 dark:text-slate-400">Captain:</span>
                  <select
                    value={teamACaptainId}
                    onChange={e => setTeamACaptainId(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="">Select Captain</option>
                    {teamAPlayerIds.map(pId => {
                      const p = allPlayers.find(x => x.id === pId);
                      return (
                        <option key={pId} value={pId}>
                          {p?.playerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Player list */}
              <div className="space-y-2 min-h-[180px]">
                {teamAPlayerIds.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No players in Team A yet
                  </div>
                ) : (
                  teamAPlayerIds.map(pId => {
                    const p = allPlayers.find(x => x.id === pId);
                    if (!p) return null;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 dark:text-slate-500 font-bold">#{p.jerseyNumber}</span>
                          <span className="font-bold text-slate-900 dark:text-white">{p.playerName}</span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                            {p.role}
                          </span>
                          {teamACaptainId === p.id && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                              <Crown className="w-3 h-3" /> (C)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => moveToTeamB(p.id)}
                            title="Move to Team B"
                            className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromTeams(p.id)}
                            title="Remove"
                            className="p-1 rounded-lg bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Team B */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Team B Name
                  </label>
                  <input
                    type="text"
                    value={teamBName}
                    onChange={e => setTeamBName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white mt-1 focus:outline-none"
                    placeholder="Team B Name"
                  />
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Count</span>
                  <div className="text-xl font-black text-cyan-600 dark:text-cyan-400">{teamBPlayerIds.length}</div>
                </div>
              </div>

              {/* Captain selector */}
              {teamBPlayerIds.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="text-slate-600 dark:text-slate-400">Captain:</span>
                  <select
                    value={teamBCaptainId}
                    onChange={e => setTeamBCaptainId(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="">Select Captain</option>
                    {teamBPlayerIds.map(pId => {
                      const p = allPlayers.find(x => x.id === pId);
                      return (
                        <option key={pId} value={pId}>
                          {p?.playerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Player list */}
              <div className="space-y-2 min-h-[180px]">
                {teamBPlayerIds.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No players in Team B yet
                  </div>
                ) : (
                  teamBPlayerIds.map(pId => {
                    const p = allPlayers.find(x => x.id === pId);
                    if (!p) return null;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 dark:text-slate-500 font-bold">#{p.jerseyNumber}</span>
                          <span className="font-bold text-slate-900 dark:text-white">{p.playerName}</span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                            {p.role}
                          </span>
                          {teamBCaptainId === p.id && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                              <Crown className="w-3 h-3" /> (C)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => moveToTeamA(p.id)}
                            title="Move to Team A"
                            className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromTeams(p.id)}
                            title="Remove"
                            className="p-1 rounded-lg bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Unassigned Players Bank */}
          {unassignedPlayers.length > 0 && (
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3 shadow-md">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Unassigned Players ({unassignedPlayers.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {unassignedPlayers.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  >
                    <div>
                      <span className="font-mono text-slate-400 dark:text-slate-500 font-bold mr-1.5">#{p.jerseyNumber}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{p.playerName}</span>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.role}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => moveToTeamA(p.id)}
                        className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/30"
                      >
                        + A
                      </button>
                      <button
                        onClick={() => moveToTeamB(p.id)}
                        className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold text-[10px] border border-cyan-500/30"
                      >
                        + B
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (teamAPlayerIds.length === 0 || teamBPlayerIds.length === 0) {
                  setErrorMessage('Please assign at least 1 player to both Team A and Team B');
                  return;
                }
                setErrorMessage(null);
                setStep(2);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              Continue to Match Config & Toss <ChevronRight className="w-4 h-4 font-bold" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Overs Configuration */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  Custom Overs Configuration
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Gully Cricket has completely flexible overs. Select a quick preset or type any custom number of overs.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-500 dark:text-amber-400">{totalOvers}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">Overs / innings</span>
              </div>
            </div>

            {/* Quick over buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[2, 3, 5, 7, 8, 10, 12, 15, 20].map(ov => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => {
                    setTotalOvers(ov);
                    setCustomOversInput(ov.toString());
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    totalOvers === ov
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {ov} ov
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

            {/* Bowling Allocation Rule */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bowling Over Limit Rule</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setBowlingRule('MAX_LIMIT')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    bowlingRule === 'MAX_LIMIT'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500/50 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Check className={`w-3.5 h-3.5 ${bowlingRule === 'MAX_LIMIT' ? 'opacity-100' : 'opacity-0'}`} />
                    Maximum Limits (Flexible)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5">
                    Allocations act as caps. Captains can distribute remaining overs as match unfolds.
                  </div>
                </div>

                <div
                  onClick={() => setBowlingRule('EXACT')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    bowlingRule === 'EXACT'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500/50 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Check className={`w-3.5 h-3.5 ${bowlingRule === 'EXACT' ? 'opacity-100' : 'opacity-0'}`} />
                    Exact Over Allocations
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5">
                    Every bowler must bowl exactly the configured number of allocated overs.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toss Setup */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Toss & Match Start
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Toss Winner</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setTossWinnerTeam('teamA')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      tossWinnerTeam === 'teamA'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {teamAName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTossWinnerTeam('teamB')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      tossWinnerTeam === 'teamB'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-700 dark:text-cyan-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {teamBName}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Decision</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setTossDecision('BAT')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      tossDecision === 'BAT'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🏏 Bat First
                  </button>
                  <button
                    type="button"
                    onClick={() => setTossDecision('BOWL')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      tossDecision === 'BOWL'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    ⚾ Bowl First
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-xl">
              Batting First: <span className="font-bold text-slate-900 dark:text-white">{battingTeamDisplayName}</span> • Fielding First:{' '}
              <span className="font-bold text-slate-900 dark:text-white">{bowlingTeamDisplayName}</span>
            </div>
          </div>

          {/* Opening Players Selection */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Opening Batters & Bowler
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Opening Striker ({battingTeamDisplayName})
                </label>
                <select
                  value={strikerId}
                  onChange={e => setStrikerId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 mt-1.5 focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="">Select Striker</option>
                  {battingPlayerIds.map(pId => {
                    const p = allPlayers.find(x => x.id === pId);
                    return (
                      <option key={pId} value={pId} disabled={pId === nonStrikerId}>
                        {p?.playerName} #{p?.jerseyNumber}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Opening Non-Striker ({battingTeamDisplayName})
                </label>
                <select
                  value={nonStrikerId}
                  onChange={e => setNonStrikerId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 mt-1.5 focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="">Select Non-Striker</option>
                  {battingPlayerIds.map(pId => {
                    const p = allPlayers.find(x => x.id === pId);
                    return (
                      <option key={pId} value={pId} disabled={pId === strikerId}>
                        {p?.playerName} #{p?.jerseyNumber}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  Opening Bowler ({bowlingTeamDisplayName})
                </label>
                <select
                  value={bowlerId}
                  onChange={e => setBowlerId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 mt-1.5 focus:outline-none focus:border-cyan-500 font-bold"
                >
                  <option value="">Select Opening Bowler</option>
                  {bowlingPlayerIds.map(pId => {
                    const p = allPlayers.find(x => x.id === pId);
                    return (
                      <option key={pId} value={pId}>
                        {p?.playerName} #{p?.jerseyNumber}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Teams
            </button>

            <button
              onClick={() => createMatchMutation.mutate()}
              disabled={createMatchMutation.isPending}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 transition-all shadow-xl shadow-amber-500/25 active:scale-95 disabled:opacity-50"
            >
              <Flame className="w-4 h-4 fill-slate-950 font-bold" />
              {createMatchMutation.isPending ? 'Starting Match...' : 'Start Gully Team Match'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
