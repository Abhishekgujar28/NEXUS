import * as React from 'react';
import { cn, clamp } from '@/lib/utils';

/**
 * Progress bar with an optional citrine track. The rail is thin (2px) so it
 * feels like a status line, not a "loading spinner".
 */
export function Progress({
  value = 0,
  className,
  variant = 'accent',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  variant?: 'accent' | 'neutral' | 'moss';
}) {
  const clamped = clamp(value, 0, 100);
  const fill =
    variant === 'accent'
      ? 'bg-citrine-400'
      : variant === 'moss'
      ? 'bg-moss-500'
      : 'bg-foreground/60';
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className={cn('h-full transition-[width] duration-500 ease-out', fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
