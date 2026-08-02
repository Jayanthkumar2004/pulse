/*
# Storage Buckets, Storage Policies, and Realtime Setup

## Storage Buckets (7)
- avatars (public read), chat-images, chat-videos, documents, audio,
  voice-notes, temporary. Path convention {user_id}/{filename}; the first
  path segment is the owner uuid, used by policies to enforce owner-only
  writes/deletes.

## Realtime
Adds the chat tables to supabase_realtime so the browser can subscribe to
live changes. Uses a DO block because ALTER PUBLICATION lacks IF NOT EXISTS.

## Security
- avatars: public SELECT. chat-* / documents / audio / voice-notes:
  authenticated SELECT. temporary: owner SELECT.
- All buckets: INSERT/UPDATE/DELETE only by the path owner
  ((storage.foldername(name))[1] = auth.uid()::text).

All statements idempotent.
*/

-- === BUCKETS =============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-images', 'chat-images', false, 26214400, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-videos', 'chat-videos', false, 104857600, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 104857600, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audio', 'audio', false, 52428800, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-notes', 'voice-notes', false, 26214400, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('temporary', 'temporary', false, 10485760, null)
ON CONFLICT (id) DO NOTHING;

-- === STORAGE POLICIES ====================================================

-- avatars: public read, owner write/delete.
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- chat-images
DROP POLICY IF EXISTS "chat_images_read" ON storage.objects;
CREATE POLICY "chat_images_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-images');
DROP POLICY IF EXISTS "chat_images_insert" ON storage.objects;
CREATE POLICY "chat_images_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "chat_images_update" ON storage.objects;
CREATE POLICY "chat_images_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "chat_images_delete" ON storage.objects;
CREATE POLICY "chat_images_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- chat-videos
DROP POLICY IF EXISTS "chat_videos_read" ON storage.objects;
CREATE POLICY "chat_videos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-videos');
DROP POLICY IF EXISTS "chat_videos_insert" ON storage.objects;
CREATE POLICY "chat_videos_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'chat-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "chat_videos_update" ON storage.objects;
CREATE POLICY "chat_videos_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'chat-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'chat-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "chat_videos_delete" ON storage.objects;
CREATE POLICY "chat_videos_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'chat-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- documents
DROP POLICY IF EXISTS "documents_read" ON storage.objects;
CREATE POLICY "documents_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
CREATE POLICY "documents_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "documents_update" ON storage.objects;
CREATE POLICY "documents_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
CREATE POLICY "documents_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- audio
DROP POLICY IF EXISTS "audio_read" ON storage.objects;
CREATE POLICY "audio_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'audio');
DROP POLICY IF EXISTS "audio_insert" ON storage.objects;
CREATE POLICY "audio_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "audio_update" ON storage.objects;
CREATE POLICY "audio_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "audio_delete" ON storage.objects;
CREATE POLICY "audio_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- voice-notes
DROP POLICY IF EXISTS "voice_notes_read" ON storage.objects;
CREATE POLICY "voice_notes_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'voice-notes');
DROP POLICY IF EXISTS "voice_notes_insert" ON storage.objects;
CREATE POLICY "voice_notes_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "voice_notes_update" ON storage.objects;
CREATE POLICY "voice_notes_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "voice_notes_delete" ON storage.objects;
CREATE POLICY "voice_notes_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- temporary (owner full CRUD)
DROP POLICY IF EXISTS "temp_read" ON storage.objects;
CREATE POLICY "temp_read" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'temporary' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "temp_insert" ON storage.objects;
CREATE POLICY "temp_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'temporary' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "temp_update" ON storage.objects;
CREATE POLICY "temp_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'temporary' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'temporary' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "temp_delete" ON storage.objects;
CREATE POLICY "temp_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'temporary' AND (storage.foldername(name))[1] = auth.uid()::text);

-- === REALTIME PUBLICATION ===============================================
-- ALTER PUBLICATION lacks IF NOT EXISTS, so guard with a membership check.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['messages','conversation_members','typing_status','notifications','message_reactions','profiles','attachments','starred_messages','pinned_chats','deleted_messages','blocked_users','user_settings'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
