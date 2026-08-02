import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${className || ''}`}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 text-chat-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-chat-bubbleText dark:text-chat-dark-bubbleText">
        {title}
      </h3>
      {description && (
        <p className="max-w-xs text-sm text-chat-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
