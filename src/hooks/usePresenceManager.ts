import { useEffect, useRef } from 'react';
import { setMyPresence } from '@/services/profile.service';

/**
 * App-wide presence manager. Keeps the signed-in user's `is_online` flag and
 * `last_seen` fresh while the app is visible and focused, and marks them
 * offline when the app is hidden / closed. Mounted once at the layout level so
 * presence works on every page, not just inside an open chat.
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
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        goOnline();
      } else {
        goOffline();
      }
    };

    sync();
    const onVis = () => sync();
    const onFocus = () => {
      if (document.visibilityState === 'visible') goOnline();
    };
    const onBlur = () => {
      if (document.visibilityState !== 'visible') goOffline();
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', goOffline);
    window.addEventListener('beforeunload', goOffline);

    // Heartbeat while visible to recover from network blips.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
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
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', goOffline);
      window.removeEventListener('beforeunload', goOffline);
      window.removeEventListener('pagehide', onUnload as EventListener);
      if (timer) clearInterval(timer);
      goOffline();
    };
  }, []);

  return null;
}
