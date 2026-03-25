import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, Mic, MicOff, Camera, CameraOff, Monitor, X, Users } from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { toast } from 'sonner';

interface LiveKitBroadcasterProps {
  roomId: string;
  onStopStream: () => void;
}

export function LiveKitBroadcaster({ roomId, onStopStream }: LiveKitBroadcasterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, startPublishing, disconnect, toggleMute, toggleCamera } = useLiveKit();
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [mode, setMode] = useState<'camera' | 'screen' | null>(null);

  const handleStart = async (screenShare: boolean) => {
    if (!videoRef.current) return;
    try {
      await startPublishing(roomId, videoRef.current, screenShare);
      setMode(screenShare ? 'screen' : 'camera');
      toast.success('You are now live!');
    } catch {
      toast.error('Failed to start broadcasting');
    }
  };

  const handleStop = () => {
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

  if (!state.isPublishing) {
    return (
      <div className="border-b bg-muted/30 p-4">
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
    );
  }

  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-2 bg-destructive/10">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <Radio className="h-3 w-3" />
            BROADCASTING
          </Badge>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {state.participantCount} watching
          </span>
        </div>
        <div className="flex items-center gap-1">
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
      <div className="aspect-video max-h-[360px] bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
      </div>
      {state.error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {state.error}
        </div>
      )}
    </div>
  );
}
