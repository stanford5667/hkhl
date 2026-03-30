import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Trash2, Video, X, ChevronDown, ChevronUp } from 'lucide-react';
import { StreamRecording } from '@/hooks/useStreamRecordings';
import { formatDistanceToNow } from 'date-fns';

interface StreamRecordingsListProps {
  recordings: StreamRecording[];
  loading: boolean;
  isAdmin: boolean;
  onDelete?: (id: string, filePath: string) => void;
}

export function StreamRecordingsList({ recordings, loading, isAdmin, onDelete }: StreamRecordingsListProps) {
  const [expanded, setExpanded] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  if (recordings.length === 0) return null;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border-b">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
      >
        <Video className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Past Streams</span>
        <Badge variant="secondary" className="text-xs">{recordings.length}</Badge>
        <div className="ml-auto">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          {playingUrl && (
            <div className="mb-3 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 h-7 w-7 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setPlayingUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <video
                src={playingUrl}
                controls
                autoPlay
                className="w-full max-h-[300px] rounded-lg bg-black"
              />
            </div>
          )}

          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => setPlayingUrl(rec.file_path)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rec.title || 'Untitled Stream'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(rec.duration_seconds)} · {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {isAdmin && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => onDelete(rec.id, rec.file_path)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
