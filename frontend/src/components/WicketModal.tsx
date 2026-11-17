import React, { useState, useEffect } from 'react';
import { DismissalType, Player } from '../types/index.js';
import { AlertCircle, X, ShieldAlert } from 'lucide-react';

interface WicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    dismissalType: DismissalType;
    dismissedPlayerId: string;
    fielderId?: string;
    incomingBatterId?: string;
    runsCompletedBeforeDismissal: number;
  }) => void;
  striker: Player;
  nonStriker: Player;
  bowlingTeamPlayers: Player[];
  availableIncomingBatters: Player[];
  isAllOutNext: boolean;
}

export const WicketModal: React.FC<WicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  striker,
  nonStriker,
  bowlingTeamPlayers,
  availableIncomingBatters,
  isAllOutNext,
}) => {
  const [dismissalType, setDismissalType] = useState<DismissalType>('CAUGHT');
  const [dismissedPlayerId, setDismissedPlayerId] = useState<string>(striker?.id || '');
  const [fielderId, setFielderId] = useState<string>('');
  const [incomingBatterId, setIncomingBatterId] = useState<string>('');
  const [runsCompleted, setRunsCompleted] = useState<number>(0);

  // Reset state whenever modal opens or active striker changes
  useEffect(() => {
    if (isOpen) {
      setDismissalType('CAUGHT');
      setDismissedPlayerId(striker?.id || '');
      setFielderId('');
      setIncomingBatterId('');
      setRunsCompleted(0);
    }
  }, [isOpen, striker?.id, nonStriker?.id]);

  if (!isOpen) return null;

  const dismissalOptions: { type: DismissalType; label: string; bowlerCredited: boolean }[] = [
    { type: 'BOWLED', label: 'Bowled', bowlerCredited: true },
    { type: 'CAUGHT', label: 'Caught', bowlerCredited: true },
    { type: 'LBW', label: 'LBW', bowlerCredited: true },
    { type: 'RUN_OUT', label: 'Run Out', bowlerCredited: false },
    { type: 'STUMPED', label: 'Stumped', bowlerCredited: true },
    { type: 'HIT_WICKET', label: 'Hit Wicket', bowlerCredited: true },
    { type: 'RETIRED_OUT', label: 'Retired Out', bowlerCredited: false },
    { type: 'OBSTRUCTING_FIELD', label: 'Obstructing Field', bowlerCredited: false },
  ];

  const requiresFielder = ['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(dismissalType);

  const activeDismissedId =
    dismissedPlayerId === nonStriker?.id ? nonStriker.id : (striker?.id || dismissedPlayerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllOutNext && availableIncomingBatters.length > 0 && !incomingBatterId) {
      alert('Please select the incoming batter');
      return;
    }
    onConfirm({
      dismissalType,
      dismissedPlayerId: activeDismissedId,
      fielderId: requiresFielder && fielderId ? fielderId : undefined,
      incomingBatterId: isAllOutNext ? undefined : incomingBatterId,
      runsCompletedBeforeDismissal: dismissalType === 'RUN_OUT' ? runsCompleted : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-colors duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto transition-colors duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Record Wicket</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select dismissal details and incoming batter</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dismissal Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Dismissal Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {dismissalOptions.map(opt => (
                <button
                  type="button"
                  key={opt.type}
                  onClick={() => setDismissalType(opt.type)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                    dismissalType === opt.type
                      ? 'bg-red-50 dark:bg-red-500/20 border-red-500 text-red-600 dark:text-red-400 shadow-sm ring-1 ring-red-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dismissed Batter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Batter Dismissed
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDismissedPlayerId(striker.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  activeDismissedId === striker?.id
                    ? 'bg-red-50 dark:bg-red-500/20 border-red-500 text-slate-900 dark:text-white ring-2 ring-red-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-0.5">Striker *</div>
                <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{striker?.playerName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Jersey #{striker?.jerseyNumber}</div>
              </button>

              <button
                type="button"
                onClick={() => setDismissedPlayerId(nonStriker?.id || '')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  activeDismissedId === nonStriker?.id
                    ? 'bg-red-50 dark:bg-red-500/20 border-red-500 text-slate-900 dark:text-white ring-2 ring-red-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-0.5">Non-Striker</div>
                <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{nonStriker.playerName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Jersey #{nonStriker.jerseyNumber}</div>
              </button>
            </div>
          </div>

          {/* Run Out Completed Runs */}
          {dismissalType === 'RUN_OUT' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Completed Runs Before Run Out
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(runs => (
                  <button
                    type="button"
                    key={runs}
                    onClick={() => setRunsCompleted(runs)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      runsCompleted === runs
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-600 dark:border-emerald-400 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {runs}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fielder Selection (for Caught / Run Out / Stumped) */}
          {requiresFielder && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Fielder Involved
              </label>
              <select
                value={fielderId}
                onChange={e => setFielderId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-medium"
              >
                <option value="">Select Fielder (Optional)</option>
                {bowlingTeamPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.playerName} (#{p.jerseyNumber}) - {p.role}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Incoming Batter Selection */}
          {!isAllOutNext && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Next Incoming Batter
              </label>
              {availableIncomingBatters.length > 0 ? (
                <select
                  value={incomingBatterId}
                  onChange={e => setIncomingBatterId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-medium"
                >
                  <option value="">Select Next Batter</option>
                  {availableIncomingBatters.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.playerName} (#{p.jerseyNumber}) - {p.role}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  No more batters available. Innings will conclude as All Out.
                </div>
              )}
            </div>
          )}

          {isAllOutNext && (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              This wicket will conclude the innings (All Out).
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-all"
            >
              Confirm Wicket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
