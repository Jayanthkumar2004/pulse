# PWA Push Notifications Setup Guide

Pulse supports **Web Push** notifications so users get native notifications when the
app is closed or in the background. This requires a few pieces of configuration that
must be set up together. Below is the complete, step-by-step guide.

> **Important:** In-app foreground notifications (the app is open and focused) work
> automatically via `new Notification()` once the browser permission is granted.
> The guide below is for **background/closed-app** Web Push.

---

## How it works (the full chain)

```
User sends a message
   │
   ▼
messages table (INSERT)
   │
   ▼
DB trigger (notify_message_push) fires
   │  reads app.push.edge_url + app.push.webhook_secret
   ▼
pg_net performs async HTTP POST
   │  Authorization: Bearer <webhook_secret>
   ▼
send-push Edge Function
   │  reads VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY secrets
   ▼
web-push library signs & sends to each recipient's push endpoint
   │
   ▼
Push service → User's device → Service Worker shows notification
```

Every box in this chain must be configured. Missing any one means notifications
won't arrive when the app is closed.

---

## Step 1 — Generate VAPID keys

VAPID keys are used to authenticate your server with the browser push service
(Chrome/Firefox/Edge). You need a **public** and **private** key.

```bash
# Install the web-push CLI once (anywhere)
npx web-push@latest generate-vapid-keys
```

This prints something like:

```
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa...

Private Key:
eXbGp90R1CdE9B7...
=======================================
```

Save both. The **public key** goes into your frontend `.env`, and both keys go into
the Edge Function secrets.

---

## Step 2 — Configure the frontend

Add the VAPID **public** key to your `.env` file (create one if it doesn't exist):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa...
```

> The `VITE_VAPID_PUBLIC_KEY` must be the **same** public key whose private key is
> stored in the Edge Function secrets.

---

## Step 3 — Integrate the Edge Function

The `send-push` Edge Function already exists in `supabase/functions/send-push/`.
Deploy it and set its secrets:

```bash
# Make sure you're linked to your Supabase project
supabase link --project-ref <project-ref>

# Deploy the function
supabase functions deploy send-push

# Set the secrets (use the VAPID keys from Step 1)
supabase secrets set VAPID_PUBLIC_KEY="BEl62iUYgUivxIkv69yViEuiBIa..."
supabase secrets set VAPID_PRIVATE_KEY="eXbGp90R1CdE9B7..."
supabase secrets set WEBHOOK_SECRET="<your-random-webhook-secret>"
```

Make sure you use a **strong random string** for `WEBHOOK_SECRET` — it must match the
one you set in Step 4.

> **Note:** Keep the `WEBHOOK_SECRET` value the same in Steps 3 and 4.

---

## Step 4 — Configure the database trigger

Run the migration that creates the trigger and set the Supabase config values:

```bash
# Apply migrations (this creates the trigger + push_subscriptions table)
supabase db push

# Register the Edge Function URL and the shared webhook secret
supabase config set app.push.edge_url "https://<project-ref>.supabase.co/functions/v1/send-push"
supabase config set app.push.webhook_secret "<your-random-webhook-secret>"
```

> `app.push.edge_url` and `app.push.webhook_secret` are read by the `notify_message_push`
> trigger function. If these are empty, the trigger silently skips sending.

---

## Step 5 — Rebuild & test

1. **Rebuild the frontend** so the new `.env` value is picked up:
   ```bash
   npm run build
   ```
   Then deploy the `dist/` folder (or run `npm run preview` locally).

2. **Install/Open the PWA** and grant notification permission:
   - Open Settings → Notifications → enable "Browser notifications".
   - The browser will ask for permission. Click **Allow**.

3. **Test in two different browsers/accounts** (or two devices):
   - Open account A and send a message to account B.
   - Close or background account B's app.
   - Account B should receive a native notification.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| Notifications work only when app is open | VAPID keys not configured | Complete Steps 1–4 |
| No notification at all | `VITE_VAPID_PUBLIC_KEY` missing | Add it to `.env` and rebuild |
| `push_subscriptions` table is empty | Service worker not registered / permission not granted | Enable notifications in Settings; check `Application → Service Workers` in DevTools |
| Edge Function returns `vapid not configured` | `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` secrets missing | Set them in Step 3 |
| Trigger never fires | `app.push.edge_url` / `app.push.webhook_secret` config missing | Set them in Step 4 |
| `401 Unauthorized` from Edge Function | `WEBHOOK_SECRET` mismatch between Steps 3 & 4 | Make them identical |

### Quick verification
- **Check the service worker is registered:** DevTools → Application → Service Workers
- **Check a push subscription exists:** DevTools → Application → Service Workers → Push
  Subscription, or query the `push_subscriptions` table in the Supabase dashboard.
- **Check the Edge Function logs** in the Supabase dashboard → Edge Functions → `send-push` → Logs.

---

## Requirements recap

| Component | Where configured | Value |
|-----------|------------------|-------|
| `VITE_VAPID_PUBLIC_KEY` | Frontend `.env` | VAPID public key |
| `VAPID_PUBLIC_KEY` | Edge Function secret | VAPID public key (same) |
| `VAPID_PRIVATE_KEY` | Edge Function secret | VAPID private key |
| `WEBHOOK_SECRET` | Edge Function secret + `app.push.webhook_secret` | Same random string |
| `app.push.edge_url` | Supabase config | `https://<ref>.supabase.co/functions/v1/send-push` |
