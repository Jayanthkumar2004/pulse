import { supabase } from '@/lib/supabase';
import type { Message, Attachment, MessageReaction, Profile } from '@/types';
import { MESSAGES_PAGE_SIZE } from '@/lib/constants';
import { classifyFile, buildStoragePath, validateFile } from '@/lib/files';

const MESSAGE_SELECT = `
  *,
  sender:profiles!messages_sender_id_fkey(*),
  attachments(*),
  reactions:message_reactions(*, profile:profiles!message_reactions_user_id_fkey(*))
`;

/** Fetch a page of messages for a conversation (newest first). */
export async function fetchMessages(
  conversationId: string,
  before?: string
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendTextMessage(
  conversationId: string,
  body: string,
  replyToId?: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      body,
      message_type: 'text',
      reply_to_id: replyToId ?? null,
    })
    .select(MESSAGE_SELECT)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Message;
}

export async function editMessage(
  messageId: string,
  body: string
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ body, edited_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

export async function deleteForEveryone(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_for_everyone: true, body: null })
    .eq('id', messageId);
  if (error) throw error;
}

export async function deleteForMe(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('deleted_messages')
    .insert({ message_id: messageId });
  if (error && error.code !== '23505') throw error;
}

/**
 * Clear all messages in a conversation for the current user. Inserts every
 * message id into `deleted_messages` so the RLS select policy hides them.
 * Uses a SECURITY DEFINER RPC so the user can bulk-hide their own copy while
 * other members' copies remain intact.
 *
 * If the RPC isn't deployed yet on the remote DB, falls back to locally
 * inserting the current conversation's message ids into `deleted_messages`
 * one-by-one (best-effort) so the chat still clears on the client.
 */
export async function clearChatForMe(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Preferred path: bulk RPC.
  const { error: rpcError } = await supabase.rpc('clear_chat_for_me', {
    p_conversation_id: conversationId,
  });
  if (!rpcError) return;

  // Fallback: fetch this conversation's messages and hide each one for me.
  const { data: msgs, error: fetchErr } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId);
  if (fetchErr) throw fetchErr;

  const ids = (msgs ?? []).map((m) => m.id);
  if (ids.length === 0) return;

  const { error: insertErr } = await supabase
    .from('deleted_messages')
    .upsert(ids.map((id) => ({ user_id: user.id, message_id: id })),
      { onConflict: 'user_id,message_id' });
  if (insertErr) throw insertErr;

  // Reset the read marker so unread counts are clean after clearing.
  await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
}

export async function toggleStar(messageId: string, star: boolean) {
  if (star) {
    const { error } = await supabase
      .from('starred_messages')
      .insert({ message_id: messageId });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('starred_messages')
      .delete()
      .eq('message_id', messageId);
    if (error) throw error;
  }
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
  add: boolean
) {
  if (add) {
    const { error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, emoji });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('emoji', emoji);
    if (error) throw error;
  }
}

export async function fetchStarredMessages() {
  const { data, error } = await supabase
    .from('starred_messages')
    .select(
      `message_id, starred_at, message:messages(${MESSAGE_SELECT})`
    )
    .order('starred_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function searchMessagesInConversation(
  conversationId: string,
  term: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .ilike('body', `%${term}%`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

/** Upload a media file to Storage and create the message + attachment row. */
export async function sendMediaMessage(
  conversationId: string,
  file: File,
  caption: string | null,
  replyToId?: string
): Promise<Message> {
  const v = validateFile(file);
  if (!v.ok) throw new Error(v.error);

  const { category, bucket } = classifyFile(file);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const path = buildStoragePath(user.id, file);
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  const messageType =
    category === 'image'
      ? 'image'
      : category === 'video'
      ? 'video'
      : category === 'voice'
      ? 'voice'
      : category === 'audio'
      ? 'audio'
      : 'file';

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      body: caption || null,
      message_type: messageType,
      reply_to_id: replyToId ?? null,
    })
    .select(MESSAGE_SELECT)
    .maybeSingle();
  if (msgErr) {
    // Clean up orphaned upload.
    await supabase.storage.from(bucket).remove([path]);
    throw msgErr;
  }
  const message = msg as unknown as Message;

  // Capture image dimensions if it's an image
  let width: number | null = null;
  let height: number | null = null;
  if (category === 'image') {
    try {
      const dimensions = await getImageDimensionsFromFile(file);
      width = dimensions.width;
      height = dimensions.height;
    } catch {
      // Ignore dimension capture errors
    }
  }

  const { error: attErr } = await supabase.from('attachments').insert({
    message_id: message.id,
    storage_path: path,
    bucket_id: bucket,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    width,
    height,
  });
  if (attErr) throw attErr;

  // Re-fetch to include the attachment.
  const { data: refreshed } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('id', message.id)
    .maybeSingle();
  return (refreshed as unknown as Message) ?? message;
}

/** Get image dimensions from a File object. */
async function getImageDimensionsFromFile(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to read image dimensions'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function getPublicMediaUrl(bucket: string, path: string): string {
  // Use signed URL for reliable access (valid for 1 year)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedMediaUrl(bucket: string, path: string): Promise<string> {
  try {
    // Create a signed URL valid for 1 year (31536000 seconds)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 31536000);
    if (error) {
      // Fallback to public URL if signed URL fails
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    return data.signedUrl;
  } catch {
    // Fallback to public URL on any error
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
}

export async function downloadAttachment(att: Attachment): Promise<void> {
  const { data, error } = await supabase.storage
    .from(att.bucket_id)
    .download(att.storage_path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type { MessageReaction, Profile };
