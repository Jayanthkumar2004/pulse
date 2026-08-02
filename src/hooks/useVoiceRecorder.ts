import { useCallback, useRef, useState } from 'react';

interface UseVoiceRecorderResult {
  isRecording: boolean;
  durationSec: number;
  start: () => Promise<void>;
  stop: () => Promise<File | null>;
  cancel: () => void;
  error: string | null;
}

/** Records audio from the microphone into a WebM File for voice notes. */
export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef(0);

  const start = useCallback(async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      chunks.current = [];
      const rec = new MediaRecorder(s);
      mediaRecorder.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.start();
      startTime.current = Date.now();
      setDurationSec(0);
      timer.current = setInterval(() => {
        setDurationSec(Math.floor((Date.now() - startTime.current) / 1000));
      }, 250);
      setIsRecording(true);
    } catch {
      setError('Microphone access denied');
    }
  }, []);

  const stop = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const rec = mediaRecorder.current;
      if (!rec || rec.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        cleanup();
        resolve(file);
      };
      rec.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const rec = mediaRecorder.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => cleanup();
      rec.stop();
    } else {
      cleanup();
    }
  }, []);

  const cleanup = () => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    mediaRecorder.current = null;
    chunks.current = [];
    setIsRecording(false);
    setDurationSec(0);
  };

  return { isRecording, durationSec, start, stop, cancel, error };
}
