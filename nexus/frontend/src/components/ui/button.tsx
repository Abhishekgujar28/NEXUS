import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Buttons. Five variants tuned for the editorial dark surface:
 *  - primary: filled citrine — the *one* action per screen
 *  - default: subtle ink surface with border — most calls-to-action
 *  - ghost: text-only, hover-lit — nav / low-emphasis
 *  - outline: emphasized border, transparent fill
 *  - destructive: clay for irreversible actions
 */
const buttonStyles = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'transition-[background,color,border-color,box-shadow,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-citrine-400 text-ink-900 hover:bg-citrine-300 active:bg-citrine-400 shadow-card',
        default:
          'bg-surface-raised text-foreground border border-border hover:bg-muted hover:border-muted-foreground/30',
        ghost:
          'text-foreground/80 hover:text-foreground hover:bg-muted',
        outline:
          'border border-foreground/20 text-foreground hover:border-foreground/40 hover:bg-muted/40',
        destructive:
          'bg-clay-500 text-white hover:bg-clay-600',
        link: 'text-citrine-400 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-9 px-4 text-sm rounded-md',
        lg: 'h-11 px-5 text-sm rounded-lg',
        icon: 'h-9 w-9 rounded-md',
        'icon-sm': 'h-8 w-8 rounded-md',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonStyles({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin mr-2"
          />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
