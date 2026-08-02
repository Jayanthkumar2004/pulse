import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { resendEmailVerification } from '@/services/auth.service';

export function VerifyEmailPage() {
  const { pendingEmail, clearEmailVerification } = useAuth();
  const [resending, setResending] = useState(false);
  const email = pendingEmail || '';

  const handleResend = async () => {
    if (!email) {
      toast.error('Please sign up again to receive a verification link.');
      return;
    }
    setResending(true);
    // Re-trigger the signup flow with the same email — Supabase will resend
    // the confirmation link to an existing unconfirmed user.
    const { error, needsVerification } = await resendEmailVerification(
      email,
      'placeholder-not-used'
    );
    setResending(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (needsVerification) {
      toast.success('Verification email sent again. Check your inbox.');
    } else {
      // The user was already verified and signed in.
      toast.success('Your email is already verified.');
      clearEmailVerification();
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`We sent a confirmation link to ${email || 'your email'}.`}
    >
      <div className="flex flex-col items-center gap-5 py-4 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <MailCheck className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-chat-muted">
            Click the link in the email to activate your account. You can close
            this tab and come back after verifying.
          </p>
          {email && (
            <p className="text-xs text-chat-muted">
              The link was sent to{' '}
              <span className="font-medium text-chat-bubbleText dark:text-chat-dark-bubbleText">
                {email}
              </span>
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            variant="outline"
            onClick={handleResend}
            loading={resending}
            className="w-full"
          >
            {!resending && <RefreshCw className="h-4 w-4" />}
            {resending ? 'Sending...' : 'Resend verification email'}
          </Button>
          <Link
            to="/login"
            onClick={clearEmailVerification}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-accent hover:underline pt-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs text-chat-muted pt-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Waiting for verification...
        </div>
      </div>
    </AuthLayout>
  );
}
