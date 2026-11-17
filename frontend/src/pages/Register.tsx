import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { authApi } from '../services/api.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { CricketBallIcon, CrossedBatsIcon } from '../components/CricketIcons.js';
import {
  Trophy,
  UserPlus,
  AlertCircle,
  Shield,
  User,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const Register: React.FC = () => {
  const [teamName, setTeamName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.register({
        teamName,
        username,
        email,
        password,
        confirmPassword,
      });
      login(res.data.token, res.data.team);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      {/* Stadium Ambient Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[45rem] h-[25rem] bg-emerald-600/15 rounded-full blur-3xl" />
      </div>

      {/* Top Bar with Brand & Theme Toggle */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400 p-0.5 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-all">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
              <CricketBallIcon className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="font-black text-xl text-white tracking-tight leading-none flex items-center gap-1.5">
              PAVILION<span className="text-emerald-400">CRICKET</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mt-0.5">
              Franchise Registration
            </div>
          </div>
        </Link>
        <ThemeToggle variant="pill" />
      </header>

      {/* Main Registration Form */}
      <main className="relative z-10 max-w-xl mx-auto w-full px-4 py-8 flex-1 flex items-center justify-center">
        <div className="w-full bg-slate-950/95 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative backdrop-blur-2xl">
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 rounded-b-full shadow-md" />

          <div className="text-center mb-6 pt-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
              <CrossedBatsIcon className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              New Franchise
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
              Register Cricket Team
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Create an official franchise account to manage squads & participate in fixtures
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Official Team Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Royal Challengers"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-medium transition-all focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Team Handle / Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. royal_challengers"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-medium transition-all focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Team Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contact@team.com"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-medium transition-all focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-medium transition-all focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-medium transition-all focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 tracking-wider uppercase"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              {loading ? 'Registering Team...' : 'Register Team Franchise'}
            </button>
          </form>

          <div className="text-center mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400">
            <span>Already registered your franchise? </span>
            <Link
              to="/login"
              className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
            >
              Sign In to Pavilion
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-800/60 text-center text-xs text-slate-500">
        Pavilion Cricket Suite • Official Match Engine
      </footer>
    </div>
  );
};
