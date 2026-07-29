import { useQuery } from '@tanstack/react-query';
import { Boxes, Server, MonitorSmartphone, Database, Brain, Cpu, Cloud, Plug } from 'lucide-react';
import { researchService } from '@/lib/services';
import type { ID, ProjectArchitectureComponent, ProjectRecommendation } from '@/types';
import { titleCase } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

function categoryIcon(cat?: string) {
  switch (cat) {
    case 'frontend':
      return <MonitorSmartphone className="h-4 w-4" />;
    case 'backend':
      return <Server className="h-4 w-4" />;
    case 'database':
      return <Database className="h-4 w-4" />;
    case 'ai':
      return <Brain className="h-4 w-4" />;
    case 'queue':
    case 'cache':
      return <Cpu className="h-4 w-4" />;
    case 'external':
      return <Plug className="h-4 w-4" />;
    default:
      return <Cloud className="h-4 w-4" />;
  }
}

function ComponentCard({ comp }: { comp: ProjectArchitectureComponent }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {categoryIcon(comp.category)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground">{comp.name}</h4>
            {comp.technology && <Badge tone="accent" size="sm">{comp.technology}</Badge>}
          </div>
          {comp.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{comp.description}</p>
          )}
          {comp.responsibilities && comp.responsibilities.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {comp.responsibilities.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground">&bull; {r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function RecommendationRow({ rec }: { rec: ProjectRecommendation }) {
  const priorityTone =
    rec.priority === 'must_have' ? 'accent' : rec.priority === 'should_have' ? 'warning' : 'neutral';
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-foreground">{rec.name}</span>
          {rec.category && <Badge tone="outline" size="sm">{titleCase(rec.category)}</Badge>}
          {rec.priority && <Badge tone={priorityTone} size="sm">{titleCase(rec.priority)}</Badge>}
        </div>
        {rec.rationale && (
          <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>
        )}
        {rec.alternatives && rec.alternatives.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Alternatives: {rec.alternatives.join(', ')}
          </div>
        )}
        {rec.tradeoffs && (
          <div className="text-xs text-muted-foreground mt-0.5 italic">
            Tradeoffs: {rec.tradeoffs}
          </div>
        )}
      </div>
    </div>
  );
}

export function ArchitectureTab({ projectId }: { projectId: ID }) {
  const { data, isLoading } = useQuery({
    queryKey: ['architecture', projectId],
    queryFn: () => researchService.architecture(projectId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const arch = data?.architecture;
  const recs = data?.recommendations ?? [];

  if (!arch && recs.length === 0) {
    return (
      <EmptyState
        icon={<Boxes className="h-5 w-5" />}
        title="No architecture yet"
        description="NEXUS designs a system architecture after analyzing research and identifying gaps. Complete a research run to see architecture recommendations."
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview */}
      {arch?.overview && (
        <Card>
          <CardHeader>
            <CardTitle>Architecture Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {arch.overview}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Components */}
      {arch?.components && arch.components.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-4">System Components</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {arch.components.map((c, i) => (
              <ComponentCard key={i} comp={c} />
            ))}
          </div>
        </section>
      )}

      {/* Data flow */}
      {arch?.dataFlow && (
        <Card>
          <CardHeader><CardTitle>Data Flow</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{arch.dataFlow}</p>
          </CardContent>
        </Card>
      )}

      {/* Tech Recommendations */}
      {recs.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Technology Recommendations</h3>
          <Card>
            <CardContent className="py-0 divide-y divide-border">
              {recs.map((r, i) => (
                <RecommendationRow key={i} rec={r} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
