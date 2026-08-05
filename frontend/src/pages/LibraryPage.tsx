import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Layers, Clock, ArrowRight } from 'lucide-react';
import { projectsService } from '@/lib/services';
import { timeAgo, truncate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section';
import type { Project, ProjectStatus } from '@/types';

function statusBadge(status: ProjectStatus) {
  const map: Record<string, { label: string; tone: 'accent' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
    draft: { label: 'Draft', tone: 'neutral' },
    researching: { label: 'Researching', tone: 'accent' },
    complete: { label: 'Complete', tone: 'success' },
    failed: { label: 'Failed', tone: 'danger' },
  };
  const s = map[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function LibraryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', 'library', statusFilter],
    queryFn: () => projectsService.list({ limit: 100, status: statusFilter || undefined }),
  });

  const allProjects = data?.items ?? [];
  const filtered = allProjects.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.domain?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Project Library"
          description="Browse and manage all your research projects."
        />
        <Button variant="primary" size="md" onClick={() => navigate('/new')}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by title, description or domain..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {['', 'draft', 'researching', 'complete', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {st === '' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-5 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Error state */}
      {error && !isLoading ? (
        <div className="text-sm text-clay-400">Failed to load projects.</div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No projects found"
          description={
            search || statusFilter
              ? 'No projects match your current search or filter.'
              : 'Create your first project to get started.'
          }
          action={
            <Button variant="primary" onClick={() => navigate('/new')}>
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          }
        />
      ) : null}

      {/* Projects Grid */}
      {!isLoading && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card
              key={project._id}
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
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {timeAgo(project.updatedAt)}
                </span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-citrine-400" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
