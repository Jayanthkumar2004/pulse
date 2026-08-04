import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { setMyPresence } from '@/services/profile.service';

/**
 * Tracks the other participant's presence in a direct conversation and keeps
 * the current user marked online while the app is visible.
 */
export function usePresence(otherUserId: string | null) {
  const [other, setOther] = useState<Profile | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!otherUserId) {
      setOther(null);
      return;
    }
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .maybeSingle();
      if (active && data) setOther(data as Profile);
    };
    load();

    const channel = supabase
      .channel(`presence:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${otherUserId}`,
        },
        (payload) => {
          setOther(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [otherUserId]);

  // Keep the current user's own presence fresh while the app is active.
  useEffect(() => {
    const goOnline = () => setMyPresence(true);
    const goOffline = () => setMyPresence(false);
    const syncPresence = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        goOnline();
      } else {
        goOffline();
      }
    };

    syncPresence();
    const onVis = () => syncPresence();
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
    timer.current = window.setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        goOnline();
      }
    }, 45_000);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', goOffline);
      window.removeEventListener('beforeunload', goOffline);
      if (timer.current) clearInterval(timer.current);
      goOffline();
    };
  }, []);

  return other;
}
