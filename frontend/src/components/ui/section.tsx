import * as React from 'react';
import { cn } from '@/lib/utils';

/** Section header — used inside pages / tabs. Editorial one-liner. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-5', className)}>
      <div>
        {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
        <h2 className="text-[19px] font-semibold tracking-tight leading-none">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** A dotted separator with an optional label — used to segment long lists. */
export function LabelledDivider({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-border" />
      {children ? (
        <span className="text-2xs uppercase tracking-widest text-muted-foreground">{children}</span>
      ) : null}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Vertical two-column key-value row, tabular numbers. */
export function KeyValue({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-[128px_1fr] items-baseline gap-3 py-1.5', className)}>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}
