import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Boxes, ArrowDown, Server, Database, Globe, Cpu, HardDrive } from 'lucide-react';
import { transitions, useReducedMotion, staggerContainerVariants, staggerItemVariants } from '@/lib/motion';
import { cn } from '@/lib/utils';

const LAYERS = [
  {
    key: 'client',
    label: 'Client Application Layer',
    tech: 'React 19 · Server Components · Edge Runtime',
    icon: Globe,
    depth: 0,
  },
  {
    key: 'gateway',
    label: 'API Gateway & Orchestration',
    tech: 'Rust Async Workers · Tokio Runtime · gRPC',
    icon: Cpu,
    depth: 1,
  },
  {
    key: 'engine',
    label: 'Research & Synthesis Engine',
    tech: 'Multi-Agent Pipeline · Citation Graph · Gap Detection',
    icon: Server,
    depth: 2,
  },
  {
    key: 'storage',
    label: 'Persistence & Vector Graph',
    tech: 'Qdrant · PostgreSQL · Raft Consensus Cluster',
    icon: Database,
    depth: 3,
  },
];

/**
 * Viewport 4 — Architecture Canvas
 *
 * Shows a layered architecture diagram using the product's card borders
 * and mono labels. NOT a 3D isometric view — a clean, dense, editorial
 * layer diagram that matches the app's information density.
 */
export function ViewportArchitecture() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  return (
    <section
      id="viewport-architecture"
      className="px-6 py-24 sm:py-32"
      ref={ref}
    >
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="mb-12">
          <div className="eyebrow mb-2">Architecture output</div>
          <h2 className="text-[19px] font-semibold tracking-tight text-foreground leading-snug">
            Evidence becomes architecture
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            NEXUS generates a system architecture derived from discovered constraints —
            not templated boilerplate. Every layer is justified by research evidence.
          </p>
        </div>

        {/* Architecture layers — stacked cards with connector lines */}
        <motion.div
          variants={!reduced ? staggerContainerVariants : undefined}
          initial="initial"
          animate={inView ? 'animate' : 'initial'}
          className="relative"
        >
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.key}
              variants={!reduced ? staggerItemVariants : undefined}
              transition={{ ...transitions.page, delay: i * 0.08 }}
            >
              {/* Connector arrow */}
              {i > 0 && (
                <div className="flex justify-center py-2" aria-hidden>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-px h-4 bg-border" />
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Layer card */}
              <div
                className={cn(
                  'border border-border rounded-lg p-5 transition-colors hover:border-foreground/25',
                  i === 0 ? 'bg-surface-raised' : 'bg-surface',
                )}
                style={{
                  marginLeft: `${layer.depth * 12}px`,
                  marginRight: `${layer.depth * 12}px`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <layer.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">
                      {layer.label}
                    </h3>
                    <p className="mono-label mt-1">{layer.tech}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Caption */}
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Architecture auto-generated from research evidence · 4 layers · 12 components · zero drift
        </p>
      </div>
    </section>
  );
}
