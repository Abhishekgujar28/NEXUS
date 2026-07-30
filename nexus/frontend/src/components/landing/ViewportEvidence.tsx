import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Scale, ExternalLink, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { transitions, useReducedMotion, staggerContainerVariants, staggerItemVariants } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EVIDENCE = [
  {
    title: 'Asynchronous Consensus under High Network Partitioning',
    source: 'arxiv.org',
    sourceType: 'Paper',
    confidence: 0.97,
    verified: true,
    relevance: 'Directly addresses Raft log truncation behavior when nodes exceed memory limits under sustained write pressure.',
    tags: ['consensus', 'distributed-systems', 'fault-tolerance'],
  },
  {
    title: 'rust-lang/raft — Production Raft Implementation',
    source: 'github.com',
    sourceType: 'Repository',
    confidence: 0.92,
    verified: true,
    relevance: 'Reference implementation with documented edge cases in leader election timeout handling and snapshot transfer.',
    tags: ['rust', 'raft', 'implementation'],
  },
  {
    title: 'HTTP/2 Server Push and Multiplexing Performance',
    source: 'rfc-editor.org',
    sourceType: 'RFC',
    confidence: 0.88,
    verified: true,
    relevance: 'Establishes baseline transport protocol constraints for client-server communication in distributed vector stores.',
    tags: ['networking', 'http2', 'protocol'],
  },
  {
    title: 'Vector Similarity Search at Scale',
    source: 'scholar.google.com',
    sourceType: 'Paper',
    confidence: 0.94,
    verified: false,
    relevance: 'Benchmarks approximate nearest neighbor algorithms across index sizes from 1M to 1B vectors.',
    tags: ['vector-search', 'ann', 'benchmarks'],
  },
];

/**
 * Viewport 3 — Evidence Engine
 *
 * Shows what evidence looks like inside NEXUS. Uses the product's actual
 * Card borders, Badge components, tabular numbers, mono labels.
 * Dense, editorial, real data — not placeholder cards.
 */
export function ViewportEvidence() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section
      id="viewport-evidence"
      className="px-6 py-24 sm:py-32"
      ref={ref}
    >
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="mb-12">
          <div className="eyebrow mb-2">Evidence engine</div>
          <h2 className="text-[19px] font-semibold tracking-tight text-foreground leading-snug">
            Every claim is traceable
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            NEXUS doesn't generate opinions. It extracts evidence from papers, repositories,
            and documentation — each with a confidence score and verification status.
          </p>
        </div>

        {/* Evidence list — uses product's card/border styling, NOT repeated cards */}
        <motion.div
          variants={!reduced ? staggerContainerVariants : undefined}
          initial="initial"
          animate={inView ? 'animate' : 'initial'}
          className="border border-border rounded-lg overflow-hidden divide-y divide-border"
        >
          {EVIDENCE.map((item, i) => (
            <motion.div
              key={i}
              variants={!reduced ? staggerItemVariants : undefined}
              transition={{ ...transitions.page, delay: i * 0.05 }}
              className={cn(
                'p-5 transition-colors cursor-pointer',
                expanded === i ? 'bg-surface-raised' : 'hover:bg-surface-raised/50'
              )}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              {/* Top row: title + metadata */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="mono-label">{item.sourceType}</span>
                    <span className="text-2xs text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="h-2.5 w-2.5" />
                      {item.source}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.verified ? (
                    <Badge tone="success" size="sm">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge tone="warning" size="sm">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Pending
                    </Badge>
                  )}
                  <span className="text-sm font-medium tabular text-foreground">
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {expanded === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={transitions.fast}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2 mb-3">
                      {item.relevance}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <Badge key={tag} tone="outline" size="sm">{tag}</Badge>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Summary stats — uses product's metric style */}
        <div className="flex items-center gap-6 mt-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            <span className="tabular">412</span> papers cross-referenced
          </span>
          <span className="flex items-center gap-1.5">
            <Scale className="h-3 w-3" />
            <span className="tabular">14</span> bottlenecks flagged
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3" />
            Verification confidence: <span className="tabular text-foreground font-medium">98.4%</span>
          </span>
        </div>
      </div>
    </section>
  );
}
