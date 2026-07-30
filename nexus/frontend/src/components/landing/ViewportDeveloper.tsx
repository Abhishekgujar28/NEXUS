import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Terminal, Code2, GitBranch } from 'lucide-react';
import { transitions, useReducedMotion, staggerContainerVariants, staggerItemVariants } from '@/lib/motion';
import { cn } from '@/lib/utils';

const INTEGRATIONS = [
  {
    key: 'cli',
    icon: Terminal,
    label: 'CLI Toolchain',
    description: 'Run verification checks, gap analysis, and architecture validation from your terminal.',
    code: `$ nexus verify --target consensus_module.ts
[PASS] 14/14 evidence vectors verified
[WARN] Raft log truncation requires persistent storage
[INFO] Architecture drift score: 0.02 (within threshold)

$ nexus gap-detect --project vector-engine
Scanning 47 evidence nodes...
Found 5 gaps in coverage:
  1. Memory pressure under concurrent writes (critical)
  2. Snapshot transfer timeout handling
  3. Multi-tenant index isolation strategy
  4. Cross-region replication latency bounds
  5. Index compaction during peak load`,
  },
  {
    key: 'ide',
    icon: Code2,
    label: 'IDE Extension',
    description: 'In-editor citations, evidence lookup, and architecture references in VS Code and Cursor.',
    code: `// nexus: evidence-backed implementation
// Source: arxiv.org/abs/2305.14234 (confidence: 97%)
// Gap: Memory limits under sustained write pressure

impl RaftConsensus {
    async fn append_entries(&mut self, entries: Vec<LogEntry>)
        -> Result<AppendResult>
    {
        // nexus: verified against RFC 7540 constraints
        self.validate_log_bounds()?;
        self.replicate_to_followers(entries).await
    }
}`,
  },
  {
    key: 'ci',
    icon: GitBranch,
    label: 'CI/CD Gatekeeper',
    description: 'GitHub Actions guard that blocks merges when architectural drift exceeds your threshold.',
    code: `# .github/workflows/nexus-guard.yml
name: NEXUS Architecture Guard
on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: nexus-engine/verify-action@v2
        with:
          project-id: \${{ secrets.NEXUS_PROJECT }}
          drift-threshold: 0.05
          fail-on-gaps: critical
      # Blocks merge if architecture drift > 5%
      # or critical research gaps are unresolved`,
  },
];

/**
 * Viewport 6 — Developer Integration
 *
 * Terminal-style viewport using JetBrains Mono and the product's
 * surface/border system. Shows CLI, IDE, and CI/CD integrations
 * with real code blocks.
 */
export function ViewportDeveloper() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();
  const [active, setActive] = useState('cli');

  const activeItem = INTEGRATIONS.find((i) => i.key === active)!;

  return (
    <section
      id="viewport-developer"
      className="px-6 py-24 sm:py-32"
      ref={ref}
    >
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="mb-12">
          <div className="eyebrow mb-2">Developer ecosystem</div>
          <h2 className="text-[19px] font-semibold tracking-tight text-foreground leading-snug">
            NEXUS fits your existing workflow
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Terminal, editor, and CI — research verification embedded
            where you already work.
          </p>
        </div>

        <motion.div
          initial={!reduced ? { opacity: 0, y: 8 } : undefined}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ ...transitions.page, delay: 0.1 }}
        >
          {/* Integration selector — tab-like, matches product tabs */}
          <div className="flex items-stretch gap-0.5 border-b border-border mb-0 overflow-x-auto no-scrollbar">
            {INTEGRATIONS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors -mb-px',
                  active === key
                    ? 'border-citrine-400 text-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="border border-t-0 border-border rounded-b-lg overflow-hidden">
            {/* Description */}
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm text-muted-foreground">
                {activeItem.description}
              </p>
            </div>

            {/* Code block — product's mono/surface styling */}
            <div className="bg-surface-raised p-5 overflow-x-auto">
              <pre className="font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre">
                {activeItem.code}
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
