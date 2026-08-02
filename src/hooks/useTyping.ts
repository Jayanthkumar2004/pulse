import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TYPING_TIMEOUT_MS } from '@/lib/constants';

/** Broadcast whether the current user is typing in a conversation. */
export function useTyping(conversationId: string | null, selfId: string | null) {
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId || !selfId) return;
      supabase
        .from('typing_status')
        .upsert({
          user_id: selfId,
          conversation_id: conversationId,
          is_typing: typing,
          updated_at: new Date().toISOString(),
        })
        .then(() => undefined);
      if (stopTimer.current) clearTimeout(stopTimer.current);
      if (typing) {
        stopTimer.current = setTimeout(() => {
          supabase
            .from('typing_status')
            .upsert({
              user_id: selfId,
              conversation_id: conversationId,
              is_typing: false,
              updated_at: new Date().toISOString(),
            })
            .then(() => undefined);
        }, TYPING_TIMEOUT_MS);
      }
    },
    [conversationId, selfId]
  );

  useEffect(() => {
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      if (conversationId && selfId) {
        supabase
          .from('typing_status')
          .upsert({
            user_id: selfId,
            conversation_id: conversationId,
            is_typing: false,
            updated_at: new Date().toISOString(),
          })
          .then(() => undefined);
      }
    };
  }, [conversationId, selfId]);

  return { setTyping };
}

/** Subscribe to the other member's typing state in a conversation. */
export function useOtherTyping(
  conversationId: string | null,
  otherUserId: string | null
) {
  const [isTyping, setIsTyping] = useState(false);
  const stale = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !otherUserId) {
      setIsTyping(false);
      return;
    }
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('typing_status')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', otherUserId)
        .maybeSingle();
      if (active && data) setIsTyping(Boolean(data.is_typing));
    };
    load();

    const channel = supabase
      .channel(`typing:${conversationId}:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            user_id: string;
            is_typing: boolean;
            updated_at: string;
          } | null;
          if (!row || row.user_id !== otherUserId) return;
          setIsTyping(Boolean(row.is_typing));
          if (stale.current) clearTimeout(stale.current);
          if (row.is_typing) {
            stale.current = setTimeout(() => setIsTyping(false), TYPING_TIMEOUT_MS);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
      if (stale.current) clearTimeout(stale.current);
    };
  }, [conversationId, otherUserId]);

  return isTyping;
}
