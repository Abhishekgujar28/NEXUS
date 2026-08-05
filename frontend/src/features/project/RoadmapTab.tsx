import { useQuery } from '@tanstack/react-query';
import { Flag, AlertTriangle, CheckCircle2, Circle, ArrowRight, Map as MapIcon } from 'lucide-react';
import { researchService } from '@/lib/services';
import type { ID, RoadmapPhase, RoadmapRisk } from '@/types';
import { cn, titleCase } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

function PhaseCard({ phase }: { phase: RoadmapPhase }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-citrine-400/10 text-citrine-400 text-xs font-bold tabular">
          {phase.phase}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{phase.title}</h4>
          {phase.duration && (
            <span className="text-xs text-muted-foreground">{phase.duration}</span>
          )}
        </div>
      </div>

      {/* Milestones */}
      {phase.milestones && phase.milestones.length > 0 && (
        <div className="mb-3">
          <h5 className="text-2xs uppercase tracking-widest text-muted-foreground mb-1.5">Milestones</h5>
          <ul className="space-y-1">
            {phase.milestones.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                <Flag className="h-3 w-3 text-citrine-400/60" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deliverables */}
      {phase.deliverables && phase.deliverables.length > 0 && (
        <div className="mb-3">
          <h5 className="text-2xs uppercase tracking-widest text-muted-foreground mb-1.5">Deliverables</h5>
          <ul className="space-y-1">
            {phase.deliverables.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                <CheckCircle2 className="h-3 w-3 text-moss-400/60" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tasks */}
      {phase.tasks && phase.tasks.length > 0 && (
        <div>
          <h5 className="text-2xs uppercase tracking-widest text-muted-foreground mb-1.5">Tasks</h5>
          <ul className="space-y-1">
            {phase.tasks.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Circle className="h-3 w-3 text-muted-foreground/40" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dependencies */}
      {phase.dependencies && phase.dependencies.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-2xs text-muted-foreground">Depends on:</span>
          {phase.dependencies.map((d, i) => (
            <Badge key={i} tone="outline" size="sm">{d}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function RiskRow({ risk }: { risk: RoadmapRisk }) {
  const tone = risk.impact === 'high' ? 'danger' : risk.impact === 'medium' ? 'warning' : 'neutral';
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <AlertTriangle className={cn('h-4 w-4 mt-0.5 shrink-0', tone === 'danger' ? 'text-clay-400' : 'text-amber-400')} />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground">{risk.risk}</div>
        {risk.mitigation && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Mitigation:</span> {risk.mitigation}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {risk.probability && (
            <Badge tone="outline" size="sm">{titleCase(risk.probability)} probability</Badge>
          )}
          {risk.impact && (
            <Badge tone={tone} size="sm">{titleCase(risk.impact)} impact</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function RoadmapTab({ projectId }: { projectId: ID }) {
  const { data, isLoading } = useQuery({
    queryKey: ['roadmap', projectId],
    queryFn: () => researchService.roadmap(projectId),
  });

  const roadmap = data?.roadmap;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (!roadmap || !roadmap.phases || roadmap.phases.length === 0) {
    return (
      <EmptyState
        icon={<MapIcon className="h-5 w-5" />}
        title="No roadmap yet"
        description="NEXUS generates a phased roadmap with milestones, deliverables, and risk assessment after research is complete."
      />
    );
  }

  const phases = [...(roadmap.phases ?? [])].sort((a, b) => a.phase - b.phase);
  const risks = roadmap.risks ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Duration & critical path */}
      <div className="flex items-center gap-4 flex-wrap">
        {roadmap.totalDuration && (
          <Badge tone="accent">Total: {roadmap.totalDuration}</Badge>
        )}
        {roadmap.criticalPath && roadmap.criticalPath.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Critical path:
            {roadmap.criticalPath.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="h-3 w-3" />}
                <Badge tone="outline" size="sm">{c}</Badge>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {phases.map((p) => (
          <PhaseCard key={p.phase} phase={p} />
        ))}
      </div>

      {/* Risks */}
      {risks.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Risks & Mitigations
          </h3>
          <Card>
            <CardContent className="py-0">
              {risks.map((r, i) => (
                <RiskRow key={i} risk={r} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
