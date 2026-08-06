-- Friendlier offline detection for online / last-seen status.
--
-- The client marks a user offline on `pagehide` / `beforeunload`, but these
-- events are unreliable on mobile and when a device is killed. Without a
-- server-side safety net, `is_online` stays true (stale) forever and
-- `last_seen` never advances, so other users see an incorrect green dot.
--
-- This migration adds a pg_cron job that runs every 15 seconds and flips
-- `is_online = false` for any profile whose `last_seen` is older than the
-- heartbeat interval (75s). The client re-asserts `is_online = true` while
-- the app is open, so a live user is never dropped — only a truly stale one.
--
-- Requires: pg_cron extension (enabled by default on hosted Supabase).
-- If pg_cron is unavailable, the job simply can't be scheduled and the
-- client heartbeats still work (last_seen advances, just no auto-offline).

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- A live user's heartbeat updates `last_seen` every 15s. Anything older than
-- this window is considered offline. pg_cron's finest interval is every
-- minute, so we keep the window at ~90s so a closing user is detected offline
-- within about 1–2 minutes (NOT 15 minutes, which was the old bug).
CREATE OR REPLACE FUNCTION public.expire_stale_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_online = false
  WHERE is_online = true
    AND last_seen < now() - interval '90 seconds';
END;
$$;

-- Run every minute (pg_cron minimum). A live user keeps last_seen fresh via
-- the 15s heartbeat, so this never drops an actually-online user.
SELECT cron.schedule(
  'expire-stale-presence',
  '* * * * *',
  $$SELECT public.expire_stale_presence()$$
);

GRANT EXECUTE ON FUNCTION public.expire_stale_presence() TO authenticated;
