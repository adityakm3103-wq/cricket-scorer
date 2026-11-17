import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.js';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 stadium-bg transition-colors duration-200">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">PavilionPro</span>
            <span>&copy; {new Date().getFullYear()}</span>
            <span>— Next-Gen Cricket Scoring & Management Engine</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">T10</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">T20</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">ODI</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">5-Day Test</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">Gully Mode</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
