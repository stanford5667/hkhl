import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResearchPost } from '@/types/community';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoteButtons } from './VoteButtons';
import { MessageSquare, Share2, Bookmark, ImageIcon, Trash2, Lock, Crown, ShieldCheck } from 'lucide-react';
import { ShareArticleDialog } from './ShareArticleDialog';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { useUsage } from '@/contexts/UsageContext';

interface PostCardProps {
  post: ResearchPost;
  onVote: (postId: string, voteType: 1 | -1) => void;
  onTickerClick?: (ticker: string) => void;
  onDelete?: (postId: string) => void;
  onTogglePremium?: (postId: string, isPremium: boolean) => void;
  compact?: boolean;
}

// Gradient placeholders for posts without thumbnails
const gradients = [
  'from-blue-600/80 to-cyan-500/80',
  'from-purple-600/80 to-pink-500/80',
  'from-emerald-600/80 to-teal-500/80',
  'from-orange-600/80 to-amber-500/80',
  'from-rose-600/80 to-red-500/80',
  'from-indigo-600/80 to-violet-500/80',
];

function getGradient(id: string) {
  const idx = id.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

export function PostCard({ post, onVote, onTickerClick, onDelete, onTogglePremium, compact = false }: PostCardProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const { isPro, showUpgradeModal } = useUsage();
  const canDelete = isAdmin || user?.id === post.user_id;
  const [shareOpen, setShareOpen] = useState(false);
  const canViewPremium = isPro || isAdmin || user?.id === post.user_id;

  const displayName = post.user_profile?.full_name || 'Anonymous';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const score = post.upvotes - post.downvotes;

  const previewContent = useMemo(() => {
    const maxLength = 140;
    // Strip markdown formatting for clean preview
    const cleaned = post.content
      .replace(/^TITLE:.*\n\n?/i, '')
      .replace(/^#{1,6}\s+.*$/gm, '') // remove headings
      .replace(/!\[.*?\]\(.*?\)/g, '') // remove images
      .replace(/\[IMAGE:.*?\]/g, '') // remove image placeholders
      .replace(/\*\*(.+?)\*\*/g, '$1') // bold → plain
      .replace(/\*(.+?)\*/g, '$1') // italic → plain
      .replace(/`(.+?)`/g, '$1') // code → plain
      .replace(/\[(.+?)\]\(.*?\)/g, '$1') // links → text
      .replace(/^\s*[-*]\s+/gm, '') // bullets
      .replace(/\n{2,}/g, ' ') // collapse newlines
      .replace(/\n/g, ' ')
      .trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.slice(0, maxLength).trim() + '...';
  }, [post.content]);

  const handleClick = () => {
    if (post.is_premium && !canViewPremium) {
      showUpgradeModal('premiumResearch');
      return;
    }
    navigate(`/community/posts/${post.id}`);
  };

  const handleTickerClick = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTickerClick?.(ticker);
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card overflow-hidden cursor-pointer",
        "transition-all duration-300 ease-out",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02]",
        "backdrop-blur-sm"
      )}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {post.thumbnail_url ? (
          <img
            src={post.thumbnail_url}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={cn(
            "w-full h-full bg-gradient-to-br flex items-center justify-center",
            getGradient(post.id)
          )}>
            <ImageIcon className="h-10 w-10 text-white/40" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Premium badge */}
        {post.is_premium && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-amber-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          </div>
        )}
        {post.detected_tickers.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end max-w-[70%]">
            {post.detected_tickers.slice(0, 3).map((ticker) => (
              <Badge
                key={ticker}
                className="bg-black/60 backdrop-blur-sm text-white border-0 text-[10px] px-1.5 py-0.5 hover:bg-primary/80 cursor-pointer"
                onClick={(e) => handleTickerClick(ticker, e)}
              >
                ${ticker}
              </Badge>
            ))}
            {post.detected_tickers.length > 3 && (
              <Badge className="bg-black/60 backdrop-blur-sm text-white/70 border-0 text-[10px] px-1.5 py-0.5">
                +{post.detected_tickers.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Score overlay */}
        <div className="absolute bottom-2 left-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
            <VoteButtons
              score={score}
              userVote={(post.user_vote as 1 | -1) || null}
              onVote={(voteType) => onVote(post.id, voteType)}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2">
          {previewContent}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground/50">·</span>
            <span className="text-xs text-muted-foreground/70 shrink-0">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <MessageSquare className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-muted-foreground -ml-1">{post.comment_count}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); setShareOpen(true); }}
            >
              <Share2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <Bookmark className="h-3 w-3" />
            </Button>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ShareArticleDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        postId={post.id}
        postTitle={post.title}
        postTickers={post.detected_tickers}
      />
    </div>
  );
}
