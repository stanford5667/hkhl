import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, Mic, MicOff, Camera, CameraOff, Monitor, X, Users, Circle } from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { toast } from 'sonner';

interface LiveKitBroadcasterProps {
  roomId: string;
  onStopStream: () => void;
  onRecordingSaved?: (blob: Blob, durationSeconds: number) => Promise<void>;
}

export function LiveKitBroadcaster({ roomId, onStopStream, onRecordingSaved }: LiveKitBroadcasterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const { state, startPublishing, disconnect, toggleMute, toggleCamera } = useLiveKit();
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [mode, setMode] = useState<'camera' | 'screen' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [savingRecording, setSavingRecording] = useState(false);

  const startRecording = () => {
    const video = videoRef.current;
    if (!video || !video.srcObject) {
      toast.error('No stream to record');
      return;
    }

    try {
      const stream = video.srcObject as MediaStream;
      
      // Find a supported MIME type (Safari doesn't support webm)
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        '',  // empty string = browser default
      ];
      const mimeType = candidates.find(m => {
        try { return m === '' || MediaRecorder.isTypeSupported(m); } catch { return false; }
      }) || '';
      
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) recorderOptions.mimeType = mimeType;
      
      const recorder = new MediaRecorder(stream, recorderOptions);
      const actualMime = recorder.mimeType || 'video/webm';
      recordingChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: actualMime });
        const duration = (Date.now() - recordingStartRef.current) / 1000;
        
        if (blob.size > 0 && onRecordingSaved) {
          setSavingRecording(true);
          try {
            await onRecordingSaved(blob, duration);
            toast.success('Stream recording saved!');
          } catch (err: any) {
            toast.error('Failed to save recording: ' + err.message);
          } finally {
            setSavingRecording(false);
          }
        }
        setIsRecording(false);
      };

      recorder.start(1000); // collect data every second
      recordingStartRef.current = Date.now();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err: any) {
      toast.error('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        const originalOnStop = mediaRecorderRef.current.onstop;
        mediaRecorderRef.current.onstop = async (e) => {
          if (originalOnStop && typeof originalOnStop === 'function') {
            await (originalOnStop as (e: Event) => Promise<void>)(e);
          }
          resolve();
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve();
      }
    });
  };

  const handleStart = async (screenShare: boolean) => {
    if (!videoRef.current) {
      console.error('LiveKit: videoRef is null');
      toast.error('Video element not ready');
      return;
    }
    try {
      await startPublishing(roomId, videoRef.current, screenShare);
      setMode(screenShare ? 'screen' : 'camera');
      toast.success('You are now live!');
    } catch (err: any) {
      console.error('LiveKit broadcast error:', err);
      toast.error('Failed to start broadcasting: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleStop = async () => {
    if (isRecording) {
      await stopRecording();
    }
    disconnect();
    onStopStream();
  };

  const handleToggleMute = async () => {
    await toggleMute();
    setIsMuted(!isMuted);
  };

  const handleToggleCamera = async () => {
    await toggleCamera();
    setIsCamOff(!isCamOff);
  };

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return (
    <div className="border-b bg-background">
      {!state.isPublishing && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Radio className="h-3 w-3" />
              LIVE
            </Badge>
            <span className="text-sm font-medium">Start Broadcasting</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleStart(false)} className="gap-1">
              <Camera className="h-4 w-4" />
              Camera
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleStart(true)} className="gap-1">
              <Monitor className="h-4 w-4" />
              Screen Share
            </Button>
            <Button size="sm" variant="ghost" onClick={onStopStream}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {state.isPublishing && (
        <div className="flex items-center justify-between px-4 py-2 bg-destructive/10">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Radio className="h-3 w-3" />
              BROADCASTING
            </Badge>
            {isRecording && (
              <Badge variant="outline" className="gap-1 border-red-500 text-red-500">
                <Circle className="h-2 w-2 fill-red-500 animate-pulse" />
                REC
              </Badge>
            )}
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {state.participantCount} watching
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!isRecording ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-red-500 border-red-500/50 hover:bg-red-500/10"
                onClick={startRecording}
                disabled={savingRecording}
              >
                <Circle className="h-3 w-3 fill-red-500" />
                Record
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1"
                onClick={stopRecording}
              >
                <X className="h-3 w-3" />
                Stop Rec
              </Button>
            )}
            {mode === 'camera' && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleMute}>
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleCamera}>
                  {isCamOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                </Button>
              </>
            )}
            <Button variant="destructive" size="sm" className="h-7 gap-1" onClick={handleStop}>
              <X className="h-3 w-3" />
              End Stream
            </Button>
          </div>
        </div>
      )}

      <div className={state.isPublishing ? 'aspect-video max-h-[360px] bg-black' : 'h-0 overflow-hidden'}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
      </div>

      {savingRecording && (
        <div className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground animate-pulse">
          Saving recording...
        </div>
      )}

      {state.error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {state.error}
        </div>
      )}
    </div>
  );
}
