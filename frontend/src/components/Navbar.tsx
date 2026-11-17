import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { ThemeToggle } from './ThemeToggle.js';
import { CricketBallIcon } from './CricketIcons.js';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Trophy,
  Flame,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { team, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin sees Platform Dashboard, Create Match, Match History, Settings
  // Team sees My Team Dashboard, Gully Cricket, My Squad, Match History, Settings
  const navLinks = isAdmin
    ? [
        { name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Create Match', path: '/create-match', icon: PlusCircle },
        { name: 'Match History', path: '/history', icon: History },
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Gully Cricket', path: '/gully', icon: Flame, isGully: true },
        { name: 'My Squad', path: '/squad', icon: Users },
        { name: 'Match History', path: '/history', icon: History },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/90 dark:border-slate-800/80 sticky top-0 z-40 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
                <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                  <CricketBallIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 leading-none">
                  PAVILION<span className="text-emerald-600 dark:text-emerald-400">CRICKET</span>
                  {isAdmin && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded shadow-sm">
                      ADMIN
                    </span>
                  )}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-extrabold mt-0.5">
                  {isAdmin ? 'Tournament Admin' : 'Scoring Console'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1.5 ml-8">
              {navLinks.map((link: any) => {
                const Icon = link.icon;
                const isActive =
                  location.pathname === link.path || (link.isGully && location.pathname.startsWith('/gully'));
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? link.isGully
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 shadow-sm'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? link.isGully
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-400'
                      }`}
                    />
                    {link.name}
                    {link.isGully && (
                      <span className="text-[9px] font-black uppercase bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full font-mono shadow-sm">
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Side - Theme Toggle & Team Profile / Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle Pill */}
            <ThemeToggle variant="pill" />

            {team ? (
              <div className="flex items-center gap-2.5 bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700/60 px-3.5 py-1.5 rounded-full shadow-sm transition-colors">
                <div
                  className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shadow-sm ${
                    isAdmin ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-white dark:text-slate-950'
                  }`}
                >
                  {getInitials(team.teamName)}
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {team.teamName}
                    </span>
                    {isAdmin && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    @{team.username}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="ml-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/60"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 px-4 py-1.5 rounded-xl shadow-sm shadow-emerald-600/20 transition-all"
                >
                  Register Team
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions: Theme Toggle + Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle variant="compact" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-2.5 transition-colors">
          {team && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center ${
                    isAdmin ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-white dark:text-slate-950'
                  }`}
                >
                  {getInitials(team.teamName)}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{team.teamName}</span>
                    {isAdmin && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/40">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">@{team.username}</span>
                </div>
              </div>
              <ThemeToggle variant="pill" />
            </div>
          )}

          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {link.name}
                </div>
                {link.isGully && (
                  <span className="text-[9px] font-black uppercase bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full font-mono">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}

          {team ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-xl"
              >
                Register Team
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
