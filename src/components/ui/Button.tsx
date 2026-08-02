import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-600 active:bg-accent-700 shadow-soft',
  secondary:
    'bg-chat-bubble dark:bg-chat-dark-bubble text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-gray-50 dark:hover:bg-white/5',
  ghost:
    'text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5',
  danger: 'bg-error text-white hover:bg-red-600 shadow-soft',
  outline:
    'border border-chat-border dark:border-chat-dark-border text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading, children, disabled, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
