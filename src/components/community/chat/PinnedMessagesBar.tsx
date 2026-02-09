import { ChatMessage } from '@/types/community';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PinnedMessagesBarProps {
  pinnedMessages: ChatMessage[];
  onUnpin?: (messageId: string) => void;
  canUnpin?: boolean;
}

export function PinnedMessagesBar({
  pinnedMessages,
  onUnpin,
  canUnpin = false,
}: PinnedMessagesBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const latestPinned = pinnedMessages[0];

  return (
    <div className="border-b bg-amber-500/5 border-amber-500/20">
      {/* Collapsed view - show latest pinned */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-amber-500/10 transition-colors",
          isExpanded && "border-b border-amber-500/20"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Pin className="h-4 w-4 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">
            <span className="font-medium text-amber-600">
              {latestPinned.user_profile?.full_name || 'Anonymous'}:
            </span>{' '}
            {latestPinned.content}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pinnedMessages.length > 1 && (
            <span className="text-xs text-muted-foreground">
              +{pinnedMessages.length - 1} more
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded view - show all pinned */}
      {isExpanded && (
        <ScrollArea className="max-h-48">
          <div className="p-2 space-y-2">
            {pinnedMessages.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                <Pin className="h-3 w-3 text-amber-500 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {message.user_profile?.full_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.content}
                  </p>
                </div>
                {canUnpin && onUnpin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin(message.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
