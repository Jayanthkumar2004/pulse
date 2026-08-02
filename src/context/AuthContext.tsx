import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  needsEmailVerification: boolean;
  pendingEmail: string | null;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName: string
  ) => Promise<{ error: string | null; needsVerification: boolean }>;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ error: string | null; needsVerification: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearEmailVerification: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const profileFetchedFor = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) {
      setProfile(data as Profile);
      profileFetchedFor.current = userId;
    } else if (error) {
      setTimeout(() => fetchProfile(userId), 1500);
    }
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        const uid = newSession?.user?.id ?? null;
        if (uid && uid !== profileFetchedFor.current) {
          fetchProfile(uid);
          setNeedsEmailVerification(false);
          setPendingEmail(null);
        } else if (!uid) {
          setProfile(null);
          profileFetchedFor.current = null;
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      fullName: string
    ) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, full_name: fullName },
        },
      });
      if (error) return { error: translateAuthError(error.message), needsVerification: false };

      // If email confirmation is enabled, Supabase returns a session=null
      // with a user object — the user must verify their email before logging in.
      if (data.user && !data.session) {
        setNeedsEmailVerification(true);
        setPendingEmail(email);
        return { error: null, needsVerification: true };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        setNeedsEmailVerification(false);
        setPendingEmail(null);
        if (data.user) fetchProfile(data.user.id);
      }
      return { error: null, needsVerification: false };
    },
    [fetchProfile]
  );

  const signIn = useCallback(
    async (email: string, password: string, _rememberMe?: boolean) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        // Supabase returns this when email confirmation is required but not done.
        if (msg.includes('email') && msg.includes('confirm')) {
          setNeedsEmailVerification(true);
          setPendingEmail(email);
          return { error: null, needsVerification: true };
        }
        return { error: translateAuthError(error.message), needsVerification: false };
      }
      setSession(data.session);
      setUser(data.user);
      setNeedsEmailVerification(false);
      setPendingEmail(null);
      if (data.user) fetchProfile(data.user.id);
      return { error: null, needsVerification: false };
    },
    [fetchProfile]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setNeedsEmailVerification(false);
    setPendingEmail(null);
    profileFetchedFor.current = null;
  }, []);

  const clearEmailVerification = useCallback(() => {
    setNeedsEmailVerification(false);
    setPendingEmail(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        profileLoading,
        needsEmailVerification,
        pendingEmail,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        clearEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Incorrect email or password.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'An account with this email already exists.';
  if (m.includes('password') && m.includes('6'))
    return 'Password must be at least 6 characters.';
  if (m.includes('email')) return 'Please enter a valid email address.';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a moment.';
  return message;
}
