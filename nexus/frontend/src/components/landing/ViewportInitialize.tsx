import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { transitions, useReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

/**
 * Viewport 7 — Initialize
 *
 * Conversion CTA styled like the product's auth forms.
 * Uses the actual Input, Label, and Button components.
 * Footer with product links.
 */
export function ViewportInitialize() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();
  const [email, setEmail] = useState('');

  return (
    <section
      id="viewport-initialize"
      className="px-6 py-24 sm:py-32"
      ref={ref}
    >
      <div className="max-w-md mx-auto text-center">
        <motion.div
          initial={!reduced ? { opacity: 0, y: 6 } : undefined}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ ...transitions.page, delay: 0.1 }}
        >
          {/* Heading — Instrument Serif, editorial */}
          <h2 className="text-display text-4xl tracking-display text-foreground mb-3">
            Start building with evidence
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
            Describe what you want to build. NEXUS handles the research,
            evidence extraction, and architecture design.
          </p>

          {/* Sign-up form — uses product's actual Input/Button components */}
          <div className="bg-surface-raised border border-border rounded-lg p-6 shadow-card text-left">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cta-email">Work email</Label>
                <Input
                  id="cta-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Link to="/register" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  <Sparkles className="h-4 w-4" />
                  Initialize Workspace
                </Button>
              </Link>
            </div>
            <p className="text-2xs text-muted-foreground mt-4 text-center">
              Free to start · No credit card required
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer — minimal, product voice */}
      <footer className="mt-24 pt-8 border-t border-border max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="text-display text-sm tracking-display text-foreground">NEXUS</span>
            <span className="text-muted-foreground">Research & Engineering Workspace</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Docs</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </section>
  );
}
