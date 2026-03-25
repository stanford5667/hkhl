import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, X, ChevronDown, ChevronUp } from 'lucide-react';

interface LivestreamPlayerProps {
  streamUrl: string;
  isAdmin: boolean;
  onStopStream: () => void;
}

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;

  // Twitch channel
  const twitchChannel = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchChannel) return `https://player.twitch.tv/?channel=${twitchChannel[1]}&parent=${window.location.hostname}`;

  // Direct embed / already an embed URL
  return url;
}

export function LivestreamPlayer({ streamUrl, isAdmin, onStopStream }: LivestreamPlayerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const embedUrl = getEmbedUrl(streamUrl);

  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-2 bg-destructive/10">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <Radio className="h-3 w-3" />
            LIVE
          </Badge>
          <span className="text-sm text-muted-foreground">Stream active</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1"
              onClick={onStopStream}
            >
              <X className="h-3 w-3" />
              End Stream
            </Button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="aspect-video max-h-[360px]">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
