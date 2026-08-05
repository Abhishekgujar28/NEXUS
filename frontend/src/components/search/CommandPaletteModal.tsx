import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Folder, Zap, Download, Settings, BookOpen, Layers } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Projects';
  icon: any;
  action: () => void;
}

export function CommandPaletteModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands: CommandItem[] = [
    {
      id: 'dash',
      title: 'Go to Dashboard',
      category: 'Navigation',
      icon: Layers,
      action: () => {
        navigate('/app');
        setOpen(false);
      },
    },
    {
      id: 'new-proj',
      title: 'Create New Research Project',
      category: 'Actions',
      icon: Zap,
      action: () => {
        navigate('/new');
        setOpen(false);
      },
    },
    {
      id: 'library',
      title: 'Research Library & Saved Reports',
      category: 'Navigation',
      icon: BookOpen,
      action: () => {
        navigate('/library');
        setOpen(false);
      },
    },
    {
      id: 'settings',
      title: 'Account & Workspace Settings',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        navigate('/settings');
        setOpen(false);
      },
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden bg-background border-border">
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search (Ctrl + K)..."
            className="w-full h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-citrine-400 shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
