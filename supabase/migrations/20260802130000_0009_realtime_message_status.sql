-- Realtime delivered/read status for messages.
--
-- Supabase Realtime only includes the primary key columns in UPDATE payloads
-- by default. The client subscribes to message updates filtered by
-- `conversation_id=eq.<id>`, so without changing the replica identity the
-- UPDATE events that carry `delivered_at` / `read_at` never match the filter
-- and the sender never sees the blue ticks update live.
--
-- Setting REPLICA IDENTITY FULL makes Postgres include all columns in the
-- WAL, so realtime delivers the full row (including conversation_id) on every
-- UPDATE. This lets the sender's realtime subscription fire and update the
-- delivered/read ticks in real time.

ALTER TABLE public.messages REPLICA IDENTITY FULL;
