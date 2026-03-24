import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceRecordButtonProps {
  onVoiceRecorded: (url: string, type: string) => void;
  disabled?: boolean;
}

export function VoiceRecordButton({ onVoiceRecorded, disabled }: VoiceRecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
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

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) {
          toast.error('Recording too short');
          setRecording(false);
          setDuration(0);
          return;
        }

        try {
          setUploading(true);
          const path = `${user.id}/${Date.now()}-voice.webm`;
          const { error } = await supabase.storage
            .from('chat-attachments')
            .upload(path, blob, { contentType: 'audio/webm' });

          if (error) throw error;

          const {
            data: { publicUrl },
          } = supabase.storage.from('chat-attachments').getPublicUrl(path);

          onVoiceRecorded(publicUrl, 'voice');
          toast.success('Voice message ready');
        } catch (err: any) {
          console.error('Voice upload error:', err);
          toast.error('Failed to upload voice message');
        } finally {
          setUploading(false);
          setDuration(0);
        }
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
  }, [user, onVoiceRecorded]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (uploading) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </Button>
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
