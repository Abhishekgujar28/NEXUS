import {
  BookOpen,
  Microscope,
  Lightbulb,
  Boxes,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProjectNavTab = '' | 'research' | 'insights' | 'build' | 'copilot';

const NAV_ITEMS: { key: ProjectNavTab; label: string; icon: LucideIcon }[] = [
  { key: '', label: 'Overview', icon: BookOpen },
  { key: 'research', label: 'Research', icon: Microscope },
  { key: 'insights', label: 'Insights', icon: Lightbulb },
  { key: 'build', label: 'Build', icon: Boxes },
  { key: 'copilot', label: 'Copilot', icon: MessageSquare },
];

export function ProjectNav({
  activeTab,
  onNavigate,
  className,
}: {
  activeTab: ProjectNavTab;
  onNavigate: (tab: ProjectNavTab) => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5 mb-6',
        className
      )}
      aria-label="Project sections"
    >
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key || 'overview'}
            type="button"
            onClick={() => onNavigate(key)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
              isActive
                ? 'bg-muted text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export { NAV_ITEMS as PROJECT_NAV_ITEMS };
