import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { authApi } from '../services/api.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { CricketBallIcon } from '../components/CricketIcons.js';
import {
  LogIn,
  AlertCircle,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ usernameOrEmail, password });
      login(res.data.token, res.data.team);
      if (res.data.team?.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setUsernameOrEmail('admin@cricket.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      {/* Stadium Ambient Lighting & Pitch Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] bg-emerald-600/10 dark:bg-emerald-600/15 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-950 flex items-center justify-center">
              <CricketBallIcon className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="font-black text-xl text-slate-900 dark:text-white tracking-tight leading-none">
              PAVILION<span className="text-emerald-600 dark:text-emerald-400">CRICKET</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mt-0.5">
              Match & Tournament Suite
            </div>
          </div>
        </Link>

        <ThemeToggle variant="pill" />
      </header>

      {/* Centered Login Card */}
      <main className="relative z-10 max-w-md mx-auto w-full px-4 py-8 flex-1 flex items-center justify-center">
        <div className="w-full bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative">
          {/* Top Seam Accent Line */}
          <div className="absolute top-0 left-10 right-10 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 rounded-b-full shadow-sm" />

          {/* Title Header */}
          <div className="text-center mb-6 pt-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400 p-0.5 shadow-xl shadow-emerald-500/25 mx-auto mb-3">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-950 flex items-center justify-center">
                <CricketBallIcon className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Sign In to Pavilion
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Enter with your Administrator or Registered Team account
            </p>
          </div>

          {/* Quick Admin Auto-Fill (No Demo Teams - Only Admin) */}
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Admin Console</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">admin@cricket.com</div>
              </div>
            </div>
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider transition-all shadow-sm hover:scale-105 active:scale-95 shrink-0"
            >
              Auto Fill
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  placeholder="admin@cricket.com or team handle"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium transition-all focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium transition-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white dark:text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 tracking-wider uppercase"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              {loading ? 'Signing In...' : 'Sign In to Pavilion'}
            </button>
          </form>

          {/* Registration Link */}
          <div className="text-center mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span>Register a new cricket team? </span>
            <Link
              to="/register"
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
            >
              Register Team Franchise
            </Link>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 text-center text-xs text-slate-400 dark:text-slate-500">
        Pavilion Cricket Suite • Hosted on Supabase
      </footer>
    </div>
  );
};
