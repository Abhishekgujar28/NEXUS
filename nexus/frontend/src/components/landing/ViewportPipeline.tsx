import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Sparkles, Search, Scale, Boxes, Map } from 'lucide-react';
import { transitions, useReducedMotion, staggerContainerVariants, staggerItemVariants } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';

const STAGES = [
  {
    key: 'idea',
    eyebrow: '01',
    label: 'Idea Seed',
    icon: Sparkles,
    description: 'You describe what you want to build — a sentence or a full spec. NEXUS adapts to what you give it.',
    tone: 'neutral' as const,
  },
  {
    key: 'research',
    eyebrow: '02',
    label: 'Multi-Source Research',
    icon: Search,
    description: 'Parallel discovery across papers, repositories, documentation, and the web. Every source is traceable.',
    tone: 'accent' as const,
  },
  {
    key: 'evidence',
    eyebrow: '03',
    label: 'Evidence Extraction',
    icon: Scale,
    description: 'Findings are distilled into structured evidence with confidence scores, citations, and tradeoff analysis.',
    tone: 'accent' as const,
  },
  {
    key: 'architecture',
    eyebrow: '04',
    label: 'Architecture Design',
    icon: Boxes,
    description: 'Constraints and evidence converge into a system architecture with component graphs and dependency maps.',
    tone: 'success' as const,
  },
  {
    key: 'roadmap',
    eyebrow: '05',
    label: 'Actionable Roadmap',
    icon: Map,
    description: 'A prioritized execution plan with phases, milestones, and resource estimates — ready to build.',
    tone: 'success' as const,
  },
];

/**
 * Viewport 2 — The Research Pipeline
 *
 * Shows the 5 stages: Idea → Research → Evidence → Architecture → Roadmap.
 * Uses the product's eyebrow labels, Badge, and stagger animations.
 * Vertical timeline with connecting line — NOT horizontal cards.
 */
export function ViewportPipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const reduced = useReducedMotion();

  return (
    <section
      id="viewport-pipeline"
      className="px-6 py-24 sm:py-32"
      ref={ref}
    >
      <div className="max-w-3xl mx-auto">
        {/* Section header — product's eyebrow style */}
        <div className="mb-16">
          <div className="eyebrow mb-2">How it works</div>
          <h2 className="text-[19px] font-semibold tracking-tight text-foreground leading-snug">
            From idea to evidence-backed architecture
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Every project follows a research lineage. NEXUS automates the pipeline
            that engineers do manually across dozens of browser tabs.
          </p>
        </div>

        {/* Timeline */}
        <motion.div
          variants={!reduced ? staggerContainerVariants : undefined}
          initial="initial"
          animate={inView ? 'animate' : 'initial'}
          className="relative"
        >
          {/* Connecting line */}
          <div
            className="absolute left-[19px] top-4 bottom-4 w-px bg-border"
            aria-hidden
          />

          <div className="space-y-1">
            {STAGES.map((stage, i) => (
              <motion.div
                key={stage.key}
                variants={!reduced ? staggerItemVariants : undefined}
                transition={{ ...transitions.page, delay: i * 0.06 }}
                className="relative flex gap-5 py-5 group"
              >
                {/* Timeline node */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-raised border border-border transition-colors group-hover:border-foreground/25">
                  <stage.icon className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="mono-label text-muted-foreground">{stage.eyebrow}</span>
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">
                      {stage.label}
                    </h3>
                    <Badge tone={stage.tone} size="sm">{stage.key}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
