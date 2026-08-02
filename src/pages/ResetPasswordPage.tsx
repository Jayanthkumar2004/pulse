import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { resetSchema, type ResetValues, passwordStrength } from '@/lib/validation';
import { updatePassword } from '@/services/auth.service';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const strength = passwordStrength(pw);

  const onSubmit = async (values: ResetValues) => {
    const { error } = await updatePassword(values.password);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Password updated. Please sign in.');
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="relative">
          <Input
            label="New password"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            autoComplete="new-password"
            {...register('password')}
            onChange={(e) => {
              setPw(e.target.value);
              register('password').onChange(e);
            }}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-[34px] text-chat-muted hover:text-chat-bubbleText dark:hover:text-chat-dark-bubbleText transition-colors"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {pw && (
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(strength.score / 4) * 100}%`,
                  backgroundColor: strength.color,
                }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
        )}

        <Input
          label="Confirm password"
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
          {...register('confirmPassword')}
        />

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
