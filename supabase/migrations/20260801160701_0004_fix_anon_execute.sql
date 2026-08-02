/*
# Security Hardening Part 2 — Fix Anon Execute on Functions

Postgres grants EXECUTE on all functions to PUBLIC by default. Combined with
USAGE on the public schema, anon can call SECURITY DEFINER functions via REST.
Fix: revoke EXECUTE from PUBLIC on each function, then grant to authenticated
only. handle_new_user (trigger) is revoked from all roles.

All idempotent.
*/

-- Revoke EXECUTE from PUBLIC (covers anon + authenticated + any future role)
REVOKE EXECUTE ON FUNCTION is_conversation_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_or_create_direct_conversation(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION mark_message_delivered(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION mark_message_read(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION mark_conversation_read(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION touch_updated_at() FROM PUBLIC;

-- Grant back to authenticated only (the app's role after sign-in)
GRANT EXECUTE ON FUNCTION is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_message_delivered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_message_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(uuid) TO authenticated;
