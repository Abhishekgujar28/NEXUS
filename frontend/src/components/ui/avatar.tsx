import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, hueOf, initials } from '@/lib/utils';

export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const hue = hueOf(name ?? 'nexus');
  const bg = `hsl(${hue} 42% 24%)`;
  const fg = `hsl(${hue} 44% 82%)`;
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full border border-border',
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={name ?? ''}
          className="aspect-square h-full w-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback
        className="flex h-full w-full items-center justify-center text-[11px] font-medium tabular"
        style={{ backgroundColor: bg, color: fg }}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
