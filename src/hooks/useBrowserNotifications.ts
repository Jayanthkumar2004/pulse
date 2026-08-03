import { useEffect, useState, useCallback } from 'react';
import { subscribeToPush, unsubscribeFromPush } from '@/services/push.service';

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<Permission>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as Permission;
  });

  useEffect(() => {
    if (!('Notification' in window)) return;
    setPermission(Notification.permission as Permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported' as const;
    const result = await Notification.requestPermission();
    setPermission(result as Permission);
    if (result === 'granted') {
      // Register the PWA push subscription if the service worker is ready.
      await subscribeToPush();
    }
    return result as Permission;
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions & { onClick?: () => void }) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }
      try {
        const n = new Notification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          ...options,
        });
        if (options?.onClick) {
          n.onclick = () => {
            window.focus();
            options.onClick?.();
            n.close();
          };
        }
        setTimeout(() => n.close(), 8000);
      } catch {
        // Some browsers throw if constructed in a service worker context.
      }
    },
    []
  );

  const disable = useCallback(async () => {
    await unsubscribeFromPush();
  }, []);

  return { permission, requestPermission, notify, disable };
}
