import { Bot, MessageSquare } from 'lucide-react';
import { useCopilotStore } from '@/stores/copilot';

export function FloatingCopilotButton() {
  const { toggleOpen, isOpen, unreadCount } = useCopilotStore();

  return (
    <button
      onClick={toggleOpen}
      className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-citrine-400 text-background shadow-lg transition-all hover:scale-105 hover:bg-citrine-300 focus:outline-none ${
        isOpen ? 'ring-2 ring-citrine-400 ring-offset-2 ring-offset-background' : ''
      }`}
      title="NEXUS AI Copilot (Ctrl + /)"
    >
      <Bot className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
