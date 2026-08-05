import { useState } from 'react';
import { Bell, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export function NotificationTray() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Research Engine Ready',
      message: 'System initialization completed. All 16+ search providers online.',
      createdAt: 'Just now',
      read: false,
    },
    {
      id: '2',
      title: 'Circuit Breaker Active',
      message: 'Provider health checks operating normally.',
      createdAt: '10m ago',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-citrine-400" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-background p-3 shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
            <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-citrine-400 hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Mark read
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-2.5 rounded-md text-xs transition-colors ${
                  n.read ? 'bg-transparent text-muted-foreground' : 'bg-muted/40 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground">{n.createdAt}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
