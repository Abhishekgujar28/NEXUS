import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderPlus,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CommandMenu } from '@/components/CommandMenu';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/new', icon: FolderPlus, label: 'New Project' },
  { to: '/team', icon: Users, label: 'Team & Activity' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

/**
 * AppLayout — the application shell.
 *
 * Narrow icon rail on the left (56px). Expands to a 224px sidebar when
 * toggled. Topbar has search and profile. Content area fills the rest.
 *
 * The rail keeps vertical scan-distance short while dedicating maximum
 * horizontal space to the research workspace.
 */
export function AppLayout() {
  const [expanded, setExpanded] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out shrink-0',
          expanded ? 'w-56' : 'w-14'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-center border-b border-border px-3 shrink-0">
          {expanded ? (
            <span className="text-display text-lg tracking-display text-foreground">
              NEXUS
            </span>
          ) : (
            <span className="text-display text-lg tracking-display text-citrine-400">N</span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            const link = (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 h-9 text-sm transition-colors',
                  isActive
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {expanded ? <span className="truncate">{label}</span> : null}
              </NavLink>
            );

            if (!expanded) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}
        </nav>

        {/* Toggle */}
        <div className="border-t border-border p-2">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center justify-center w-full h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {expanded ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0">
          {/* Search — dispatches ⌘K to open CommandMenu */}
          <button
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true })
              )
            }
            className="flex items-center gap-2 h-8 rounded-md border border-border bg-surface-raised px-3 text-sm text-muted-foreground hover:border-foreground/20 transition-colors max-w-xs w-64"
            aria-label="Open command menu"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="truncate">Search projects…</span>
            <kbd className="ml-auto text-2xs bg-muted px-1.5 py-0.5 rounded border border-border font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                <Avatar name={user?.name} src={user?.avatar} size={28} />
                <span className="text-sm text-foreground hidden sm:inline">{user?.name}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-3.5 w-3.5" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-clay-400">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>

      {/* Command palette (⌘K) */}
      <CommandMenu />
    </div>
  );
}
