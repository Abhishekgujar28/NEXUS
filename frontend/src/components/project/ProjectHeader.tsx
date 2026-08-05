import { Play, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Project, ProjectStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LiveDot } from '@/components/LiveDot';
import { PinButton } from '@/components/PinButton';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline';

const STATUS_META: Record<ProjectStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  researching: { label: 'Researching', tone: 'accent' },
  complete: { label: 'Complete', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  deleted: { label: 'Deleted', tone: 'outline' },
};

/**
 * ProjectHeader — the single compact project header. Rendered once per
 * project (Stage 3 removes the duplicate title/description from every tab).
 * No description block here: title, status, live progress, and a primary
 * action only. Extra actions slot via `actions`.
 */
export function ProjectHeader({
  project,
  onStartResearch,
  starting = false,
  actions,
  className,
}: {
  project: Project;
  onStartResearch?: () => void;
  starting?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  const meta = STATUS_META[project.status] ?? STATUS_META.draft;
  const isResearching = project.status === 'researching';
  const canStart =
    project.status === 'draft' || project.status === 'complete' || project.status === 'failed';

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
          {project.title}
        </h1>
        <Badge tone={meta.tone}>
          {isResearching ? (
            <span className="flex items-center gap-1.5">
              <LiveDot label="" className="scale-90" />
              {meta.label}
            </span>
          ) : (
            meta.label
          )}
        </Badge>
        <PinButton projectId={project._id} size="sm" />
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {isResearching && (
          <div className="flex items-center gap-2.5 min-w-[160px]">
            <Progress value={project.researchProgress} className="flex-1" />
            <span className="text-xs tabular text-muted-foreground">
              {project.researchProgress}%
            </span>
          </div>
        )}
        {actions}
        {canStart && onStartResearch && (
          <Button variant="primary" size="md" onClick={onStartResearch} loading={starting}>
            <Play className="h-3.5 w-3.5" />
            {project.status === 'draft' ? 'Start Research' : 'Re-run Research'}
          </Button>
        )}
        {isResearching && !actions && (
          <div className="flex items-center gap-2 text-xs text-citrine-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Running
          </div>
        )}
      </div>
    </div>
  );
}
