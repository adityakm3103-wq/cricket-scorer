import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { squadApi } from '../services/api.js';
import { Player, PlayerRole } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';

export const Squad: React.FC = () => {
  const queryClient = useQueryClient();
  const { team, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Form states
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [role, setRole] = useState<PlayerRole>('BATTER');
  const [formError, setFormError] = useState('');

  const { data: squad, isLoading } = useQuery<Player[]>({
    queryKey: ['squad', team?.id, roleFilter, search],
    queryFn: async () => {
      const res = await squadApi.getSquad({
        teamId: team?.id,
        role: (roleFilter as PlayerRole) || undefined,
        search: search.trim() || undefined,
      });
      return res.data;
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: { playerName: string; jerseyNumber: number; role: PlayerRole }) =>
      squadApi.addPlayer({ ...data, teamId: team?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad'] });
      queryClient.invalidateQueries({ queryKey: ['teamDashboard'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || err.message || 'Failed to add player');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { playerName: string; jerseyNumber: number; role: PlayerRole } }) =>
      squadApi.updatePlayer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to update player');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => squadApi.deletePlayer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad'] });
      queryClient.invalidateQueries({ queryKey: ['teamDashboard'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Cannot delete player');
    },
  });

  const openAddModal = () => {
    setEditingPlayer(null);
    setPlayerName('');
    setJerseyNumber('');
    setRole('BATTER');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setPlayerName(player.playerName);
    setJerseyNumber(player.jerseyNumber.toString());
    setRole(player.role);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingPlayer(null);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const jNum = parseInt(jerseyNumber, 10);
    if (isNaN(jNum) || jNum <= 0) {
      setFormError('Please enter a valid positive jersey number');
      return;
    }

    if (editingPlayer) {
      updateMutation.mutate({
        id: editingPlayer.id,
        data: { playerName, jerseyNumber: jNum, role },
      });
    } else {
      addMutation.mutate({
        playerName,
        jerseyNumber: jNum,
        role,
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name} from your squad?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Squad Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            Squad Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Register and manage {team?.teamName ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{team.teamName}</span> : 'your team'}'s squad. All player statistics are updated automatically.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add Player
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by player name or jersey number..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 w-full sm:w-auto font-medium"
          >
            <option value="">All Roles</option>
            <option value="BATTER">Batters</option>
            <option value="BOWLER">Bowlers</option>
            <option value="ALL_ROUNDER">All-rounders</option>
            <option value="WICKETKEEPER">Wicketkeepers</option>
          </select>
        </div>
      </div>

      {/* Squad Table / Cards */}
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : squad && squad.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="py-3 px-4"># Jersey</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Matches</th>
                  <th className="py-3 px-4 text-center">Runs</th>
                  <th className="py-3 px-4 text-center">Wickets</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {squad.map(player => (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      #{player.jerseyNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/player/${player.id}`}
                        className="text-slate-900 dark:text-white font-bold hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2"
                      >
                        {player.playerName}
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {player.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300 font-semibold">
                      {player.matchesPlayed || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                      {player.runsScored || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center text-blue-600 dark:text-blue-400 font-bold">
                      {player.wicketsTaken || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEditModal(player)}
                          title="Edit Player"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(player.id, player.playerName)}
                          title="Delete Player"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-400">No players found</p>
            <p className="text-xs text-slate-500 mt-1">
              {search || roleFilter ? 'Try clearing your search or filter' : 'Add players to build your squad'}
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Player Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-colors duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative transition-colors duration-200">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {editingPlayer ? 'Edit Player' : 'Add New Player'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter player name, jersey number, and role</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Player Name
                </label>
                <input
                  type="text"
                  required
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="e.g. Virat Kohli"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Jersey Number (Unique within team)
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  required
                  value={jerseyNumber}
                  onChange={e => setJerseyNumber(e.target.value)}
                  placeholder="e.g. 18"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Playing Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as PlayerRole)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-medium"
                >
                  <option value="BATTER">Batter</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="ALL_ROUNDER">All-rounder</option>
                  <option value="WICKETKEEPER">Wicketkeeper</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-colors shadow-md shadow-emerald-600/20"
                >
                  {editingPlayer ? 'Save Changes' : 'Add to Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
