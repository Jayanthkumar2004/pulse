/*
# Chat Application Core Schema

Creates the database foundation for a WhatsApp-style real-time chat app.
All tables use Row Level Security so the browser client only sees data the
signed-in user may access.

Ordering matters: tables are created first (SQL-language functions validate
their bodies at creation, so referenced tables must already exist), then the
helper functions, then the RLS policies that call those functions.

## New Tables (13)
profiles, conversations, conversation_members, messages, attachments,
message_reactions, deleted_messages, blocked_users, pinned_chats,
starred_messages, user_settings, notifications, typing_status.

## Helper Functions (SECURITY DEFINER)
is_conversation_member, get_or_create_direct_conversation,
mark_message_delivered, mark_message_read, mark_conversation_read.

## Triggers
handle_new_user (auto-profile on signup), touch_updated_at.

## Security
RLS on every table; policies use auth.uid() + is_conversation_member();
owner columns default to auth.uid().

All statements idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS).
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- === TABLES (created before functions/policies) =========================

CREATE TABLE IF NOT EXISTS profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username              text NOT NULL UNIQUE,
  full_name             text NOT NULL DEFAULT '',
  avatar_url            text,
  bio                   text NOT NULL DEFAULT '',
  phone                 text,
  last_seen             timestamptz NOT NULL DEFAULT now(),
  is_online             boolean NOT NULL DEFAULT false,
  last_seen_visible     boolean NOT NULL DEFAULT true,
  read_receipts_enabled boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  title       text,
  avatar_url  text,
  created_by  uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  last_read_at    timestamptz,
  muted           boolean NOT NULL DEFAULT false,
  archived        boolean NOT NULL DEFAULT false,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id             uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body                  text,
  message_type          text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','video','audio','voice','file','system')),
  reply_to_id           uuid REFERENCES messages(id) ON DELETE SET NULL,
  edited_at             timestamptz,
  deleted_for_everyone  boolean NOT NULL DEFAULT false,
  delivered_at          timestamptz,
  read_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,
  bucket_id       text NOT NULL,
  file_name       text NOT NULL,
  mime_type       text NOT NULL DEFAULT '',
  size_bytes      bigint NOT NULL DEFAULT 0,
  width           integer,
  height          integer,
  duration_sec    numeric,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id  uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS deleted_messages (
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  message_id  uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  deleted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS pinned_chats (
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  pinned_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS starred_messages (
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  message_id  uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  starred_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id               uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  theme                 text NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  language              text NOT NULL DEFAULT 'en',
  notifications_enabled boolean NOT NULL DEFAULT true,
  sound_enabled         boolean NOT NULL DEFAULT true,
  accent_color          text NOT NULL DEFAULT '#00a884',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  message_id      uuid REFERENCES messages(id) ON DELETE CASCADE,
  actor_id        uuid REFERENCES profiles(id) ON DELETE CASCADE,
  kind            text NOT NULL DEFAULT 'message' CHECK (kind IN ('message','mention','reaction','system')),
  body            text NOT NULL DEFAULT '',
  is_read         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS typing_status (
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  is_typing       boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

-- Enable RLS on all tables (locked until policies added below) -----------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE starred_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- === FUNCTIONS (tables now exist) ========================================

CREATE OR REPLACE FUNCTION is_conversation_member(p_conversation uuid, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = p_conversation AND user_id = p_user);
$$;

CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(p_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv_id uuid;
  v_me uuid := auth.uid();
BEGIN
  IF p_other_user = v_me THEN RAISE EXCEPTION 'Cannot create a conversation with yourself'; END IF;
  SELECT c.id INTO v_conv_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = v_me)
    AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = p_other_user)
    AND (SELECT count(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) = 2
  LIMIT 1;
  IF v_conv_id IS NOT NULL THEN RETURN v_conv_id; END IF;
  INSERT INTO conversations (type, created_by) VALUES ('direct', v_me) RETURNING id INTO v_conv_id;
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (v_conv_id, v_me), (v_conv_id, p_other_user);
  RETURN v_conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_message_delivered(p_message_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv uuid; v_sender uuid;
BEGIN
  SELECT conversation_id, sender_id INTO v_conv, v_sender FROM messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_sender = auth.uid() THEN RETURN; END IF;
  IF NOT is_conversation_member(v_conv, auth.uid()) THEN RETURN; END IF;
  UPDATE messages SET delivered_at = now() WHERE id = p_message_id AND delivered_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION mark_message_read(p_message_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv uuid; v_sender uuid;
BEGIN
  SELECT conversation_id, sender_id INTO v_conv, v_sender FROM messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_sender = auth.uid() THEN RETURN; END IF;
  IF NOT is_conversation_member(v_conv, auth.uid()) THEN RETURN; END IF;
  UPDATE messages SET read_at = now(), delivered_at = COALESCE(delivered_at, now()) WHERE id = p_message_id AND read_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_conversation_member(p_conversation_id, auth.uid()) THEN RETURN; END IF;
  UPDATE conversation_members SET last_read_at = now() WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
  UPDATE messages SET read_at = now(), delivered_at = COALESCE(delivered_at, now())
    WHERE conversation_id = p_conversation_id AND sender_id <> auth.uid() AND read_at IS NULL;
  UPDATE notifications SET is_read = true WHERE user_id = auth.uid() AND conversation_id = p_conversation_id AND NOT is_read;
END;
$$;

-- === TRIGGERS ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), coalesce(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated ON profiles;
CREATE TRIGGER profiles_touch_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS user_settings_touch_updated ON user_settings;
CREATE TRIGGER user_settings_touch_updated BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- === POLICIES (functions now exist) ======================================

-- profiles
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- conversations
DROP POLICY IF EXISTS "conversations_select_member" ON conversations;
CREATE POLICY "conversations_select_member" ON conversations FOR SELECT TO authenticated USING (is_conversation_member(id, auth.uid()));
DROP POLICY IF EXISTS "conversations_insert_creator" ON conversations;
CREATE POLICY "conversations_insert_creator" ON conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "conversations_update_member" ON conversations;
CREATE POLICY "conversations_update_member" ON conversations FOR UPDATE TO authenticated USING (is_conversation_member(id, auth.uid())) WITH CHECK (is_conversation_member(id, auth.uid()));
DROP POLICY IF EXISTS "conversations_delete_member" ON conversations;
CREATE POLICY "conversations_delete_member" ON conversations FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- conversation_members
DROP POLICY IF EXISTS "cm_select_member" ON conversation_members;
CREATE POLICY "cm_select_member" ON conversation_members FOR SELECT TO authenticated USING (is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "cm_insert_self" ON conversation_members;
CREATE POLICY "cm_insert_self" ON conversation_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cm_update_self" ON conversation_members;
CREATE POLICY "cm_update_self" ON conversation_members FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cm_delete_self" ON conversation_members;
CREATE POLICY "cm_delete_self" ON conversation_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- messages
DROP POLICY IF EXISTS "messages_select_member" ON messages;
CREATE POLICY "messages_select_member" ON messages FOR SELECT TO authenticated
  USING (is_conversation_member(conversation_id, auth.uid())
    AND NOT EXISTS (SELECT 1 FROM deleted_messages dm WHERE dm.message_id = messages.id AND dm.user_id = auth.uid()));
DROP POLICY IF EXISTS "messages_insert_sender" ON messages;
CREATE POLICY "messages_insert_sender" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "messages_update_sender" ON messages;
CREATE POLICY "messages_update_sender" ON messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "messages_delete_sender" ON messages;
CREATE POLICY "messages_delete_sender" ON messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- attachments
DROP POLICY IF EXISTS "attachments_select_member" ON attachments;
CREATE POLICY "attachments_select_member" ON attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM messages m WHERE m.id = attachments.message_id AND is_conversation_member(m.conversation_id, auth.uid())));
DROP POLICY IF EXISTS "attachments_insert_sender" ON attachments;
CREATE POLICY "attachments_insert_sender" ON attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM messages m WHERE m.id = attachments.message_id AND m.sender_id = auth.uid()));
DROP POLICY IF EXISTS "attachments_delete_sender" ON attachments;
CREATE POLICY "attachments_delete_sender" ON attachments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM messages m WHERE m.id = attachments.message_id AND m.sender_id = auth.uid()));

-- message_reactions
DROP POLICY IF EXISTS "reactions_select_member" ON message_reactions;
CREATE POLICY "reactions_select_member" ON message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM messages m WHERE m.id = message_reactions.message_id AND is_conversation_member(m.conversation_id, auth.uid())));
DROP POLICY IF EXISTS "reactions_insert_member" ON message_reactions;
CREATE POLICY "reactions_insert_member" ON message_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM messages m WHERE m.id = message_reactions.message_id AND is_conversation_member(m.conversation_id, auth.uid())));
DROP POLICY IF EXISTS "reactions_delete_own" ON message_reactions;
CREATE POLICY "reactions_delete_own" ON message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- deleted_messages
DROP POLICY IF EXISTS "deleted_messages_select_own" ON deleted_messages;
CREATE POLICY "deleted_messages_select_own" ON deleted_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "deleted_messages_insert_own" ON deleted_messages;
CREATE POLICY "deleted_messages_insert_own" ON deleted_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "deleted_messages_delete_own" ON deleted_messages;
CREATE POLICY "deleted_messages_delete_own" ON deleted_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- blocked_users
DROP POLICY IF EXISTS "blocked_select_own" ON blocked_users;
CREATE POLICY "blocked_select_own" ON blocked_users FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocked_insert_own" ON blocked_users;
CREATE POLICY "blocked_insert_own" ON blocked_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocked_delete_own" ON blocked_users;
CREATE POLICY "blocked_delete_own" ON blocked_users FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- pinned_chats
DROP POLICY IF EXISTS "pinned_select_own" ON pinned_chats;
CREATE POLICY "pinned_select_own" ON pinned_chats FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "pinned_insert_own" ON pinned_chats;
CREATE POLICY "pinned_insert_own" ON pinned_chats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "pinned_delete_own" ON pinned_chats;
CREATE POLICY "pinned_delete_own" ON pinned_chats FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- starred_messages
DROP POLICY IF EXISTS "starred_select_own" ON starred_messages;
CREATE POLICY "starred_select_own" ON starred_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "starred_insert_own" ON starred_messages;
CREATE POLICY "starred_insert_own" ON starred_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "starred_delete_own" ON starred_messages;
CREATE POLICY "starred_delete_own" ON starred_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_settings
DROP POLICY IF EXISTS "settings_select_own" ON user_settings;
CREATE POLICY "settings_select_own" ON user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings_insert_own" ON user_settings;
CREATE POLICY "settings_insert_own" ON user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings_update_own" ON user_settings;
CREATE POLICY "settings_update_own" ON user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- typing_status
DROP POLICY IF EXISTS "typing_select_member" ON typing_status;
CREATE POLICY "typing_select_member" ON typing_status FOR SELECT TO authenticated USING (is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "typing_upsert_own" ON typing_status;
CREATE POLICY "typing_upsert_own" ON typing_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "typing_update_own" ON typing_status;
CREATE POLICY "typing_update_own" ON typing_status FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- === INDEXES =============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_cm_conversation ON conversation_members (conversation_id);
CREATE INDEX IF NOT EXISTS idx_cm_user ON conversation_members (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages (reply_to_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_starred_user ON starred_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_user ON pinned_chats (user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users (blocker_id);

-- === GRANTS ==============================================================

GRANT EXECUTE ON FUNCTION is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_message_delivered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_message_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(uuid) TO authenticated;
