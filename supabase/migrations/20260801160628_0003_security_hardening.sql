/*
# Security Hardening — Address Advisor Findings

1. Revoke EXECUTE on all SECURITY DEFINER functions from the `anon` role.
   The frontend always runs as `authenticated` after sign-in, so anon should
   never invoke these. `handle_new_user` is a trigger function and should not
   be callable via REST by any role — revoke from both anon and authenticated.
2. Fix `touch_updated_at` mutable search_path by adding SET search_path.
3. The `authenticated` execute grants on the chat functions are intentional
   (the app calls them), so those remain.

All idempotent.
*/

-- Revoke anon execute on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION is_conversation_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_or_create_direct_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION mark_message_delivered(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION mark_message_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION mark_conversation_read(uuid) FROM anon;

-- handle_new_user is a trigger function; no role should call it via REST.
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM authenticated;

-- Fix mutable search_path on touch_updated_at (recreate with SET search_path)
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
