import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Inline metric — borderless, dense. */
export function Stat({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-baseline gap-2', className)}>
      {Icon ? (
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
      <div className="min-w-0">
        <div className="mono-label mb-0.5">{label}</div>
        <div className="text-sm font-medium text-foreground tabular">{value}</div>
      </div>
    </div>
  );
}

/** Horizontal row of inline stats separated by dividers. */
export function MetricRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-x-6 gap-y-3 divide-x divide-border [&>*]:pl-6 [&>*:first-child]:pl-0',
        className
      )}
    >
      {children}
    </div>
  );
}
