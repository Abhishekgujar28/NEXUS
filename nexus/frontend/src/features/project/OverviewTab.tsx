import { BookOpen, FolderOpen, Scale, Lightbulb, ShieldAlert, Clock } from 'lucide-react';
import type { Project, ProjectStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { pct, timeAgo } from '@/lib/utils';

function StatCard({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-surface">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground tabular">{value}</div>
      </div>
    </div>
  );
}

export function OverviewTab({ project, stats }: { project: Project; stats: ProjectStats | null }) {
  const pu = project.problemUnderstanding;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Sources" value={stats?.sourceCount ?? '—'} icon={FolderOpen} />
        <StatCard label="Evidence" value={stats?.solutionCount ?? '—'} icon={Scale} />
        <StatCard label="Solutions" value={stats?.solutionCount ?? '—'} icon={Lightbulb} />
        <StatCard label="Gaps" value={stats?.gapCount ?? '—'} icon={ShieldAlert} />
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Project Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {project.description}
          </p>
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {project.tags.map((t) => (
                <Badge key={t} tone="outline" size="sm">{t}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {project.domain && (
          <Card>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground mb-1">Domain</div>
              <div className="text-sm font-medium">{project.domain}</div>
            </CardContent>
          </Card>
        )}
        {project.platform && (
          <Card>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground mb-1">Platform</div>
              <div className="text-sm font-medium">{project.platform}</div>
            </CardContent>
          </Card>
        )}
        {project.preferredTech && (
          <Card>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground mb-1">Preferred Tech</div>
              <div className="text-sm font-medium">{project.preferredTech}</div>
            </CardContent>
          </Card>
        )}
        {project.timeline && (
          <Card>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground mb-1">Timeline</div>
              <div className="text-sm font-medium">{project.timeline}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Key concepts (from AI) */}
      {pu?.keyConcepts && pu.keyConcepts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Concepts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pu.keyConcepts.map((c, i) => (
                <Badge key={i} tone="accent">{c}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Created {timeAgo(project.createdAt)}
        </span>
        <span>Updated {timeAgo(project.updatedAt)}</span>
      </div>
    </div>
  );
}
