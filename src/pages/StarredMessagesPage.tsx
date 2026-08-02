import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchStarredMessages, toggleStar } from '@/services/message.service';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMessageTime, formatRelative } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import type { Message } from '@/types';

export function StarredMessagesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: starred = [], isLoading } = useQuery({
    queryKey: ['starred'],
    queryFn: fetchStarredMessages,
    enabled: !!user,
  });

  const unstar = async (messageId: string) => {
    try {
      await toggleStar(messageId, false);
      qc.invalidateQueries({ queryKey: ['starred'] });
      toast.success('Removed from starred');
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-chat-panel dark:bg-chat-dark-panel">
      <header className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-chat-border dark:border-chat-dark-border">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5 text-chat-bubbleText dark:text-chat-dark-bubbleText" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-chat-bubbleText dark:text-chat-dark-bubbleText">
            Starred Messages
          </h1>
          <p className="text-xs text-chat-muted">{starred.length} starred</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : starred.length === 0 ? (
          <EmptyState
            icon={<Star className="h-7 w-7" />}
            title="No starred messages"
            description="Star important messages to find them here later."
          />
        ) : (
          <div className="flex flex-col">
            {(starred as unknown as { message_id: string; starred_at: string; message?: Message }[]).map((item) => {
              const msg = item.message;
              if (!msg) return null;
              return (
                <div
                  key={item.message_id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-chat-border dark:border-chat-dark-border hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <Avatar
                    src={msg.sender?.avatar_url}
                    name={msg.sender?.full_name || msg.sender?.username}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-chat-bubbleText dark:text-chat-dark-bubbleText">
                        {msg.sender?.full_name || msg.sender?.username}
                      </p>
                      <span className="shrink-0 text-xs text-chat-muted">
                        {formatRelative(item.starred_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-chat-muted line-clamp-2">
                      {msg.deleted_for_everyone
                        ? 'This message was deleted'
                        : msg.body || `[${msg.message_type}]`}
                    </p>
                    <p className="mt-1 text-xs text-chat-muted">
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => unstar(item.message_id)}
                    className="rounded-lg p-1.5 text-chat-muted hover:bg-error/5 hover:text-error transition-colors"
                    title="Remove star"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
