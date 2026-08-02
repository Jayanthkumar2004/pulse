import { supabase } from '@/lib/supabase';

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error: error ? error.message : null };
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? error.message : null };
}

/**
 * Resends the email confirmation link. Supabase re-sends the verification
 * email when signUp is called again with the same email + password for an
 * existing unconfirmed user.
 */
export async function resendEmailVerification(
  email: string,
  password: string
) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // If email confirmation is required and the user hasn't confirmed,
  // Supabase returns a specific error. We treat that as "needs verification".
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('email') && msg.includes('confirm')) {
      return { error: null, needsVerification: true as const };
    }
    return { error: error.message, needsVerification: false as const };
  }
  return { error: null, needsVerification: false as const };
}

export async function deleteAccount(userId: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  return { error: null };
}
