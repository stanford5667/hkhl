import { useState } from 'react';
import { ShareArticleDialog } from './ShareArticleDialog';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import { usePostDetail } from '@/hooks/useResearchPosts';
import { useAuth } from '@/contexts/AuthContext';
import { useUsage } from '@/contexts/UsageContext';
import { useAdmin } from '@/hooks/useAdmin';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { VoteButtons } from './VoteButtons';
import { ArrowLeft, MessageSquare, Send, ImageIcon, Share2, Lock, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TickerBadge } from '@/components/ui/TickerBadge';
import { toast } from 'sonner';

export function PostDetailView() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { post, comments, loading, addComment } = usePostDetail(postId ?? null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    try {
      setSubmitting(true);
      await addComment(commentText.trim());
      setCommentText('');
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="aspect-[16/9] rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-lg font-medium text-muted-foreground">Post not found</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate('/community/posts')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </Button>
      </div>
    );
  }

  const displayName = post.user_profile?.full_name || 'Anonymous';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const score = post.upvotes - post.downvotes;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate('/community/posts')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </Button>

      {/* Thumbnail */}
      {post.thumbnail_url ? (
        <div className="aspect-[16/9] rounded-xl overflow-hidden">
          <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
          <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
        </div>
      )}

      {/* Title & Meta */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold leading-tight">{post.title}</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{displayName}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Tickers */}
        {post.detected_tickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.detected_tickers.map(ticker => (
              <TickerBadge key={ticker} ticker={ticker} />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-8 prose-headings:mb-3 prose-headings:font-bold prose-p:mb-4 prose-p:leading-relaxed">
        <ReactMarkdown
          components={{
            h2: ({ node, children, ...props }) => (
              <h2 {...props} className="text-xl font-bold mt-8 mb-3 text-foreground">{children}</h2>
            ),
            h3: ({ node, children, ...props }) => (
              <h3 {...props} className="text-lg font-bold mt-6 mb-2 text-foreground">{children}</h3>
            ),
            p: ({ node, children, ...props }) => (
              <p {...props} className="mb-5 leading-relaxed text-foreground/90">{children}</p>
            ),
            img: ({ node, ...props }) => (
              <img {...props} className="rounded-lg border border-border/50 my-6 max-w-full" loading="lazy" />
            ),
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>

      {/* Vote bar */}
      <div className="flex items-center gap-4 py-3 border-y border-border/50">
        <VoteButtons
          score={score}
          userVote={(post.user_vote as 1 | -1) || null}
          onVote={() => {}}
          size="sm"
        />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm">{post.comment_count} comments</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground ml-auto"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      <ShareArticleDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        postId={post.id}
        postTitle={post.title}
        postTickers={post.detected_tickers}
      />

      {/* Comment input */}
      {isAuthenticated && (
        <div className="flex gap-3">
          <Textarea
            placeholder="Share your thoughts..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-[80px] bg-muted/50"
          />
          <Button
            size="icon"
            disabled={!commentText.trim() || submitting}
            onClick={handleSubmitComment}
            className="shrink-0 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4">
        {comments.map(comment => {
          const cName = comment.user_profile?.full_name || 'Anonymous';
          const cInitials = cName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[9px] bg-primary/20 text-primary">{cInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{cName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
