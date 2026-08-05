import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SegmentedItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** Optional trailing count / badge. */
  count?: number;
}

/**
 * Segmented — secondary, pill-style control used *inside* a grouped project
 * view (Research / Insights / Build) to switch between sub-sections. Visually
 * subordinate to the underline `ProjectNav` so the hierarchy reads: nav (top,
 * underline) → segmented (section, pills) → content.
 */
export function Segmented({
  items,
  value,
  onChange,
  className,
}: {
  items: SegmentedItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 overflow-x-auto no-scrollbar',
        className
      )}
    >
      {items.map(({ value: v, label, icon: Icon, count }) => {
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {label}
            {typeof count === 'number' ? (
              <span className={cn('tabular text-2xs', active ? 'text-citrine-400' : 'text-muted-foreground/70')}>
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
