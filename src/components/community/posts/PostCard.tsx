import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResearchPost } from '@/types/community';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoteButtons } from './VoteButtons';
import { TickerBadge } from '@/components/ui/TickerBadge';
import { MessageSquare, Share2, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: ResearchPost;
  onVote: (postId: string, voteType: 1 | -1) => void;
  onTickerClick?: (ticker: string) => void;
  compact?: boolean;
}

export function PostCard({ post, onVote, onTickerClick, compact = false }: PostCardProps) {
  const navigate = useNavigate();

  const displayName = post.user_profile?.full_name || 'Anonymous';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const score = post.upvotes - post.downvotes;

  // Truncate content for preview
  const previewContent = useMemo(() => {
    const maxLength = compact ? 100 : 200;
    if (post.content.length <= maxLength) return post.content;
    return post.content.slice(0, maxLength).trim() + '...';
  }, [post.content, compact]);

  const handleClick = () => {
    navigate(`/community/posts/${post.id}`);
  };

  const handleTickerClick = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTickerClick) {
      onTickerClick(ticker);
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:border-primary/50 transition-colors",
        compact && "py-2"
      )}
      onClick={handleClick}
    >
      <div className="flex">
        {/* Vote sidebar */}
        <div 
          className="flex flex-col items-center py-4 px-2 border-r"
          onClick={(e) => e.stopPropagation()}
        >
          <VoteButtons
            score={score}
            userVote={(post.user_vote as 1 | -1) || null}
            onVote={(voteType) => onVote(post.id, voteType)}
            vertical
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <CardHeader className={cn("pb-2", compact && "py-2")}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{displayName}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            </div>
            <h3 className={cn(
              "font-semibold leading-tight",
              compact ? "text-base" : "text-lg"
            )}>
              {post.title}
            </h3>
          </CardHeader>

          <CardContent className={cn("pb-3", compact && "py-1")}>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {previewContent}
            </p>

            {/* Ticker tags */}
            {post.detected_tickers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.detected_tickers.slice(0, 5).map((ticker) => (
                  <Badge
                    key={ticker}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 text-xs"
                    onClick={(e) => handleTickerClick(ticker, e)}
                  >
                    ${ticker}
                  </Badge>
                ))}
                {post.detected_tickers.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{post.detected_tickers.length - 5} more
                  </Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground h-8"
                onClick={handleClick}
              >
                <MessageSquare className="h-4 w-4" />
                <span>{post.comment_count}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground h-8"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground h-8"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
