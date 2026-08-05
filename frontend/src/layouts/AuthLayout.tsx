import { Outlet } from 'react-router-dom';

/**
 * AuthLayout — minimalist centered card on a noise-textured surface.
 * No sidebar, no navigation. Pure focus.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background noise-bg px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo lockup */}
        <div className="text-center mb-8">
          <h1 className="text-display text-3xl tracking-display text-foreground">NEXUS</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Research & Innovation Copilot
          </p>
        </div>

        <div className="bg-surface-raised border border-border rounded-lg p-6 shadow-card">
          <Outlet />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Idea &rarr; Evidence &rarr; Decision &rarr; Execution
        </p>
      </div>
    </div>
  );
}
