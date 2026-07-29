import { useQuery } from '@tanstack/react-query';
import { ExternalLink, ThumbsUp, ThumbsDown, Code2 } from 'lucide-react';
import { researchService } from '@/lib/services';
import type { ID, ExistingSolution } from '@/types';
import { pct, hostOf } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

function SolutionCard({ solution }: { solution: ExistingSolution }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{solution.name}</h3>
          {solution.url && (
            <a
              href={solution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-citrine-400 flex items-center gap-1 mt-0.5"
            >
              {hostOf(solution.url)}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {solution.similarityScore != null && solution.similarityScore > 0 && (
          <Badge tone="outline" size="sm">
            {pct(solution.similarityScore)} similar
          </Badge>
        )}
      </div>

      {solution.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {solution.description}
        </p>
      )}

      {/* Technologies */}
      {solution.technologies && solution.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {solution.technologies.map((t, i) => (
            <Badge key={i} tone="neutral" size="sm">
              <Code2 className="h-2.5 w-2.5" />
              {t}
            </Badge>
          ))}
        </div>
      )}

      {/* Strengths & Limitations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {solution.strengths && solution.strengths.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-moss-400 flex items-center gap-1.5 mb-2">
              <ThumbsUp className="h-3 w-3" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {solution.strengths.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                  &bull; {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {solution.limitations && solution.limitations.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-clay-400 flex items-center gap-1.5 mb-2">
              <ThumbsDown className="h-3 w-3" />
              Limitations
            </h4>
            <ul className="space-y-1">
              {solution.limitations.map((l, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                  &bull; {l}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

export function SolutionsTab({ projectId }: { projectId: ID }) {
  const { data, isLoading } = useQuery({
    queryKey: ['solutions', projectId],
    queryFn: () => researchService.solutions(projectId),
  });

  const items = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-5">
            <Skeleton className="h-5 w-48 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No existing solutions found"
        description="After research completes, NEXUS catalogs existing products, tools, and projects that address similar problems — with their strengths and weaknesses."
      />
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-xs text-muted-foreground mb-4">
        {items.length} existing solution{items.length !== 1 ? 's' : ''} discovered.
      </p>
      {items.map((s) => (
        <SolutionCard key={s._id} solution={s} />
      ))}
    </div>
  );
}
