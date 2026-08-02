import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AtSign, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  registerSchema,
  type RegisterValues,
  passwordStrength,
} from '@/lib/validation';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const strength = passwordStrength(pw);

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true);
    const { error, needsVerification } = await signUp(
      values.email,
      values.password,
      values.username,
      values.fullName
    );
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (needsVerification) {
      toast.success('Account created! Check your email to verify.');
      navigate('/verify-email', { replace: true });
      return;
    }
    toast.success('Account created! Welcome to Pulse.');
    navigate('/chats', { replace: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Pulse and start chatting instantly."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Full name"
          placeholder="Jane Doe"
          icon={<User className="h-4 w-4" />}
          error={errors.fullName?.message}
          autoComplete="name"
          {...register('fullName')}
        />
        <Input
          label="Username"
          placeholder="janedoe"
          icon={<AtSign className="h-4 w-4" />}
          error={errors.username?.message}
          hint="Only letters, numbers, _ and . — must start with a letter."
          autoComplete="username"
          {...register('username')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          autoComplete="email"
          {...register('email')}
        />
        <div className="relative">
          <Input
            label="Password"
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
            aria-label={showPw ? 'Hide password' : 'Show password'}
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

        <label className="flex items-start gap-2.5 text-sm text-chat-muted">
          <input
            type="checkbox"
            {...register('acceptTerms')}
            className="mt-0.5 h-4 w-4 rounded border-chat-border accent-accent"
          />
          <span>
            I agree to the Terms of Service and Privacy Policy.
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="-mt-2 text-xs text-error">{errors.acceptTerms.message}</p>
        )}

        <Button type="submit" size="lg" loading={isSubmitting || submitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-chat-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
