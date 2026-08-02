import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, type LoginValues } from '@/lib/validation';

export function LoginPage() {
  const { signIn, needsEmailVerification, clearEmailVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPw, setShowPw] = useState(false);
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    '/chats';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (values: LoginValues) => {
    const { error, needsVerification } = await signIn(
      values.email,
      values.password,
      values.rememberMe
    );
    if (needsVerification) {
      navigate('/verify-email', { replace: true });
      return;
    }
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Welcome back!');
    navigate(from, { replace: true });
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to Pulse.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
            autoComplete="current-password"
            {...register('password')}
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-chat-muted cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="h-4 w-4 rounded border-chat-border accent-accent"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>

      {needsEmailVerification && (
        <p className="mt-4 text-center text-sm text-warning">
          Please verify your email to continue.{' '}
          <Link
            to="/verify-email"
            className="font-medium text-accent hover:underline"
            onClick={clearEmailVerification}
          >
            Resend link
          </Link>
        </p>
      )}

      <p className="mt-6 text-center text-sm text-chat-muted">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
