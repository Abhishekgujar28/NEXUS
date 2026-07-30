import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Sparkles,
  Library,
  Activity,
  FolderPlus,
  Search,
  Settings,
  LogOut,
  ChevronDown,
  Pin,
  Folder,
} from 'lucide-react';
import { cn, truncate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { projectsService } from '@/lib/services';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CommandMenu } from '@/components/CommandMenu';
import { PageTransition } from '@/components/PageTransition';
import { LiveDot } from '@/components/LiveDot';
import { getPinnedProjects } from '@/components/PinButton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Project } from '@/types';

const MAIN_NAV = [
  { to: '/app', icon: Home, label: 'Home', end: true },
  { to: '/discoveries', icon: Sparkles, label: 'Discoveries' },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/team', icon: Activity, label: 'Activity' },
] as const;

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1.5">
      <span className="eyebrow">{children}</span>
    </div>
  );
}

function SidebarProjectLink({ project }: { project: Project }) {
  const location = useLocation();
  const path = `/projects/${project._id}`;
  const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
  const isResearching = project.status === 'researching';

  return (
    <NavLink
      to={path}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors min-w-0',
        isActive
          ? 'bg-muted text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      {isResearching ? (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-accent-pulse rounded-full bg-citrine-400/40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-citrine-400" />
        </span>
      ) : (
        <Folder className="h-3.5 w-3.5 shrink-0 opacity-60" />
      )}
      <span className="truncate">{truncate(project.title, 28)}</span>
    </NavLink>
  );
}

function SidebarPinnedLink({
  projectId,
  title,
}: {
  projectId: string;
  title: string;
}) {
  const location = useLocation();
  const path = `/projects/${projectId}`;
  const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <NavLink
      to={path}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors min-w-0',
        isActive
          ? 'bg-muted text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      <Pin className="h-3.5 w-3.5 shrink-0 text-citrine-400/80" />
      <span className="truncate">{truncate(title, 28)}</span>
    </NavLink>
  );
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => getPinnedProjects());

  const syncPinned = useCallback(() => {
    setPinnedIds(getPinnedProjects());
  }, []);

  useEffect(() => {
    syncPinned();
    window.addEventListener('nexus:pinned-changed', syncPinned);
    window.addEventListener('storage', syncPinned);
    return () => {
      window.removeEventListener('nexus:pinned-changed', syncPinned);
      window.removeEventListener('storage', syncPinned);
    };
  }, [syncPinned]);

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'sidebar'],
    queryFn: () => projectsService.list({ limit: 40 }),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((p) => p.status === 'researching') ? 5000 : false;
    },
  });

  const projects = projectsData?.items ?? [];

  const sidebarProjects = useMemo(() => {
    const researching = projects.filter((p) => p.status === 'researching');
    const rest = projects.filter((p) => p.status !== 'researching');
    const merged = [...researching, ...rest];
    const seen = new Set<string>();
    return merged.filter((p) => {
      if (seen.has(p._id)) return false;
      seen.add(p._id);
      return true;
    }).slice(0, 12);
  }, [projects]);

  const pinnedProjects = useMemo(
    () =>
      pinnedIds
        .map((id) => {
          const project = projects.find((p) => p._id === id);
          return project ? { id, title: project.title } : null;
        })
        .filter((p): p is { id: string; title: string } => p !== null),
    [pinnedIds, projects]
  );

  const hasActiveResearch = projects.some((p) => p.status === 'researching');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openCommandMenu = () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true })
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-60 min-h-0 shrink-0 flex-col border-r border-border bg-surface">
        <div className="shrink-0 border-b border-border px-4 py-4">
          <span className="text-display text-lg tracking-display text-foreground">NEXUS</span>
        </div>

        <div className="shrink-0 space-y-2 border-b border-border p-3">
          <Button
            variant="primary"
            size="md"
            className="w-full justify-start"
            onClick={() => navigate('/new')}
          >
            <FolderPlus className="h-4 w-4" />
            New Research
          </Button>
          <button
            type="button"
            onClick={openCommandMenu}
            className="flex h-8 w-full items-center gap-2 rounded-md border border-border bg-surface-raised px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
            aria-label="Open command menu"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Search…</span>
            <kbd className="ml-auto text-2xs rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="space-y-0.5 px-2 py-2">
            {MAIN_NAV.map(({ to, icon: Icon, label, ...rest }) => {
              const end = 'end' in rest ? rest.end : false;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              );
            })}
          </nav>

          {sidebarProjects.length > 0 ? (
            <div className="px-2 pb-2">
              <SidebarSectionLabel>
                <span className="flex items-center gap-2">
                  Projects
                  {hasActiveResearch ? <LiveDot pulse label="" className="scale-90" /> : null}
                </span>
              </SidebarSectionLabel>
              <div className="space-y-0.5">
                {sidebarProjects.map((project) => (
                  <SidebarProjectLink key={project._id} project={project} />
                ))}
              </div>
            </div>
          ) : null}

          {pinnedProjects.length > 0 ? (
            <div className="px-2 pb-2">
              <SidebarSectionLabel>Pinned</SidebarSectionLabel>
              <div className="space-y-0.5">
                {pinnedProjects.map(({ id, title }) => (
                  <SidebarPinnedLink key={id} projectId={id} title={title} />
                ))}
              </div>
            </div>
          ) : null}
        </ScrollArea>

        <div className="shrink-0 border-t border-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted">
              <Avatar name={user?.name} src={user?.avatar} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">Settings</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
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
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname} className="min-h-full">
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      <CommandMenu />
    </div>
  );
}
