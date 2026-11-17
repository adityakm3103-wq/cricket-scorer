import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { MatchFormat } from '../types/index.js';
import { Zap, Flame, Shield, Trophy, ChevronRight, Check } from 'lucide-react';

export const SelectFormat: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const formats: {
    format: MatchFormat;
    title: string;
    badge: string;
    oversDesc: string;
    bowlerLimit: string;
    description: string;
    icon: any;
    color: string;
  }[] = [
    {
      format: 'T10',
      title: 'T10 Cricket',
      badge: 'Fast & Action-Packed',
      oversDesc: '10 Overs Per Innings',
      bowlerLimit: 'Max 2 overs per bowler',
      description: 'Ultra-fast cricket format designed for high octane entertainment and rapid scoring.',
      icon: Zap,
      color: 'from-amber-500 to-orange-600',
    },
    {
      format: 'T20',
      title: 'T20 International / League',
      badge: 'Standard T20',
      oversDesc: '20 Overs Per Innings',
      bowlerLimit: 'Max 4 overs per bowler',
      description: 'The world standard franchise and international format with 20 allotted overs per side.',
      icon: Flame,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      format: 'ODI',
      title: 'One Day International',
      badge: '50 Overs',
      oversDesc: '50 Overs Per Innings',
      bowlerLimit: 'Max 10 overs per bowler',
      description: 'Traditional 50-over limited overs cricket testing tactical pacing and endurance.',
      icon: Trophy,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      format: 'TEST',
      title: 'Test Match',
      badge: 'First-Class & International',
      oversDesc: '5 Days • 4 Innings',
      bowlerLimit: 'Unlimited overs per bowler',
      description: 'The ultimate test of cricket with 3 sessions per day (90 overs), follow-on, and declarations.',
      icon: Shield,
      color: 'from-purple-500 to-violet-700',
    },
  ];

  const handleSelect = (format: MatchFormat) => {
    navigate(`/match-setup?format=${format}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 transition-colors duration-200">
      <div className="text-center space-y-2">
        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
          Match Setup • Step 1
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Select Match Format
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
          Choose from standard official formats. The cricket engine strictly enforces format-specific over limits, session rules, and bowling constraints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {formats.map(f => {
          const Icon = f.icon;
          return (
            <div
              key={f.format}
              onClick={() => handleSelect(f.format)}
              className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${f.color} flex items-center justify-center text-white font-black shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
                    {f.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{f.description}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {f.oversDesc}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {f.bowlerLimit}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Configure Playing XI & Toss</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
