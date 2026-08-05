import { Clock, Layers, AlertCircle } from 'lucide-react';

interface QueueStatusBannerProps {
  queuePosition: number;
  estimatedWaitTimeSeconds: number;
  onCancel?: () => void;
}

export function QueueStatusBanner({
  queuePosition,
  estimatedWaitTimeSeconds,
}: QueueStatusBannerProps) {
  const mins = Math.floor(estimatedWaitTimeSeconds / 60);
  const secs = estimatedWaitTimeSeconds % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 mb-4">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-amber-400 shrink-0" />
        <div>
          <span className="font-semibold">Research Job Queued (Position #{queuePosition})</span>
          <span className="ml-2 text-amber-300/80">
            Worker queue is processing preceding jobs.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-amber-300 font-medium">
        <Clock className="h-3.5 w-3.5" />
        <span>Est. wait: {timeStr}</span>
      </div>
    </div>
  );
}
