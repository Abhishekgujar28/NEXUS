import * as React from 'react';
import { cn } from '@/lib/utils';

/** A visual placeholder that pulses gently — matches actual layout, not a blob. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-gradient-to-r from-muted/60 via-muted/90 to-muted/60 bg-[length:200%_100%] animate-shimmer',
        className
      )}
      {...props}
    />
  );
}
