import { Toaster as Sonner } from 'sonner';

/**
 * Toaster — configured to match the NEXUS surface palette.
 * Positioned bottom-right so it doesn't obscure primary content.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      theme="dark"
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group bg-surface-raised text-foreground border border-border shadow-pop rounded-md',
          title: 'text-sm font-medium',
          description: 'text-xs text-muted-foreground',
          actionButton: 'bg-citrine-400 text-ink-900 text-xs font-medium',
          cancelButton: 'text-muted-foreground text-xs',
        },
      }}
    />
  );
}
