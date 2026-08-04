import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { subscribeToPush } from '@/services/push.service';
import { playNotificationSound } from '@/lib/sound';
import type { Message } from '@/types';

const MESSAGE_SELECT = `
  *,
  sender:profiles!messages_sender_id_fkey(*),
  attachments(*),
  reactions:message_reactions(*, profile:profiles!message_reactions_user_id_fkey(*))
`;

/**
 * App-wide notification listener. Subscribes to new messages on every
 * conversation the user is part of and shows a browser notification when the
 * app is NOT visible. Respects muted conversations and the user's
 * `notifications_enabled` / `sound_enabled` settings.
 *
 * Key behaviors (aligned with the reference implementation):
 *  - Requests notification permission on app load if it's still "default".
 *  - Tracks already-notified message ids to avoid duplicates.
 *  - Invalidates the conversations query on new messages.
 *  - Falls back to a service-worker notification if `new Notification`
 *    throws (e.g. unsupported in some contexts).
 *
 * Mounted once at the layout level so notifications arrive on any page
 * (sidebar, settings, etc.), not just inside an open chat.
 */
export function useGlobalNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { permission, notify } = useBrowserNotifications();

  // Track which conversation is currently open so we don't notify for it.
  const activeConvRef = useRef<string | null>(null);
  const focusedRef = useRef(true);
  const mutedRef = useRef<Set<string>>(new Set());
  const notifEnabledRef = useRef(true);
  const soundEnabledRef = useRef(true);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    focusedRef.current = document.hasFocus();
    const onFocus = () => (focusedRef.current = true);
    const onBlur = () => (focusedRef.current = false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Request notification permission on load if it's still "default".
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Load user's notification settings + muted conversations, then
  // auto-subscribe to Web Push on app load when permission is already
  // granted and notifications are enabled (so installed PWAs get native push
  // without requiring the user to visit Settings).
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: settings }, { data: members }] = await Promise.all([
        supabase
          .from('user_settings')
          .select('notifications_enabled, sound_enabled')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('conversation_members')
          .select('conversation_id, muted')
          .eq('user_id', user.id),
      ]);
      if (!active) return;
      if (settings) {
        notifEnabledRef.current = settings.notifications_enabled !== false;
        soundEnabledRef.current = settings.sound_enabled !== false;
      }
      mutedRef.current = new Set(
        (members ?? []).filter((m) => m.muted).map((m) => m.conversation_id)
      );

      // Auto-subscribe if notifications are on and permission already granted.
      if (
        notifEnabledRef.current &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        void subscribeToPush();
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Expose active conversation so ChatPage can tell us not to notify.
  const setActiveConversation = useCallback((id: string | null) => {
    activeConvRef.current = id;
  }, []);

  // Subscribe to new messages across all the user's conversations.
  useEffect(() => {
    if (!user) return;
    let active = true;

    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          if (!active) return;
          const msg = payload.new as Message;
          if (msg.sender_id === user.id) return; // ignore own messages
          if (notifiedRef.current.has(msg.id)) return; // avoid duplicates
          notifiedRef.current.add(msg.id);

          // Mark the message as delivered for the recipient so the sender
          // sees the double tick even when the chat is not open.
          if (msg.delivered_at == null) {
            supabase.rpc('mark_message_delivered', { p_message_id: msg.id });
          }

          // Refresh the sidebar conversation list.
          queryClient.invalidateQueries({ queryKey: ['conversations'] });

          // Don't notify for the conversation that's currently open.
          if (activeConvRef.current === msg.conversation_id) return;
          if (mutedRef.current.has(msg.conversation_id)) return; // muted
          if (!notifEnabledRef.current) return; // notifications disabled

          // Fetch full message with sender for a nice title.
          const { data } = await supabase
            .from('messages')
            .select(MESSAGE_SELECT)
            .eq('id', msg.id)
            .maybeSingle();
          if (!data || !active) return;

          const full = data as unknown as Message;
          const senderName =
            full.sender?.full_name || full.sender?.username || 'Someone';
          const body =
            full.message_type === 'text'
              ? full.body || 'New message'
              : full.message_type === 'image'
              ? 'Sent a photo'
              : full.message_type === 'video'
              ? 'Sent a video'
              : full.message_type === 'voice'
              ? 'Sent a voice message'
              : full.message_type === 'audio'
              ? 'Sent an audio message'
              : full.message_type === 'file'
              ? 'Sent an attachment'
              : 'New message';

          // Only show a notification when the app is not visible/focused.
          if (document.visibilityState === 'visible') return;

          if (soundEnabledRef.current) {
            playNotificationSound();
          }

          if (permission === 'granted') {
            notify(senderName, {
              body,
              icon: '/icon-192.png',
              tag: msg.id,
              onClick: () => navigate(`/chats/${msg.conversation_id}`),
            });
          } else {
            // Fallback: service-worker notification if available.
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready
                .then((reg) => {
                  reg.showNotification(senderName, {
                    body,
                    icon: '/icon-192.png',
                    tag: msg.id,
                    data: { url: `/chats/${msg.conversation_id}` },
                  });
                })
                .catch(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, permission, notify, navigate, queryClient]);

  return { setActiveConversation };
}
