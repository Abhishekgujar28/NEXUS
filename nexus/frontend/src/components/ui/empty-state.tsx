import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Empty state — never just "no data". Always tell the user what belongs
 * here, why it matters, and one relevant action.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-border rounded-lg bg-surface/50',
        className
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6 border border-clay-500/25 rounded-lg bg-clay-500/5',
        className
      )}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md">{description}</p>
      ) : null}
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-4 text-xs font-medium text-citrine-400 hover:underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
