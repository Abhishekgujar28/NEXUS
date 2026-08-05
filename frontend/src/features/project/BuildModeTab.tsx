import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Play,
  CheckCircle2,
  Circle,
  ArrowRight,
  Hammer,
  Boxes,
  Sparkles,
  BookOpen,
  Package,
} from 'lucide-react';
import { researchService } from '@/lib/services';
import type { ID, RoadmapPhase } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface FlatTask {
  id: string;
  phase: number;
  phaseTitle: string;
  task: string;
  dependencies?: string[];
}

function flattenTasks(phases: RoadmapPhase[]): FlatTask[] {
  const out: FlatTask[] = [];
  for (const p of phases) {
    (p.tasks ?? []).forEach((t, i) => {
      out.push({
        id: `${p.phase}-${i}`,
        phase: p.phase,
        phaseTitle: p.title,
        task: t,
        dependencies: p.dependencies,
      });
    });
  }
  return out;
}

export function BuildModeTab({ projectId }: { projectId: ID }) {
  const { data: roadmapData, isLoading: roadmapLoading } = useQuery({
    queryKey: ['roadmap', projectId],
    queryFn: () => researchService.roadmap(projectId),
  });
  const { data: archData, isLoading: archLoading } = useQuery({
    queryKey: ['architecture', projectId],
    queryFn: () => researchService.architecture(projectId),
  });
  const { data: resources } = useQuery({
    queryKey: ['resources', projectId],
    queryFn: () => researchService.resources(projectId),
  });

  const phases = useMemo(
    () => [...(roadmapData?.roadmap?.phases ?? [])].sort((a, b) => a.phase - b.phase),
    [roadmapData]
  );
  const tasks = useMemo(() => flattenTasks(phases), [phases]);

  // Local task completion state (persisted only for this session — real
  // persistence would need a backend endpoint we don't have)
  const [done, setDone] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const toggleDone = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentTask = tasks.find((t) => t.id === selected) ?? tasks.find((t) => !done.has(t.id));
  const completedCount = done.size;
  const totalCount = tasks.length;
  const progress = totalCount ? (completedCount / totalCount) * 100 : 0;

  if (roadmapLoading || archLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<Hammer className="h-5 w-5" />}
        title="Build mode unlocks after roadmap"
        description="Once NEXUS generates a phased roadmap with tasks, Build Mode turns those tasks into an executable workspace with context from architecture, resources, and evidence."
      />
    );
  }

  const currentPhase = phases.find((p) => p.phase === currentTask?.phase);
  const relevantComponents = archData?.architecture?.components ?? [];
  const relevantResources = resources?.resources ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Progress bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Hammer className="h-4 w-4 text-citrine-400" />
              <span className="text-sm font-medium text-foreground">Build progress</span>
            </div>
            <span className="text-xs text-muted-foreground tabular">
              {completedCount} of {totalCount} tasks
            </span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-citrine-400 transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: task list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
          <div className="space-y-4">
            {phases.map((p) => {
              const phaseTasks = tasks.filter((t) => t.phase === p.phase);
              const phaseDone = phaseTasks.filter((t) => done.has(t.id)).length;
              return (
                <div key={p.phase}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-2xs uppercase tracking-widest text-muted-foreground">
                      Phase {p.phase} — {p.title}
                    </span>
                    <Badge tone="outline" size="sm">
                      {phaseDone}/{phaseTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {phaseTasks.map((t) => {
                      const isDone = done.has(t.id);
                      const isSelected = currentTask?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelected(t.id)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-md text-xs flex items-start gap-2 transition-colors',
                            isSelected
                              ? 'bg-citrine-400/8 text-foreground'
                              : 'hover:bg-muted/60 text-foreground/80',
                            isDone && 'opacity-50'
                          )}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDone(t.id);
                            }}
                            className="shrink-0 mt-0.5"
                            aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {isDone ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-moss-400" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-foreground" />
                            )}
                          </button>
                          <span className={cn('leading-relaxed', isDone && 'line-through')}>
                            {t.task}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: current task context */}
        <div className="lg:col-span-3">
          {currentTask ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-2xs uppercase tracking-widest text-citrine-400">
                    Current task · Phase {currentTask.phase}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-4 leading-tight">
                  {currentTask.task}
                </h2>

                <div className="flex items-center gap-2 mb-6">
                  <Badge tone="accent" size="sm">
                    <Play className="h-2.5 w-2.5" />
                    Ready to build
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDone(currentTask.id)}
                  >
                    {done.has(currentTask.id) ? (
                      <>Mark as incomplete</>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark complete
                      </>
                    )}
                  </Button>
                </div>

                {/* Phase context */}
                {currentPhase && (
                  <div className="mb-6">
                    <h4 className="text-2xs uppercase tracking-widest text-muted-foreground mb-2">
                      Phase context
                    </h4>
                    <div className="text-xs text-foreground/80 mb-2">{currentPhase.title}</div>
                    {currentPhase.milestones && currentPhase.milestones.length > 0 && (
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {currentPhase.milestones.slice(0, 3).map((m, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <ArrowRight className="h-3 w-3 mt-0.5 text-citrine-400/60 shrink-0" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Relevant architecture */}
                {relevantComponents.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-2xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Boxes className="h-3 w-3" />
                      Related components
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {relevantComponents.slice(0, 6).map((c, i) => (
                        <Badge key={i} tone="outline" size="sm">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relevant resources */}
                {relevantResources.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-2xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Package className="h-3 w-3" />
                      Recommended resources
                    </h4>
                    <ul className="space-y-1">
                      {relevantResources.slice(0, 4).map((r, i) => (
                        <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                          <BookOpen className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                          {r.name}
                          {r.timeframe && (
                            <span className="text-muted-foreground">— {r.timeframe}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ask copilot */}
                <div className="border-t border-border pt-4">
                  <Link
                    to={`/projects/${projectId}/copilot`}
                    className="inline-flex items-center gap-2 text-xs text-citrine-400 hover:underline"
                  >
                    <Sparkles className="h-3 w-3" />
                    Ask Copilot about this task
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="h-8 w-8 text-moss-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground">All tasks complete</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You've worked through every roadmap task. Nice.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* System Architecture Blueprint & Recommended Specs */}
      <Card className="border-border">
        <CardContent className="py-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Boxes className="h-4 w-4 text-citrine-400" />
            Project Blueprint & Specifications
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <div className="text-xs font-semibold text-foreground mb-1">Recommended Folder Structure</div>
              <pre className="text-[10px] font-mono text-citrine-300 leading-relaxed overflow-x-auto">
{`src/
├── controllers/
├── services/
├── models/
├── routes/
└── middleware/`}
              </pre>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <div className="text-xs font-semibold text-foreground mb-1">API & Database Contracts</div>
              <pre className="text-[10px] font-mono text-citrine-300 leading-relaxed overflow-x-auto">
{`REST: /api/v1/projects
REST: /api/v1/research
WS:   /socket.io
DB:   MongoDB + Mongoose`}
              </pre>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <div className="text-xs font-semibold text-foreground mb-1">Deployment Plan</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Docker containerized deployment with Nginx proxy, Redis BullMQ workers, and TLS termination.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <div className="text-xs font-semibold text-foreground mb-1">Technology Stack</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                React 18 + Vite, Express.js, TypeScript, Node.js, Redis, MongoDB, Framer Motion.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-2xs text-muted-foreground italic">
        Task state is stored in this session only — a persistent build ledger will arrive
        when the backend exposes a tasks endpoint.
      </p>
    </div>
  );
}
