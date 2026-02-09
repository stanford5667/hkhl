import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChatMessage, MessageReaction } from '@/types/community';
import { useAuth } from '@/contexts/AuthContext';
import { useUsage } from '@/contexts/UsageContext';
import { useAdmin } from '@/hooks/useAdmin';
import { parseContent, ContentPart } from '@/utils/tickerParser';
import { TickerBadge } from '@/components/ui/TickerBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  MoreHorizontal, 
  Smile, 
  Reply, 
  Pencil, 
  Trash2,
  TrendingUp,
  Pin,
  MessageSquare,
  Lock,
  Crown,
} from 'lucide-react';
import { PresenceIndicator } from './PresenceIndicator';
import { PremiumMessageGate } from './PremiumMessageGate';

const COMMON_EMOJIS = ['👍', '❤️', '🚀', '🔥', '📈', '💎', '🐻', '🐂'];

interface MessageItemProps {
  message: ChatMessage;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onOpenThread?: (message: ChatMessage) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onSetPremium?: (messageId: string, isPremium: boolean) => void;
  isPinned?: boolean;
  canPin?: boolean;
  getUserPresence?: (userId: string) => 'online' | 'idle' | 'offline';
}

const MessageItem = memo(function MessageItem({
  message,
  onAddReaction,
  onRemoveReaction,
  onEdit,
  onDelete,
  onReply,
  onOpenThread,
  onPin,
  onUnpin,
  onSetPremium,
  isPinned = false,
  canPin = false,
  getUserPresence,
}: MessageItemProps) {
  const { user } = useAuth();
  const { isPro } = useUsage();
  const { isAdmin } = useAdmin();
  const isOwn = user?.id === message.user_id;
  const contentParts = useMemo(() => parseContent(message.content), [message.content]);
  const presenceStatus = getUserPresence?.(message.user_id) || 'offline';

  // Check if user can view premium content
  const canViewPremium = isPro || isAdmin || isOwn;
  const isPremiumMessage = message.is_premium;

  // Group reactions by emoji with count
  const groupedReactions = useMemo(() => {
    const groups: Record<string, { count: number; userReacted: boolean; users: string[] }> = {};
    
    (message.reactions || []).forEach((reaction) => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = { count: 0, userReacted: false, users: [] };
      }
      groups[reaction.emoji].count++;
      groups[reaction.emoji].users.push(reaction.user_id);
      if (reaction.user_id === user?.id) {
        groups[reaction.emoji].userReacted = true;
      }
    });

    return groups;
  }, [message.reactions, user?.id]);

  const handleReactionClick = (emoji: string, userReacted: boolean) => {
    if (userReacted) {
      onRemoveReaction(message.id, emoji);
    } else {
      onAddReaction(message.id, emoji);
    }
  };

  const renderContent = (parts: ContentPart[]) => {
    return parts.map((part, index) => {
      if (part.type === 'ticker') {
        return <TickerBadge key={index} ticker={part.value} className="mx-0.5" />;
      }
      if (part.type === 'mention') {
        return (
          <span key={index} className="text-primary font-medium">
            @{part.value}
          </span>
        );
      }
      return <span key={index}>{part.value}</span>;
    });
  };

  const displayName = message.user_profile?.full_name || 'Anonymous';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const threadCount = message.thread?.reply_count || 0;

  return (
    <div className={cn(
      "group flex gap-3 px-4 py-2 hover:bg-muted/50 transition-colors",
      isPinned && "bg-amber-500/5 border-l-2 border-amber-500"
    )}>
      <div className="relative">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary/20 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        {getUserPresence && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <PresenceIndicator status={presenceStatus} size="sm" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {message.is_edited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {isPremiumMessage && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <Crown className="h-3 w-3" />
              Premium
            </span>
          )}
          {isPinned && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
        </div>

        {/* Message content - gated if premium and user can't view */}
        <div className="text-sm break-words">
          {isPremiumMessage && !canViewPremium ? (
            <PremiumMessageGate content={message.content} />
          ) : (
            renderContent(contentParts)
          )}
        </div>

        {/* Thread indicator */}
        {threadCount > 0 && onOpenThread && (
          <button
            onClick={() => onOpenThread(message)}
            className="flex items-center gap-1.5 mt-1 text-xs text-primary hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            {threadCount} {threadCount === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji, data.userReacted)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                  "border transition-colors",
                  data.userReacted
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-muted border-border hover:bg-muted/80"
                )}
              >
                <span>{emoji}</span>
                <span>{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Smile className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="grid grid-cols-4 gap-1 p-2">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onAddReaction(message.id, emoji)}
                className="p-2 hover:bg-muted rounded text-lg"
              >
                {emoji}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {onOpenThread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onOpenThread(message)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}

        {onReply && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onReply(message.id)}
          >
            <Reply className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canPin && (
              <>
                {isPinned ? (
                  <DropdownMenuItem onClick={() => onUnpin?.(message.id)}>
                    <Pin className="h-4 w-4 mr-2" />
                    Unpin message
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin message
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            {isAdmin && onSetPremium && (
              <>
                {isPremiumMessage ? (
                  <DropdownMenuItem onClick={() => onSetPremium(message.id, false)}>
                    <Lock className="h-4 w-4 mr-2" />
                    Remove Premium
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onSetPremium(message.id, true)}>
                    <Crown className="h-4 w-4 mr-2" />
                    Mark as Premium
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            {isOwn && onEdit && (
              <DropdownMenuItem onClick={() => onEdit(message.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {isOwn && onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(message.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  blurred?: boolean;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onOpenThread?: (message: ChatMessage) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onSetPremium?: (messageId: string, isPremium: boolean) => void;
  onLoadMore: () => void;
  pinnedMessageIds?: Set<string>;
  canPin?: boolean;
  getUserPresence?: (userId: string) => 'online' | 'idle' | 'offline';
}

export function MessageList({
  messages,
  loading,
  hasMore,
  blurred = false,
  onAddReaction,
  onRemoveReaction,
  onEdit,
  onDelete,
  onReply,
  onOpenThread,
  onPin,
  onUnpin,
  onSetPremium,
  onLoadMore,
  pinnedMessageIds = new Set(),
  canPin = false,
  getUserPresence,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
        <p>No messages yet</p>
        <p className="text-sm">Be the first to start the conversation!</p>
      </div>
    );
  }

  // For blurred mode, show a gradient fade at the top of visible messages
  const visibleCount = 3;
  const blurredMessages = blurred ? messages.slice(0, -visibleCount) : [];
  const visibleMessages = blurred ? messages.slice(-visibleCount) : messages;

  return (
    <ScrollArea ref={scrollRef} className="flex-1 h-[calc(100vh-250px)]">
      {hasMore && !blurred && (
        <div className="flex justify-center py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load older messages'}
          </Button>
        </div>
      )}
      
      {/* Blurred older messages (teaser mode) */}
      {blurred && blurredMessages.length > 0 && (
        <div className="relative">
          <div className="blur-sm pointer-events-none opacity-50">
            {blurredMessages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
              />
            ))}
          </div>
          {/* Gradient fade overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-transparent pointer-events-none" />
        </div>
      )}
      
      {/* Visible messages */}
      <div className="space-y-0">
        {visibleMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            onEdit={blurred ? undefined : onEdit}
            onDelete={blurred ? undefined : onDelete}
            onReply={blurred ? undefined : onReply}
            onOpenThread={blurred ? undefined : onOpenThread}
            onPin={blurred ? undefined : onPin}
            onUnpin={blurred ? undefined : onUnpin}
            onSetPremium={blurred ? undefined : onSetPremium}
            isPinned={pinnedMessageIds.has(message.id)}
            canPin={canPin}
            getUserPresence={getUserPresence}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
