import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ title: string; url: string }>;
  createdAt: Date;
}

interface CopilotState {
  isOpen: boolean;
  isMinimized: boolean;
  messages: ChatMessage[];
  unreadCount: number;
  toggleOpen: () => void;
  toggleMinimize: () => void;
  setOpen: (open: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
}

export const useCopilotStore = create<CopilotState>()((set) => ({
  isOpen: false,
  isMinimized: false,
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your NEXUS AI Research Copilot. Ask me anything about your project requirements, evidence, architecture, or roadmap!',
      createdAt: new Date(),
    },
  ],
  unreadCount: 0,

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen, isMinimized: false, unreadCount: 0 })),
  toggleMinimize: () => set((s) => ({ isMinimized: !s.isMinimized })),
  setOpen: (open) => set({ isOpen: open, isMinimized: false, unreadCount: 0 }),

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      unreadCount: !s.isOpen && msg.role === 'assistant' ? s.unreadCount + 1 : s.unreadCount,
    })),

  clearMessages: () => set({ messages: [] }),
}));
