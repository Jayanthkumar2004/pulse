import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  initOneSignal,
  loginOneSignal,
  logoutOneSignal,
  isOneSignalConfigured,
} from '@/services/onesignal.service';

/**
 * App-wide OneSignal initializer.
 *
 * Mount this once (e.g. in ChatLayout) so the OneSignal SDK is initialized and
 * the authenticated Supabase user is linked to the OneSignal subscription as
 * soon as they sign in. When the user signs out, the subscription is unlinked.
 *
 * Notification.permission is requested via the OneSignal-managed prompt
 * (see SettingsPage), not here, so we don't prompt users on every page load.
 */
export function useOneSignal() {
  const { user } = useAuth();

  useEffect(() => {
    if (!isOneSignalConfigured()) return;

    let active = true;

    void (async () => {
      await initOneSignal();
      if (!active) return;

      if (user) {
        await loginOneSignal(user.id);
      } else {
        await logoutOneSignal();
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);
}
