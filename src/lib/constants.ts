export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  chatImages: 'chat-images',
  chatVideos: 'chat-videos',
  documents: 'documents',
  audio: 'audio',
  voiceNotes: 'voice-notes',
  temporary: 'temporary',
} as const;

export type StorageBucketId =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const MAX_TEXT_LENGTH = 4000;
export const MAX_USERNAME_LENGTH = 24;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB hard cap

export const MESSAGES_PAGE_SIZE = 30;

export const CONVERSATIONS_PAGE_SIZE = 40;

export const TYPING_TIMEOUT_MS = 4000;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
export const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/webm'];
export const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/vnd.android.package-archive',
  'text/plain',
  'application/json',
  'application/csv',
];

export const MESSAGE_STATUSES = {
  sending: 'sending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
} as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[keyof typeof MESSAGE_STATUSES];
