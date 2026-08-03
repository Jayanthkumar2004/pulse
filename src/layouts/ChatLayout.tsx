import { Outlet, useLocation } from 'react-router-dom';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { cn } from '@/lib/utils';

/**
 * Two-pane WhatsApp-style shell with a single routed outlet. On desktop the
 * sidebar is a fixed column and the chat fills the remainder. On mobile, the
 * ChatPage renders as a full-screen overlay above the sidebar when a
 * conversation is open, and as a welcome placeholder otherwise — so only one
 * pane is ever visible on small screens.
 */
export function ChatLayout() {
  const location = useLocation();
  const isMobileFullScreen =
    location.pathname.startsWith('/chats/') ||
    location.pathname === '/settings' ||
    location.pathname === '/profile' ||
    location.pathname === '/starred';

  return (
    <div className="flex min-h-dvh w-full pt-safe bg-chat-panel dark:bg-chat-dark-panel">
      <aside
        className={cn(
          'sidebar-pane w-full shrink-0 border-r border-chat-border dark:border-chat-dark-border md:w-[380px] lg:w-[400px]',
          isMobileFullScreen && 'hidden md:flex'
        )}
      >
        <ChatSidebar />
      </aside>

      <main className={cn('chat-pane flex-1 min-w-0', !isMobileFullScreen && 'hidden md:flex')}>
        <Outlet />
      </main>
    </div>
  );
}
