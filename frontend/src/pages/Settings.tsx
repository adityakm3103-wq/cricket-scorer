import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { Settings as SettingsIcon, Shield, Trophy, Moon, Sun, Laptop } from 'lucide-react';

export const Settings: React.FC = () => {
  const { team } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data: teamStats } = useQuery({
    queryKey: ['teamStats', team?.id],
    queryFn: async () => {
      const res = await statsApi.getTeamStats(team!.id);
      return res.data;
    },
    enabled: !!team?.id,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 transition-colors duration-200">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize your visual experience, review account credentials, and inspect lifetime team statistics.
        </p>
      </div>

      {/* Visual Appearance & Theme Selection Card */}
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Interface Theme & Appearance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose between Daylight Stadium Mode or Cinematic Floodlight Dark Mode.
            </p>
          </div>
          <ThemeToggle variant="pill" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {/* Light Mode Selector Card */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
              theme === 'light'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Daylight Stadium Mode
                {theme === 'light' && (
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Bright, crisp stadium aesthetic with high-contrast text and clean borders for daylight scoring.
              </p>
            </div>
          </button>

          {/* Dark Mode Selector Card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
              theme === 'dark'
                ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Floodlight Dark Mode
                {theme === 'dark' && (
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deep obsidian and slate palette with glowing emerald and gold accents for low-light pavilions.
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 transition-colors">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Account Information
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold mb-1">
                Official Team Name
              </span>
              <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/60 font-bold text-slate-900 dark:text-white text-sm">
                {team?.teamName}
              </div>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold mb-1">
                Unique Handle
              </span>
              <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/60 font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                @{team?.username}
              </div>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold mb-1">
                Registered Email
              </span>
              <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-sm font-medium">
                {team?.email}
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Team data is isolated with Supabase PostgreSQL Row Level Security (RLS) and JWT authentication. Individual player login is disallowed by design.
            </div>
          </div>
        </div>

        {/* Lifetime Team Stats Summary */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 transition-colors">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Trophy className="w-4 h-4 text-amber-500" />
            Lifetime Statistics
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold">Total Matches</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {teamStats?.totalMatches || 0}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold">Total Runs</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {teamStats?.totalRunsScored || 0}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold">Wickets Taken</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                {teamStats?.totalWicketsTaken || 0}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold">Highest Total</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                {teamStats?.highestTotal || 0}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Cricket Scoring Integrity</span>
            All player and team stats are dynamically aggregated from ball-by-ball deliveries and scorecards. Manual score entry is prohibited.
          </div>
        </div>
      </div>
    </div>
  );
};
