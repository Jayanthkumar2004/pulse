import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-chat-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-11 w-full rounded-xl border bg-white dark:bg-chat-dark-input px-3.5 text-sm text-chat-bubbleText dark:text-chat-dark-bubbleText placeholder:text-chat-muted transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent',
              icon && 'pl-10',
              error && 'border-error focus:ring-error/30',
              !error && 'border-chat-border dark:border-chat-dark-border',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-error">{error}</p>
        ) : hint ? (
          <p className="text-xs text-chat-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border bg-white dark:bg-chat-dark-input px-3.5 py-2.5 text-sm text-chat-bubbleText dark:text-chat-dark-bubbleText placeholder:text-chat-muted transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none',
            error ? 'border-error' : 'border-chat-border dark:border-chat-dark-border',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
