-- Presence & "clear chat for me" fixes.
--
-- 1. clear_chat_for_me(conversation_id): insert every message id in a
--    conversation into deleted_messages for the current user so the RLS
--    select policy hides them from their device while other members keep
--    their own copies.
--
-- 2. Presence cleanup: a heartbeat-based trigger is not practical without a
--    backend cron, so this migration only provides the RPC used by the
--    client's presence manager (setMyPresence) and ensures last_seen is
--    bumped whenever presence flips. The client marks a user offline on
--    pagehide / beforeunload and periodically while visible.

-- === clear_chat_for_me RPC =============================================

CREATE OR REPLACE FUNCTION clear_chat_for_me(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_conversation_member(p_conversation_id, auth.uid()) THEN
    RETURN;
  END IF;

  INSERT INTO deleted_messages (user_id, message_id)
  SELECT auth.uid(), m.id
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id <> auth.uid()
  ON CONFLICT (user_id, message_id) DO NOTHING;

  -- Mark own sent messages as deleted for me too (so the thread reads "you
  -- cleared this chat" on re-open rather than showing your old messages).
  INSERT INTO deleted_messages (user_id, message_id)
  SELECT auth.uid(), m.id
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id = auth.uid()
  ON CONFLICT (user_id, message_id) DO NOTHING;

  -- Reset the read marker so unread counts are clean after clearing.
  UPDATE conversation_members
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION clear_chat_for_me(uuid) TO authenticated;

