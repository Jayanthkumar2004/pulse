# Mobile UI Compatibility Fixes for Pulse

## Steps
- [x] 1. Fix `ChatLayout.tsx` — import `useLocation`, fix mobile toggle logic, add safe-area top padding
- [x] 2. Fix `ChatPage.tsx` — condense header buttons on mobile, make overflow menu mobile-friendly
- [x] 3. Fix `MessageComposer.tsx` — responsive emoji picker & attachment menu, safe-area bottom padding
- [x] 4. Fix `MessageBubble.tsx` — tap-to-reveal actions on mobile, fix menu clipping
- [x] 5. Update `index.css` — safe-area-inset utilities, mobile viewport handling
- [x] 6. Fix `ChatSidebar.tsx` — safe-area bottom padding on footer
- [x] 7. Update `manifest.webmanifest` — proper PWA icons for installability
- [x] 8. Verify build compiles with `npm run build`

## PWA Notification Support (bonus)
- [x] Add `push_subscriptions` table migration
- [x] Add Web Push handler to `sw.js`
- [x] Add `push.service.ts` for subscription management
- [x] Integrate push subscription into `useBrowserNotifications` hook
- [x] Wire disable/unsubscribe into `SettingsPage`
