import { Image, FileText, Download, Mic } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MessageAttachmentProps {
  url: string;
  type: string;
}

export function MessageAttachment({ url, type }: MessageAttachmentProps) {
  const [expanded, setExpanded] = useState(false);
  const filename = url.split('/').pop()?.split('?')[0] || 'file';
  // Strip the timestamp prefix from display name
  const displayName = filename.replace(/^\d+-/, '');

  if (type === 'voice') {
    // Determine audio MIME type from file extension
    const audioMime = url.includes('.m4a') ? 'audio/mp4' 
      : url.includes('.aac') ? 'audio/aac'
      : url.includes('.ogg') ? 'audio/ogg'
      : 'audio/webm';
    
    return (
      <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 max-w-[300px]">
        <Mic className="h-4 w-4 text-primary shrink-0" />
        <audio controls preload="auto" className="h-8 w-full [&::-webkit-media-controls-panel]:bg-transparent">
          <source src={url} type={audioMime} />
          <source src={url} />
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  if (type === 'image' || type === 'gif') {
    return (
      <div className="mt-1.5">
        <img
          src={url}
          alt="Attachment"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "rounded-lg cursor-pointer border border-border object-cover",
            expanded ? "max-w-full max-h-[600px]" : "max-w-[300px] max-h-[200px]"
          )}
          loading="lazy"
        />
        {expanded && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
            onClick={() => setExpanded(false)}
          >
            <img src={url} alt="Attachment" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors text-sm"
    >
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate max-w-[200px]">{displayName}</span>
      <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </a>
  );
}
