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
 * App-wide notification listener implementing the Pulse Chat notification
 * architecture:
 *
 *   Foreground:      Message → Realtime → Hook → Browser Notification
 *   Background/PWA:  Message → DB Trigger → Edge Function → Web Push → SW
 *
 * This hook covers the foreground path (Realtime) and also fires the in-app
 * fallback (service-worker `showNotification`) when the tab is hidden but the
 * OS-level Web Push hasn't been configured yet. Delivery is layered:
 *
 *   1. Realtime (PRIMARY) — instant INSERT events via Supabase Realtime while
 *      the app is open. This is the fast path used for active sessions.
 *   2. Recovery sync (safety net) — a low-frequency reconciliation that only
 *      runs when the realtime channel reports it is disconnected. It queries
 *      the `messages` table (RLS: conversation members) for anything missed
 *      since the last check, so a dropped websocket never silently loses a
 *      notification. It is NOT the primary mechanism — it is a recovery tool.
 *
 * Deduplication is handled by message id (`notifiedRef`), mutes and user
 * notification settings are respected, and read receipts (delivered ticks)
 * are updated separately from notification delivery.
 */
export function useGlobalNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { permission, notify } = useBrowserNotifications();

  // Track which conversation is currently open so we don't notify for it.
  const activeConvRef = useRef<string | null>(null);
  const mutedRef = useRef<Set<string>>(new Set());
  const notifEnabledRef = useRef(true);
  const soundEnabledRef = useRef(true);
  const pushEnabledRef = useRef(true);
  const previewEnabledRef = useRef(true);
  const notifiedRef = useRef<Set<string>>(new Set());
  const lastSeenRef = useRef<string | null>(null);
  const usersRef = useRef<string | null>(null);
  const channelStateRef = useRef<'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | string>('CLOSED');
  const reconnectTimerRef = useRef<number | null>(null);

  // Keep the user id available to the recovery callback.
  usersRef.current = user?.id ?? null;

// Load user's notification preferences + muted conversations.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: prefs }, { data: members }] = await Promise.all([
        supabase
          .from('notification_preferences')
          .select('message_notifications, sound_enabled, push_enabled, preview_enabled')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('conversation_members')
          .select('conversation_id, muted')
          .eq('user_id', user.id),
      ]);
      if (!active) return;
      if (prefs) {
        notifEnabledRef.current = prefs.message_notifications !== false;
        soundEnabledRef.current = prefs.sound_enabled !== false;
        pushEnabledRef.current = prefs.push_enabled !== false;
        previewEnabledRef.current = prefs.preview_enabled !== false;
      }
      mutedRef.current = new Set(
        (members ?? []).filter((m) => m.muted).map((m) => m.conversation_id)
      );
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Request notification permission on load if it's still "default".
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

// Auto-subscribe to Web Push when permission is granted and push is enabled
  // so the background/closed-app path (DB trigger → Edge Function → Web Push)
  // works.
  useEffect(() => {
    if (
      user &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      notifEnabledRef.current &&
      pushEnabledRef.current
    ) {
      void subscribeToPush();
    }
  }, [user]);

  // Expose active conversation so ChatPage can tell us not to notify.
  const setActiveConversation = useCallback((id: string | null) => {
    activeConvRef.current = id;
  }, []);

  // Core: process a list of new messages and surface notifications.
  const processNewMessages = useCallback(
    async (incoming: Message[]) => {
      if (!incoming.length) return;
      const selfId = usersRef.current;
      if (!selfId) return;

      for (const msg of incoming) {
        if (msg.sender_id === selfId) continue; // ignore own messages
        if (!notifEnabledRef.current) continue; // notifications disabled
        if (notifiedRef.current.has(msg.id)) continue; // dedupe
        notifiedRef.current.add(msg.id);

        // Mark delivered so the sender sees the double tick even when the
        // chat is not open. Separate from notification delivery.
        if (msg.delivered_at == null) {
          supabase.rpc('mark_message_delivered', { p_message_id: msg.id });
        }

        // Skip the currently-open conversation.
        if (activeConvRef.current === msg.conversation_id) continue;
        if (mutedRef.current.has(msg.conversation_id)) continue;

        // Only show a notification when the app is not visible.
        if (document.visibilityState === 'visible') continue;

const senderName =
          msg.sender?.full_name || msg.sender?.username || 'Someone';
        const body = !previewEnabledRef.current
          ? 'New message'
          : msg.message_type === 'text'
            ? msg.body || 'New message'
            : msg.message_type === 'image'
            ? 'Sent a photo'
            : msg.message_type === 'video'
            ? 'Sent a video'
            : msg.message_type === 'voice'
            ? 'Sent a voice message'
            : msg.message_type === 'audio'
            ? 'Sent an audio message'
            : msg.message_type === 'file'
            ? 'Sent an attachment'
            : 'New message';

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
        } else if ('serviceWorker' in navigator) {
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
    },
    [navigate, notify, permission]
  );

  // Recovery sync — runs only when realtime is disconnected. Queries the
  // `messages` table for anything we missed since the last seen message.
  const recoverMissedMessages = useCallback(
    async (): Promise<boolean> => {
      const selfId = usersRef.current;
      if (!selfId) return false;
      if (!channelStateRef.current || channelStateRef.current === 'SUBSCRIBED') {
        return false; // realtime healthy — no need to poll
      }

      // Fetch conversations the user is a member of.
      const { data: memberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', selfId);
      if (!memberships || memberships.length === 0) return false;

      const convIds = memberships.map((m) => m.conversation_id);

      let query = supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .in('conversation_id', convIds)
        .neq('sender_id', selfId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (lastSeenRef.current) {
        query = query.gt('created_at', lastSeenRef.current);
      }

      const { data } = await query;
      if (!data) return false;

      // Newest first; collect in chronological order.
      const newMessages = (data as unknown as Message[]).reverse();

      // Advance lastSeen to the newest message we've seen.
      const newest = data[0] as Message | undefined;
      if (newest) {
        lastSeenRef.current = newest.created_at;
      }

      if (newMessages.length) {
        await processNewMessages(newMessages);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
      return true;
    },
    [processNewMessages, queryClient]
  );

  // Realtime path (PRIMARY). Listens for new message inserts on every
  // conversation and fires the browser notification.
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

          // Fetch the full row with relations (payload.new lacks sender).
          const { data } = await supabase
            .from('messages')
            .select(MESSAGE_SELECT)
            .eq('id', msg.id)
            .maybeSingle();
          if (!data || !active) return;

          // Keep lastSeenRef advanced so the recovery sync doesn't re-notify.
          if (
            !lastSeenRef.current ||
            new Date(data.created_at).getTime() > new Date(lastSeenRef.current).getTime()
          ) {
            lastSeenRef.current = data.created_at;
          }

          await processNewMessages([data as unknown as Message]);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe((status) => {
        channelStateRef.current = status;
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, processNewMessages, queryClient]);

  // Recovery sync timer — only meaningful while realtime is down. Runs a
  // reconciliation check when the tab becomes visible again (the most common
  // gap) and on a slow interval (2 min) as a safety net while disconnected.
  useEffect(() => {
    if (!user) return;
    let active = true;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void recoverMissedMessages();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const interval = window.setInterval(() => {
      // Only reconcile when realtime is NOT healthy (disconnected/error).
      const state = channelStateRef.current;
      if (!state || state !== 'SUBSCRIBED') {
        void recoverMissedMessages();
      }
    }, 2 * 60_000);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [user, recoverMissedMessages]);

  return { setActiveConversation };
}
