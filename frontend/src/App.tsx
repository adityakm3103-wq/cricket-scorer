import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { ThemeProvider } from './context/ThemeContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Layout } from './components/Layout.js';

// Pages
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { Dashboard } from './pages/Dashboard.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { Squad } from './pages/Squad.js';
import { PlayerProfile } from './pages/PlayerProfile.js';
import { SelectFormat } from './pages/SelectFormat.js';
import { MatchSetup } from './pages/MatchSetup.js';
import { Toss } from './pages/Toss.js';
import { OpeningPlayers } from './pages/OpeningPlayers.js';
import { LiveScoring } from './pages/LiveScoring.js';
import { Scorecard } from './pages/Scorecard.js';
import { MatchHistory } from './pages/MatchHistory.js';
import { Settings } from './pages/Settings.js';
import { GullyDashboard } from './pages/GullyDashboard.js';
import { GullyTeamMatchCreate } from './pages/GullyTeamMatchCreate.js';
import { GullySinglesMatchCreate } from './pages/GullySinglesMatchCreate.js';
import { GullyLiveScoring } from './pages/GullyLiveScoring.js';
import { GullyScorecard } from './pages/GullyScorecard.js';
import { GullyMatchHistory } from './pages/GullyMatchHistory.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { team, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!team) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { team, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!team) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

const CapacitorBackButtonHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isSubscribed = true;
    let listenerHandle: any = null;

    CapApp.addListener('backButton', () => {
      const exitPaths = ['/dashboard', '/login', '/admin'];
      if (exitPaths.includes(location.pathname)) {
        CapApp.exitApp();
      } else {
        navigate(-1);
      }
    }).then((handle) => {
      if (isSubscribed) {
        listenerHandle = handle;
      } else {
        handle.remove();
      }
    });

    return () => {
      isSubscribed = false;
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate, location]);

  return null;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <CapacitorBackButtonHandler />
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RootRedirect />} />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="squad" element={<Squad />} />
              <Route path="player/:id" element={<PlayerProfile />} />
              <Route
                path="create-match"
                element={
                  <AdminRoute>
                    <SelectFormat />
                  </AdminRoute>
                }
              />
              <Route
                path="match-setup"
                element={
                  <AdminRoute>
                    <MatchSetup />
                  </AdminRoute>
                }
              />
              <Route path="toss/:id" element={<Toss />} />
              <Route path="opening-players/:id" element={<OpeningPlayers />} />
              <Route path="live/:id" element={<LiveScoring />} />
              <Route path="scorecard/:id" element={<Scorecard />} />
              <Route path="history" element={<MatchHistory />} />
              <Route path="settings" element={<Settings />} />

              {/* Gully Cricket Routes */}
              <Route path="gully" element={<GullyDashboard />} />
              <Route path="gully/create-team" element={<GullyTeamMatchCreate />} />
              <Route path="gully/create-singles" element={<GullySinglesMatchCreate />} />
              <Route path="gully/live/:id" element={<GullyLiveScoring />} />
              <Route path="gully/scorecard/:id" element={<GullyScorecard />} />
              <Route path="gully/history" element={<GullyMatchHistory />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
};

export default App;
