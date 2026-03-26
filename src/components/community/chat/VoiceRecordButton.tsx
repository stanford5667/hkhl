import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VoiceRecordButtonProps {
  onVoiceRecorded: (url: string, type: string) => void;
  disabled?: boolean;
}

const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
];

const getUploadExtension = (mimeType: string) => {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
};

const getMicErrorMessage = (error: unknown) => {
  const err = error as DOMException;
  if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
    return {
      title: 'Microphone access denied',
      description: 'Please allow microphone access for this site in your browser settings.',
    };
  }

  if (err?.name === 'NotReadableError') {
    return {
      title: 'Microphone unavailable',
      description: 'Your microphone may be in use by another app. Please close it and try again.',
    };
  }

  if (err?.name === 'NotSupportedError' || err?.name === 'TypeError') {
    return {
      title: 'Voice recording not supported',
      description: 'This browser does not support the selected audio format. Try Chrome or update Safari.',
    };
  }

  return {
    title: 'Could not start recording',
    description: 'Please try again. If this persists, refresh the page.',
  };
};

export function VoiceRecordButton({ onVoiceRecorded, disabled }: VoiceRecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    };
  }, [pendingUrl]);

  const startRecording = useCallback(async () => {
    if (!user || disabled) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Microphone not available', {
        description: 'Your browser does not support microphone access.',
      });
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording not supported', {
        description: 'Your browser does not support voice recording.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeType = RECORDER_MIME_CANDIDATES.find((candidate) =>
        MediaRecorder.isTypeSupported(candidate)
      );

      const mediaRecorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const recordedMime = mediaRecorder.mimeType || supportedMimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: recordedMime });

        if (blob.size < 1000) {
          toast.error('Recording too short');
          setDuration(0);
          return;
        }

        const url = URL.createObjectURL(blob);
        setPendingBlob(blob);
        setPendingUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      };

      mediaRecorder.start(250);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (error) {
      const { title, description } = getMicErrorMessage(error);
      toast.error(title, { description });
    }
  }, [user, disabled]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const discardRecording = useCallback(() => {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPendingBlob(null);
    setPendingUrl(null);
    setDuration(0);
  }, [pendingUrl]);

  const confirmAndSend = useCallback(async () => {
    if (!pendingBlob || !user) return;

    try {
      setUploading(true);
      const mimeType = pendingBlob.type || 'audio/webm';
      const extension = getUploadExtension(mimeType);
      const path = `${user.id}/${Date.now()}-voice.${extension}`;

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, pendingBlob, { contentType: mimeType, upsert: false });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('chat-attachments').getPublicUrl(path);

      console.log('[Voice] uploaded:', { path, mimeType, size: pendingBlob.size, publicUrl });
      onVoiceRecorded(publicUrl, 'voice');
      toast.success('Voice message sent');
    } catch (err: any) {
      console.error('Voice upload error:', err);
      toast.error('Failed to upload voice message');
    } finally {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
      setPendingBlob(null);
      setPendingUrl(null);
      setUploading(false);
      setDuration(0);
    }
  }, [pendingBlob, pendingUrl, user, onVoiceRecorded]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (uploading) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </Button>
    );
  }

  if (pendingBlob && pendingUrl) {
    return (
      <div className="flex items-center gap-1.5">
        <audio src={pendingUrl} controls className="h-7 max-w-[140px]" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={discardRecording}
          type="button"
          title="Discard"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary hover:text-primary"
          onClick={confirmAndSend}
          type="button"
          title="Send voice message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-destructive font-medium animate-pulse">● {formatTime(duration)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={stopRecording}
          type="button"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      type="button"
      disabled={disabled}
      onClick={startRecording}
      title="Record voice message"
    >
      <Mic className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}