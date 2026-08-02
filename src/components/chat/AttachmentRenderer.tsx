import { useState, useRef, useEffect } from 'react';
import {
  Download,
  Play,
  Pause,
  FileText,
  FileArchive,
  FileType,
  Presentation,
  Smartphone,
  File as FileIcon,
  Loader2,
} from 'lucide-react';
import type { Attachment } from '@/types';
import { getPublicMediaUrl, downloadAttachment, getSignedMediaUrl } from '@/services/message.service';
import { formatBytes, fileIconName } from '@/lib/files';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  FileArchive,
  FileType,
  Presentation,
  Smartphone,
  File: FileIcon,
};

export function AttachmentRenderer({
  attachment,
  isMine,
}: {
  attachment: Attachment;
  isMine: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const isImage = attachment.mime_type.startsWith('image/');
    const isVideo = attachment.mime_type.startsWith('video/');
    
    if (isImage || isVideo) {
      // Use signed URL for images and videos
      getSignedMediaUrl(attachment.bucket_id, attachment.storage_path)
        .then((signedUrl) => {
          if (active) setUrl(signedUrl);
        })
        .catch(() => {
          // Fallback to public URL on error
          if (active) setUrl(getPublicMediaUrl(attachment.bucket_id, attachment.storage_path));
        });
    } else {
      // Use public URL for other media types
      setUrl(getPublicMediaUrl(attachment.bucket_id, attachment.storage_path));
    }
    return () => {
      active = false;
    };
  }, [attachment]);

  if (!url) {
    return (
      <div className="flex h-32 w-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chat-muted" />
      </div>
    );
  }

  if (attachment.mime_type.startsWith('image/')) {
    return <ImagePreview url={url} attachment={attachment} isMine={isMine} />;
  }
  if (attachment.mime_type.startsWith('video/')) {
    return <VideoPreview url={url} attachment={attachment} />;
  }
  if (attachment.mime_type.startsWith('audio/')) {
    return <AudioPlayer url={url} attachment={attachment} isMine={isMine} />;
  }
  return <DocumentPreview attachment={attachment} isMine={isMine} />;
}

function ImagePreview({
  url,
  attachment,
  isMine,
}: {
  url: string;
  attachment: Attachment;
  isMine: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const maxW = Math.min(attachment.width || 320, 320);
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"
      style={{ maxWidth: maxW }}
    >
      {!loaded && !errored && (
        <div className="flex h-48 w-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-chat-muted" />
        </div>
      )}
      {errored ? (
        <div className="flex h-32 w-full items-center justify-center text-chat-muted text-sm">
          Failed to load
        </div>
      ) : (
        <img
          src={url}
          alt={attachment.file_name}
          className={cn(
            'block w-full h-auto object-cover transition-opacity',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ maxHeight: 360 }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          loading="lazy"
        />
      )}
      <button
        onClick={() => downloadAttachment(attachment)}
        className={cn(
          'absolute bottom-1.5 right-1.5 rounded-full p-1.5 opacity-0 hover:opacity-100 transition-opacity',
          'bg-black/50 text-white',
          loaded && 'opacity-80'
        )}
        title="Download"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function VideoPreview({ url, attachment }: { url: string; attachment: Attachment }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      <video
        src={url}
        controls
        className="block w-full h-auto"
        style={{ maxHeight: 360, maxWidth: 320 }}
        preload="metadata"
      />
      <button
        onClick={() => downloadAttachment(attachment)}
        className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1.5 text-white opacity-80 hover:opacity-100"
        title="Download"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AudioPlayer({
  url,
  attachment,
  isMine,
}: {
  url: string;
  attachment: Attachment;
  isMine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => undefined);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 min-w-[200px]',
        isMine ? 'bg-white/15' : 'bg-black/5 dark:bg-white/5'
      )}
    >
      <button
        onClick={toggle}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isMine ? 'bg-white/25 text-white' : 'bg-accent text-white'
        )}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-black/15 dark:bg-white/15 overflow-hidden">
          <div
            className="h-full bg-current opacity-70 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={cn('flex justify-between mt-0.5 text-[10px]', isMine ? 'text-white/80' : 'text-chat-muted')}>
          <span>{formatTime(progress / 100 * duration)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <button
        onClick={() => downloadAttachment(attachment)}
        className={cn('shrink-0', isMine ? 'text-white/80' : 'text-chat-muted')}
        title="Download"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        preload="metadata"
        playsInline
      />
    </div>
  );
}

function DocumentPreview({
  attachment,
  isMine,
}: {
  attachment: Attachment;
  isMine: boolean;
}) {
  const Icon = ICONS[fileIconName(attachment.mime_type)] || FileIcon;
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 min-w-[220px]',
        isMine ? 'bg-white/15' : 'bg-black/5 dark:bg-white/5'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          isMine ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', isMine ? 'text-white' : 'text-chat-bubbleText dark:text-chat-dark-bubbleText')}>
          {attachment.file_name}
        </p>
        <p className={cn('text-xs', isMine ? 'text-white/70' : 'text-chat-muted')}>
          {formatBytes(attachment.size_bytes)}
        </p>
      </div>
      <button
        onClick={() => downloadAttachment(attachment).catch(() => toast.error('Download failed'))}
        className={cn('shrink-0 rounded-full p-1.5', isMine ? 'text-white/80 hover:bg-white/15' : 'text-chat-muted hover:bg-black/10 dark:hover:bg-white/10')}
        title="Download"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
