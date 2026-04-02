import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Send, MessageSquare, Link2, Twitter, Lock } from 'lucide-react';
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

export function ShareArticleDialog({ open, onOpenChange, postId, postTitle }: ShareArticleDialogProps) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [privateLink, setPrivateLink] = useState<string | null>(null);

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

    const fetchShareToken = async () => {
      const { data } = await supabase
        .from('research_posts')
        .select('share_token')
        .eq('id', postId)
        .maybeSingle();

      if (data?.share_token) {
        setPrivateLink(`${window.location.origin}/shared/post/${data.share_token}`);
      }
    };

    fetchRooms();
    fetchShareToken();
  }, [open, postId]);

  const handleCopyPublicLink = async () => {
    await navigator.clipboard.writeText(articleUrl);
    setCopiedPublic(true);
    toast.success('Public link copied');
    setTimeout(() => setCopiedPublic(false), 2000);
  };

  const handleCopyPrivateLink = async () => {
    if (!privateLink) return;
    await navigator.clipboard.writeText(privateLink);
    setCopiedPrivate(true);
    toast.success('Private share link copied — anyone with this link can view the article');
    setTimeout(() => setCopiedPrivate(false), 2000);
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
    const shareUrl = privateLink || articleUrl;
    if (navigator.share) {
      navigator.share({ title: postTitle, url: shareUrl }).catch(() => {});
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Share Article</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Private share link */}
          {privateLink && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                Private Link — accessible to anyone, no sign-in needed
              </p>
              <Button
                variant="outline"
                className="w-full gap-2 h-10 border-primary/30 hover:border-primary/60"
                onClick={handleCopyPrivateLink}
              >
                {copiedPrivate ? <Check className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-primary" />}
                {copiedPrivate ? 'Copied!' : 'Copy Private Link'}
              </Button>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-10"
              onClick={handleCopyPublicLink}
            >
              {copiedPublic ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
              {copiedPublic ? 'Copied!' : 'Copy Link'}
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
