import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// NOTE: the "live/in-progress" dot lives canonically at `@/components/LiveDot`.
// It is intentionally not re-defined here to keep a single source of truth.

/**
 * SectionHeader — editorial eyebrow + optional title/action.
 * Borderless by default: differentiate sections by rhythm, not boxes.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
        {title ? (
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        ) : null}
        {description ? (
          <p className="text-sm text-muted-foreground mt-1 max-w-prose">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Stat — a single inline, borderless metric. Number leads, label beneath.
 */
export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-xl font-semibold tabular tracking-tight text-foreground leading-none">
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1.5 truncate">{label}</div>
      {hint ? <div className="text-2xs text-muted-foreground/70 mt-0.5">{hint}</div> : null}
    </div>
  );
}

/**
 * MetricRow — a row of inline stats separated by whitespace (no cards).
 */
export function MetricRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start gap-x-10 gap-y-4', className)}>{children}</div>
  );
}
