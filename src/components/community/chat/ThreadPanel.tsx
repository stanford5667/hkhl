import { ChatMessage } from '@/types/community';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ThreadPanelProps {
  parentMessage: ChatMessage;
  replies: ChatMessage[];
  replyCount: number;
  loading: boolean;
  onClose: () => void;
  onSendReply: (content: string) => Promise<void>;
}

export function ThreadPanel({
  parentMessage,
  replies,
  replyCount,
  loading,
  onClose,
  onSendReply,
}: ThreadPanelProps) {
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  // Auto-scroll to bottom on new replies
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [replies.length]);

  const handleSendReply = async () => {
    if (!replyContent.trim() || sending) return;

    try {
      setSending(true);
      await onSendReply(replyContent.trim());
      setReplyContent('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const parentInitials = (parentMessage.user_profile?.full_name || 'A')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-semibold">Thread</span>
          <span className="text-sm text-muted-foreground">
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs bg-primary/20 text-primary">
              {parentInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {parentMessage.user_profile?.full_name || 'Anonymous'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(parentMessage.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm break-words">{parentMessage.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <ScrollArea ref={scrollRef} className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No replies yet</p>
            <p className="text-xs">Be the first to reply!</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {replies.map((reply) => {
              const initials = (reply.user_profile?.full_name || 'A')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={reply.id} className="flex gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {reply.user_profile?.full_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm break-words">{reply.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Reply input */}
      {isAuthenticated && (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply in thread..."
              rows={1}
              className="min-h-[40px] max-h-[100px] resize-none"
              disabled={sending}
            />
            <Button
              onClick={handleSendReply}
              disabled={!replyContent.trim() || sending}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
