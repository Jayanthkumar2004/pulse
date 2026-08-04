# TODO — Chat fixes

## Typing bar scroll fix
- [x] Create `src/hooks/useVisualViewport.ts` — hook tracking visual viewport height
- [x] Update `src/layouts/ChatLayout.tsx` — anchor root container to visual viewport height
- [x] Update `src/components/chat/MessageComposer.tsx` — remove manual kbOffset keyboard handling

## Message status ticks
- [x] Update `ChatPage.tsx` — optimistic message sending (fixes late messages)
- [x] Update `useGlobalNotifications.ts` — mark delivered globally for non-open chats
- [x] Create migration `0009` — REPLICA IDENTITY FULL on messages for live blue ticks
- [x] Update `useGlobalNotifications.ts` — respect `sound_enabled` + notify for non-open chats

## Online/last-seen accuracy
- [x] Update `usePresence.ts` & `usePresenceManager.ts` — shorter heartbeat (15s) for accurate presence
- [x] TypeScript compile verification

## PWA push notifications
- [x] Integrate reference notification logic (auto permission, dedupe, query invalidation, SW fallback)
- [x] Update `main.tsx` — register SW in dev on localhost + auto-subscribe when permission granted
- [x] Create `PUSH_SETUP.md` — full Web Push configuration guide
- [x] Create `.env.example` — documents `VITE_VAPID_PUBLIC_KEY`
- [x] Create `scripts/generate-vapid-keys.cjs` + add `npm run vapid:keys`
- [x] Update README with PWA push setup steps

## Remaining (requires backend access)
- [ ] Run `node scripts/generate-vapid-keys.cjs` and add keys to `.env` + Edge Function secrets
- [ ] Deploy `send-push` Edge Function with VAPID secrets
- [ ] `supabase config set app.push.edge_url` + `app.push.webhook_secret`
- [ ] `supabase db push` (apply migration 0008 trigger + 0009 REPLICA IDENTITY)

