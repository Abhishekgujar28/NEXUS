import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe, Github, FileText, Database, Package, MessageSquare } from 'lucide-react';
import { researchService } from '@/lib/services';
import type { ID, ResearchSource, SourceType } from '@/types';
import { cn, hostOf, pct } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'paper', label: 'Papers' },
  { value: 'repo', label: 'Repos' },
  { value: 'package', label: 'Packages' },
  { value: 'discussion', label: 'Discussions' },
  { value: 'article', label: 'Articles' },
  { value: 'dataset', label: 'Datasets' },
  { value: 'api', label: 'APIs' },
];

function sourceIcon(t: SourceType) {
  switch (t) {
    case 'repo':
      return <Github className="h-3.5 w-3.5" />;
    case 'paper':
      return <FileText className="h-3.5 w-3.5" />;
    case 'package':
      return <Package className="h-3.5 w-3.5" />;
    case 'discussion':
      return <MessageSquare className="h-3.5 w-3.5" />;
    case 'dataset':
    case 'api':
      return <Database className="h-3.5 w-3.5" />;
    default:
      return <Globe className="h-3.5 w-3.5" />;
  }
}

function SourceCard({ source }: { source: ResearchSource }) {
  return (
    <Card className="p-4 group">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground mt-0.5">
          {sourceIcon(source.sourceType)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-1">
              {source.title}
            </h3>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {source.snippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {source.snippet}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <Badge tone="outline" size="sm">{source.sourceType}</Badge>
            {source.url && (
              <span className="text-2xs text-muted-foreground">{hostOf(source.url)}</span>
            )}
            {source.relevanceScore > 0 && (
              <span className="text-2xs text-muted-foreground">
                Relevance: {pct(source.relevanceScore)}
              </span>
            )}
            {source.authors && source.authors.length > 0 && (
              <span className="text-2xs text-muted-foreground truncate max-w-[200px]">
                {source.authors.slice(0, 2).join(', ')}
                {source.authors.length > 2 ? ` +${source.authors.length - 2}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SourcesTab({ projectId }: { projectId: ID }) {
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sources', projectId, filter],
    queryFn: () => researchService.sources(projectId, { limit: 50, type: filter || undefined }),
  });

  const items = data?.items ?? [];

  return (
    <div className="animate-fade-in">
      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto no-scrollbar">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              filter === f.value
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No sources found"
          description={
            filter
              ? 'No sources match this filter. Try a different type.'
              : 'Run research to discover relevant sources for your project.'
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <SourceCard key={s._id} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}
