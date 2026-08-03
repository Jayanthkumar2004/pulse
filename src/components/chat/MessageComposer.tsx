import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Smile,
  Paperclip,
  Mic,
  Trash2,
  X,
  Camera,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { cn } from '@/lib/utils';
import { MAX_TEXT_LENGTH } from '@/lib/constants';
import type { Message } from '@/types';
import toast from 'react-hot-toast';

interface MessageComposerProps {
  onSendText: (text: string) => void;
  onSendMedia: (file: File, caption: string | null) => void;
  onSendVoice: (file: File) => void;
  onTyping: (typing: boolean) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  editing: Message | null;
  onCancelEdit: () => void;
  onSubmitEdit: (text: string) => void;
  sending?: boolean;
}

const EMOJI_SET = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤩','🥳',
  '🤔','🤨','😐','😶','🙄','😏','😴','🤤','😌','😔',
  '😢','😭','😤','😠','🤬','🥺','😱','😨','😰','😓',
  '👍','👎','👏','🙌','🤝','🙏','💪','🤞','✌️','🤟',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❤️‍🔥',
  '🔥','✨','⭐','🌟','💫','💥','🎉','🎊','🎁','🏆',
  '💯','✅','❌','⚠️','❓','❗','💬','💭','📌','📎',
];

export function MessageComposer({
  onSendText,
  onSendMedia,
  onSendVoice,
  onTyping,
  replyTo,
  onCancelReply,
  editing,
  onCancelEdit,
  onSubmitEdit,
  sending,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const recorder = useVoiceRecorder();

  useEffect(() => {
    if (editing) {
      setText(editing.body || '');
      textareaRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const handleTyping = useCallback(
    (typing: boolean) => {
      if (isTypingRef.current !== typing) {
        isTypingRef.current = typing;
        onTyping(typing);
      }
    },
    [onTyping]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!editing) {
      handleTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => handleTyping(false), 2000);
    }
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (editing) {
      onSubmitEdit(trimmed);
    } else {
      onSendText(trimmed);
    }
    setText('');
    handleTyping(false);
    setShowEmoji(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    if (e.key === 'Escape') {
      if (editing) onCancelEdit();
      if (replyTo) onCancelReply();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      onSendMedia(f, null);
    }
    e.target.value = '';
    setShowAttach(false);
    setShowEmoji(false);
  };

  const handleVoiceSend = async () => {
    const file = await recorder.stop();
    if (file) onSendVoice(file);
  };

  const canSend = text.trim().length > 0 && text.length <= MAX_TEXT_LENGTH;

  return (
<div className="relative bg-chat-panel dark:bg-chat-dark-panel px-2 sm:px-4 py-2.5 pb-[env(safe-area-inset-bottom)] border-t border-chat-border dark:border-chat-dark-border">
      {/* Reply / edit banner */}
      {(replyTo || editing) && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 animate-slide-right">
          <div className="flex-1 min-w-0 border-l-2 border-accent pl-2">
            <p className="text-xs font-semibold text-accent">
              {editing ? 'Editing' : `Replying to ${replyTo?.sender?.username || ''}`}
            </p>
            <p className="truncate text-xs text-chat-muted">
              {editing ? editing.body : replyTo?.body || `[${replyTo?.message_type}]`}
            </p>
          </div>
          <button
            onClick={() => (editing ? onCancelEdit() : onCancelReply())}
            className="rounded-full p-1 text-chat-muted hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

{/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full left-2 right-2 sm:right-auto sm:w-72 mb-2 max-h-52 sm:max-h-56 overflow-y-auto scrollbar-thin rounded-2xl bg-white dark:bg-chat-dark-bubble shadow-lift p-3 grid grid-cols-8 sm:grid-cols-8 sm:gap-1 gap-0.5 animate-scale-in origin-bottom-left">
          {EMOJI_SET.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setText((t) => t + emoji);
                textareaRef.current?.focus();
              }}
              className="rounded-lg p-1.5 text-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Attachment menu */}
      {showAttach && (
        <div className="absolute bottom-full left-2 right-2 sm:left-12 sm:right-auto sm:w-44 mb-2 rounded-2xl bg-white dark:bg-chat-dark-bubble shadow-lift py-2 animate-scale-in origin-bottom-left">
          <AttachItem
            icon={<ImageIcon className="h-5 w-5 text-violet-500" />}
            label="Photos & Videos"
            onClick={() => imageInputRef.current?.click()}
          />
          <AttachItem
            icon={<Camera className="h-5 w-5 text-rose-500" />}
            label="Camera"
            onClick={() => cameraInputRef.current?.click()}
          />
          <AttachItem
            icon={<FileText className="h-5 w-5 text-sky-500" />}
            label="Document"
            onClick={() => fileInputRef.current?.click()}
          />
        </div>
      )}

      <div className="flex items-end gap-1.5">
        {/* Attach button */}
        <button
          onClick={() => {
            setShowAttach((s) => !s);
            setShowEmoji(false);
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-chat-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Attach"
        >
          <Paperclip className={cn('h-5 w-5 transition-transform', showAttach && 'rotate-45')} />
        </button>

        {/* Text input */}
        <div className="flex-1 flex items-end gap-1 rounded-2xl bg-chat-bubble dark:bg-chat-dark-bubble px-2 py-1.5 min-h-[42px] max-w-full">
          <button
            onClick={() => {
              setShowEmoji((s) => !s);
              setShowAttach(false);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-chat-muted hover:bg-black/5 dark:hover:bg-white/5"
            title="Emoji"
          >
            <Smile className={cn('h-5 w-5', showEmoji && 'text-accent')} />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={editing ? 'Edit message...' : 'Type a message'}
            className="auto-resize flex-1 resize-none bg-transparent text-sm text-chat-bubbleText dark:text-chat-dark-bubbleText placeholder:text-chat-muted focus:outline-none max-h-28 leading-relaxed py-1.5 min-w-0"
            maxLength={MAX_TEXT_LENGTH}
          />
        </div>

        {/* Voice / Send button */}
        {recorder.isRecording ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={recorder.cancel}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10 text-error"
              title="Cancel"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 rounded-full bg-error/10 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-error animate-pulse" />
              <span className="text-sm font-medium text-error tabular-nums">
                {Math.floor(recorder.durationSec / 60)}:
                {(recorder.durationSec % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={handleVoiceSend}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-soft"
              title="Send voice"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        ) : canSend ? (
          <Button
            size="icon"
            onClick={send}
            disabled={sending}
            className="h-10 w-10 rounded-full shadow-soft"
            title={editing ? 'Save edit' : 'Send'}
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <button
            onClick={recorder.start}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-chat-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Record voice note"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>

      {recorder.error && (
        <p className="mt-1 text-xs text-error">{recorder.error}</p>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

function AttachItem({
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
