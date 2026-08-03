import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Moon,
  Sun,
  Monitor,
  Bell,
  Volume2,
  Palette,
  Shield,
  Globe,
  User as UserIcon,
  Star,
  LogOut,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const ACCENT_COLORS = ['#00a884', '#2563eb', '#0ea5e9', '#e11d48', '#f59e0b', '#10b981'];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { mode, setMode, accentColor, setAccentColor } = useTheme();
const { permission, requestPermission, disable } = useBrowserNotifications();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleNotifs = async () => {
    if (!notifEnabled && permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }
    }
    setNotifEnabled((n) => !n);
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, notifications_enabled: !notifEnabled });
    }
    // If disabling, also remove the push subscription.
    if (notifEnabled) {
      await disable();
    }
  };

  const toggleSound = async () => {
    setSoundEnabled((s) => !s);
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, sound_enabled: !soundEnabled });
    }
  };

  const themeOptions: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="h-4 w-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="h-4 w-4" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="h-4 w-4" />, label: 'System' },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-chat-panel dark:bg-chat-dark-panel">
      <header className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-chat-border dark:border-chat-dark-border">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5 text-chat-bubbleText dark:text-chat-dark-bubbleText" />
        </button>
        <h1 className="text-lg font-semibold text-chat-bubbleText dark:text-chat-dark-bubbleText">
          Settings
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-8">
        {/* Profile card */}
        <button
          onClick={() => navigate('/profile')}
          className="flex w-full items-center gap-4 px-4 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username}
            size={56}
            online
            showStatus
          />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-base font-semibold text-chat-bubbleText dark:text-chat-dark-bubbleText">
              {profile?.full_name || 'Set your name'}
            </p>
            <p className="truncate text-sm text-chat-muted">@{profile?.username}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-chat-muted" />
        </button>

        {/* Appearance */}
        <Section title="Appearance" icon={<Palette className="h-4 w-4" />}>
          <div className="px-4 py-3">
            <p className="mb-3 text-sm font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText">
              Theme
            </p>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-all',
                    mode === opt.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-chat-border dark:border-chat-dark-border text-chat-muted hover:bg-black/5 dark:hover:bg-white/5'
                  )}
                >
                  {opt.icon}
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-chat-border dark:border-chat-dark-border">
            <p className="mb-3 text-sm font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText">
              Accent color
            </p>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-transform hover:scale-110',
                    accentColor === color && 'ring-2 ring-offset-2 ring-offset-chat-panel dark:ring-offset-chat-dark-panel ring-current scale-110'
                  )}
                  style={{ backgroundColor: color, color }}
                />
              ))}
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={<Bell className="h-4 w-4" />}>
          <ToggleRow
            label="Browser notifications"
            description={
              permission === 'unsupported'
                ? 'Not supported on this device'
                : permission === 'denied'
                ? 'Blocked — enable in browser settings'
                : 'Get notified of new messages'
            }
            checked={notifEnabled && permission === 'granted'}
            onChange={toggleNotifs}
            disabled={permission === 'unsupported' || permission === 'denied'}
          />
          <ToggleRow
            label="Notification sound"
            description="Play a sound on new messages"
            checked={soundEnabled}
            onChange={toggleSound}
            icon={<Volume2 className="h-4 w-4" />}
          />
        </Section>

        {/* Privacy */}
        <Section title="Privacy" icon={<Shield className="h-4 w-4" />}>
          <NavRow
            label="Blocked users"
            description="Manage who you've blocked"
            onClick={() => toast('Blocked users list coming soon', { icon: '🚫' })}
          />
          <NavRow
            label="Last seen & online"
            description="Control your visibility"
            onClick={() => toast('Privacy controls coming soon', { icon: '🔒' })}
          />
          <NavRow
            label="Read receipts"
            description="Manage blue ticks"
            onClick={() => toast('Privacy controls coming soon', { icon: '🔒' })}
          />
        </Section>

        {/* More */}
        <Section title="More" icon={<Globe className="h-4 w-4" />}>
          <NavRow
            label="Starred messages"
            description="Your bookmarked messages"
            icon={<Star className="h-4 w-4" />}
            onClick={() => navigate('/starred')}
          />
          <NavRow
            label="Profile"
            description="Edit your profile information"
            icon={<UserIcon className="h-4 w-4" />}
            onClick={() => navigate('/profile')}
          />
        </Section>

        {/* Account */}
        <div className="px-4 mt-6">
          <Button
            variant="outline"
            onClick={() => signOut()}
            className="w-full"
          >
            <LogOut className="h-4 w-4" /> Log out
          </Button>
          <button
            onClick={() => navigate('/profile')}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-error hover:bg-error/5 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-chat-muted">
        {icon}
        {title}
      </div>
      <div className="bg-white dark:bg-chat-dark-bubble">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-chat-border dark:border-chat-dark-border last:border-0">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 text-chat-muted">{icon}</span>}
        <div>
          <p className="text-sm font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText">
            {label}
          </p>
          <p className="text-xs text-chat-muted">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors shrink-0',
          checked ? 'bg-accent' : 'bg-gray-300 dark:bg-white/15',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

function NavRow({
  label,
  description,
  onClick,
  icon,
}: {
  label: string;
  description: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 border-b border-chat-border dark:border-chat-dark-border last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
    >
      {icon && <span className="text-chat-muted">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText">
          {label}
        </p>
        <p className="text-xs text-chat-muted">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-chat-muted" />
    </button>
  );
}
