# TODO — Chat fixes

## Typing bar scroll fix
- [x] Create `src/hooks/useVisualViewport.ts` — hook tracking visual viewport height
- [x] Update `src/layouts/ChatLayout.tsx` — anchor root container to visual viewport height
- [x] Update `src/components/chat/MessageComposer.tsx` — remove manual kbOffset keyboard handling

## Message status ticks
- [x] Update `ChatPage.tsx` — optimistic message sending (fixes late messages)
- [x] Update `useGlobalNotifications.ts` — mark delivered globally for non-open chats (fixes double ticks)
- [x] Update `usePresence.ts` — polling fallback for online/last-seen accuracy

## Notifications
- [x] Update `useGlobalNotifications.ts` — ensure notifications fire for non-open chats
- [x] TypeScript compile verification
