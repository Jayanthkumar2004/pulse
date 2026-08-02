import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = 'sm',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-white dark:bg-chat-dark-panel rounded-t-2xl sm:rounded-2xl shadow-lift animate-slide-up overflow-hidden',
          sizeClass,
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-chat-border dark:border-chat-dark-border">
            <h2 className="text-base font-semibold text-chat-bubbleText dark:text-chat-dark-bubbleText">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-chat-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[80vh] overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>,
    document.body
  );
}
