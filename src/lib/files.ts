import {
  STORAGE_BUCKETS,
  StorageBucketId,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_DOC_TYPES,
  MAX_FILE_SIZE,
} from './constants';

export type MediaCategory = 'image' | 'video' | 'audio' | 'voice' | 'document';

/** Classify a file by its MIME type into a media category + bucket. */
export function classifyFile(file: File): {
  category: MediaCategory;
  bucket: StorageBucketId;
} {
  const type = file.type;
  if (ACCEPTED_IMAGE_TYPES.includes(type)) {
    return { category: 'image', bucket: STORAGE_BUCKETS.chatImages };
  }
  if (ACCEPTED_VIDEO_TYPES.includes(type)) {
    return { category: 'video', bucket: STORAGE_BUCKETS.chatVideos };
  }
  if (type === 'audio/webm' && file.name.startsWith('voice-')) {
    return { category: 'voice', bucket: STORAGE_BUCKETS.voiceNotes };
  }
  if (ACCEPTED_AUDIO_TYPES.includes(type)) {
    return { category: 'audio', bucket: STORAGE_BUCKETS.audio };
  }
  if (ACCEPTED_DOC_TYPES.includes(type) || type.startsWith('application/')) {
    return { category: 'document', bucket: STORAGE_BUCKETS.documents };
  }
  return { category: 'document', bucket: STORAGE_BUCKETS.documents };
}

export function validateFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `${file.name} exceeds the 100MB limit` };
  }
  const { category } = classifyFile(file);
  if (category === 'document' && !ACCEPTED_DOC_TYPES.includes(file.type) && !file.type) {
    return { ok: false, error: 'Unsupported file type' };
  }
  return { ok: true };
}

/** Build a Storage path: {userId}/{timestamp}-{random}.{ext}. */
export function buildStoragePath(userId: string, file: File): string {
  const ext = file.name.split('.').pop() || 'bin';
  const rand = Math.random().toString(36).slice(2, 8);
  const safeName = `${Date.now()}-${rand}.${ext}`.replace(/\s+/g, '-');
  return `${userId}/${safeName}`;
}

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** File-type icon name (lucide) for a document attachment. */
export function fileIconName(mime: string): string {
  if (mime.includes('pdf')) return 'FileText';
  if (mime.includes('word') || mime.includes('msword')) return 'FileType';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'Presentation';
  if (mime.includes('zip') || mime.includes('compressed')) return 'FileArchive';
  if (mime.includes('apk')) return 'Smartphone';
  return 'File';
}

/** Read an image file into a data URL for previews. */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Get image dimensions from a data URL. */
export function getImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
}

/** Get audio/video duration in seconds from a File. */
export function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = file.type.startsWith('audio')
      ? new Audio()
      : document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(el.duration) ? el.duration : 0);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    el.src = url;
  });
}
