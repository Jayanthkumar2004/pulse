 import { useEffect, useRef } from 'react';
import { setMyPresence } from '@/services/profile.service';

/**
 * App-wide presence manager. Keeps the signed-in user's `is_online` flag and
 * `last_seen` fresh while the app is open, and marks them offline when the
 * app is hidden / closed. Mounted once at the layout level so presence works
 * on every page, not just inside an open chat.
 *
 * Production notes:
 *  - A user is kept online while the tab is merely *visible*, not only when it
 *    also has keyboard focus. Requiring focus caused desktop users to show
 *    offline whenever they clicked another window, which looked wrong.
 *  - The server has a `pg_cron` job (migration 0011) that flips `is_online`
 *    back to false if `last_seen` goes stale, so even if `pagehide` /
 *    `beforeunload` are missed on mobile, presence self-corrects.
 */
export function usePresenceManager() {
  const mounted = useRef(false);

  useEffect(() => {
    // Avoid double-mounting in StrictMode so we don't flicker offline.
    if (mounted.current) return;
    mounted.current = true;

    const goOnline = () => setMyPresence(true);
    const goOffline = () => setMyPresence(false);

    const sync = () => {
      if (document.visibilityState === 'visible') {
        goOnline();
      } else {
        goOffline();
      }
    };

    sync();
    const onVis = () => sync();

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', goOffline);
    window.addEventListener('beforeunload', goOffline);

    // Heartbeat while visible to recover from network blips and keep
    // `last_seen` fresh (the server auto-offlines after ~75s of staleness).
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        goOnline();
      }
    }, 15_000);

    const onUnload = () => {
      // Best-effort sync detached fetch so the server sees us go offline
      // even if `beforeunload` is unreliable on mobile.
      void setMyPresence(false);
    };
    window.addEventListener('pagehide', onUnload as EventListener);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', goOffline);
      window.removeEventListener('beforeunload', goOffline);
      window.removeEventListener('pagehide', onUnload as EventListener);
      if (timer) clearInterval(timer);
      goOffline();
    };
  }, []);

  return null;
}
