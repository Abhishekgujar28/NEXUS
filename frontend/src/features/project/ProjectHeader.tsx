import { Loader2, Play } from 'lucide-react';
import type { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PinButton } from '@/components/PinButton';
import { LiveDot } from '@/components/LiveDot';

function statusTone(status: Project['status']) {
  switch (status) {
    case 'researching':
      return 'accent' as const;
    case 'complete':
      return 'success' as const;
    case 'failed':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

function statusLabel(status: Project['status']) {
  return status === 'researching' ? 'Researching' : status;
}

export function ProjectHeader({
  project,
  onStartResearch,
  isStartingResearch = false,
}: {
  project: Project;
  onStartResearch?: () => void;
  isStartingResearch?: boolean;
}) {
  const isResearching = project.status === 'researching';
  const canStartResearch =
    project.status === 'draft' ||
    project.status === 'complete' ||
    project.status === 'failed';

  return (
    <header className="border-b border-border pb-4 mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-foreground tracking-tight truncate">
              {project.title}
            </h1>
            <Badge tone={statusTone(project.status)}>{statusLabel(project.status)}</Badge>
            <PinButton projectId={project._id} />
          </div>
          {project.description ? (
            <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
          ) : null}
          {isResearching ? (
            <div className="flex items-center gap-3 mt-2.5 max-w-sm">
              <Progress value={project.researchProgress} className="flex-1" />
              <span className="text-xs tabular text-muted-foreground shrink-0">
                {project.researchProgress}%
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canStartResearch && onStartResearch ? (
            <Button
              variant="primary"
              size="md"
              onClick={onStartResearch}
              loading={isStartingResearch}
            >
              <Play className="h-3.5 w-3.5" />
              {project.status === 'draft' ? 'Start Research' : 'Re-run Research'}
            </Button>
          ) : null}
          {isResearching ? (
            <div className="flex items-center gap-2">
              <LiveDot label="Running" />
              <Loader2 className="h-3.5 w-3.5 animate-spin text-citrine-400" aria-hidden />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
