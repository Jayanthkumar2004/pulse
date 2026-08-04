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
