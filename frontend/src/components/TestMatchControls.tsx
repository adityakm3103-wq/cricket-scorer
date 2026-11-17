import React, { useState } from 'react';
import { Calendar, Clock, Flag, AlertCircle } from 'lucide-react';

interface TestMatchControlsProps {
  currentDay: number;
  currentSession: number;
  dayOvers: number;
  sessionOvers: number;
  leadTrailData?: {
    teamA: { name: string; cumulativeRuns: number };
    teamB: { name: string; cumulativeRuns: number };
    leaderTeam: { id: string; teamName: string } | null;
    leadRuns: number;
    canEnforceFollowOn: boolean;
    followOnEnforced: boolean;
  } | null;
  onEndSession: () => void;
  onEndDay: () => void;
  onDeclare: () => void;
  onFollowOn: (enforce: boolean) => void;
}

export const TestMatchControls: React.FC<TestMatchControlsProps> = ({
  currentDay,
  currentSession,
  dayOvers,
  sessionOvers,
  leadTrailData,
  onEndSession,
  onEndDay,
  onDeclare,
  onFollowOn,
}) => {
  const [showDeclareConfirm, setShowDeclareConfirm] = useState(false);

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 transition-colors">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            Day {currentDay} of 5
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-3 py-1 rounded-xl text-blue-700 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            Session {currentSession} of 3
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-800 dark:text-slate-200">{sessionOvers}</span> ov in session •{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{dayOvers}</span> ov in day
        </div>
      </div>

      {/* Cumulative Lead & Trail Banner */}
      {leadTrailData && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
            <span>
              {leadTrailData.teamA.name}: <strong className="text-slate-900 dark:text-white font-bold">{leadTrailData.teamA.cumulativeRuns}</strong>
            </span>
            <span className="text-slate-400">vs</span>
            <span>
              {leadTrailData.teamB.name}: <strong className="text-slate-900 dark:text-white font-bold">{leadTrailData.teamB.cumulativeRuns}</strong>
            </span>
          </div>

          <div>
            {leadTrailData.leadRuns > 0 && leadTrailData.leaderTeam ? (
              <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                {leadTrailData.leaderTeam.teamName} lead by {leadTrailData.leadRuns} runs
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">Scores are level</span>
            )}
          </div>
        </div>
      )}

      {/* Follow-On Prompt */}
      {leadTrailData?.canEnforceFollowOn && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">Follow-On Available!</span>
              <span className="text-slate-600 dark:text-slate-300">Opponent trails by 200+ runs. Enforce follow-on?</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onFollowOn(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              Enforce Follow-On
            </button>
            <button
              onClick={() => onFollowOn(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-300 dark:border-slate-700"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={onEndSession}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          End Session
        </button>

        <button
          onClick={onEndDay}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          End Day {currentDay}
        </button>

        <button
          onClick={() => setShowDeclareConfirm(true)}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 transition-colors"
        >
          <Flag className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          Declare Innings
        </button>
      </div>

      {/* Declare Confirmation Modal */}
      {showDeclareConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
              <Flag className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Declare Innings?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to declare the current innings closed? This will transition to the next innings.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeclareConfirm(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeclareConfirm(false);
                  onDeclare();
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30"
              >
                Confirm Declaration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
