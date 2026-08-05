import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ResearchViz from '@/components/landing/ResearchViz';
import { useReducedMotion } from '@/lib/motion';

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="py-20">
      <div className="container max-w-5xl mx-auto grid grid-cols-12 gap-8 items-center">
        <div className="col-span-7">
          <h1 className="text-display text-5xl leading-[1.02] text-foreground mb-4">
            Ideas deserve evidence.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-6">
            NEXUS is an AI Research & Engineering Workspace that turns vague ideas into
            evidence-backed plans. Research faster, find existing solutions, and design
            architectures with confidence before writing a single line of production code.
          </p>

          <div className="flex items-center gap-3">
                      <a href="/register"><Button variant="primary" size="lg">Start researching — free</Button></a>
                      <a href="/login"><Button variant="ghost" size="lg">Sign in</Button></a>
                    </div>

          <p className="mt-6 text-2xs mono-label">Live demo · No credit card required</p>
        </div>

        <div className="col-span-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="rounded-lg bg-surface-raised border border-border p-4 shadow-pop"
            aria-hidden
          >
            <div className="text-xs text-muted-foreground mb-2">Research snapshot</div>
            <div className="rounded-md overflow-hidden">
              <ResearchViz />
            </div>
            {!reduced && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Evolving knowledge graph</div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Hero;