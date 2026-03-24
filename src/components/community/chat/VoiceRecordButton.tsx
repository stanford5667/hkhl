import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VoiceRecordButtonProps {
  onVoiceRecorded: (url: string, type: string) => void;
  disabled?: boolean;
}

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

  const startRecording = useCallback(async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) {
          toast.error('Recording too short');
          setDuration(0);
          return;
        }
        const url = URL.createObjectURL(blob);
        setPendingBlob(blob);
        setPendingUrl(url);
      };

      mediaRecorder.start(250);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error('Microphone access denied', {
        description: 'Please allow microphone access to send voice messages.',
      });
    }
  }, [user]);

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
      const path = `${user.id}/${Date.now()}-voice.webm`;
      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, pendingBlob, { contentType: 'audio/webm' });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path);
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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
        <span className="text-xs text-destructive font-medium animate-pulse">
          ● {formatTime(duration)}
        </span>
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