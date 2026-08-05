import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badges — informational chips. Small, quiet, semantic.
 * `tone` maps to meaning: neutral, accent (citrine), success (moss),
 * warning (amber), danger (clay), info (blue-ish through ink).
 */
const badgeStyles = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium leading-none border tabular',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-foreground/80 border-border',
        accent: 'bg-citrine-400/12 text-citrine-300 border-citrine-400/25',
        success: 'bg-moss-500/12 text-moss-400 border-moss-500/25',
        warning: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
        danger: 'bg-clay-500/12 text-clay-400 border-clay-500/25',
        outline: 'bg-transparent text-muted-foreground border-border',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-[11px] px-2 py-0.5',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone, size }), className)} {...props} />;
}
