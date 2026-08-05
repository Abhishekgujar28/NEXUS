import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Home, Sparkles, Library, Activity, FolderPlus, Search, Folder,
  BookOpen, Microscope, Scale, Boxes, Map, MessageSquare,
  Play, Loader2, Clock, ShieldAlert, Lightbulb, ArrowRight,
} from 'lucide-react';
import { transitions, useReducedMotion, staggerContainerVariants, staggerItemVariants } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const SIDEBAR_NAV = [
  { icon: Home, label: 'Home', active: false },
  { icon: Sparkles, label: 'Discoveries', active: false },
  { icon: Library, label: 'Library', active: false },
  { icon: Activity, label: 'Activity', active: false },
];

const SIDEBAR_PROJECTS = [
  { title: 'Distributed Vector Engine', status: 'researching' as const },
  { title: 'AI Code Review System', status: 'complete' as const },
  { title: 'Real-time Collab Platform', status: 'draft' as const },
];

const PROJECT_TABS = [
  { key: 'overview', label: 'Overview', icon: BookOpen },
  { key: 'research', label: 'Research', icon: Microscope },
  { key: 'evidence', label: 'Evidence', icon: Scale },
  { key: 'architecture', label: 'Architecture', icon: Boxes },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
  { key: 'copilot', label: 'Copilot', icon: MessageSquare },
];

/**
 * Viewport 5 — The Workspace
 *
 * A visual reproduction of the actual NEXUS app layout.
 * Sidebar + project view, styled identically to AppLayout and ProjectPage.
 * This makes users think "I want to be inside this."
 */
export function ViewportWorkspace() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <section
      id="viewport-workspace"
      className="px-6 py-24 sm:py-32"
      ref={ref}
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="mb-12">
          <div className="eyebrow mb-2">Your workspace</div>
          <h2 className="text-[19px] font-semibold tracking-tight text-foreground leading-snug">
            A focused environment for technical research
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Command palette, source explorer, evidence graph, and architecture canvas —
            all connected to reproducible research artifacts.
          </p>
        </div>

        {/* App simulation — matches AppLayout exactly */}
        <motion.div
          initial={!reduced ? { opacity: 0, y: 8 } : undefined}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ ...transitions.page, delay: 0.1 }}
          className="border border-border rounded-lg overflow-hidden bg-background"
          style={{ height: 420 }}
        >
          <div className="flex h-full">
            {/* Sidebar — mirrors AppLayout.tsx */}
            <aside className="hidden sm:flex w-52 shrink-0 flex-col border-r border-border bg-surface">
              {/* Logo */}
              <div className="shrink-0 border-b border-border px-4 py-3">
                <span className="text-display text-base tracking-display text-foreground">NEXUS</span>
              </div>

              {/* New + Search */}
              <div className="shrink-0 space-y-1.5 border-b border-border p-2.5">
                <div className="flex h-7 w-full items-center gap-2 rounded-md bg-citrine-400 px-2.5 text-xs font-medium text-ink-900">
                  <FolderPlus className="h-3.5 w-3.5" />
                  New Research
                </div>
                <div className="flex h-7 w-full items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 text-xs text-muted-foreground">
                  <Search className="h-3 w-3" />
                  <span className="truncate">Search…</span>
                  <kbd className="ml-auto text-[9px] rounded border border-border bg-muted px-1 py-0.5 font-mono text-muted-foreground">⌘K</kbd>
                </div>
              </div>

              {/* Nav */}
              <div className="flex-1 overflow-hidden px-1.5 py-1.5">
                <nav className="space-y-0.5">
                  {SIDEBAR_NAV.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {label}
                    </div>
                  ))}
                </nav>

                {/* Projects section */}
                <div className="mt-3 px-2.5 pt-2.5 pb-1">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Projects</span>
                </div>
                <div className="space-y-0.5">
                  {SIDEBAR_PROJECTS.map((p, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs min-w-0',
                        i === 0 ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {p.status === 'researching' ? (
                        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                          <span className="absolute inline-flex h-full w-full animate-accent-pulse rounded-full bg-citrine-400/40" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-citrine-400" />
                        </span>
                      ) : (
                        <Folder className="h-3 w-3 shrink-0 opacity-60" />
                      )}
                      <span className="truncate">{p.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main content — mirrors ProjectPage.tsx */}
            <main className="flex-1 min-w-0 overflow-hidden">
              {/* Project header */}
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">
                    Distributed Vector Engine
                  </h3>
                  <Badge tone="accent">Researching</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  Design a distributed vector search engine optimized for low-latency approximate nearest neighbor queries at billion-scale.
                </p>
                <div className="flex items-center gap-3 mt-2 max-w-xs">
                  <Progress value={67} className="flex-1" />
                  <span className="text-xs tabular text-muted-foreground">67%</span>
                </div>
              </div>

              {/* Tab nav — mirrors ProjectPage.tsx */}
              <nav className="flex items-stretch gap-0.5 border-b border-border px-5 overflow-x-auto no-scrollbar">
                {PROJECT_TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-2 text-xs whitespace-nowrap border-b-2 transition-colors -mb-px',
                      activeTab === key
                        ? 'border-citrine-400 text-foreground font-medium'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </nav>

              {/* Tab content preview */}
              <div className="p-5 animate-fade-in">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Sources', value: '23', icon: Folder },
                        { label: 'Evidence', value: '47', icon: Scale },
                        { label: 'Solutions', value: '12', icon: Lightbulb },
                        { label: 'Gaps', value: '5', icon: ShieldAlert },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-2 p-2.5 border border-border rounded-md bg-surface">
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
                            <Icon className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">{label}</div>
                            <div className="text-xs font-semibold tabular text-foreground">{value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border border-border rounded-md p-3">
                      <div className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                        Project Description
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Design a distributed vector search engine optimized for low-latency approximate nearest neighbor queries at billion-scale, supporting dynamic index updates and multi-tenant isolation.
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === 'research' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-citrine-400 mb-3">
                      <Loader2 className="h-3 w-3 animate-spin" /> Research in progress
                    </div>
                    {['Web search: distributed vector databases', 'Papers: approximate nearest neighbor', 'GitHub: vector search engines'].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 py-2 px-3 border border-border rounded-md text-xs text-muted-foreground">
                        <Play className="h-3 w-3 text-citrine-400" />
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                {activeTab !== 'overview' && activeTab !== 'research' && (
                  <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      Click a tab to preview
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                )}
              </div>
            </main>
          </div>
        </motion.div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Command palette · Source explorer · Evidence graph · Architecture canvas · Copilot
        </p>
      </div>
    </section>
  );
}
