import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Send, Smile, X, Lock, LogIn } from 'lucide-react';
import { ChatAttachmentButton } from './ChatAttachmentButton';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';

const COMMON_EMOJIS = ['👍', '❤️', '🚀', '🔥', '📈', '💎', '🐻', '🐂', '😂', '🤔', '👏', '💪'];

interface MessageInputProps {
  onSend: (content: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
  locked?: boolean;
  onUpgradeClick?: () => void;
  replyingTo?: {
    id: string;
    content: string;
    userName: string;
  } | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  onSend,
  onTyping,
  placeholder = 'Type a message... Use $TICKER to mention stocks',
  disabled = false,
  locked = false,
  onUpgradeClick,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isAuthenticated } = useAuth();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!content.trim() || sending || disabled) return;

    try {
      setSending(true);
      await onSend(content.trim());
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const navigateTo = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="p-4 border-t bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Sign in to join the conversation
        </p>
        <Button size="sm" variant="default" className="gap-2" onClick={() => navigateTo('/auth')}>
          <LogIn className="h-4 w-4" />
          Sign In / Sign Up
        </Button>
      </div>
    );
  }

  if (locked) {
    return (
      <div 
        className="p-4 border-t bg-muted/50 text-center cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={onUpgradeClick}
      >
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <p className="text-sm font-medium">
            Upgrade to Pro to join the conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t bg-background">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-muted rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Replying to <span className="font-medium">{replyingTo.userName}</span>
            </p>
            <p className="text-sm truncate">{replyingTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className={cn(
              "min-h-[44px] max-h-[150px] resize-none pr-20",
              "focus-visible:ring-1"
            )}
          />
          
          {/* Inline action buttons */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  type="button"
                >
                  <Smile className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-2">
                <div className="grid grid-cols-6 gap-1">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="p-2 hover:bg-muted rounded text-lg"
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || sending || disabled}
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Use <code className="px-1 py-0.5 bg-muted rounded">$TICKER</code> to mention stocks • 
        Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to send
      </p>
    </div>
  );
}
