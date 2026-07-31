import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles, BookOpen } from 'lucide-react';
import { copilotService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import type { Project } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CopilotTab({ project }: { project: Project }) {
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);

  const { data: historyData } = useQuery({
    queryKey: ['copilot-history', project._id],
    queryFn: () => copilotService.history(project._id, conversationId),
  });
  const messages = historyData?.messages ?? [];

  const scrollToEnd = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToEnd, [messages]);

  const send = useMutation({
    mutationFn: (msg: string) => copilotService.chat(project._id, msg, conversationId),
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setInput('');
      qc.invalidateQueries({ queryKey: ['copilot-history', project._id] });
    },
    onError: (err) => console.error(apiErrorMessage(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || send.isPending) return;
    send.mutate(input.trim());
  };

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[400px] animate-fade-in">
      {/* Context indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 pb-3 border-b border-border">
        <BookOpen className="h-3 w-3" />
        Using context from <span className="text-foreground font-medium">{project.title}</span>
        {project.status === 'complete' && (
          <span className="text-moss-400">&middot; Research complete</span>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-citrine-400/10 text-citrine-400 mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">NEXUS Copilot</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Ask anything about your project. Copilot uses your research data, evidence,
              and architecture to give grounded answers.
            </p>

          </div>
        ) : (
          <div className="space-y-4 px-1">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-citrine-400/10 text-citrine-400">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-muted text-foreground'
                      : 'bg-surface-raised border border-border text-foreground/90'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            {send.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-citrine-400/10 text-citrine-400">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="bg-surface-raised border border-border rounded-lg px-4 py-3">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-border pt-3">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !send.isPending) send.mutate(input.trim());
              }
            }}
            placeholder="Ask about your project…"
            rows={1}
            className="w-full rounded-md border border-input bg-surface-raised px-3 py-2.5 pr-12 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/70"
          />
        </div>
        <Button type="submit" variant="primary" size="icon" disabled={!input.trim() || send.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
