import { memo, useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  MoreVertical,
  Reply,
  Pencil,
  Trash2,
  Copy,
  Star,
  Forward,
  Download,
  Smile,
} from 'lucide-react';
import type { Message } from '@/types';
import type { User } from '@supabase/supabase-js';
import { Avatar } from '@/components/ui/Avatar';
import { formatMessageTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { REACTION_EMOJIS } from '@/types';
import { AttachmentRenderer } from './AttachmentRenderer';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  user: User | null;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDeleteForMe: (m: Message) => void;
  onDeleteForEveryone: (m: Message) => void;
  onForward: (m: Message) => void;
  onStar: (m: Message) => void;
  onCopy: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  isStarred: boolean;
  replyTo?: Message;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
  showAvatar,
  user,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
  onStar,
  onCopy,
  onReact,
  isStarred,
  replyTo,
}: MessageBubbleProps) {
const [menuOpen, setMenuOpen] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !showReactions && !actionsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowReactions(false);
        setActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen, showReactions, actionsOpen]);

  if (message.deleted_for_everyone) {
    return (
      <div className={cn('flex px-3 my-0.5', isMine ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'max-w-[75%] rounded-xl px-3 py-2 text-sm italic text-chat-muted',
            isMine
              ? 'bg-accent/15 text-accent-700'
              : 'bg-chat-bubble dark:bg-chat-dark-bubble'
          )}
        >
          🚫 This message was deleted
          <span className="ml-2 text-[10px]">{formatMessageTime(message.created_at)}</span>
        </div>
      </div>
    );
  }

  const hasMedia = message.message_type !== 'text' && (message.attachments?.length ?? 0) > 0;
  const myReaction = message.reactions?.find((r) => r.user_id === user?.id);

  return (
    <div
      className={cn(
        'group flex px-3 my-0.5 gap-2',
        isMine ? 'justify-end' : 'justify-start'
      )}
    >
      {!isMine && (
        <div className="w-8 shrink-0 self-end">
          {showAvatar && (
            <Avatar
              src={message.sender?.avatar_url}
              name={message.sender?.full_name || message.sender?.username}
              size={32}
            />
          )}
        </div>
      )}

<div
        className="relative max-w-[82%] sm:max-w-[65%]"
        ref={menuRef}
        onClick={() => {
          // Tap-to-reveal actions on touch devices (no hover available)
          if (window.matchMedia('(hover: none)').matches) {
            setActionsOpen((o) => !o);
          }
        }}
      >
        {/* Reaction bar */}
        {showReactions && (
          <div className="absolute -top-9 left-0 z-10 flex gap-1 rounded-full bg-white dark:bg-chat-dark-bubble shadow-lift px-1.5 py-1 animate-scale-in">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message, emoji);
                  setShowReactions(false);
                }}
                className="rounded-full p-1 text-lg hover:bg-black/5 dark:hover:bg-white/10 transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            'rounded-xl px-3 py-2 shadow-sm relative',
            isMine
              ? 'bg-accent text-white rounded-tr-sm'
              : 'bg-chat-bubble dark:bg-chat-dark-bubble text-chat-bubbleText dark:text-chat-dark-bubbleText rounded-tl-sm',
            hasMedia && 'p-1'
          )}
        >
          {/* Reply preview */}
          {message.reply_to_id && replyTo && (
            <div
              className={cn(
                'mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs opacity-90',
                isMine ? 'border-white/70 bg-white/10' : 'border-accent bg-accent/10'
              )}
            >
              <p className={cn('font-semibold', isMine ? 'text-white' : 'text-accent')}>
                {replyTo.sender?.username || 'User'}
              </p>
              <p className="truncate">
                {replyTo.deleted_for_everyone
                  ? 'deleted message'
                  : replyTo.body || `[${replyTo.message_type}]`}
              </p>
            </div>
          )}

          {/* Media */}
          {hasMedia &&
            message.attachments!.map((att) => (
              <AttachmentRenderer key={att.id} attachment={att} isMine={isMine} />
            ))}

          {/* Text body */}
          {message.body && (
            <p
              className={cn(
                'text-sm whitespace-pre-wrap break-words',
                hasMedia && 'px-2 pt-1'
              )}
            >
              {linkify(message.body)}
            </p>
          )}

          {/* Footer: time + status */}
          <div
            className={cn(
              'flex items-center gap-1 mt-0.5',
              hasMedia && !message.body ? 'absolute bottom-1 right-2' : '',
              'justify-end'
            )}
          >
            {message.edited_at && (
              <span className={cn('text-[10px]', isMine ? 'text-white/70' : 'text-chat-muted')}>
                edited
              </span>
            )}
            {isStarred && (
              <Star className={cn('h-3 w-3 fill-current', isMine ? 'text-white/80' : 'text-warning')} />
            )}
            <span className={cn('text-[10px]', isMine ? 'text-white/70' : 'text-chat-muted')}>
              {formatMessageTime(message.created_at)}
            </span>
            {isMine && <StatusTicks message={message} />}
          </div>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn('flex gap-1 -mt-1', isMine ? 'justify-end pr-1' : 'justify-start pl-1')}>
            {aggregateReactions(message.reactions).map(({ emoji, count }) => (
              <span
                key={emoji}
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs shadow-sm',
                  myReaction?.emoji === emoji
                    ? 'bg-accent text-white'
                    : 'bg-chat-bubble dark:bg-chat-dark-bubble text-chat-bubbleText dark:text-chat-dark-bubbleText'
                )}
              >
                {emoji} {count > 1 && count}
              </span>
            ))}
          </div>
        )}

{/* Hover/tap actions */}
        <div
          className={cn(
            'absolute top-0 flex items-center gap-0.5',
            'z-10',
            'opacity-0 group-hover:opacity-100',
            'pointer-events-none group-hover:pointer-events-auto',
            'sm:opacity-0 sm:group-hover:opacity-100',
            actionsOpen && 'opacity-100 pointer-events-auto',
            isMine ? '-left-16' : '-right-16'
          )}
        >
          <button
            onClick={() => setShowReactions((s) => !s)}
            className="rounded-full p-1.5 bg-white dark:bg-chat-dark-bubble shadow-soft text-chat-muted hover:text-accent"
            title="React"
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMenuOpen((m) => !m)}
            className="rounded-full p-1.5 bg-white dark:bg-chat-dark-bubble shadow-soft text-chat-muted hover:text-accent"
            title="More"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Context menu */}
        {menuOpen && (
          <div
            className={cn(
              'absolute z-20 mt-1 w-44 rounded-xl bg-white dark:bg-chat-dark-bubble shadow-lift py-1 animate-scale-in origin-top',
              isMine ? 'right-0' : 'left-0'
            )}
          >
            <MenuItem icon={<Reply className="h-4 w-4" />} label="Reply" onClick={() => { onReply(message); setMenuOpen(false); }} />
            <MenuItem icon={<Smile className="h-4 w-4" />} label="React" onClick={() => { setShowReactions(true); setMenuOpen(false); }} />
            <MenuItem icon={<Copy className="h-4 w-4" />} label="Copy" onClick={() => { onCopy(message); setMenuOpen(false); }} />
            <MenuItem icon={<Forward className="h-4 w-4" />} label="Forward" onClick={() => { onForward(message); setMenuOpen(false); }} />
            <MenuItem
              icon={<Star className="h-4 w-4" />}
              label={isStarred ? 'Unstar' : 'Star'}
              onClick={() => { onStar(message); setMenuOpen(false); }}
            />
            {isMine && message.message_type === 'text' && !message.deleted_for_everyone && (
              <MenuItem icon={<Pencil className="h-4 w-4" />} label="Edit" onClick={() => { onEdit(message); setMenuOpen(false); }} />
            )}
            {isMine && (
              <MenuItem
                icon={<Trash2 className="h-4 w-4" />}
                label="Delete for everyone"
                danger
                onClick={() => { onDeleteForEveryone(message); setMenuOpen(false); }}
              />
            )}
            <MenuItem
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete for me"
              danger
              onClick={() => { onDeleteForMe(message); setMenuOpen(false); }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

function StatusTicks({ message }: { message: Message }) {
  if (message.deleted_for_everyone) return null;
  if (message.read_at) return <CheckCheck className="h-3.5 w-3.5 text-sky-300" />;
  if (message.delivered_at) return <CheckCheck className="h-3.5 w-3.5 text-white/80" />;
  return <Check className="h-3.5 w-3.5 text-white/70" />;
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
        danger ? 'text-error' : 'text-chat-bubbleText dark:text-chat-dark-bubbleText'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function aggregateReactions(reactions: { emoji: string }[]) {
  const map = new Map<string, number>();
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
}

function linkify(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="msg-link"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
