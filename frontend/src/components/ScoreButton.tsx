import React from 'react';

interface ScoreButtonProps {
  label: string;
  sublabel?: string;
  variant?: 'run' | 'boundary' | 'extra' | 'wicket' | 'undo';
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export const ScoreButton: React.FC<ScoreButtonProps> = ({
  label,
  sublabel,
  variant = 'run',
  disabled = false,
  onClick,
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'boundary':
        return 'bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20 active:scale-95 border border-amber-400/80';
      case 'wicket':
        return 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold shadow-md shadow-red-600/30 active:scale-95 border border-red-500';
      case 'extra':
        return 'bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/40 active:scale-95 shadow-sm font-bold';
      case 'undo':
        return 'bg-amber-50 dark:bg-slate-800/80 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:border-amber-400 active:scale-95 font-semibold shadow-sm';
      case 'run':
      default:
        return 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 shadow-sm font-bold';
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none ${getVariantStyles()} ${className}`}
    >
      <span className="text-xl sm:text-2xl tracking-tight leading-none">{label}</span>
      {sublabel && (
        <span className="text-[10px] sm:text-xs opacity-80 mt-0.5 tracking-wider uppercase font-semibold">
          {sublabel}
        </span>
      )}
    </button>
  );
};
