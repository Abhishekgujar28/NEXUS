import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { researchService } from '@/lib/services';
import type { ID, EvidenceClaim } from '@/types';
import { pct } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

function confidenceTone(c: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (c >= 0.75) return 'success';
  if (c >= 0.4) return 'warning';
  if (c > 0) return 'danger';
  return 'neutral';
}

function EvidenceCard({ claim }: { claim: EvidenceClaim }) {
  const supporting = claim.supportingSourceIds?.length ?? 0;
  const contradicting = claim.contradictingSourceIds?.length ?? 0;

  return (
    <Card className="p-5">
      {/* Claim */}
      <p className="text-sm text-foreground leading-relaxed">{claim.claim}</p>

      {/* Scores */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <Badge tone={confidenceTone(claim.confidence)} size="sm">
                {pct(claim.confidence)} confidence
              </Badge>
              <Info className="h-3 w-3 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              This is an AI-estimated confidence score. It reflects how well the claim is
              supported by available evidence — not a guarantee of accuracy.
            </p>
          </TooltipContent>
        </Tooltip>

        {supporting > 0 && (
          <span className="flex items-center gap-1 text-xs text-moss-400">
            <ArrowUpRight className="h-3 w-3" />
            {supporting} supporting
          </span>
        )}
        {contradicting > 0 && (
          <span className="flex items-center gap-1 text-xs text-clay-400">
            <ArrowDownRight className="h-3 w-3" />
            {contradicting} contradicting
          </span>
        )}
      </div>

      {/* Reasoning */}
      {claim.reasoning && (
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          {claim.reasoning}
        </p>
      )}

      {/* Evidence score breakdown */}
      {(claim.sourceQuality || claim.relevance || claim.freshness) && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {claim.sourceQuality != null && (
            <div>
              <div className="text-2xs text-muted-foreground mb-1">Source quality</div>
              <Progress value={claim.sourceQuality * 100} variant="neutral" />
            </div>
          )}
          {claim.relevance != null && (
            <div>
              <div className="text-2xs text-muted-foreground mb-1">Relevance</div>
              <Progress value={claim.relevance * 100} variant="neutral" />
            </div>
          )}
          {claim.freshness != null && (
            <div>
              <div className="text-2xs text-muted-foreground mb-1">Freshness</div>
              <Progress value={claim.freshness * 100} variant="neutral" />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function EvidenceTab({ projectId }: { projectId: ID }) {
  const { data, isLoading } = useQuery({
    queryKey: ['evidence', projectId],
    queryFn: () => researchService.evidence(projectId),
  });

  const items = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-5">
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No evidence yet"
        description="Evidence claims are extracted from research sources. They connect findings to their supporting data so you can trace every recommendation."
      />
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-xs text-muted-foreground mb-4">
        {items.length} claim{items.length !== 1 ? 's' : ''} extracted from research.
        Confidence scores are AI-estimated — treat them as indicators, not certainty.
      </p>
      {items.map((c) => (
        <EvidenceCard key={c._id} claim={c} />
      ))}
    </div>
  );
}
