import { supabase } from '@/lib/supabase';
import type { Profile, UserSettings } from '@/types';
import { STORAGE_BUCKETS } from '@/lib/constants';
import { buildStoragePath } from '@/lib/files';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'username' | 'bio' | 'phone'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function checkUsernameAvailable(username: string, selfId: string) {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .ilike('username', username)
    .neq('id', selfId);
  if (error) throw error;
  return (count ?? 0) === 0;
}

export async function uploadAvatar(userId: string, file: File) {
  const path = buildStoragePath(userId, file);
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .getPublicUrl(path);
  const url = data.publicUrl;
  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (dbErr) throw dbErr;
  return url;
}

export async function updatePresence(online: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_online: online, last_seen: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  // Update only the current user — the .neq guard above is a no-op; the RLS
  // policy restricts the update to the caller's own row automatically.
  void error;
}

export async function setMyPresence(online: boolean) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({
      is_online: online,
      last_seen: new Date().toISOString(),
    })
    .eq('id', user.id);
}

export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as UserSettings | null;
}

export async function upsertSettings(
  userId: string,
  patch: Partial<UserSettings>
) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...patch })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as UserSettings | null;
}

export async function searchUsersByUsername(query: string, selfId: string) {
  const term = query.trim().replace(/^@/, '');
  if (!term) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${term}%`)
    .neq('id', selfId)
    .limit(10);
  if (error) throw error;
  return (data ?? []) as Profile[];
}
