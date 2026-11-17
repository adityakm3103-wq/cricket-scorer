import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface ThemeToggleProps {
  variant?: 'pill' | 'button' | 'compact';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'pill', className = '' }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`p-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700/60 shadow-sm'
            : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm shadow-slate-200/50'
        } ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform duration-500 hover:rotate-90 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-500 hover:-rotate-12 text-indigo-600" />
        )}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 hover:border-slate-600'
            : 'bg-white hover:bg-slate-100/80 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm'
        } ${className}`}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Light</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dark</span>
          </>
        )}
      </button>
    );
  }

  // Default 'pill' toggle with smooth sliding indicator
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode (Current: ${theme})`}
      className={`relative inline-flex items-center h-8 w-16 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
        isDark
          ? 'bg-slate-800/90 border border-slate-700/70 shadow-inner'
          : 'bg-slate-200 border border-slate-300/80 shadow-inner'
      } ${className}`}
    >
      {/* Background Icons */}
      <span className="w-full flex items-center justify-between px-1 text-[10px] pointer-events-none select-none">
        <Sun className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-40 text-slate-400' : 'opacity-100 text-amber-500'}`} />
        <Moon className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-100 text-indigo-400' : 'opacity-40 text-slate-500'}`} />
      </span>

      {/* Sliding Knob */}
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
          isDark
            ? 'translate-x-8 bg-slate-900 border border-slate-700 text-indigo-300'
            : 'translate-x-0 bg-white border border-slate-200 text-amber-500'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 fill-indigo-400/20 text-indigo-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 fill-amber-400/30 text-amber-500" />
        )}
      </span>
    </button>
  );
};
