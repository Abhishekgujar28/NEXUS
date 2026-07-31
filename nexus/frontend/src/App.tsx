import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/auth';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DiscoveriesPage } from '@/pages/DiscoveriesPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { NewProjectPage } from '@/pages/NewProjectPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { TeamActivityPage } from '@/pages/TeamActivityPage';
import { SettingsPage } from '@/pages/SettingsPage';
import LandingPage from '@/pages/LandingPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-citrine-400/50 border-t-citrine-400 animate-spin" />
      </div>
    );
  }
  if (status === 'guest') return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-citrine-400/50 border-t-citrine-400 animate-spin" />
      </div>
    );
  }
  if (status === 'authed') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            {/* Auth routes */}
            <Route
              element={
                <GuestRoute>
                  <AuthLayout />
                </GuestRoute>
              }
            >
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected app routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/discoveries" element={<DiscoveriesPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/new" element={<NewProjectPage />} />
              <Route path="/projects/:projectId/*" element={<ProjectPage />} />
              <Route path="/team" element={<TeamActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
