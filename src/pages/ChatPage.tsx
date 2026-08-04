import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Video,
  Search,
  MoreVertical,
  Pin,
  BellOff,
  Archive,
  Trash2,
  UserX,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast'; 
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  fetchMessages,
  sendTextMessage,
  sendMediaMessage,
  editMessage,
  deleteForMe,
  deleteForEveryone,
  clearChatForMe,
  toggleStar,
  toggleReaction,
  searchMessagesInConversation,
} from '@/services/message.service';
import {
  getDirectOtherMember,
  markConversationRead,
  togglePinConversation,
  setMuted,
  setArchived,
} from '@/services/conversation.service';
import { fetchStarredMessages } from '@/services/message.service';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { usePresence } from '@/hooks/usePresence';
import { useTyping, useOtherTyping } from '@/hooks/useTyping';
import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatPresence, formatDateDivider, isSameDay } from '@/lib/format';
import type { Message, Conversation, Profile } from '@/types';
import { cn } from '@/lib/utils';

export function ChatPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setActiveConversation } = useGlobalNotifications();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerOther, setHeaderOther] = useState<Profile | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

const scrollRef = useRef<HTMLDivElement>(null);
  const oldestDate = useRef<string | null>(null);
  const previousMessageCount = useRef(0);
  const isNearBottomRef = useRef(true);
  const clearedAtRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  }, []);

  const handleViewportScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 240;
  }, []);

  // Load conversation details
  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setHeaderOther(null);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (active && data) setConversation(data as Conversation);

      if (data?.type === 'direct' && user) {
        const other = await getDirectOtherMember(conversationId, user.id);
        if (active) setHeaderOther(other);
      }

      // Pinned / muted state
      if (user) {
        const { data: pin } = await supabase
          .from('pinned_chats')
          .select('conversation_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (active) setIsPinned(!!pin);

        const { data: mem } = await supabase
          .from('conversation_members')
          .select('muted, archived')
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (active) {
          setIsMuted(mem?.muted ?? false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [conversationId, user]);

  // Presence tracking for the other participant
  const otherPresence = usePresence(headerOther?.id ?? null);

  // Typing
  const { setTyping } = useTyping(conversationId ?? null, user?.id ?? null);
  const otherTyping = useOtherTyping(conversationId ?? null, headerOther?.id ?? null);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const data = await fetchMessages(conversationId);
    setMessages(data.reverse());
    setHasMore(data.length >= 30);
    if (data.length > 0) oldestDate.current = data[data.length - 1].created_at;
    requestAnimationFrame(() => scrollToBottom('auto'));
}, [conversationId, scrollToBottom]);

  useEffect(() => {
    setActiveConversation(conversationId ?? null);
    if (conversationId) {
      setMessages([]);
      loadMessages();
      markConversationRead(conversationId).catch(() => undefined);
    }
  }, [conversationId, loadMessages, setActiveConversation]);

  useEffect(() => {
    if (!conversationId) return;

    let active = true;
    const syncLatestMessages = async () => {
      try {
        const data = await fetchMessages(conversationId);
        if (!active) return;
        const nextMessages = data.reverse();
        setMessages((prev) => {
          const existingIds = new Set(prev.map((msg) => msg.id));
          const additions = nextMessages.filter((msg) => !existingIds.has(msg.id));
          if (additions.length === 0) return prev;
          return [...prev, ...additions].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        qc.invalidateQueries({ queryKey: ['conversations', user?.id] });
      } catch {
        // Ignore polling failures and keep the current view intact.
      }
    };

void syncLatestMessages();
    const interval = window.setInterval(() => {
      // Skip polling for a short window after clearing so old messages
      // already hidden in deleted_messages don't flash back in.
      if (clearedAtRef.current && Date.now() - clearedAtRef.current < 12000) {
        return;
      }
      void syncLatestMessages();
    }, 4000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncLatestMessages();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [conversationId, qc, user?.id]);

  useEffect(() => {
    if (messages.length === 0) {
      previousMessageCount.current = 0;
      return;
    }

    const shouldAutoScroll = previousMessageCount.current === 0 || isNearBottomRef.current;
    if (shouldAutoScroll) {
      scrollToBottom('smooth');
    }
    previousMessageCount.current = messages.length;
  }, [messages, scrollToBottom]);

  // Starred state
  const { data: starred = [] } = useQuery({
    queryKey: ['starred'],
    queryFn: fetchStarredMessages,
    enabled: !!user,
  });
  const starredIds = useMemo(
    () => new Set((starred as unknown as { message_id: string }[]).map((s) => s.message_id)),
    [starred]
  );

// Realtime message handlers
  const handleNewMessage = useCallback(
    (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Mark as delivered/read if from other user
      if (msg.sender_id !== user?.id && conversationId) {
        supabase.rpc('mark_message_delivered', { p_message_id: msg.id });
        if (document.visibilityState === 'visible') {
          supabase.rpc('mark_message_read', { p_message_id: msg.id });
          markConversationRead(conversationId).catch(() => undefined);
        }
      }
      // Notifications are handled globally by useGlobalNotifications.
      if (isNearBottomRef.current || msg.sender_id === user?.id) {
        scrollToBottom('smooth');
      }
      qc.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
    [user?.id, conversationId, qc, scrollToBottom]
  );

  const handleUpdate = useCallback((msg: Message) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
  }, []);

  const handleDelete = useCallback((msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  }, []);

  useRealtimeMessages({
    conversationId: conversationId ?? null,
    onMessage: handleNewMessage,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    enabled: !!conversationId,
  });

  // Load more (infinite scroll up)
  const loadMore = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore) return;
    const el = scrollRef.current;
    if (!el) return;
    const prevHeight = el.scrollHeight;
    setLoadingMore(true);
    const older = await fetchMessages(conversationId, oldestDate.current || undefined);
    if (older.length === 0) {
      setHasMore(false);
    } else {
      setMessages((prev) => [...older.reverse(), ...prev]);
      if (older.length < 30) setHasMore(false);
      oldestDate.current = older[older.length - 1].created_at;
      // Maintain scroll position
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    }
    setLoadingMore(false);
  }, [conversationId, loadingMore, hasMore]);

// Send handlers
  const handleSendText = useCallback(
    async (text: string) => {
      if (!conversationId) return;
      try {
        const msg = await sendTextMessage(conversationId, text, replyTo?.id);
        // Optimistically add the message sent by the server response so the
        // bubble appears immediately instead of waiting for the realtime event.
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setReplyTo(null);
        setTyping(false);
        scrollToBottom('smooth');
      } catch {
        toast.error('Failed to send message');
      }
    },
    [conversationId, replyTo, setTyping, scrollToBottom]
  );

  const handleSendMedia = useCallback(
    async (file: File, caption: string | null) => {
      if (!conversationId) return;
      try {
        const msg = await sendMediaMessage(conversationId, file, caption, replyTo?.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setReplyTo(null);
        scrollToBottom('smooth');
        toast.success('File sent');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed');
      }
    },
    [conversationId, replyTo]
  );

  const handleSendVoice = useCallback(
    async (file: File) => {
      if (!conversationId) return;
      try {
        const msg = await sendMediaMessage(conversationId, file, null, replyTo?.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setReplyTo(null);
        scrollToBottom('smooth');
      } catch {
        toast.error('Voice note failed');
      }
    },
    [conversationId, replyTo]
  );

  const handleSubmitEdit = useCallback(
    async (text: string) => {
      if (!editing) return;
      try {
        await editMessage(editing.id, text);
        setEditing(null);
        toast.success('Message edited');
      } catch {
        toast.error('Edit failed');
      }
    },
    [editing]
  );

  const handleCopy = useCallback((m: Message) => {
    if (m.body) {
      navigator.clipboard.writeText(m.body);
      toast.success('Copied');
    }
  }, []);

  const handleDeleteForMe = useCallback(
    async (m: Message) => {
      try {
        await deleteForMe(m.id);
        handleDelete(m.id);
        toast.success('Deleted for you');
      } catch {
        toast.error('Delete failed');
      }
    },
    [handleDelete]
  );

  const handleDeleteForEveryone = useCallback(
    async (m: Message) => {
      try {
        await deleteForEveryone(m.id);
        toast.success('Deleted for everyone');
      } catch {
        toast.error('Delete failed');
      }
    },
    []
  );

  const handleStar = useCallback(
    async (m: Message) => {
      const isStarred = starredIds.has(m.id);
      try {
        await toggleStar(m.id, !isStarred);
        qc.invalidateQueries({ queryKey: ['starred'] });
        toast.success(isStarred ? 'Unstarred' : 'Starred');
      } catch {
        toast.error('Failed');
      }
    },
    [starredIds, qc]
  );

  const handleReact = useCallback(
    async (m: Message, emoji: string) => {
      const existing = m.reactions?.find((r) => r.user_id === user?.id && r.emoji === emoji);
      try {
        await toggleReaction(m.id, emoji, !existing);
      } catch {
        toast.error('Reaction failed');
      }
    },
    [user?.id]
  );

  const handleForward = useCallback((m: Message) => {
    toast('Forwarding: search for a user in the sidebar, then open their chat and paste.', {
      icon: '↗️',
    });
    if (m.body) navigator.clipboard.writeText(m.body).catch(() => undefined);
  }, []);

  // Pin / mute / archive
  const handlePin = useCallback(async () => {
    if (!conversationId) return;
    try {
      await togglePinConversation(conversationId, !isPinned);
      setIsPinned((p) => !p);
      qc.invalidateQueries({ queryKey: ['conversations', user?.id] });
      setMenuOpen(false);
    } catch {
      toast.error('Failed');
    }
  }, [conversationId, isPinned, qc, user?.id]);

  const handleMute = useCallback(async () => {
    if (!conversationId) return;
    try {
      await setMuted(conversationId, !isMuted);
      setIsMuted((m) => !m);
      setMenuOpen(false);
      toast.success(isMuted ? 'Notifications enabled' : 'Notifications muted');
    } catch {
      toast.error('Failed');
    }
  }, [conversationId, isMuted]);

  const handleArchive = useCallback(async () => {
    if (!conversationId) return;
    try {
      await setArchived(conversationId, true);
      qc.invalidateQueries({ queryKey: ['conversations', user?.id] });
      setMenuOpen(false);
      toast.success('Chat archived');
      navigate('/chats');
    } catch {
      toast.error('Failed');
    }
  }, [conversationId, qc, user?.id, navigate]);

const handleClearChat = useCallback(async () => {
    if (!conversationId) return;
    try {
      await clearChatForMe(conversationId);
      setMessages([]);
      clearedAtRef.current = Date.now();
      qc.invalidateQueries({ queryKey: ['conversations', user?.id] });
      setMenuOpen(false);
      toast.success('Chat cleared');
    } catch {
      toast.error('Failed to clear chat');
    }
  }, [conversationId, qc, user?.id]);

  const handleDeleteContact = useCallback(async () => {
    if (!conversationId) return;
    try {
      await setArchived(conversationId, true);
      qc.invalidateQueries({ queryKey: ['conversations', user?.id] });
      setMenuOpen(false);
      toast.success('Contact removed');
      navigate('/chats');
    } catch {
      toast.error('Failed to remove contact');
    }
  }, [conversationId, qc, user?.id, navigate]);

  // Search in chat
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const handleSearch = useCallback(async (term: string) => {
    if (!conversationId || !term.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchMessagesInConversation(conversationId, term);
    setSearchResults(results);
    setSearchIndex(0);
    if (results.length > 0) {
      const target = results[0];
      document.getElementById(`msg-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [conversationId]);

  const navigateSearch = (dir: 1 | -1) => {
    if (searchResults.length === 0) return;
    const next = (searchIndex + dir + searchResults.length) % searchResults.length;
    setSearchIndex(next);
    document.getElementById(`msg-${searchResults[next].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Empty state — no conversation selected (desktop)
  if (!conversationId) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center chat-bg gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-light text-chat-bubbleText dark:text-chat-dark-bubbleText">
          Pulse for Web
        </h2>
        <p className="max-w-sm text-center text-sm text-chat-muted px-6">
          Select a conversation to start messaging, or search for a username to begin a new chat.
        </p>
      </div>
    );
  }

  const displayName = headerOther?.full_name || headerOther?.username || 'Chat';
  const presenceText = otherTyping
    ? 'typing...'
    : formatPresence(
        otherPresence?.is_online ?? headerOther?.is_online ?? false,
        otherPresence?.last_seen ?? headerOther?.last_seen,
        headerOther?.last_seen_visible
      );

  return (
    <div className="flex h-full w-full flex-col chat-bg">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 sm:px-4 h-16 shrink-0 bg-chat-panel dark:bg-chat-dark-panel border-b border-chat-border dark:border-chat-dark-border">
        <button
          onClick={() => navigate('/chats')}
          className="md:hidden rounded-full p-1.5 text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link to={`/profile/${headerOther?.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={headerOther?.avatar_url}
            name={displayName}
            size={40}
            online={otherPresence?.is_online ?? headerOther?.is_online}
            showStatus
          />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-chat-bubbleText dark:text-chat-dark-bubbleText">
              {displayName}
            </h2>
            <p
              className={cn(
                'truncate text-xs',
                otherTyping ? 'text-accent' : 'text-chat-muted'
              )}
            >
              {presenceText}
            </p>
          </div>
</Link>
        <div className="flex items-center gap-0.5">
          {/* Call buttons hidden on small screens to avoid crowding */}
          <button className="hidden sm:flex rounded-full p-2 text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5" title="Video call">
            <Video className="h-5 w-5" />
          </button>
          <button className="hidden sm:flex rounded-full p-2 text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5" title="Voice call">
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={() => setSearchOpen((s) => !s)}
            className="rounded-full p-2 text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5"
            title="Search in chat"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((m) => !m)}
              className="rounded-full p-2 text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="fixed right-3 top-16 z-30 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-black/10 bg-white p-1 shadow-lift dark:border-white/10 dark:bg-chat-dark-bubble sm:fixed sm:right-auto sm:top-auto sm:absolute sm:right-0 sm:top-full sm:mt-1">
                <MenuRow icon={<Pin className="h-4 w-4" />} label={isPinned ? 'Unpin chat' : 'Pin chat'} onClick={() => { handlePin(); setMenuOpen(false); }} />
                <MenuRow icon={<BellOff className="h-4 w-4" />} label={isMuted ? 'Unmute' : 'Mute notifications'} onClick={() => { handleMute(); setMenuOpen(false); }} />
                <MenuRow icon={<Trash2 className="h-4 w-4" />} label="Clear chat" onClick={() => { handleClearChat(); setMenuOpen(false); }} />
                <MenuRow icon={<UserX className="h-4 w-4" />} label="Delete contact" onClick={() => { handleDeleteContact(); setMenuOpen(false); }} />
                <MenuRow icon={<Archive className="h-4 w-4" />} label="Archive chat" onClick={() => { handleArchive(); setMenuOpen(false); }} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* In-chat search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-chat-panel dark:bg-chat-dark-panel border-b border-chat-border dark:border-chat-dark-border animate-slide-down">
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleSearch(e.target.value);
            }}
            className="h-9"
            autoFocus
          />
          {searchResults.length > 0 && (
            <>
              <span className="text-xs text-chat-muted whitespace-nowrap">
                {searchIndex + 1}/{searchResults.length}
              </span>
              <button onClick={() => navigateSearch(-1)} className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => navigateSearch(1)} className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <button onClick={() => { setSearchOpen(false); setSearchTerm(''); setSearchResults([]); }} className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          handleViewportScroll();
          if (e.currentTarget.scrollTop < 50 && hasMore) loadMore();
        }}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-3"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
        {messages.length === 0 ? (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title="No messages yet"
            description="Say hello to start the conversation."
          />
        ) : (
          <MessageList
            messages={messages}
            user={user}
            starredIds={starredIds}
            onReply={setReplyTo}
            onEdit={setEditing}
            onDeleteForMe={handleDeleteForMe}
            onDeleteForEveryone={handleDeleteForEveryone}
            onForward={handleForward}
            onStar={handleStar}
            onCopy={handleCopy}
            onReact={handleReact}
          />
        )}
      </div>

      {/* Composer */}
      <MessageComposer
        onSendText={handleSendText}
        onSendMedia={handleSendMedia}
        onSendVoice={handleSendVoice}
        onTyping={setTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSubmitEdit={handleSubmitEdit}
      />
    </div>
  );
}

function MessageList({
  messages,
  user,
  starredIds,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
  onStar,
  onCopy,
  onReact,
}: {
  messages: Message[];
  user: { id: string } | null;
  starredIds: Set<string>;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDeleteForMe: (m: Message) => void;
  onDeleteForEveryone: (m: Message) => void;
  onForward: (m: Message) => void;
  onStar: (m: Message) => void;
  onCopy: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
}) {
  let lastDate = '';
  let lastSender = '';

  return (
    <>
      {messages.map((m, i) => {
        const showDate = !isSameDay(m.created_at, lastDate) || lastDate === '';
        if (showDate) lastDate = m.created_at;
        const showAvatar = m.sender_id !== lastSender;
        lastSender = m.sender_id;
        const isMine = m.sender_id === user?.id;
        const replyToMsg = m.reply_to_id
          ? messages.find((mm) => mm.id === m.reply_to_id)
          : undefined;

        return (
          <div key={m.id} id={`msg-${m.id}`}>
            {showDate && (
              <div className="flex justify-center my-3">
                <span className="rounded-lg bg-black/5 dark:bg-white/10 px-3 py-1 text-xs font-medium text-chat-muted shadow-sm">
                  {formatDateDivider(m.created_at)}
                </span>
              </div>
            )}
            <MessageBubble
              message={m}
              isMine={isMine}
              showAvatar={showAvatar}
              user={user as never}
              onReply={onReply}
              onEdit={onEdit}
              onDeleteForMe={onDeleteForMe}
              onDeleteForEveryone={onDeleteForEveryone}
              onForward={onForward}
              onStar={onStar}
              onCopy={onCopy}
              onReact={onReact}
              isStarred={starredIds.has(m.id)}
              replyTo={replyToMsg}
            />
          </div>
        );
      })}
    </>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-chat-bubbleText dark:text-chat-dark-bubbleText hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
