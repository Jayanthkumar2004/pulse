import { type ReactNode } from 'react';
import { MessageCircle, ShieldCheck, Zap } from 'lucide-react';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full bg-white dark:bg-chat-dark-bg">
      {/* Left brand panel (desktop only) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-accent to-accent-700 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <MessageCircle className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Pulse</span>
        </div>

        <div className="max-w-md animate-slide-up">
          <h1 className="text-4xl font-bold leading-tight">
            Conversations that feel instant.
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Real-time messaging with end-to-end privacy, rich media, and a
            clean modern interface — anywhere you go.
          </p>
          <div className="mt-8 flex flex-col gap-4">
            <Feature icon={<Zap className="h-5 w-5" />} text="Real-time delivery & typing indicators" />
            <Feature icon={<ShieldCheck className="h-5 w-5" />} text="Private conversations, row-level secured" />
            <Feature icon={<MessageCircle className="h-5 w-5" />} text="Photos, videos, voice notes & documents" />
          </div>
        </div>

        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} Pulse Chat
        </p>

        {/* decorative blobs */}
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden flex items-center justify-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-chat-bubbleText dark:text-chat-dark-bubbleText">
              Pulse
            </span>
          </div>
          <h2 className="text-2xl font-bold text-chat-bubbleText dark:text-chat-dark-bubbleText">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-chat-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur shrink-0">
        {icon}
      </div>
      <span className="text-white/90 text-sm">{text}</span>
    </div>
  );
}
