import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
  showStatus?: boolean;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = 44,
  online,
  showStatus = false,
  className,
}: AvatarProps) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'avatar'}
          width={size}
          height={size}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-700 text-white font-semibold"
          style={{ fontSize: size * 0.36 }}
        >
          {initials || <User className="h-1/2 w-1/2" />}
        </div>
      )}
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full border-2 border-white dark:border-chat-dark-panel',
            online ? 'bg-success' : 'bg-gray-400'
          )}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
