/**
 * OneSignal Web SDK v16 wrapper.
 *
 * OneSignal manages Web Push notifications (background/closed-app) via its own
 * service worker (`OneSignalSDKWorker.js`). This module provides a typed
 * wrapper around the global `OneSignal` object so the app can:
 *
 *   - initialize the SDK with the app id
 *   - link the authenticated Supabase user id to the OneSignal subscription
 *   - toggle the opt-in subscription state
 *
 * IMPORTANT (v16): The SDK script is loaded with `defer` in index.html, so the
 * global `OneSignal` object may not exist yet when this module runs. We must
 * use `window.OneSignalDeferred.push(callback)` to queue commands until the
 * SDK is ready. Calling `OneSignal.init()` directly can silently no-op.
 */

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;

type OneSignalInitOptions = {
  appId: string;
  serviceWorkerParam?: { scope: string };
  serviceWorkerPath?: string;
  allowLocalhostAsSecureOrigin?: boolean;
};

type OneSignalGlobal = {
  init?: (options: OneSignalInitOptions) => Promise<void>;
  login?: (externalUserId: string) => Promise<void>;
  logout?: () => Promise<void>;
  setSubscription?: (enabled: boolean) => Promise<void>;
  Notifications?: {
    requestPermission?: () => Promise<boolean | undefined>;
  };
};

type OneSignalDeferred = {
  push: (callback: (OneSignal: OneSignalGlobal) => void) => void;
};

function getOneSignal(): OneSignalGlobal | undefined {
  return (window as unknown as { OneSignal?: OneSignalGlobal }).OneSignal;
}

function getDeferred(): OneSignalDeferred | undefined {
  return (window as unknown as { OneSignalDeferred?: OneSignalDeferred }).OneSignalDeferred;
}

/** Whether the OneSignal app id is configured in the environment. */
export function isOneSignalConfigured(): boolean {
  return Boolean(APP_ID);
}

/**
 * Initialize OneSignal with the configured app id.
 *
 * Uses `OneSignalDeferred.push()` so the command runs as soon as the SDK
 * script (loaded with `defer`) is ready. This is the recommended v16 pattern.
 */
export function initOneSignal(): Promise<void> {
  if (!APP_ID) {
    if (import.meta.env.PROD) {
      console.warn(
        '[onesignal] `VITE_ONESIGNAL_APP_ID` is not set. OneSignal push notifications are disabled.'
      );
    }
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const deferred = getDeferred();
    if (!deferred?.push) {
      console.warn('[onesignal] SDK not loaded. Did you add the OneSignal script to index.html?');
      resolve();
      return;
    }

    deferred.push((OneSignal) => {
      if (!OneSignal?.init) {
        console.warn('[onesignal] OneSignal.init is not available.');
        resolve();
        return;
      }

      OneSignal.init({
        appId: APP_ID,
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        allowLocalhostAsSecureOrigin: true,
      })
        .then(() => resolve())
        .catch((err) => {
          console.warn('[onesignal] init failed', err);
          resolve();
        });
    });
  });
}

/** Link the current Supabase user to the OneSignal subscription. */
export function loginOneSignal(externalUserId: string): Promise<void> {
  return new Promise((resolve) => {
    const deferred = getDeferred();
    if (!deferred?.push) {
      resolve();
      return;
    }
    deferred.push((OneSignal) => {
      if (!OneSignal?.login) {
        resolve();
        return;
      }
      OneSignal.login(externalUserId)
        .then(() => resolve())
        .catch((err) => {
          console.warn('[onesignal] login failed', err);
          resolve();
        });
    });
  });
}

/** Unlink the user from the OneSignal subscription (e.g. on sign-out). */
export function logoutOneSignal(): Promise<void> {
  return new Promise((resolve) => {
    const deferred = getDeferred();
    if (!deferred?.push) {
      resolve();
      return;
    }
    deferred.push((OneSignal) => {
      if (!OneSignal?.logout) {
        resolve();
        return;
      }
      OneSignal.logout()
        .then(() => resolve())
        .catch((err) => {
          console.warn('[onesignal] logout failed', err);
          resolve();
        });
    });
  });
}

/** Enable or disable push notifications for this device. */
export function setOneSignalSubscription(enabled: boolean): Promise<void> {
  return new Promise((resolve) => {
    const deferred = getDeferred();
    if (!deferred?.push) {
      resolve();
      return;
    }
    deferred.push((OneSignal) => {
      if (!OneSignal?.setSubscription) {
        resolve();
        return;
      }
      OneSignal.setSubscription(enabled)
        .then(() => resolve())
        .catch((err) => {
          console.warn('[onesignal] setSubscription failed', err);
          resolve();
        });
    });
  });
}

/** Prompt the user for notification permission (OneSignal-managed). */
export function requestOneSignalPermission(): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    const deferred = getDeferred();
    if (!deferred?.push) {
      resolve(undefined);
      return;
    }
    deferred.push((OneSignal) => {
      if (!OneSignal?.Notifications?.requestPermission) {
        resolve(undefined);
        return;
      }
      OneSignal.Notifications.requestPermission()
        .then((result) => resolve(result))
        .catch((err) => {
          console.warn('[onesignal] requestPermission failed', err);
          resolve(undefined);
        });
    });
  });
}
