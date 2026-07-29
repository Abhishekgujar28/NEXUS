import { useQuery } from '@tanstack/react-query';
import {
  ExternalLink,
  Package,
  Database,
  Globe,
  Clock,
  DollarSign,
  Server,
  Users,
  Wrench,
} from 'lucide-react';
import { researchService } from '@/lib/services';
import type { ID, ResourceRecommendation } from '@/types';
import { titleCase, hostOf } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

function typeIcon(type?: string) {
  switch (type) {
    case 'infrastructure':
      return <Server className="h-4 w-4" />;
    case 'human':
      return <Users className="h-4 w-4" />;
    case 'financial':
      return <DollarSign className="h-4 w-4" />;
    case 'time':
      return <Clock className="h-4 w-4" />;
    default:
      return <Wrench className="h-4 w-4" />;
  }
}

function typeTone(type?: string): 'accent' | 'warning' | 'success' | 'neutral' | 'outline' {
  switch (type) {
    case 'infrastructure':
      return 'accent';
    case 'human':
      return 'success';
    case 'financial':
      return 'warning';
    case 'time':
      return 'neutral';
    default:
      return 'outline';
  }
}

function ResourceCard({ resource }: { resource: ResourceRecommendation }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {typeIcon(resource.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-semibold text-foreground">{resource.name}</h4>
            {resource.type && (
              <Badge tone={typeTone(resource.type)} size="sm">
                {titleCase(resource.type)}
              </Badge>
            )}
          </div>

          {resource.description && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              {resource.description}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {resource.estimatedCost && (
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <DollarSign className="h-3 w-3" />
                {resource.estimatedCost}
              </span>
            )}
            {resource.timeframe && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {resource.timeframe}
              </span>
            )}
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-citrine-400 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {hostOf(resource.url)}
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ResourcesTab({ projectId }: { projectId: ID }) {
  const { data, isLoading } = useQuery({
    queryKey: ['resources', projectId],
    queryFn: () => researchService.resources(projectId),
  });

  const items = data?.resources ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-5 w-5" />}
        title="No resources yet"
        description="NEXUS recommends APIs, datasets, services, and infrastructure after analyzing your project's architecture. Complete a research run to discover what you'll need."
      />
    );
  }

  // Group by type
  const grouped = items.reduce<Record<string, ResourceRecommendation[]>>((acc, r) => {
    const key = r.type ?? 'other';
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  const typeOrder = ['infrastructure', 'human', 'financial', 'time', 'other'];
  const sortedKeys = Object.keys(grouped).sort(
    (a, b) => (typeOrder.indexOf(a) === -1 ? 99 : typeOrder.indexOf(a)) -
              (typeOrder.indexOf(b) === -1 ? 99 : typeOrder.indexOf(b))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <p className="text-xs text-muted-foreground">
        {items.length} resource{items.length !== 1 ? 's' : ''} recommended across {sortedKeys.length} categor{sortedKeys.length !== 1 ? 'ies' : 'y'}.
      </p>

      {sortedKeys.map((key) => (
        <section key={key}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            {typeIcon(key)}
            {titleCase(key)}
            <Badge tone="outline" size="sm">{grouped[key].length}</Badge>
          </h3>
          <div className="space-y-2">
            {grouped[key].map((r, i) => (
              <ResourceCard key={i} resource={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
