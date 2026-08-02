import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

const MESSAGE_SELECT = `
  *,
  sender:profiles!messages_sender_id_fkey(*),
  attachments(*),
  reactions:message_reactions(*, profile:profiles!message_reactions_user_id_fkey(*))
`;

interface Options {
  conversationId: string | null;
  onMessage: (message: Message) => void;
  onUpdate: (message: Message) => void;
  onDelete: (messageId: string) => void;
  enabled?: boolean;
}

/** Subscribe to live message inserts/updates/deletes for a conversation. */
export function useRealtimeMessages({
  conversationId,
  onMessage,
  onUpdate,
  onDelete,
  enabled = true,
}: Options) {
  const handlers = useRef({ onMessage, onUpdate, onDelete });
  handlers.current = { onMessage, onUpdate, onDelete };

  useEffect(() => {
    if (!conversationId || !enabled) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full row with relations (payload.new lacks joins).
          const { data } = await supabase
            .from('messages')
            .select(MESSAGE_SELECT)
            .eq('id', payload.new.id)
            .maybeSingle();
          if (data) handlers.current.onMessage(data as unknown as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(MESSAGE_SELECT)
            .eq('id', payload.new.id)
            .maybeSingle();
          if (data) handlers.current.onUpdate(data as unknown as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          handlers.current.onDelete(payload.old.id as string);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        async () => {
          // Re-fetch affected messages is complex; callers can refetch.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, enabled]);
}
