import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp, Info } from 'lucide-react';
import { researchService } from '@/lib/services';
import type { ID, InnovationGap } from '@/types';
import { pct, titleCase } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

function impactBadge(level: 'low' | 'medium' | 'high') {
  const tone = level === 'high' ? 'accent' : level === 'medium' ? 'warning' : 'neutral';
  return <Badge tone={tone} size="sm">{titleCase(level)} impact</Badge>;
}

function difficultyBadge(level: 'low' | 'medium' | 'high') {
  const tone = level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success';
  return <Badge tone={tone} size="sm">{titleCase(level)} difficulty</Badge>;
}

function GapCard({ gap }: { gap: InnovationGap }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-foreground">{gap.title}</h3>
        {gap.category && (
          <Badge tone="outline" size="sm">{titleCase(gap.category)}</Badge>
        )}
      </div>

      {gap.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{gap.description}</p>
      )}

      {/* Opportunity */}
      {gap.opportunity && (
        <div className="bg-citrine-400/5 border border-citrine-400/15 rounded-md p-3 mb-3">
          <h4 className="text-xs font-medium text-citrine-400 flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3 w-3" />
            Opportunity
          </h4>
          <p className="text-xs text-foreground/80 leading-relaxed">{gap.opportunity}</p>
        </div>
      )}

      {/* Metrics */}
      <div className="flex items-center gap-3 flex-wrap">
        {impactBadge(gap.impact)}
        {difficultyBadge(gap.difficulty)}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-xs text-muted-foreground cursor-default">
              {pct(gap.confidence)} confidence
              <Info className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent>AI-estimated confidence in this gap's existence and opportunity size.</TooltipContent>
        </Tooltip>
      </div>
    </Card>
  );
}

export function GapsTab({ projectId }: { projectId: ID }) {
  const { data, isLoading } = useQuery({
    queryKey: ['gaps', projectId],
    queryFn: () => researchService.gaps(projectId),
  });

  const items = data ?? [];

  // Sort: high impact first, then by confidence desc
  const sorted = [...items].sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    const diff = (impactOrder[b.impact] ?? 0) - (impactOrder[a.impact] ?? 0);
    return diff !== 0 ? diff : b.confidence - a.confidence;
  });

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-5">
            <Skeleton className="h-5 w-56 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="h-5 w-5" />}
        title="No innovation gaps yet"
        description="NEXUS identifies what's missing in the existing landscape — the features nobody built, the problems nobody solved, the approaches nobody tried. Run research to discover them."
      />
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-xs text-muted-foreground mb-4">
        {sorted.length} gap{sorted.length !== 1 ? 's' : ''} identified — sorted by impact.
      </p>
      {sorted.map((g) => (
        <GapCard key={g._id} gap={g} />
      ))}
    </div>
  );
}
