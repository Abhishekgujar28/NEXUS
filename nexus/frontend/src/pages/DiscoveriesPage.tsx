import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FolderOpen, Scale, ShieldAlert, ExternalLink, ArrowRight } from 'lucide-react';
import { projectsService, researchService } from '@/lib/services';
import { hostOf, pct, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section';
import type { Project, ResearchSource } from '@/types';

export function DiscoveriesPage() {
  const navigate = useNavigate();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', 'discoveries'],
    queryFn: () => projectsService.list({ limit: 20 }),
  });

  const projects = projectsData?.items ?? [];
  const completedProjects = projects.filter((p) => p.status === 'complete' || p.status === 'researching');

  // Fetch sources for the latest active/completed project
  const firstProject = completedProjects[0];
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['sources', firstProject?._id],
    queryFn: () => (firstProject ? researchService.sources(firstProject._id, { limit: 20 }) : null),
    enabled: !!firstProject,
  });

  const { data: gapsData } = useQuery({
    queryKey: ['gaps', firstProject?._id],
    queryFn: () => (firstProject ? researchService.gaps(firstProject._id) : null),
    enabled: !!firstProject,
  });

  const sources = sourcesData?.items ?? [];
  const gaps = gapsData ?? [];

  const isLoading = projectsLoading || sourcesLoading;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      <SectionHeader
        title="Discoveries Feed"
        description="Key findings, research sources, and innovation gaps discovered across your projects."
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="No discoveries yet"
          description="Discoveries compile sources and market gaps from completed research runs."
        />
      ) : (
        <div className="space-y-8">
          {firstProject && (
            <div className="border-b border-border pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>Featured Project</span>
                <span>&bull;</span>
                <span>{timeAgo(firstProject.updatedAt)}</span>
              </div>
              <h2
                onClick={() => navigate(`/projects/${firstProject._id}`)}
                className="text-lg font-semibold text-foreground hover:text-citrine-400 cursor-pointer inline-flex items-center gap-2"
              >
                {firstProject.title}
                <ArrowRight className="h-4 w-4" />
              </h2>
            </div>
          )}

          {/* Sources section */}
          {sources.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-citrine-400" />
                <h3 className="text-sm font-semibold text-foreground">Recent Sources</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sources.slice(0, 6).map((source: ResearchSource) => (
                  <Card key={source._id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-foreground line-clamp-1">
                        {source.title}
                      </h4>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {source.snippet && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {source.snippet}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge tone="outline" size="sm">{source.sourceType}</Badge>
                      {source.url && <span className="text-2xs text-muted-foreground">{hostOf(source.url)}</span>}
                      {source.relevanceScore > 0 && (
                        <span className="text-2xs text-muted-foreground">Relevance: {pct(source.relevanceScore)}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Gaps section */}
          {gaps.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-citrine-400" />
                <h3 className="text-sm font-semibold text-foreground">Market &amp; Tech Gaps</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gaps.slice(0, 4).map((gap) => (
                  <Card key={gap._id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">{gap.title}</h4>
                      <Badge tone={gap.impact === 'high' ? 'accent' : 'warning'} size="sm">
                        {gap.impact} impact
                      </Badge>
                    </div>
                    {gap.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{gap.description}</p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
