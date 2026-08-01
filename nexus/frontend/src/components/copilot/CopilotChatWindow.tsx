import { useState, useRef, useEffect } from 'react';
import { Bot, X, Minus, Send, Sparkles } from 'lucide-react';
import { useCopilotStore, ChatMessage } from '@/stores/copilot';
import { Button } from '@/components/ui/button';

export function CopilotChatWindow() {
  const { isOpen, isMinimized, toggleOpen, toggleMinimize, messages, addMessage } =
    useCopilotStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleOpen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userText,
      createdAt: new Date(),
    };
    addMessage(userMsg);
    setLoading(true);

    // Simulate copilot response (integrated with backend in active project views)
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: `I analyzed your query regarding "${userText}". Based on the project evidence and system architecture, I recommend deploying decoupled workers with Redis caching for optimum scalability.`,
        createdAt: new Date(),
      };
      addMessage(assistantMsg);
      setLoading(false);
    }, 800);
  };

  return (
    <div
      className={`fixed bottom-20 right-6 z-50 flex flex-col rounded-xl border border-border bg-background shadow-2xl transition-all ${
        isMinimized ? 'h-14 w-80 overflow-hidden' : 'h-[500px] w-[380px]'
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4 bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-citrine-400" />
          <span className="text-sm font-semibold text-foreground">NEXUS Copilot</span>
          <span className="text-[10px] text-citrine-400 font-mono bg-citrine-400/10 px-1.5 py-0.5 rounded">
            AI
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMinimize}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={toggleOpen}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-citrine-400 text-background font-medium'
                      : 'bg-muted/50 border border-border text-foreground'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                <Sparkles className="h-3 w-3 animate-spin text-citrine-400" /> Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Copilot (Ctrl + /)..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="h-7 w-7 p-0 text-citrine-400 hover:text-citrine-300"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
