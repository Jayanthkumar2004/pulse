import { MessageCircle } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-white dark:bg-chat-dark-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-lift animate-pulse-soft">
          <MessageCircle className="h-8 w-8" />
        </div>
        <div className="flex gap-1.5">
          <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
          <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
          <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}
