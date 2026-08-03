import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  MessageCircle,
  Settings,
  Star,
  Archive,
  Pin,
  X,
  UserSearch,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fetchConversations } from '@/services/conversation.service';
import { searchUsersByUsername } from '@/services/profile.service';
import { getOrCreateDirectConversation } from '@/services/conversation.service';
import { useDebounce } from '@/hooks/useDebounce';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatListTime, formatPresence } from '@/lib/format';
import type { ConversationWithMeta, Profile } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function ChatSidebar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const debouncedSearch = useDebounce(search, 350);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // User search
  useEffect(() => {
    if (!debouncedSearch.trim() || !user) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    searchUsersByUsername(debouncedSearch, user.id)
      .then((results) => {
        if (active) setSearchResults(results);
      })
      .catch(() => {
        if (active) setSearchResults([]);
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, user]);

  // Realtime: refresh conversation list when messages change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('sidebar-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => qc.invalidateQueries({ queryKey: ['conversations', user.id] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pinned_chats' },
        () => qc.invalidateQueries({ queryKey: ['conversations', user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const activeConversationId = location.pathname.match(/\/chats\/(.+)/)?.[1];

  const pinned = conversations.filter((c) => c.is_pinned);
  const regular = conversations.filter((c) => !c.is_pinned && !c.is_archived);

  const startChatWithUser = async (otherUser: Profile) => {
    if (!user) return;
    try {
      const convId = await getOrCreateDirectConversation(otherUser.id);
      setSearch('');
      navigate(`/chats/${convId}`);
      qc.invalidateQueries({ queryKey: ['conversations', user.id] });
    } catch {
      toast.error('Could not start conversation');
    }
  };

  const showSearch = search.trim().length > 0;
  const visibleSearchResults = searchResults.filter((profile) => profile.id !== user?.id);

  return (
    <div className="flex h-full flex-col bg-chat-panel dark:bg-chat-dark-panel">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-16 shrink-0 bg-chat-panel dark:bg-chat-dark-panel">
        <h1 className="text-xl font-bold text-chat-bubbleText dark:text-chat-dark-bubbleText">
          Chats
        </h1>
        <div className="flex items-center gap-1">
          <Link
            to="/starred"
            className="rounded-full p-2 text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Starred messages"
          >
            <Star className="h-5 w-5" />
          </Link>
          <Link
            to="/settings"
            className="rounded-full p-2 text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-chat-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username (e.g. @jayanth)"
            className="h-10 w-full rounded-xl bg-black/5 dark:bg-white/5 pl-9 pr-9 text-sm text-chat-bubbleText dark:text-chat-dark-bubbleText placeholder:text-chat-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-chat-muted hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {showSearch ? (
          <SearchResults
            results={visibleSearchResults}
            searching={searching}
            onSelect={startChatWithUser}
          />
        ) : isLoading ? (
          <ConversationSkeletons />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-7 w-7" />}
            title="No conversations yet"
            description="Search for a username above to start chatting with anyone."
          />
        ) : (
          <div className="flex flex-col">
            {pinned.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-chat-muted">
                  <Pin className="h-3 w-3" /> Pinned
                </div>
                {pinned.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    active={c.id === activeConversationId}
                    selfId={user!.id}
                  />
                ))}
                <div className="mx-4 my-1 border-t border-chat-border dark:border-chat-dark-border" />
              </>
            )}
            {regular.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeConversationId}
                selfId={user!.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-chat-border dark:border-chat-dark-border px-3 py-2 pb-safe">
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="flex flex-1 items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name || profile?.username}
              size={36}
              online
              showStatus
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText">
                {profile?.full_name || profile?.username}
              </p>
              <p className="truncate text-xs text-chat-muted">
                @{profile?.username}
              </p>
            </div>
          </Link>
          <button
            onClick={() => signOut()}
            className="rounded-xl px-3 py-2 text-sm font-medium text-chat-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Log out
          </button>
        </div>
      </footer>
    </div>
  );
}

function SearchResults({
  results,
  searching,
  onSelect,
}: {
  results: Profile[];
  searching: boolean;
  onSelect: (p: Profile) => void;
}) {
  if (searching) {
    return (
      <div className="flex items-center justify-center py-10 text-chat-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <EmptyState
        icon={<UserSearch className="h-7 w-7" />}
        title="No user found"
        description="Try a different username. Search works with exact or partial matches."
      />
    );
  }
  return (
    <div className="flex flex-col">
      <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-chat-muted">
        People
      </div>
      {results.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
        >
          <Avatar
            src={p.avatar_url}
            name={p.full_name || p.username}
            size={44}
            online={p.is_online}
            showStatus
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText">
              @{p.username}
            </p>
            <p className="truncate text-xs text-chat-muted">
              {p.full_name || formatPresence(p.is_online, p.last_seen, p.last_seen_visible)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function ConversationItem({
  conversation,
  active,
  selfId,
}: {
  conversation: ConversationWithMeta;
  active: boolean;
  selfId: string;
}) {
  const navigate = useNavigate();
  const other = conversation.other_member;
  const lastMsg = conversation.last_message;
  const isMine = lastMsg?.sender_id === selfId;

  let preview = 'No messages yet';
  if (lastMsg) {
    if (lastMsg.deleted_for_everyone) preview = 'This message was deleted';
    else if (lastMsg.message_type === 'image') preview = 'Photo';
    else if (lastMsg.message_type === 'video') preview = 'Video';
    else if (lastMsg.message_type === 'voice') preview = 'Voice message';
    else if (lastMsg.message_type === 'audio') preview = 'Audio';
    else if (lastMsg.message_type === 'file') preview = lastMsg.attachments?.[0]?.file_name || 'Document';
    else preview = lastMsg.body || '';
  }

  return (
    <button
      onClick={() => navigate(`/chats/${conversation.id}`)}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 transition-colors text-left w-full',
        active
          ? 'bg-accent/10'
          : 'hover:bg-black/5 dark:hover:bg-white/5'
      )}
    >
      <Avatar
        src={other?.avatar_url}
        name={other?.full_name || other?.username || 'Chat'}
        size={48}
        online={other?.is_online}
        showStatus
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-chat-bubbleText dark:text-chat-dark-bubbleText">
            {other?.full_name || `@${other?.username}` || 'Unknown'}
          </p>
          {lastMsg && (
            <span className="shrink-0 text-xs text-chat-muted">
              {formatListTime(lastMsg.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="truncate text-xs text-chat-muted">
            {isMine && lastMsg && <span className="text-chat-muted">You: </span>}
            {preview}
          </p>
          {(conversation.unread_count ?? 0) > 0 && (
            <span className="shrink-0 rounded-full bg-accent px-1.5 min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ConversationSkeletons() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-12 w-12 rounded-full bg-black/5 dark:bg-white/5 skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-black/5 dark:bg-white/5 skeleton" />
            <div className="h-2.5 w-3/4 rounded bg-black/5 dark:bg-white/5 skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}
