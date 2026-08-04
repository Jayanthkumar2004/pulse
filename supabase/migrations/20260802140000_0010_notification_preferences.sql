-- Notification preferences table.
--
-- Part of the Pulse Chat notification architecture. Stores per-user control
-- over how notifications are delivered on each channel (foreground browser
-- notifications, background Web Push, and sound). This is the single source
-- of truth for delivery preferences, separate from read receipts.
--
--   message_notifications:  allow browser notifications for new messages
--   push_enabled:           allow Web Push (background / app closed)
--   sound_enabled:          play an alert sound on new messages
--   preview_enabled:        show message preview text in the notification
--
-- Defaults to everything enabled. Rows are owned by the user.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id                uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  message_notifications  boolean NOT NULL DEFAULT true,
  push_enabled           boolean NOT NULL DEFAULT true,
  sound_enabled          boolean NOT NULL DEFAULT true,
  preview_enabled        boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: a user may only read/manage their own preferences.
DROP POLICY IF EXISTS "notif_prefs_select_own" ON notification_preferences;
CREATE POLICY "notif_prefs_select_own"
ON notification_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_prefs_insert_own" ON notification_preferences;
CREATE POLICY "notif_prefs_insert_own"
ON notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_prefs_update_own" ON notification_preferences;
CREATE POLICY "notif_prefs_update_own"
ON notification_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_prefs_delete_own" ON notification_preferences;
CREATE POLICY "notif_prefs_delete_own"
ON notification_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
-- Auto-create a preferences row when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_prefs AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

-- Add to the realtime publication so preference changes propagate live.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notification_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.handle_new_user_preferences() TO authenticated;
