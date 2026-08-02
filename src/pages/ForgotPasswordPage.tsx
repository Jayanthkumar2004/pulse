import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { forgotSchema, type ForgotValues } from '@/lib/validation';
import { sendPasswordResetEmail } from '@/services/auth.service';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotValues) => {
    const { error } = await sendPasswordResetEmail(values.email);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
    toast.success('Reset link sent to your email');
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password."
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-sm text-chat-muted">
            Check your inbox for a password reset link. It expires in one hour.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
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
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              Send reset link
            </Button>
          </form>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
