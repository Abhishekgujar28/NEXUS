import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { pageVariants, transitions } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { ViewportBoot } from '@/components/landing/ViewportBoot';
import { ViewportPipeline } from '@/components/landing/ViewportPipeline';
import { ViewportEvidence } from '@/components/landing/ViewportEvidence';
import { ViewportArchitecture } from '@/components/landing/ViewportArchitecture';
import { ViewportWorkspace } from '@/components/landing/ViewportWorkspace';
import { ViewportDeveloper } from '@/components/landing/ViewportDeveloper';
import { ViewportInitialize } from '@/components/landing/ViewportInitialize';

/**
 * NEXUS Landing Page
 *
 * 7 viewports that feel like entering the operating system itself.
 * Every component, color, font, and interaction matches the product.
 * Scrolling = moving deeper into NEXUS.
 *
 * Viewport 1: System Boot
 * Viewport 2: Research Pipeline
 * Viewport 3: Evidence Engine
 * Viewport 4: Architecture Canvas
 * Viewport 5: The Workspace
 * Viewport 6: Developer Integration
 * Viewport 7: Initialize
 */
import { useAuthStore } from '@/stores/auth';

export function LandingPage() {
  const status = useAuthStore((s) => s.status);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={transitions.page}
      className="min-h-screen bg-background text-foreground"
    >
      {/* Fixed top bar — minimal, matches product sidebar header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between">
          <Link to="/" className="text-display text-base tracking-display text-foreground">
            NEXUS
          </Link>
          <nav className="flex items-center gap-3">
            {status === 'authed' ? (
              <Link to="/app">
                <Button variant="primary" size="sm">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">Start free</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <ViewportBoot />

        {/* Divider — hairline, product style */}
        <div className="border-t border-border" />

        <ViewportPipeline />

        <div className="border-t border-border" />

        <ViewportEvidence />

        <div className="border-t border-border" />

        <ViewportArchitecture />

        <div className="border-t border-border" />

        <ViewportWorkspace />

        <div className="border-t border-border" />

        <ViewportDeveloper />

        <div className="border-t border-border" />

        <ViewportInitialize />
      </main>
    </motion.div>
  );
}

export default LandingPage;