import { supabase } from '@/lib/supabase';
import type { Conversation, ConversationWithMeta, Message, Profile } from '@/types';
import { CONVERSATIONS_PAGE_SIZE } from '@/lib/constants';

/** Start or resume a 1-1 conversation with another user. */
export async function getOrCreateDirectConversation(
  otherUserId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_other_user: otherUserId,
  });
  if (error) throw error;
  return data as string;
}

/** Fetch the other participant in a direct conversation. */
export async function getDirectOtherMember(
  conversationId: string,
  selfId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('profile:profiles(*)')
    .eq('conversation_id', conversationId)
    .neq('user_id', selfId)
    .maybeSingle();
  if (error) throw error;
  return (data?.profile as Profile | undefined) ?? null;
}

/** List the current user's conversations with last message + unread count. */
export async function fetchConversations(
  selfId: string,
  page = 0
): Promise<ConversationWithMeta[]> {
  const from = page * CONVERSATIONS_PAGE_SIZE;
  const to = from + CONVERSATIONS_PAGE_SIZE - 1;

  const { data: convs, error } = await supabase
    .from('conversations')
    .select('*, members:conversation_members!inner(*)')
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!convs || convs.length === 0) return [];

  const convIds = convs.map((c) => c.id);

  // Last message per conversation — fetch a recent window and keep newest per conv.
  const { data: lastMsgs } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(*)')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })
    .limit(200);

  // Unread counts + membership state.
  const { data: myMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at, muted, archived')
    .eq('user_id', selfId)
    .in('conversation_id', convIds);

  // Pinned chats.
  const { data: pinned } = await supabase
    .from('pinned_chats')
    .select('conversation_id')
    .eq('user_id', selfId)
    .in('conversation_id', convIds);

  const pinnedSet = new Set((pinned ?? []).map((p) => p.conversation_id));
  const memberMap = new Map(
    (myMembers ?? []).map((m) => [m.conversation_id, m])
  );
  const lastMsgMap = new Map<string, Message>();
  for (const m of (lastMsgs ?? []) as Message[]) {
    if (!lastMsgMap.has(m.conversation_id)) {
      lastMsgMap.set(m.conversation_id, m);
    }
  }

  // Fetch the other member for direct chats.
  const otherMemberIds = await Promise.all(
    convs
      .filter((c) => c.type === 'direct')
      .map(async (c) => {
        const members = c.members as { user_id: string }[];
        const otherId = members.find((m) => m.user_id !== selfId)?.user_id;
        return { id: c.id, otherId };
      })
  );

  const otherIds = otherMemberIds
    .map((o) => o.otherId)
    .filter((v): v is string => Boolean(v));
  const { data: otherProfiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', otherIds);
  const profileMap = new Map((otherProfiles ?? []).map((p) => [p.id, p]));

  // Unread counts per conversation.
  const unreadEntries = await Promise.all(
    convIds.map(async (cid) => {
      const mem = memberMap.get(cid);
      if (!mem) return [cid, 0] as const;
      if (!mem.last_read_at) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', cid)
          .neq('sender_id', selfId);
        return [cid, count ?? 0] as const;
      }
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', cid)
        .neq('sender_id', selfId)
        .gt('created_at', mem.last_read_at);
      return [cid, count ?? 0] as const;
    })
  );
  const unreadMap = new Map(unreadEntries);

  return convs.map((c) => {
    const otherEntry = otherMemberIds.find((o) => o.id === c.id);
    const otherProfile = otherEntry?.otherId
      ? profileMap.get(otherEntry.otherId)
      : undefined;
    const mem = memberMap.get(c.id);
    return {
      ...(c as Conversation),
      other_member: otherProfile,
      last_message: lastMsgMap.get(c.id),
      unread_count: unreadMap.get(c.id) ?? 0,
      is_pinned: pinnedSet.has(c.id),
      is_muted: mem?.muted ?? false,
      is_archived: mem?.archived ?? false,
    } as ConversationWithMeta;
  });
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}

export async function togglePinConversation(conversationId: string, pin: boolean) {
  if (pin) {
    const { error } = await supabase
      .from('pinned_chats')
      .insert({ conversation_id: conversationId });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('pinned_chats')
      .delete()
      .eq('conversation_id', conversationId);
    if (error) throw error;
  }
}

export async function setMuted(conversationId: string, muted: boolean) {
  const { error } = await supabase
    .from('conversation_members')
    .update({ muted })
    .eq('conversation_id', conversationId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '');
  if (error) throw error;
}

export async function setArchived(conversationId: string, archived: boolean) {
  const { error } = await supabase
    .from('conversation_members')
    .update({ archived })
    .eq('conversation_id', conversationId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '');
  if (error) throw error;
}
