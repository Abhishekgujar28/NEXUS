import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowRight, ChevronDown } from 'lucide-react';
import { fadeVariants, transitions, useReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { LiveDot } from '@/components/LiveDot';
import { ResearchNodeCanvas } from '@/components/landing/ResearchNodeCanvas';
import { useTypewriter } from '@/hooks/useTypewriter';

const PROMPTS = [
  'Build a distributed vector search engine',
  'Design an AI-powered code review system',
  'Architect a real-time collaboration platform',
  'Create a zero-drift consensus algorithm',
];

/**
 * Viewport 1 — System Boot
 *
 * The system initializes. Warm void. NEXUS wordmark in Instrument Serif.
 * A research node network in the product's palette. A command input
 * styled like the app's search bar. "What are you building?"
 */
export function ViewportBoot() {
  const reduced = useReducedMotion();
  const typed = useTypewriter(PROMPTS, { typingMs: 55, pauseMs: 2800 });
  const scrollTarget = useRef<HTMLDivElement>(null);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24 overflow-hidden">
      {/* Background: research node canvas — sits behind everything */}
      <div className="absolute inset-0 opacity-60 pointer-events-none" aria-hidden>
        {!reduced && <ResearchNodeCanvas className="absolute inset-0" />}
      </div>

      {/* Subtle ambient warmth — single citrine glow, NOT a neon aurora */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, hsl(72 62% 55% / 0.04) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
        {/* System status — uses the product's LiveDot */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...transitions.page, delay: 0.1 }}
        >
          <LiveDot label="Research Engine Active" className="mb-8" />
        </motion.div>

        {/* Wordmark — Instrument Serif, the actual brand font */}
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.page, delay: 0.15 }}
          className="text-display text-6xl sm:text-7xl tracking-display text-foreground mb-4"
        >
          NEXUS
        </motion.h1>

        {/* Tagline — Inter, restrained, product voice */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.page, delay: 0.2 }}
          className="text-base sm:text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed"
        >
          Turn ideas into evidence-backed architecture before writing
          a single line of production code.
        </motion.p>

        {/* Command input — styled exactly like the app's search bar */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.page, delay: 0.3 }}
          className="w-full max-w-lg mb-8"
        >
          <Link to="/register" className="block">
            <div className="flex h-11 w-full items-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground cursor-text group">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-left truncate">
                {typed}
                <span className="inline-block w-px h-4 bg-citrine-400 ml-0.5 align-middle animate-pulse" />
              </span>
              <kbd className="text-2xs rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </Link>
          <p className="text-2xs mono-label mt-2 text-center">
            Describe what you want to build
          </p>
        </motion.div>

        {/* Actions — uses the product's actual Button component */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.page, delay: 0.35 }}
          className="flex items-center gap-3"
        >
          <Link to="/register">
            <Button variant="primary" size="lg">
              Start researching — free
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="lg">
              Sign in
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        ref={scrollTarget}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...transitions.page, delay: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-muted-foreground cursor-pointer select-none"
        onClick={() => {
          const next = document.getElementById('viewport-pipeline');
          next?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span className="mono-label text-[10px]">Scroll</span>
        <ChevronDown className="h-3.5 w-3.5 animate-fade-in" />
      </motion.div>
    </section>
  );
}
