import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Send, MessageSquare, Link2, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string;
  postTickers?: string[];
}

interface ChatRoom {
  id: string;
  name: string;
  icon: string | null;
  member_count: number;
}

export function ShareArticleDialog({ open, onOpenChange, postId, postTitle, postTickers = [] }: ShareArticleDialogProps) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const articleUrl = `${window.location.origin}/community/posts/${postId}`;

  useEffect(() => {
    if (!open) return;
    const fetchRooms = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('chat_rooms')
        .select('id, name, icon, member_count')
        .order('member_count', { ascending: false });
      setRooms(data || []);
      setLoading(false);
    };
    fetchRooms();
  }, [open]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(articleUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToChat = async (roomId: string) => {
    if (!user) {
      toast.error('Sign in to share to chat');
      return;
    }

    setSharing(roomId);
    try {
      const { data: postData } = await supabase
        .from('research_posts')
        .select('thumbnail_url')
        .eq('id', postId)
        .maybeSingle();

      const content = `📊 Shared Research Article\n\n${articleUrl}`;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content,
          detected_tickers: [],
          attachment_type: postData?.thumbnail_url ? 'image' : null,
          attachment_url: postData?.thumbnail_url || null,
        });

      if (error) throw error;
      toast.success('Article shared to chat');
      onOpenChange(false);
    } catch {
      toast.error('Failed to share article');
    } finally {
      setSharing(null);
    }
  };

  const handleShareExternal = () => {
    if (navigator.share) {
      navigator.share({ title: postTitle, url: articleUrl }).catch(() => {});
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(articleUrl)}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Share Article</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-10"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 h-10"
              onClick={handleShareExternal}
            >
              <Twitter className="h-4 w-4" />
              Share
            </Button>
          </div>

          {/* Share to chat rooms */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Share to Chat Room
            </p>
            <ScrollArea className="h-[200px] rounded-lg border border-border/50">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading rooms...</div>
              ) : rooms.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No rooms available</div>
              ) : (
                <div className="p-1">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm",
                        "hover:bg-muted/60 transition-colors",
                        sharing === room.id && "opacity-50 pointer-events-none"
                      )}
                      onClick={() => handleShareToChat(room.id)}
                      disabled={sharing !== null}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{room.icon || '💬'}</span>
                        <span className="truncate font-medium">{room.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {room.member_count} members
                        </span>
                      </div>
                      <Send className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
