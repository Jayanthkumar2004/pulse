/**
 * send-push Edge Function
 * ------------------------
 * Delivers Web Push notifications to PWA subscribers when a new message
 * arrives. It is invoked via HTTP by a Postgres trigger (migration 0008)
 * using pg_net whenever a row is inserted into `messages`.
 *
 * Required environment variables:
 *   SUPABASE_URL            - set automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY - set automatically by Supabase
 *   VAPID_PUBLIC_KEY        - public VAPID key (URL-safe base64)
 *   VAPID_PRIVATE_KEY       - private VAPID key (URL-safe base64)
 *   WEBHOOK_SECRET          - shared secret sent by the DB trigger
 *
 * Uses the `web-push` library via npm import (bundled by deployctl).
 */

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const webhookSecret = Deno.env.get('WEBHOOK_SECRET') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@pulse.local',
    vapidPublicKey,
    vapidPrivateKey
  );
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  // Verify the shared webhook secret when configured.
  const auth = req.headers.get('authorization') ?? '';
  if (webhookSecret && auth !== `Bearer ${webhookSecret}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const record = (payload.record ?? payload) as Record<string, unknown>;
  const conversationId = record.conversation_id as string | undefined;
  const senderId = record.sender_id as string | undefined;

  if (!conversationId || !senderId) {
    console.warn('send-push: missing conversation_id or sender_id', record);
    return json({ ok: false, reason: 'missing ids' }, 400);
  }

  // Skip system messages (e.g. "You were added"), they don't need pushes.
  if (record.message_type === 'system') {
    return json({ ok: true, skipped: 'system' });
  }

  // No VAPID keys → cannot sign pushes; fall back to foreground-only client.
  if (!vapidPublicKey || !vapidPrivateKey) {
    return json({ ok: false, reason: 'vapid not configured' }, 500);
  }

// Recipients = conversation members, excluding the sender and muted users.
  const { data: members, error: membersErr } = await supabase
    .from('conversation_members')
    .select('user_id, muted')
    .eq('conversation_id', conversationId);

  if (membersErr) return json({ error: membersErr.message }, 500);

  const recipientIds = (members ?? [])
    .filter((m: { user_id: string; muted: boolean }) => m.user_id !== senderId && !m.muted)
    .map((m: { user_id: string }) => m.user_id);

  if (recipientIds.length === 0) {
    return json({ ok: true, sent: 0 });
  }

  // Respect each recipient's global push preference.
  const { data: prefs, error: prefsErr } = await supabase
    .from('notification_preferences')
    .select('user_id, push_enabled, preview_enabled')
    .in('user_id', recipientIds);

  if (prefsErr) return json({ error: prefsErr.message }, 500);

  const prefMap = new Map(
    (prefs ?? []).map((p: { user_id: string; push_enabled: boolean; preview_enabled: boolean }) => [
      p.user_id,
      { push: p.push_enabled !== false, preview: p.preview_enabled !== false },
    ])
  );

  const finalRecipients = recipientIds.filter((id) => {
    const p = prefMap.get(id);
    // Default to enabled if no row exists.
    return p ? p.push : true;
  });

  if (finalRecipients.length === 0) {
    return json({ ok: true, sent: 0 });
  }

  // Sender name for the notification title.
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', senderId)
    .maybeSingle();

  const senderName =
    (senderProfile?.full_name as string) ||
    (senderProfile?.username as string) ||
    'Someone';

  const msgType = (record.message_type as string) ?? 'text';
  const rawBody = ((record.body as string) ?? '').slice(0, 200);
  let bodyText = rawBody || 'New message';
  if (msgType === 'image') bodyText = 'Sent a photo';
  else if (msgType === 'video') bodyText = 'Sent a video';
  else if (msgType === 'voice') bodyText = 'Sent a voice message';
  else if (msgType === 'audio') bodyText = 'Sent an audio message';
  else if (msgType === 'file') bodyText = 'Sent an attachment';

// Fetch push subscriptions for every recipient.
  const { data: subscriptions, error: subsErr } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', finalRecipients);

  if (subsErr) return json({ error: subsErr.message }, 500);

  // Per-recipient preview: if any recipient disabled previews, hide the body.
  const anyPreviewDisabled = (prefs ?? []).some(
    (p: { user_id: string; preview_enabled: boolean }) =>
      finalRecipients.includes(p.user_id) && p.preview_enabled === false
  );

  const notification = {
    title: senderName,
    body: anyPreviewDisabled ? 'New message' : bodyText,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: `/chats/${conversationId}`,
    tag: conversationId,
  };

  let sent = 0;
  const tasks = (subscriptions ?? []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
        },
        JSON.stringify(notification)
      );
      sent += 1;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        // Subscription expired → clean up.
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint as string);
      } else {
        console.error('send-push error', code, (e as Error).message);
      }
    }
  });

  await Promise.allSettled(tasks);

  return json({ ok: true, sent });
});

