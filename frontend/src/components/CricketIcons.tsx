import React from 'react';

// Authentic Cricket Ball with stitched seam
export const CricketBallIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <radialGradient id="cricketBallGrad" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="45%" stopColor="#dc2626" />
        <stop offset="85%" stopColor="#991b1b" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </radialGradient>
      <linearGradient id="seamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#fef08a" />
      </linearGradient>
    </defs>
    {/* Ball sphere */}
    <circle cx="24" cy="24" r="21" fill="url(#cricketBallGrad)" />
    {/* Shadow depth */}
    <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
    {/* Subtle specular highlight */}
    <ellipse cx="17" cy="14" rx="7" ry="4" fill="white" fillOpacity="0.25" transform="rotate(-30 17 14)" />
    {/* Curved raised seam */}
    <path
      d="M9 39 C15 30, 19 19, 39 9"
      stroke="url(#seamGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Seam stitches */}
    <path
      d="M10 38 L12 40 M14 34 L17 36 M18 29 L21 31 M23 23 L26 25 M28 17 L31 19 M33 12 L36 14 M37 8 L39 10"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Three Stumps with Bails on top
export const CricketStumpsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Ground / Crease line */}
    <line x1="6" y1="44" x2="42" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    {/* 3 Stumps */}
    <rect x="12" y="14" width="3.5" height="30" rx="1.5" fill="currentColor" />
    <rect x="22.25" y="14" width="3.5" height="30" rx="1.5" fill="currentColor" />
    <rect x="32.5" y="14" width="3.5" height="30" rx="1.5" fill="currentColor" />
    {/* 2 Bails on top */}
    <rect x="10" y="10" width="13" height="3" rx="1.2" fill="#eab308" />
    <rect x="25" y="10" width="13" height="3" rx="1.2" fill="#eab308" />
  </svg>
);

// Crossed Cricket Bats
export const CrossedBatsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Bat 1 angled right */}
    <g transform="rotate(45 24 24)">
      {/* Handle */}
      <rect x="22.5" y="3" width="3" height="13" rx="1.2" fill="#eab308" />
      {/* Grip wraps */}
      <line x1="22.5" y1="6" x2="25.5" y2="6" stroke="#ca8a04" strokeWidth="1" />
      <line x1="22.5" y1="9" x2="25.5" y2="9" stroke="#ca8a04" strokeWidth="1" />
      <line x1="22.5" y1="12" x2="25.5" y2="12" stroke="#ca8a04" strokeWidth="1" />
      {/* Blade */}
      <path d="M21 16 H27 V39 C27 41.5 25.8 43 24 43 C22.2 43 21 41.5 21 39 Z" fill="currentColor" />
    </g>
    {/* Bat 2 angled left */}
    <g transform="rotate(-45 24 24)">
      {/* Handle */}
      <rect x="22.5" y="3" width="3" height="13" rx="1.2" fill="#eab308" />
      {/* Grip wraps */}
      <line x1="22.5" y1="6" x2="25.5" y2="6" stroke="#ca8a04" strokeWidth="1" />
      <line x1="22.5" y1="9" x2="25.5" y2="9" stroke="#ca8a04" strokeWidth="1" />
      <line x1="22.5" y1="12" x2="25.5" y2="12" stroke="#ca8a04" strokeWidth="1" />
      {/* Blade */}
      <path d="M21 16 H27 V39 C27 41.5 25.8 43 24 43 C22.2 43 21 41.5 21 39 Z" fill="currentColor" opacity="0.9" />
    </g>
  </svg>
);

// 22-Yard Turf Pitch Illustration Badge
export const CricketPitchGraphic: React.FC<{ className?: string }> = ({ className = 'w-full' }) => (
  <div className={`relative rounded-2xl overflow-hidden p-4 bg-gradient-to-r from-emerald-900/90 via-emerald-800/90 to-emerald-900/90 border border-emerald-500/40 text-white shadow-xl ${className}`}>
    {/* Grass stripes background */}
    <div
      className="absolute inset-0 opacity-15 pointer-events-none"
      style={{
        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 40px)',
      }}
    />

    {/* Pitch Strip in center */}
    <div className="relative mx-auto max-w-md h-24 rounded-xl bg-gradient-to-r from-amber-200/90 via-amber-100/95 to-amber-200/90 dark:from-amber-900/40 dark:via-amber-800/50 dark:to-amber-900/40 border border-amber-300/40 dark:border-amber-700/50 flex items-center justify-between px-6 shadow-inner">
      {/* Bowler End Crease */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-1 bg-white dark:bg-slate-200 rounded-full mb-1 shadow-sm" />
        <CricketStumpsIcon className="w-6 h-6 text-amber-700 dark:text-amber-400" />
        <span className="text-[9px] font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider mt-1">
          Bowler
        </span>
      </div>

      {/* 22 Yards Center Badge */}
      <div className="text-center px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 shadow-md">
        <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          22 YARDS • 66 FT
        </div>
        <div className="text-[9px] text-emerald-200/70 font-semibold">TURF PITCH SPECIFICATION</div>
      </div>

      {/* Striker End Crease */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-1 bg-white dark:bg-slate-200 rounded-full mb-1 shadow-sm" />
        <CricketStumpsIcon className="w-6 h-6 text-amber-700 dark:text-amber-400" />
        <span className="text-[9px] font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider mt-1">
          Striker
        </span>
      </div>
    </div>
  </div>
);
