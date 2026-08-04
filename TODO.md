# Pulse Fixes: PWA Push Notifications, Mobile UI, Clear Chat, Advanced Keyboard

## Steps
- [x] 1. Auto-subscribe to push on app load in `useGlobalNotifications`
- [x] 2. Create `send-push` Supabase Edge Function (backend Web Push sender)
- [x] 3. Create migration `0008_push_trigger.sql` (DB trigger firing Edge Function via pg_net)
- [x] 4. Add robust client-side fallback to `clearChatForMe` in `message.service.ts`
- [x] 5. Suppress polling re-fetch of cleared messages in `ChatPage.tsx`
- [x] 6. Upgrade `MessageComposer.tsx` to advanced autosizing keyboard (Enter-to-send, Shift+Enter newline, mobile-friendly)
- [x] 7. Add `visualViewport` keyboard-aware handling for mobile composer
- [x] 8. Improve `ChatPage.tsx` mobile header/bubble layout
- [x] 9. Verify build + typecheck compile

## Notes
- **Push backend**: Deploy `send-push` Edge Function + set secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `WEBHOOK_SECRET`; configure `app.push.edge_url` and `app.push.webhook_secret` before `supabase db push` for migration 0008.
- **Clear chat**: Client falls back to row-by-row `deleted_messages` insert if the `clear_chat_for_me` RPC is unavailable.
- **Composer**: Autosizes up to 5 rows; `enterKeyHint="send"`; Shift+Enter for newline; `visualViewport` keeps it above the on-screen keyboard.
