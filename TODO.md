# TODO — Chat fixes

## Typing bar scroll fix
- [x] Create `src/hooks/useVisualViewport.ts` — hook tracking visual viewport height
- [x] Update `src/layouts/ChatLayout.tsx` — anchor root container to visual viewport height
- [x] Update `src/components/chat/MessageComposer.tsx` — remove manual kbOffset keyboard handling

## Message status ticks
- [x] Update `useGlobalNotifications.ts` — mark delivered globally for non-open chats
- [x] Create migration `0009` — REPLICA IDENTITY FULL on messages for live blue ticks
- [x] Update `useGlobalNotifications.ts` — respect mute + sound + notify settings

## Online/last-seen accuracy
- [x] Update `usePresence.ts` & `usePresenceManager.ts` — shorter heartbeat for accurate presence

## Notification architecture (Pulse Chat spec)
- [x] Realtime (PRIMARY) for foreground notifications
- [x] Web Push chain for background/closed: DB Trigger → Edge Function → SW (provided)
- [x] Recovery sync only when realtime disconnected (not primary)
- [x] Dedup by message id (`notifiedRef`)
- [x] Respect mute + notification preferences
- [x] Separate notification delivery from read receipts
- [x] Create `notification_preferences` table (migration `0010`)
- [x] Auto-create preferences row on signup
- [x] Add preferences to realtime publication
- [x] SettingsPage: push_enabled + preview_enabled toggles wired to `notification_preferences`
- [x] `useGlobalNotifications` reads `notification_preferences` (message/push/sound/preview)
- [x] `send-push` Edge Function respects `push_enabled` + `preview_enabled`
- [x] `pushsubscriptionchange` handler in `sw.js` + re-subscribe listener
- [x] Client TypeScript compiles

## Remaining (requires backend access / deploy for Web Push)
- [ ] Run `node scripts/generate-vapid-keys.cjs` and add keys to `.env` + Edge Function secrets
- [ ] Deploy `send-push` Edge Function with VAPID secrets
- [ ] `supabase config set app.push.edge_url` + `app.push.webhook_secret`
- [ ] `supabase db push` (apply migrations 0008, 0009, 0010)
