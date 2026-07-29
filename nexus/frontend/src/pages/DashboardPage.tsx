import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Layers, Zap, Clock } from 'lucide-react';
import { projectsService } from '@/lib/services';
import { useAuthStore } from '@/stores/auth';
import { timeAgo, truncate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { Project } from '@/types';

function statusBadge(status: Project['status']) {
  const map: Record<string, { label: string; tone: 'accent' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
    draft: { label: 'Draft', tone: 'neutral' },
    researching: { label: 'Researching', tone: 'accent' },
    complete: { label: 'Complete', tone: 'success' },
    failed: { label: 'Failed', tone: 'danger' },
  };
  const s = map[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  return (
    <Card
      interactive
      onClick={() => navigate(`/projects/${project._id}`)}
      className="flex flex-col justify-between p-5 group"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
            {project.title}
          </h3>
          {statusBadge(project.status)}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {truncate(project.description, 120)}
        </p>
      </div>
      <div className="mt-4">
        {project.status === 'researching' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Research in progress</span>
              <span className="tabular">{project.researchProgress}%</span>
            </div>
            <Progress value={project.researchProgress} />
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {timeAgo(project.updatedAt)}
            </span>
            <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-citrine-400" />
          </div>
        )}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-5 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-1 w-full mt-4" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.list({ limit: 30 }),
  });

  const projects = data?.items ?? [];
  const active = projects.filter((p) => p.status === 'researching');
  const rest = projects.filter((p) => p.status !== 'researching');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length === 0
              ? 'Start by creating your first research project.'
              : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => navigate('/new')}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Loading */}
      {isLoading ? <DashboardSkeleton /> : null}

      {/* Error */}
      {error && !isLoading ? (
        <div className="text-sm text-clay-400">Failed to load projects. Try refreshing the page.</div>
      ) : null}

      {/* Empty */}
      {!isLoading && !error && projects.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No projects yet"
          description="NEXUS turns your idea into deep research, architecture, and an actionable roadmap. Start by describing what you want to build."
          action={
            <Button variant="primary" onClick={() => navigate('/new')}>
              <Plus className="h-4 w-4" />
              Create your first project
            </Button>
          }
        />
      ) : null}

      {/* Active research */}
      {active.length > 0 ? (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-citrine-400" />
            <h2 className="text-sm font-semibold text-foreground">Active Research</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map((p) => (
              <ProjectCard key={p._id} project={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* All projects */}
      {rest.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">All Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rest.map((p) => (
              <ProjectCard key={p._id} project={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
