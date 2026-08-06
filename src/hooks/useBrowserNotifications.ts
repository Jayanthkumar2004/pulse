import { useEffect, useState, useCallback } from 'react';

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Foreground browser notification helper.
 *
 * This only handles in-app `new Notification()` foreground notifications.
 * Background/closed-app Web Push is delegated to OneSignal, which manages its
 * own service worker and subscriptions — no push logic lives here.
 */
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

  return { permission, requestPermission, notify };
}
