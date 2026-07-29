import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — a plain surface with a hairline border. Never gradient-filled,
 * never with a heavy shadow. The point is calm information density.
 */
export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'bg-surface-raised border border-border rounded-lg',
        interactive &&
          'transition-[background,border-color,transform] duration-150 hover:border-foreground/25 hover:bg-surface-raised/80 cursor-pointer',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-5 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground mt-1', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-3', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-3 border-t border-border flex items-center justify-between gap-3', className)}
      {...props}
    />
  );
}
