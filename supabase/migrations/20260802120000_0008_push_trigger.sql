-- Push notification trigger.
--
-- Fires the `send-push` Edge Function whenever a message is inserted, so
-- recipients get a native Web Push notification even when the app is closed
-- or backgrounded.
--
-- Requires:
--   1. The `pg_net` extension (available on hosted Supabase by default).
--   2. The `send-push` Edge Function deployed with these secrets:
--        VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, WEBHOOK_SECRET
--   3. `supabase config set` WEBHOOK_SECRET used here.
--
-- If the Edge Function or secrets are not configured, the trigger simply
-- fires and the extension call fails silently (pg_net is async), so normal
-- app behavior is unaffected.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function called by the trigger; performs the async HTTP POST via pg_net.
CREATE OR REPLACE FUNCTION public.notify_message_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text := current_setting('app.push.webhook_secret', true);
  v_body jsonb;
BEGIN
  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN NEW; -- not configured, skip
  END IF;

  v_body := jsonb_build_object(
    'record', to_jsonb(NEW),
    'type', 'INSERT',
    'table', 'messages',
    'schema', 'public'
  );

  PERFORM net.http_post(
    url := current_setting('app.push.edge_url', true)::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', format('Bearer %s', v_secret)
    ),
    body := v_body
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_push ON public.messages;
CREATE TRIGGER trg_message_push
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_push();

-- Grants (not needed for trigger execution but harmless).
GRANT EXECUTE ON FUNCTION public.notify_message_push() TO authenticated;

-- =====================================================================
-- After deploying, run:
--   supabase config set app.push.edge_url "https://<project-ref>.supabase.co/functions/v1/send-push"
--   supabase config set app.push.webhook_secret "<your-random-secret>"
--   supabase db push
-- =====================================================================

