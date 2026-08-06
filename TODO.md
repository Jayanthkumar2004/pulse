# OneSignal Migration — Task Checklist

## Deletions
- [x] Delete `src/services/push.service.ts`
- [x] Delete `scripts/generate-vapid-keys.cjs`
- [x] Delete `supabase/functions/send-push/index.ts` (folder)
- [x] Delete `supabase/migrations/20260802103000_0006_push_subscriptions.sql`
- [x] Delete `supabase/migrations/20260802120000_0008_push_trigger.sql`
- [x] Delete `supabase/migrations/20260802160000_0012_fix_push_trigger.sql`
- [x] Delete `PUSH_SETUP.md`
- [x] Delete `public/sw.js` (merged into OneSignalSDKWorker.js)

## Modifications
- [x] Merge PWA offline caching into `public/OneSignalSDKWorker.js`
- [x] Clean `src/main.tsx` (remove all manual SW registration)
- [x] Fix `src/services/onesignal.service.ts` (v16 `OneSignalDeferred.push` init)
- [x] Clean `src/hooks/useOneSignal.ts` (init + login sequence)
- [x] Mount `useOneSignal` in `src/layouts/ChatLayout.tsx`
- [x] Wire `src/pages/SettingsPage.tsx` push toggle to OneSignal
- [x] Update `index.html` (OneSignal SDK script)
- [x] Add `vercel.json` rewrites

## Root-cause fix
- [x] Eliminate the two-service-worker scope conflict (sw.js vs OneSignalSDKWorker.js)

## Verification
- [x] `npm run typecheck` — PASS
- [x] `npm run build` — PASS
- [x] `dist/OneSignalSDKWorker.js` present; `dist/sw.js` absent
