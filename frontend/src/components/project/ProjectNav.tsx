import { NavLink } from 'react-router-dom';
import { LayoutGrid, Microscope, Lightbulb, Hammer, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProjectNavItem {
  /** Path segment relative to the project base; '' is Overview. */
  key: string;
  label: string;
  icon: LucideIcon;
}

/** The collapsed 5-item project sub-nav (12 legacy tabs group into these). */
export const PROJECT_NAV: ProjectNavItem[] = [
  { key: '', label: 'Overview', icon: LayoutGrid },
  { key: 'research', label: 'Research', icon: Microscope },
  { key: 'insights', label: 'Insights', icon: Lightbulb },
  { key: 'build', label: 'Build', icon: Hammer },
  { key: 'copilot', label: 'Copilot', icon: MessageSquare },
];

/**
 * ProjectNav — segmented sub-nav for a project. Hairline underline, citrine
 * active marker. Rendered once by ProjectPage (Stage 3), not per tab.
 */
export function ProjectNav({
  basePath,
  className,
}: {
  basePath: string;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        'flex items-stretch gap-0.5 border-b border-border overflow-x-auto no-scrollbar',
        className
      )}
    >
      {PROJECT_NAV.map(({ key, label, icon: Icon }) => (
        <NavLink
          key={key || 'overview'}
          to={key ? `${basePath}/${key}` : basePath}
          end={key === ''}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors -mb-px',
              isActive
                ? 'border-citrine-400 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )
          }
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
