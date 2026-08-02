export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'file'
  | 'system';

export type ConversationType = 'direct' | 'group';

export interface Profile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  phone: string | null;
  last_seen: string;
  is_online: boolean;
  last_seen_visible: boolean;
  read_receipts_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  role: 'member' | 'admin';
  last_read_at: string | null;
  muted: boolean;
  archived: boolean;
  joined_at: string;
  profile?: Profile;
}

export interface Attachment {
  id: string;
  message_id: string;
  storage_path: string;
  bucket_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  created_at: string;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type: MessageType;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_for_everyone: boolean;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  attachments?: Attachment[];
  reactions?: MessageReaction[];
}

export interface Notification {
  id: string;
  user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  actor_id: string | null;
  kind: 'message' | 'mention' | 'reaction' | 'system';
  body: string;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

export interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  accent_color: string;
  created_at: string;
  updated_at: string;
}

export interface BlockedUser {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked?: Profile;
}

export interface PinnedChat {
  user_id: string;
  conversation_id: string;
  pinned_at: string;
}

export interface StarredMessage {
  user_id: string;
  message_id: string;
  starred_at: string;
  message?: Message;
}

export interface TypingStatus {
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
  updated_at: string;
}

/** Conversation enriched with the other participant + last message, for the sidebar. */
export interface ConversationWithMeta extends Conversation {
  other_member?: Profile;
  last_message?: Message;
  unread_count?: number;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
}

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
