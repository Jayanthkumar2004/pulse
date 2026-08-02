import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-white dark:bg-chat-dark-bg text-center p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-lift">
        <MessageCircle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-chat-bubbleText dark:text-chat-dark-bubbleText">
        Page not found
      </h1>
      <p className="text-sm text-chat-muted">
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/chats"
        className="mt-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
      >
        Back to chats
      </Link>
    </div>
  );
}
