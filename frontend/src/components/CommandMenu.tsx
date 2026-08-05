import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  LayoutDashboard,
  FolderPlus,
  Settings,
  LogOut,
  Users,
  Folder,
  Play,
  Sparkles,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { projectsService } from '@/lib/services';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

/**
 * Global command palette. Open with ⌘K / Ctrl+K.
 * Fuzzy-searches across the user's projects and static navigation actions.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  // Only fetch projects when the palette opens — no wasted load
  const { data } = useQuery({
    queryKey: ['projects', 'palette'],
    queryFn: () => projectsService.list({ limit: 50 }),
    enabled: open,
    staleTime: 30_000,
  });
  const projects = data?.items ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2',
            'bg-surface-raised border border-border rounded-lg shadow-lg overflow-hidden',
            'animate-fade-in-up'
          )}
        >
          <DialogPrimitive.Title className="sr-only">Command menu</DialogPrimitive.Title>
          <Command className="w-full" label="Command menu" loop>
            <div className="flex items-center gap-2 px-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Command.Input
                placeholder="Search projects or run a command…"
                className="flex-1 h-11 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <kbd className="text-2xs bg-muted px-1.5 py-0.5 rounded border border-border font-mono text-muted-foreground">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-80 overflow-y-auto scrollbar-thin py-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matches.
              </Command.Empty>

              <Command.Group heading="Navigation" className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground">
                <CmdItem onSelect={() => go('/')} icon={<LayoutDashboard className="h-3.5 w-3.5" />}>
                  Dashboard
                </CmdItem>
                <CmdItem onSelect={() => go('/new')} icon={<FolderPlus className="h-3.5 w-3.5" />}>
                  New project
                </CmdItem>
                <CmdItem onSelect={() => go('/team')} icon={<Users className="h-3.5 w-3.5" />}>
                  Team &amp; activity
                </CmdItem>
                <CmdItem onSelect={() => go('/settings')} icon={<Settings className="h-3.5 w-3.5" />}>
                  Settings
                </CmdItem>
              </Command.Group>

              {projects.length > 0 && (
                <Command.Group
                  heading="Projects"
                  className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {projects.slice(0, 15).map((p) => (
                    <CmdItem
                      key={p._id}
                      value={`${p.title} ${p.description ?? ''}`}
                      onSelect={() => go(`/projects/${p._id}`)}
                      icon={
                        p.status === 'researching' ? (
                          <Play className="h-3.5 w-3.5 text-citrine-400" />
                        ) : p.status === 'complete' ? (
                          <Sparkles className="h-3.5 w-3.5 text-moss-400" />
                        ) : (
                          <Folder className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="ml-auto text-2xs text-muted-foreground shrink-0">
                        {p.status}
                      </span>
                    </CmdItem>
                  ))}
                </Command.Group>
              )}

              <Command.Group
                heading="Account"
                className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                <CmdItem onSelect={handleLogout} icon={<LogOut className="h-3.5 w-3.5" />}>
                  Sign out
                </CmdItem>
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CmdItem({
  children,
  onSelect,
  icon,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon?: React.ReactNode;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-2.5 px-2 py-2 mx-1 rounded-md text-sm text-foreground cursor-pointer',
        'aria-selected:bg-muted aria-selected:text-foreground',
        'data-[selected=true]:bg-muted data-[selected=true]:text-foreground',
        'transition-colors'
      )}
    >
      {icon}
      {children}
    </Command.Item>
  );
}
