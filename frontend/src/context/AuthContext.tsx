import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { UserRole } from '../types/index.js';

export interface TeamInfo {
  id: string;
  teamName: string;
  username: string;
  email: string;
  role?: UserRole;
  isActive?: boolean;
}

interface AuthContextType {
  team: TeamInfo | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (token: string, team: TeamInfo) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [team, setTeam] = useState<TeamInfo | null>(() => {
    const saved = localStorage.getItem('cricket_team');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cricket_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTeamProfile = async (userId: string, userEmail?: string): Promise<TeamInfo | null> => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, team_name, username, email, role, is_active')
        .or(`auth_user_id.eq.${userId},id.eq.${userId},email.eq.${userEmail || ''}`)
        .maybeSingle();

      if (data) {
        const profile: TeamInfo = {
          id: data.id,
          teamName: data.team_name,
          username: data.username,
          email: data.email,
          role: data.role as UserRole,
          isActive: data.is_active,
        };

        setTeam(profile);
        localStorage.setItem('cricket_team', JSON.stringify(profile));
        return profile;
      }

      // If authenticated user has no teams row yet, automatically create one
      const teamName = userEmail?.split('@')[0] || 'Team';
      const username = userEmail?.split('@')[0] || `team_${userId.slice(0, 6)}`;
      const { data: created } = await supabase
        .from('teams')
        .insert({
          auth_user_id: userId,
          team_name: teamName,
          username: username,
          email: userEmail || '',
          role: 'TEAM',
          is_active: true,
        })
        .select('id, team_name, username, email, role, is_active')
        .maybeSingle();

      if (created) {
        const profile: TeamInfo = {
          id: created.id,
          teamName: created.team_name,
          username: created.username,
          email: created.email,
          role: created.role as UserRole,
          isActive: created.is_active,
        };
        setTeam(profile);
        localStorage.setItem('cricket_team', JSON.stringify(profile));
        return profile;
      }

      return null;
    } catch {
      return null;
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setToken(null);
        setTeam(null);
        localStorage.removeItem('cricket_auth_token');
        localStorage.removeItem('cricket_team');
        return;
      }

      setToken(session.access_token);
      localStorage.setItem('cricket_auth_token', session.access_token);
      await fetchTeamProfile(session.user.id, session.user.email);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setToken(session.access_token);
        localStorage.setItem('cricket_auth_token', session.access_token);
        fetchTeamProfile(session.user.id, session.user.email).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setToken(session.access_token);
        localStorage.setItem('cricket_auth_token', session.access_token);
        await fetchTeamProfile(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setToken(null);
        setTeam(null);
        localStorage.removeItem('cricket_auth_token');
        localStorage.removeItem('cricket_team');
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (newToken: string, newTeam: TeamInfo) => {
    setToken(newToken);
    setTeam(newTeam);
    localStorage.setItem('cricket_auth_token', newToken);
    localStorage.setItem('cricket_team', JSON.stringify(newTeam));
  };

  const logout = () => {
    supabase.auth.signOut().catch(() => {});
    setToken(null);
    setTeam(null);
    localStorage.removeItem('cricket_auth_token');
    localStorage.removeItem('cricket_team');
  };

  const isAdmin = team?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ team, token, isLoading, isAdmin, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
