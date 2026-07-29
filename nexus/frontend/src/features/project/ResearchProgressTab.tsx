import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Loader2, XCircle, SkipForward } from 'lucide-react';
import { researchService } from '@/lib/services';
import { cn, timeAgo } from '@/lib/utils';
import type { ResearchStage, StageStatus, ID } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';

function stageIcon(status: StageStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-moss-400" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-citrine-400 animate-spin" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-clay-400" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-muted-foreground/50" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/30" />;
  }
}

function StageLine({ stage, isLast }: { stage: ResearchStage; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        {stageIcon(stage.status)}
        {!isLast && (
          <div
            className={cn(
              'w-px flex-1 mt-1',
              stage.status === 'completed' ? 'bg-moss-500/40' : 'bg-border'
            )}
          />
        )}
      </div>
      {/* Content */}
      <div className="pb-6 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              stage.status === 'running' ? 'text-citrine-400' : 'text-foreground'
            )}
          >
            {stage.label}
          </span>
          {stage.status === 'running' && (
            <span className="text-xs text-citrine-400/70 animate-pulse">processing…</span>
          )}
          {stage.completedAt && (
            <span className="text-xs text-muted-foreground">{timeAgo(stage.completedAt)}</span>
          )}
        </div>
        {stage.note && (
          <p className="text-xs text-muted-foreground mt-1">{stage.note}</p>
        )}
      </div>
    </div>
  );
}

export function ResearchProgressTab({ projectId }: { projectId: ID }) {
  const { data: job, isLoading, error } = useQuery({
    queryKey: ['research-job', projectId],
    queryFn: () => researchService.job(projectId),
    refetchInterval: (q) => {
      const s = q.state?.data?.status;
      return s === 'running' || s === 'queued' ? 3000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <Skeleton className="h-4 w-64" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !job) {
    return (
      <EmptyState
        title="No research yet"
        description="Start a research job from the project header to see progress here."
      />
    );
  }

  const stages = job.stages ?? [];

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Top summary */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Research Pipeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {job.status === 'completed'
              ? 'Research completed'
              : job.status === 'running'
              ? 'Research in progress…'
              : job.status === 'failed'
              ? 'Research failed'
              : `Status: ${job.status}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular text-muted-foreground">{job.progress}%</span>
          <Progress value={job.progress} className="w-32" />
        </div>
      </div>

      {/* Stage timeline */}
      <div className="pl-1">
        {stages.map((stage, i) => (
          <StageLine key={stage.key} stage={stage} isLast={i === stages.length - 1} />
        ))}
      </div>

      {/* Error */}
      {job.error && (
        <div className="mt-4 border border-clay-500/25 rounded-md bg-clay-500/5 p-4 text-sm text-clay-400">
          {job.error}
        </div>
      )}
    </div>
  );
}
