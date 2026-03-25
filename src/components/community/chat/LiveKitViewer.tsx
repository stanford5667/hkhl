import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, ChevronDown, ChevronUp, Users, Volume2, VolumeX } from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';

interface LiveKitViewerProps {
  roomId: string;
}

export function LiveKitViewer({ roomId }: LiveKitViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, joinAsViewer, disconnect } = useLiveKit();
  const [collapsed, setCollapsed] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      joinAsViewer(roomId, videoRef.current).catch(console.error);
    }
    return () => { disconnect(); };
  }, [roomId]);

  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-2 bg-destructive/10">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <Radio className="h-3 w-3" />
            LIVE
          </Badge>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {state.participantCount} watching
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setMuted(!muted);
              if (videoRef.current) videoRef.current.muted = !muted;
            }}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {!collapsed && (
        <div className="aspect-video max-h-[360px] bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
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
