import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Sparkles,
  Users as UsersIcon,
} from 'lucide-react';
import { projectsService } from '@/lib/services';
import { useAuthStore } from '@/stores/auth';
import type { Project } from '@/types';
import { timeAgo, initials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

type ActivityItem = {
  id: string;
  kind: 'created' | 'started' | 'completed' | 'failed' | 'draft';
  project: Project;
  at: string;
};

function inferActivity(projects: Project[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const p of projects) {
    items.push({ id: `${p._id}-created`, kind: 'created', project: p, at: p.createdAt });
    if (p.status === 'researching') {
      items.push({ id: `${p._id}-started`, kind: 'started', project: p, at: p.updatedAt });
    }
    if (p.status === 'complete') {
      items.push({ id: `${p._id}-complete`, kind: 'completed', project: p, at: p.updatedAt });
    }
    if (p.status === 'failed') {
      items.push({ id: `${p._id}-failed`, kind: 'failed', project: p, at: p.updatedAt });
    }
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function iconFor(kind: ActivityItem['kind']) {
  switch (kind) {
    case 'created':
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'started':
      return <Play className="h-3.5 w-3.5 text-citrine-400" />;
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-moss-400" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-clay-400" />;
    default:
      return <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function labelFor(kind: ActivityItem['kind']): string {
  switch (kind) {
    case 'created':
      return 'created project';
    case 'started':
      return 'started research on';
    case 'completed':
      return 'completed research on';
    case 'failed':
      return 'research failed on';
    default:
      return 'updated';
  }
}

export function TeamActivityPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectsService.list({ limit: 50 }),
  });

  const projects = data?.items ?? [];
  const activity = inferActivity(projects);
  const activeResearch = projects.filter((p) => p.status === 'researching');

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Team &amp; Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What's happening across your workspace — active research and recent changes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: activity feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-citrine-400" />
                Recent activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <EmptyState
                  icon={<Activity className="h-5 w-5" />}
                  title="No activity yet"
                  description="Create a project and start research to see updates here."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {activity.slice(0, 20).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        {iconFor(a.kind)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{user?.name ?? 'You'}</span>{' '}
                          <span className="text-muted-foreground">{labelFor(a.kind)}</span>{' '}
                          <Link
                            to={`/projects/${a.project._id}`}
                            className="text-citrine-400 hover:underline font-medium"
                          >
                            {a.project.title}
                          </Link>
                        </p>
                        <span className="text-xs text-muted-foreground">{timeAgo(a.at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: team + active research */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-citrine-400" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-citrine-400/15 text-citrine-400 text-xs font-semibold">
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <Badge tone="outline" size="sm">
                    {user.plan ?? 'free'}
                  </Badge>
                </div>
              ) : (
                <Skeleton className="h-10" />
              )}
              <p className="text-2xs text-muted-foreground mt-4 leading-relaxed">
                Team collaboration is coming soon — you'll be able to invite teammates and share
                projects with role-based access.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-citrine-400" />
                Active research
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {activeResearch.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing running right now.</p>
              ) : (
                <ul className="space-y-2">
                  {activeResearch.map((p) => (
                    <li key={p._id}>
                      <Link
                        to={`/projects/${p._id}/research`}
                        className="block p-2.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="text-sm font-medium text-foreground truncate">{p.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-citrine-400 transition-[width] duration-500"
                              style={{ width: `${p.researchProgress}%` }}
                            />
                          </div>
                          <span className="text-2xs tabular text-muted-foreground">
                            {p.researchProgress}%
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
