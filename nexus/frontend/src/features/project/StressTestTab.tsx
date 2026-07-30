import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, ShieldAlert, ShieldCheck, Play, Info } from 'lucide-react';
import { toast } from 'sonner';
import { projectsService, researchService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import type { ID } from '@/types';
import { titleCase } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

type Severity = 'low' | 'medium' | 'high';

function severityTone(s?: Severity): 'danger' | 'warning' | 'neutral' | 'success' {
  if (s === 'high') return 'danger';
  if (s === 'medium') return 'warning';
  if (s === 'low') return 'success';
  return 'neutral';
}

function severityRail(s?: Severity): string {
  if (s === 'high') return 'bg-clay-500';
  if (s === 'medium') return 'bg-amber-500';
  if (s === 'low') return 'bg-moss-500';
  return 'bg-border';
}

export function StressTestTab({ projectId }: { projectId: ID }) {
  const qc = useQueryClient();
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsService.get(projectId),
  });

  const runStressTest = useMutation({
    mutationFn: () => researchService.stressTest(projectId),
    onSuccess: () => {
      toast.success('Stress test queued — refreshing when complete');
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const assumptions = project?.problemUnderstanding?.assumptions ?? [];

  // Sort by severity: high → medium → low → undefined
  const sorted = [...assumptions].sort((a, b) => {
    const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (rank[b.severity ?? ''] ?? 0) - (rank[a.severity ?? ''] ?? 0);
  });

  const highCount = assumptions.filter((a) => a.severity === 'high').length;
  const medCount = assumptions.filter((a) => a.severity === 'medium').length;
  const lowCount = assumptions.filter((a) => a.severity === 'low').length;

  if (assumptions.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" />}
          title="No stress-test results yet"
          description="NEXUS challenges your idea by surfacing hidden assumptions and risks with mitigations. Run a stress test after research completes."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => runStressTest.mutate()}
              loading={runStressTest.isPending}
            >
              <Play className="h-4 w-4" />
              Run stress test
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + counts */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-foreground/90">
            {assumptions.length} assumption{assumptions.length !== 1 ? 's' : ''} identified.
            Severity reflects impact if the assumption fails.
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {highCount > 0 && <Badge tone="danger" size="sm">{highCount} high</Badge>}
            {medCount > 0 && <Badge tone="warning" size="sm">{medCount} medium</Badge>}
            {lowCount > 0 && <Badge tone="success" size="sm">{lowCount} low</Badge>}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runStressTest.mutate()}
          loading={runStressTest.isPending}
        >
          <Play className="h-3.5 w-3.5" />
          Re-run
        </Button>
      </div>

      {/* Assumption list */}
      <div className="space-y-3">
        {sorted.map((a, i) => (
          <Card key={i} className="p-0 overflow-hidden">
            <div className="flex">
              <div className={`w-1 shrink-0 ${severityRail(a.severity as Severity)}`} />
              <div className="p-5 min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {a.severity === 'high' ? (
                      <AlertOctagon className="h-4 w-4 mt-0.5 text-clay-400 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    )}
                    <h4 className="text-sm font-semibold text-foreground">{a.assumption}</h4>
                  </div>
                  {a.severity && (
                    <Badge tone={severityTone(a.severity as Severity)} size="sm">
                      {titleCase(a.severity)}
                    </Badge>
                  )}
                </div>

                {a.risk && (
                  <div className="ml-6 mb-2">
                    <span className="text-2xs uppercase tracking-widest text-clay-400 font-medium">Risk</span>
                    <p className="text-xs text-foreground/80 leading-relaxed mt-1">{a.risk}</p>
                  </div>
                )}

                {a.mitigation && (
                  <div className="ml-6 mb-2">
                    <span className="text-2xs uppercase tracking-widest text-moss-400 font-medium">Mitigation</span>
                    <p className="text-xs text-foreground/80 leading-relaxed mt-1">{a.mitigation}</p>
                  </div>
                )}

                {a.evidence && (
                  <div className="ml-6">
                    <span className="text-2xs uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-1">
                      Evidence
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          What NEXUS observed in research that supports (or challenges) this assumption.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <p className="text-xs text-muted-foreground italic leading-relaxed mt-1">{a.evidence}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
