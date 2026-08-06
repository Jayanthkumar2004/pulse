# Pulse Chat

A modern, real-time chat application inspired by WhatsApp — built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

## Features

### Authentication
- Email & password sign up / sign in / sign out
- Forgot password & reset password flows
- Session persistence with auto-refresh tokens
- Protected routes (redirect to login when unauthenticated)
- Password strength meter on registration
- Automatic profile creation on sign-up (database trigger)

### Chat
- **Real-time messaging** via Supabase Realtime (no page refresh)
- **Direct (1:1) conversations** — search any username and start chatting instantly (no friend requests)
- **Message status receipts**: single tick (sent), double tick (delivered), blue tick (read)
- **Typing indicator** ("typing...") with live broadcast
- **Online presence** + last seen timestamps
- **Message actions**: reply, edit, copy, forward, star, delete for me, delete for everyone
- **Emoji reactions** (6 quick reactions)
- **Date dividers** between days
- **In-chat search** through message history
- **Pin, mute, and archive** conversations

### Media
- Send **images, videos, audio, voice notes, and documents** (PDF, DOC, DOCX, PPT, ZIP, APK, etc.)
- Image / video / PDF previews, audio player, and download button
- Voice note recording from the composer
- Files stored in Supabase Storage with per-user path isolation

### Search
- Search users **by username only** (debounced, partial + exact matches)
- Shows profile picture, username, name, and online status
- Only matching users appear — never lists every registered user
- "No user found" empty state

### Profile & Settings
- Editable profile: full name, username (uniqueness enforced), bio, phone
- Upload / change avatar
- View another user's profile from a chat
- Theme: light / dark / system
- Accent color customization (6 colors)
- Browser notification & sound toggles
- Starred messages page
- Delete account

### Notifications
- Browser notifications when the tab is in the background
- Notification sound (synthesized via Web Audio API)
- Click-to-open-chat from a notification

### UI / UX
- Responsive: two-pane on desktop, single-pane with back navigation on mobile
- WhatsApp-inspired doodle chat background
- Smooth animations & micro-interactions
- Skeleton loaders, empty states, toast notifications
- PWA-ready (manifest + service worker)

### Security
- **Row Level Security** on every database table
- Only conversation members can read messages
- Only the sender can edit / delete their own messages
- Storage policies enforce per-user path ownership
- Recipient-side receipt updates go through SECURITY DEFINER functions (can't edit message bodies)
- `is_conversation_member()` helper guards all membership-scoped policies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Routing | React Router DOM |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query (React Query) |
| Animation | Framer Motion |
| Icons | Lucide React |
| Toasts | React Hot Toast |
| Dates | date-fns + date-fns-tz |
| Backend | Supabase (Auth, Postgres, Realtime, Storage) |

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (already provisioned in this environment)

### Install & Run
```bash
npm install
npm run dev
```

### Environment Variables
The following are pre-populated in `.env`:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id   # required for OneSignal push notifications
```

### PWA Push Notifications
Push notifications are handled by **OneSignal**. The Web SDK is loaded in
`index.html`, its service worker (`public/OneSignalSDKWorker.js`) is served from
the app root, and the app links the authenticated Supabase user id to the
OneSignal subscription via `src/services/onesignal.service.ts`.

To enable **native Web Push notifications** when the app is closed/backgrounded:

1. Create a OneSignal app at https://onesignal.com and copy its **App ID**.
2. Add `VITE_ONESIGNAL_APP_ID` to `.env` (local) and to your Vercel env vars.
3. Rebuild and test.

When deploying to **Vercel**, remember `VITE_ONESIGNAL_APP_ID` (and the Supabase
env vars) must be set as **build-time** environment variables in the Vercel project
settings, then redeploy — otherwise push notifications are silently disabled.

### Build
```bash
npm run build      # production build
npm run typecheck   # type checking
npm run lint        # ESLint
```

## Database Schema

13 tables with RLS enabled:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (username, name, avatar, bio, presence) |
| `conversations` | Chat threads (direct or group) |
| `conversation_members` | Membership + per-user state (read, muted, archived) |
| `messages` | Messages with reply, edit, delete, and receipt tracking |
| `attachments` | Media metadata linked to Storage |
| `message_reactions` | Emoji reactions |
| `deleted_messages` | Per-user "delete for me" tombstones |
| `blocked_users` | Block list |
| `pinned_chats` | Pinned conversations |
| `starred_messages` | Bookmarked messages |
| `user_settings` | Theme, notifications, accent color |
| `notifications` | Notification events |
| `typing_status` | Ephemeral typing state |

### Helper Functions (SECURITY DEFINER)
- `is_conversation_member(conv, user)` — membership check
- `get_or_create_direct_conversation(other_user)` — atomic 1-1 chat creation
- `mark_message_delivered(id)` / `mark_message_read(id)` — receipt updates
- `mark_conversation_read(conv)` — clears unread + marks messages read

### Storage Buckets (7)
`avatars` (public), `chat-images`, `chat-videos`, `documents`, `audio`, `voice-notes`, `temporary` — all with per-user path ownership policies.

### Realtime
All chat tables are added to the `supabase_realtime` publication for live updates.

## Project Structure
```
src/
  components/    Reusable UI + chat components
  context/       Auth, Theme, Query providers
  hooks/         Realtime, presence, typing, voice recorder, debounce, notifications
  layouts/       AuthLayout, ChatLayout
  lib/           Supabase client, constants, utils, format, files, sound, validation
  pages/         Login, Register, ForgotPassword, ResetPassword, Chat, Profile, Settings, Starred
  routes/        ProtectedRoute wrapper
  services/      auth, profile, conversation, message services
  types/         TypeScript interfaces
```

## License
This is a demo project for educational purposes.
