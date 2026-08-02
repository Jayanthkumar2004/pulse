import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Shield,
  Trash2,
  User as UserIcon,
  AtSign,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  profileSchema,
  type ProfileValues,
} from '@/lib/validation';
import {
  getProfile,
  updateProfile,
  checkUsernameAvailable,
  uploadAvatar,
} from '@/services/profile.service';
import { deleteAccount } from '@/services/auth.service';
import { formatPresence, formatRelative } from '@/lib/format';
import type { Profile } from '@/types';

export function ProfilePage() {
  const { userId } = useParams();
  const { user, profile: myProfile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const isOwn = !userId || userId === user?.id;
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const targetId = userId || user?.id;
      if (!targetId) return;
      setLoading(true);
      const p = await getProfile(targetId);
      if (!active) return;
      setViewProfile(p);
      if (p && isOwn) {
        setValue('full_name', p.full_name);
        setValue('username', p.username);
        setValue('bio', p.bio);
        setValue('phone', p.phone || '');
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, user?.id, isOwn, setValue]);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setViewProfile((p) => (p ? { ...p, avatar_url: url } : p));
      await refreshProfile();
      toast.success('Profile picture updated');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onSubmit = async (values: ProfileValues) => {
    if (!user) return;
    try {
      if (values.username !== viewProfile?.username) {
        const available = await checkUsernameAvailable(values.username, user.id);
        if (!available) {
          toast.error('Username is already taken');
          return;
        }
      }
      await updateProfile(user.id, {
        full_name: values.full_name,
        username: values.username,
        bio: values.bio || '',
        phone: values.phone || null,
      });
      await refreshProfile();
      setViewProfile((p) =>
        p
          ? {
              ...p,
              full_name: values.full_name,
              username: values.username,
              bio: values.bio || '',
              phone: values.phone || null,
            }
          : p
      );
      setEditing(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Update failed');
    }
  };

  const onDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await deleteAccount(user.id);
      if (error) throw new Error(error);
      toast.success('Account deleted');
      await signOut();
      navigate('/login', { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const p = viewProfile || myProfile;

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
          {isOwn ? 'Profile' : 'Contact Info'}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Avatar */}
        <div className="flex flex-col items-center py-8 px-4">
          <div className="relative">
            <Avatar
              src={p?.avatar_url}
              name={p?.full_name || p?.username}
              size={128}
              className="shadow-lift"
            />
            {isOwn && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-soft hover:bg-accent-600 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>
          <h2 className="mt-4 text-xl font-bold text-chat-bubbleText dark:text-chat-dark-bubbleText">
            {p?.full_name || 'Unknown'}
          </h2>
          <p className="text-sm text-chat-muted">@{p?.username}</p>
          {!isOwn && (
            <p className="mt-1 text-sm text-chat-muted">
              {formatPresence(p?.is_online ?? false, p?.last_seen, p?.last_seen_visible)}
            </p>
          )}
        </div>

        {isOwn && (
          <div className="px-4 pb-4">
            <Button
              variant={editing ? 'outline' : 'primary'}
              onClick={() => setEditing((e) => !e)}
              className="w-full"
            >
              {editing ? 'Cancel editing' : 'Edit profile'}
            </Button>
          </div>
        )}

        {/* Details / Edit form */}
        <div className="px-4 pb-8">
          {isOwn && editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Full name"
                icon={<UserIcon className="h-4 w-4" />}
                error={errors.full_name?.message}
                {...register('full_name')}
              />
              <Input
                label="Username"
                icon={<AtSign className="h-4 w-4" />}
                error={errors.username?.message}
                hint="Letters, numbers, _ and . only"
                {...register('username')}
              />
              <Textarea
                label="Bio"
                rows={3}
                placeholder="Tell something about yourself..."
                error={errors.bio?.message}
                {...register('bio')}
              />
              <Input
                label="Phone (optional)"
                icon={<Phone className="h-4 w-4" />}
                error={errors.phone?.message}
                {...register('phone')}
              />
              <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
                <Check className="h-4 w-4" /> Save changes
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <DetailRow label="Username" value={`@${p?.username}`} />
              <DetailRow label="Bio" value={p?.bio || 'No bio yet'} />
              {p?.phone && <DetailRow label="Phone" value={p.phone} />}
              <DetailRow
                label="Status"
                value={formatPresence(p?.is_online ?? false, p?.last_seen, p?.last_seen_visible)}
              />
              <DetailRow label="Joined" value={p ? formatRelative(p.created_at) : ''} />
            </div>
          )}
        </div>

        {/* Danger zone */}
        {isOwn && !editing && (
          <div className="px-4 pb-8 border-t border-chat-border dark:border-chat-dark-border pt-6">
            <h3 className="mb-3 text-sm font-semibold text-chat-muted uppercase tracking-wide">
              Account
            </h3>
            <div className="flex flex-col gap-2">
              <Link
                to="/settings"
                className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Shield className="h-5 w-5 text-chat-muted" />
                <span className="text-sm text-chat-bubbleText dark:text-chat-dark-bubbleText">
                  Privacy & settings
                </span>
              </Link>
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-error hover:bg-error/5 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                <span className="text-sm font-medium">Delete account</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete account?"
        size="sm"
      >
        <div className="px-5 py-4">
          <p className="text-sm text-chat-muted">
            This permanently deletes your profile, messages, and all associated
            data. This action cannot be undone.
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={onDeleteAccount}
              className="flex-1"
            >
              Delete forever
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.03] px-4 py-3">
      <p className="text-xs font-medium text-chat-muted uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-chat-bubbleText dark:text-chat-dark-bubbleText break-words">
        {value}
      </p>
    </div>
  );
}
