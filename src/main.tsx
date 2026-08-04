import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // Register the service worker in production builds and on localhost (so
  // Web Push can be tested). Skip during plain `vite dev` on a remote host
  // to avoid stale-cache conflicts with HMR.
  if (import.meta.env.PROD || import.meta.env.DEV && isLocalhost) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          // Subscribe to Web Push as soon as the worker is ready if the user
          // has already granted permission.
          if ('Notification' in window && Notification.permission === 'granted') {
            return import('./services/push.service').then(({ subscribeToPush }) =>
              subscribeToPush()
            );
          }
        })
        .catch((err) => console.warn('Service worker registration failed', err));
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      return Promise.all(registrations.map((registration) => registration.unregister()));
    }).catch(() => undefined);
  }
}
