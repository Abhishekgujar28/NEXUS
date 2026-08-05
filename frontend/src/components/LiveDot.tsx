import { cn } from '@/lib/utils';

export function LiveDot({
  className,
  pulse = true,
  label = 'Live',
}: {
  className?: string;
  pulse?: boolean;
  label?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {pulse ? (
          <span className="absolute inline-flex h-full w-full animate-accent-pulse rounded-full bg-citrine-400/40" />
        ) : null}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-citrine-400" />
      </span>
      {label ? <span className="mono-label text-citrine-400">{label}</span> : null}
    </span>
  );
}
