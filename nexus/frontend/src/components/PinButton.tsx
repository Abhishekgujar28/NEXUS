import { useCallback, useEffect, useState } from 'react';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PINNED_KEY = 'nexus:pinned-projects';

export function getPinnedProjects(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function setPinnedProjects(ids: string[]): void {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

export function togglePinnedProject(projectId: string): boolean {
  const pinned = getPinnedProjects();
  const isPinned = pinned.includes(projectId);
  const next = isPinned ? pinned.filter((id) => id !== projectId) : [...pinned, projectId];
  setPinnedProjects(next);
  window.dispatchEvent(new CustomEvent('nexus:pinned-changed'));
  return !isPinned;
}

export function PinButton({
  projectId,
  className,
  size = 'sm',
}: {
  projectId: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [pinned, setPinned] = useState(() => getPinnedProjects().includes(projectId));

  const sync = useCallback(() => {
    setPinned(getPinnedProjects().includes(projectId));
  }, [projectId]);

  useEffect(() => {
    sync();
    window.addEventListener('nexus:pinned-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('nexus:pinned-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [sync]);

  const handleClick = () => {
    setPinned(togglePinnedProject(projectId));
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={handleClick}
        aria-pressed={pinned}
        aria-label={pinned ? 'Unpin project' : 'Pin project'}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
          pinned && 'text-citrine-400 hover:text-citrine-300',
          className
        )}
      >
        <Pin className={cn(iconSize, pinned && 'fill-current')} />
      </TooltipTrigger>
      <TooltipContent side="bottom">{pinned ? 'Unpin' : 'Pin to sidebar'}</TooltipContent>
    </Tooltip>
  );
}
